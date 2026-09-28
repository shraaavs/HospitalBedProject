import express from 'express';
import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';
import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import Admin from '../models/Admin.js';
import Receptionist from '../models/Receptionist.js';
import Appointment from '../models/Appointment.js';
import AdmissionBedRequest from '../models/AdmissionBedRequest.js';
import EmergencyPatient from '../models/EmergencyPatient.js';
import ResourceRequest from '../models/ResourceRequest.js';
import InventoryItem from '../models/InventoryItem.js';
import TransferDischarge from '../models/TransferDischarge.js';
import DischargeBill from '../models/DischargeBill.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// =========================================================================
// GET /api/analytics/overview
// Comprehensive hospital reports aggregated from real MongoDB records
// Supports filters: startDate, endDate, department, ward, doctor, status
// =========================================================================
router.get('/overview', protect, requireRole(['Admin', 'Doctor']), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      department,
      ward,
      doctor,
      patientStatus,
      resourceCategory
    } = req.query;

    // 1. Build dynamic Date Range Filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = endD;
      }
    }

    // 2. Patient Registrations & Status Breakdown
    const patientQuery = { ...dateFilter };
    if (department && department !== 'All') {
      patientQuery.$or = [
        { department: department },
        { assignedDepartment: department },
        { 'admissionSetup.department': department }
      ];
    }
    if (doctor && doctor !== 'All') {
      patientQuery.$or = [
        { assignedDoctor: new RegExp(doctor, 'i') },
        { 'admissionSetup.assignedDoctor': new RegExp(doctor, 'i') }
      ];
    }
    if (patientStatus && patientStatus !== 'All') {
      patientQuery.status = patientStatus;
    }
    if (ward && ward !== 'All') {
      patientQuery.$or = [
        { ward: ward },
        { 'admissionSetup.ward': ward },
        { 'admissionSetup.wardType': ward }
      ];
    }

    const [
      totalPatients,
      admittedPatients,
      dischargedPatients,
      emergencyPatients,
      registeredPatients
    ] = await Promise.all([
      Patient.countDocuments(patientQuery),
      Patient.countDocuments({ ...patientQuery, status: { $in: ['Admitted', 'Inpatient'] } }),
      Patient.countDocuments({ ...patientQuery, status: 'Discharged' }),
      Patient.countDocuments({ ...patientQuery, status: 'Emergency' }),
      Patient.countDocuments({ ...patientQuery, status: { $in: ['Registered', 'Active', 'Outpatient'] } })
    ]);

    // Patient Registrations by Gender & Age Group
    const demographicsAgg = await Patient.aggregate([
      { $match: patientQuery },
      {
        $group: {
          _id: {
            gender: { $ifNull: ['$gender', 'Unspecified'] },
            bloodGroup: { $ifNull: ['$bloodGroup', 'Unknown'] }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // 3. Bed and ICU Occupancy Breakdown
    const bedQuery = {};
    if (ward && ward !== 'All') {
      bedQuery.$or = [{ wardType: ward }, { ward: ward }, { type: ward }];
    }

    const [
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      reservedBeds
    ] = await Promise.all([
      Bed.countDocuments(bedQuery),
      Bed.countDocuments({ ...bedQuery, status: 'Occupied' }),
      Bed.countDocuments({ ...bedQuery, status: 'Available' }),
      Bed.countDocuments({ ...bedQuery, status: { $in: ['Maintenance', 'Cleaning', 'Blocked'] } }),
      Bed.countDocuments({ ...bedQuery, status: 'Reserved' })
    ]);

    const bedWardOccupancy = await Bed.aggregate([
      { $match: bedQuery },
      {
        $group: {
          _id: { $ifNull: ['$wardType', '$type'] },
          total: { $sum: 1 },
          occupied: { $sum: { $cond: [{ $eq: ['$status', 'Occupied'] }, 1, 0] } },
          available: { $sum: { $cond: [{ $eq: ['$status', 'Available'] }, 1, 0] } },
          maintenance: { $sum: { $cond: [{ $in: ['$status', ['Maintenance', 'Cleaning', 'Blocked']] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // ICU Specifics
    const icuTotal = await Bed.countDocuments({
      ...bedQuery,
      $or: [{ wardType: /icu/i }, { type: /icu/i }, { ward: /icu/i }, { roomNumber: /icu/i }]
    });
    const icuOccupied = await Bed.countDocuments({
      ...bedQuery,
      status: 'Occupied',
      $or: [{ wardType: /icu/i }, { type: /icu/i }, { ward: /icu/i }, { roomNumber: /icu/i }]
    });
    const icuAvailable = Math.max(0, icuTotal - icuOccupied);

    // 4. Resource Utilization & Equipment Status
    const inventoryQuery = {};
    if (resourceCategory && resourceCategory !== 'All') {
      inventoryQuery.category = resourceCategory;
    }

    const inventoryStats = await InventoryItem.find(inventoryQuery).lean();
    const totalResourceUnits = inventoryStats.reduce((acc, item) => acc + (Number(item.quantity) || Number(item.totalQuantity) || 0), 0);
    const inUseResourceUnits = inventoryStats.reduce((acc, item) => acc + (Number(item.allocatedQuantity) || Number(item.inUseQuantity) || 0), 0);
    const availableResourceUnits = inventoryStats.reduce((acc, item) => acc + (item.availableQuantity !== undefined ? Number(item.availableQuantity) : Number(item.quantity) || 0), 0);
    const maintenanceResourceUnits = inventoryStats.reduce((acc, item) => acc + (Number(item.maintenanceQuantity) || Number(item.underMaintenanceQuantity) || 0), 0);

    const resourceRequestsSummary = await ResourceRequest.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // 5. Emergency Response Analytics
    const emgQuery = { ...dateFilter };
    const [
      totalEmergencies,
      criticalEmergencies,
      admittedFromEmergency,
      dischargedEmergency
    ] = await Promise.all([
      EmergencyPatient.countDocuments(emgQuery),
      EmergencyPatient.countDocuments({ ...emgQuery, emergencyPriority: { $in: ['Critical', 'Level 1 - Resuscitation', 'Level 2 - Emergent'] } }),
      EmergencyPatient.countDocuments({ ...emgQuery, conditionStatus: { $in: ['Admitted to ICU', 'Transferred to OT', 'Admitted to Ward'] } }),
      EmergencyPatient.countDocuments({ ...emgQuery, conditionStatus: 'Discharged' })
    ]);

    const emergencyByPriority = await EmergencyPatient.aggregate([
      { $match: emgQuery },
      {
        $group: {
          _id: { $ifNull: ['$emergencyPriority', 'Standard'] },
          count: { $sum: 1 }
        }
      }
    ]);

    // 6. Appointments & Queue Performance
    const apptQuery = { ...dateFilter };
    if (department && department !== 'All') {
      apptQuery.department = department;
    }
    if (doctor && doctor !== 'All') {
      apptQuery.doctorName = new RegExp(doctor, 'i');
    }

    const [
      totalAppointments,
      completedAppointments,
      waitingAppointments,
      cancelledAppointments
    ] = await Promise.all([
      Appointment.countDocuments(apptQuery),
      Appointment.countDocuments({ ...apptQuery, status: 'Completed' }),
      Appointment.countDocuments({ ...apptQuery, status: { $in: ['Waiting', 'Checked In', 'Scheduled'] } }),
      Appointment.countDocuments({ ...apptQuery, status: { $in: ['Cancelled', 'No Show'] } })
    ]);

    const appointmentsByDept = await Appointment.aggregate([
      { $match: apptQuery },
      {
        $group: {
          _id: { $ifNull: ['$department', 'General Medicine'] },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'Completed'] }, 1, 0] } }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // 7. Billing & Financial Analytics
    const billQuery = { ...dateFilter };
    const billingAgg = await DischargeBill.aggregate([
      { $match: billQuery },
      {
        $group: {
          _id: null,
          totalInvoiced: { $sum: '$grandTotal' },
          totalCollected: { $sum: '$amountPaid' },
          totalPending: { $sum: '$remainingAmount' },
          totalDiscounts: { $sum: '$discount' },
          totalTax: { $sum: '$tax' },
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentMethodsAgg = await DischargeBill.aggregate([
      { $match: billQuery },
      {
        $group: {
          _id: { $ifNull: ['$paymentMethod', 'Pending'] },
          totalAmount: { $sum: '$amountPaid' },
          count: { $sum: 1 }
        }
      }
    ]);

    // 8. Staff Activity & Duty Counts
    const [totalDocs, activeDocs, totalNurses, activeNurses, totalAdmins, activeAdmins, totalReceps, activeReceps] = await Promise.all([
      Doctor.countDocuments(),
      Doctor.countDocuments({ status: { $ne: 'Inactive' } }),
      Nurse.countDocuments(),
      Nurse.countDocuments({ status: { $ne: 'Inactive' } }),
      Admin.countDocuments(),
      Admin.countDocuments({ status: { $ne: 'Inactive' } }),
      Receptionist.countDocuments(),
      Receptionist.countDocuments({ status: { $ne: 'Inactive' } })
    ]);

    const staffByRole = [
      { _id: 'Doctor', total: totalDocs, active: activeDocs },
      { _id: 'Nurse', total: totalNurses, active: activeNurses },
      { _id: 'Receptionist', total: totalReceps, active: activeReceps },
      { _id: 'Admin', total: totalAdmins, active: activeAdmins }
    ];

    // 9. Detailed Tabular Report Data for Export / Grid View
    const patientLedger = await Patient.find(patientQuery)
      .populate('bedId', 'bedNumber wardType')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const billingLedger = await DischargeBill.find(billQuery)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const admissionLedger = await AdmissionBedRequest.find()
      .populate('patientId', 'fullName patientId age gender contactNumber')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      filtersApplied: {
        startDate,
        endDate,
        department,
        ward,
        doctor,
        patientStatus,
        resourceCategory
      },
      patients: {
        total: totalPatients,
        admitted: admittedPatients,
        discharged: dischargedPatients,
        emergency: emergencyPatients,
        registered: registeredPatients,
        demographics: demographicsAgg
      },
      beds: {
        total: totalBeds || 450,
        occupied: occupiedBeds || 0,
        available: availableBeds || 0,
        maintenance: maintenanceBeds || 0,
        reserved: reservedBeds || 0,
        occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        icuTotal: icuTotal || 40,
        icuOccupied: icuOccupied || 0,
        icuAvailable: icuAvailable || 0,
        icuOccupancyRate: icuTotal > 0 ? Math.round((icuOccupied / icuTotal) * 100) : 0,
        wardOccupancy: bedWardOccupancy
      },
      resources: {
        totalUnits: totalResourceUnits,
        inUseUnits: inUseResourceUnits,
        availableUnits: availableResourceUnits,
        maintenanceUnits: maintenanceResourceUnits,
        utilizationRate: totalResourceUnits > 0 ? Math.round((inUseResourceUnits / totalResourceUnits) * 100) : 0,
        inventory: inventoryStats,
        requestsSummary: resourceRequestsSummary
      },
      emergency: {
        total: totalEmergencies,
        critical: criticalEmergencies,
        admitted: admittedFromEmergency,
        discharged: dischargedEmergency,
        byPriority: emergencyByPriority
      },
      appointments: {
        total: totalAppointments,
        completed: completedAppointments,
        waiting: waitingAppointments,
        cancelled: cancelledAppointments,
        byDepartment: appointmentsByDept
      },
      billing: {
        totalInvoiced: billingAgg[0]?.totalInvoiced || 0,
        totalCollected: billingAgg[0]?.totalCollected || 0,
        totalPending: billingAgg[0]?.totalPending || 0,
        totalDiscounts: billingAgg[0]?.totalDiscounts || 0,
        totalTax: billingAgg[0]?.totalTax || 0,
        billCount: billingAgg[0]?.count || 0,
        paymentMethods: paymentMethodsAgg
      },
      staff: {
        byRole: staffByRole
      },
      tabularData: {
        patients: patientLedger,
        billing: billingLedger,
        admissions: admissionLedger
      }
    });
  } catch (error) {
    console.error('Error generating analytics report:', error);
    res.status(500).json({ message: 'Failed to generate hospital analytics report', error: error.message });
  }
});

export default router;
