import express from 'express';
import mongoose from 'mongoose';
import MedicationAdministration from '../models/MedicationAdministration.js';
import Prescription from '../models/Prescription.js';
import Patient from '../models/Patient.js';
import Nurse from '../models/Nurse.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to seed initial realistic administration records if empty
const seedInitialAdministrations = async () => {
  const count = await MedicationAdministration.countDocuments();
  if (count === 0) {
    const prescriptions = await Prescription.find().limit(5).lean();
    if (prescriptions.length > 0) {
      const sampleLogs = [];
      prescriptions.forEach((rx, idx) => {
        if (rx.medications && rx.medications.length > 0) {
          const med = rx.medications[0];
          sampleLogs.push({
            prescriptionId: rx._id,
            patientId: rx.patientId,
            patientCustomId: rx.patientCustomId || `P-${rx.patientName.replace(/\s+/g, '').toUpperCase()}`,
            patientName: rx.patientName,
            ward: rx.ward || 'General Ward',
            bedNumber: rx.bedNumber || 'Bed #01',
            medicineName: med.medicineName,
            prescribedDosage: med.dosage,
            prescribedRoute: med.route || 'Oral',
            prescribedFrequency: med.frequency || 'Once daily (OD)',
            prescribedDuration: med.duration || '5 days',
            scheduledTime: '08:00 AM',
            doctorInstructions: med.instructions || med.specialInstructions || 'Take after breakfast with water.',
            prescribedDoctorName: rx.doctorName || 'Dr. Sarah Jenkins',
            nurseName: 'Nurse Clara Vance (RN)',
            status: idx === 3 ? 'Not Administered' : 'Administered',
            administeredDose: med.dosage,
            administeredRoute: med.route || 'Oral',
            administeredDate: new Date().toISOString().split('T')[0],
            administeredTime: '08:15 AM',
            recordedAt: new Date(Date.now() - (idx + 1) * 3600000),
            remarks: idx === 3 ? 'Dose withheld due to scheduled fasting before ultrasound.' : 'Patient swallowed whole tablet with water. No adverse reaction observed.',
            reasonNotAdministered: idx === 3 ? 'Patient NPO for Diagnostic Procedure' : ''
          });
        }
      });
      if (sampleLogs.length > 0) {
        await MedicationAdministration.insertMany(sampleLogs);
      }
    }
  }
};

// @route   GET /api/medication-administrations
// @desc    Get all medication administration records with filtering by patient, ward, date
// @access  Protected (Nurse, Doctor, Admin)
router.get('/', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    await seedInitialAdministrations();
    const { patientId, patientCustomId, ward, search, status, date } = req.query;

    let query = {};

    if (patientId) {
      if (mongoose.Types.ObjectId.isValid(patientId)) {
        query.patientId = patientId;
      } else {
        query.patientCustomId = patientId;
      }
    } else if (patientCustomId) {
      query.patientCustomId = patientCustomId;
    }

    if (ward && ward !== 'All') {
      query.ward = new RegExp(ward.replace(/\s*ward$/i, '').trim(), 'i');
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (date) {
      query.administeredDate = date;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { patientName: regex },
        { patientCustomId: regex },
        { medicineName: regex },
        { prescribedDoctorName: regex },
        { nurseName: regex },
        { remarks: regex }
      ];
    }

    const records = await MedicationAdministration.find(query)
      .populate('patientId', 'fullName patientId ward admissionSetup bedId')
      .populate('nurseId', 'name nurseId assignedWard')
      .sort({ recordedAt: -1, createdAt: -1 });

    res.json(records);
  } catch (error) {
    console.error('Error fetching medication administrations:', error);
    res.status(500).json({ message: 'Server error retrieving medication administration logs: ' + error.message });
  }
});

// @route   GET /api/medication-administrations/patient/:id
// @desc    Get chronological administration history for a specific patient
// @access  Protected
router.get('/patient/:id', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    let query = {
      $or: [
        { patientCustomId: targetId }
      ]
    };

    if (mongoose.Types.ObjectId.isValid(targetId)) {
      query.$or.push({ patientId: targetId });
    }

    const history = await MedicationAdministration.find(query)
      .sort({ recordedAt: -1, createdAt: -1 });

    res.json(history);
  } catch (error) {
    console.error('Error fetching patient medication history:', error);
    res.status(500).json({ message: 'Failed to retrieve patient medication administration history' });
  }
});

// @route   POST /api/medication-administrations
// @desc    Record a medication administration event (Nurse MAR)
// @access  Protected (Nurse, Admin)
// Note: Nurse can only record administration; cannot alter doctor's original prescription.
router.post('/', protect, requireRole(['Nurse', 'Admin']), async (req, res) => {
  try {
    const {
      prescriptionId,
      patientId,
      patientCustomId,
      patientName,
      ward,
      bedNumber,
      medicineName,
      prescribedDosage,
      prescribedRoute,
      prescribedFrequency,
      prescribedDuration,
      scheduledTime,
      doctorInstructions,
      prescribedDoctorName,
      status, // 'Administered', 'Not Administered', 'Refused', 'Held'
      administeredDose,
      administeredRoute,
      administeredDate,
      administeredTime,
      remarks,
      reasonNotAdministered,
      vitalCheckBeforeAdmin
    } = req.body;

    if (!medicineName || (!patientCustomId && !patientId)) {
      return res.status(400).json({ message: 'Medicine name and patient identifier are required.' });
    }

    if (status !== 'Administered' && !reasonNotAdministered?.trim() && !remarks?.trim()) {
      return res.status(400).json({ message: 'Please provide a reason or remarks for not administering this dose.' });
    }

    // Resolve patient details
    let patient = null;
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await Patient.findById(patientId);
    }
    if (!patient && patientCustomId) {
      patient = await Patient.findOne({ patientId: patientCustomId });
    }

    const finalPatientName = patient?.fullName || patient?.name || patientName || 'Assigned Inpatient';
    const finalPatientCustomId = patient?.patientId || patientCustomId || (patient ? `P-${patient._id.toString().slice(-5).toUpperCase()}` : 'PM-00001');
    const finalWard = ward || patient?.admissionSetup?.wardType || patient?.ward || 'General Ward';
    const finalBed = bedNumber || patient?.bedId?.bedNumber || patient?.bedNumber || 'Assigned Bed';

    const log = new MedicationAdministration({
      prescriptionId: prescriptionId || null,
      patientId: patient ? patient._id : (patientId || null),
      patientCustomId: finalPatientCustomId,
      patientName: finalPatientName,
      ward: finalWard,
      bedNumber: finalBed,
      medicineName: medicineName.trim(),
      prescribedDosage: prescribedDosage || 'As directed',
      prescribedRoute: prescribedRoute || 'Oral',
      prescribedFrequency: prescribedFrequency || 'Once daily (OD)',
      prescribedDuration: prescribedDuration || '5 days',
      scheduledTime: scheduledTime || '08:00 AM',
      doctorInstructions: doctorInstructions || 'Take as prescribed by doctor',
      prescribedDoctorName: prescribedDoctorName || 'Attending Physician',
      nurseId: req.user._id,
      nurseName: req.user.name || 'Staff Nurse',
      status: status || 'Administered',
      administeredDose: status === 'Administered' ? (administeredDose || prescribedDosage) : 'None (Withheld)',
      administeredRoute: administeredRoute || prescribedRoute || 'Oral',
      administeredDate: administeredDate || new Date().toISOString().split('T')[0],
      administeredTime: administeredTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recordedAt: new Date(),
      remarks: remarks?.trim() || '',
      reasonNotAdministered: reasonNotAdministered?.trim() || '',
      vitalCheckBeforeAdmin: vitalCheckBeforeAdmin || {}
    });

    const saved = await log.save();

    // If medication was refused or held with high concern, alert attending doctor
    if (status === 'Refused' || status === 'Held' || status === 'Not Administered') {
      await Notification.create({
        title: `⚠️ MEDICATION ALERT: ${saved.medicineName} Withheld for ${saved.patientName}`,
        message: `Medication dose (${saved.medicineName}, ${saved.prescribedDosage}) was ${status.toLowerCase()} by ${saved.nurseName} in ${saved.ward} (${saved.bedNumber}). Reason: ${saved.reasonNotAdministered || saved.remarks || 'Clinical precaution'}.`,
        category: 'Medication Alert',
        priority: 'High',
        recipientRole: 'Doctor',
        senderName: saved.nurseName,
        link: '/prescriptions'
      });
    }

    res.status(201).json(saved);
  } catch (error) {
    console.error('Error logging medication administration:', error);
    res.status(500).json({ message: 'Server error saving medication administration: ' + error.message });
  }
});

export default router;
