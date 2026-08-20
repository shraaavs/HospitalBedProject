import express from 'express';
import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';
import NursingTask from '../models/NursingTask.js';
import ResourceRequest from '../models/ResourceRequest.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/dashboard/nurse
router.get('/nurse', protect, requireRole(['Nurse', 'Admin']), async (req, res) => {
  try {
    // Assigned Patients: Count patients where status is Admitted
    // (If the hospital is large, we might want to filter by the nurse's specific ward, but for MVP we use total admitted)
    const assignedPatientsCount = await Patient.countDocuments({ status: 'Admitted' });

    // Critical Patients: Count beds that are ICU and Occupied
    const criticalPatientsCount = await Bed.countDocuments({ wardType: 'ICU', status: 'Occupied' });

    // Patients Requiring Vitals
    const vitalsPendingCount = await NursingTask.countDocuments({ taskType: 'Vitals', status: 'Pending' });

    // Pending Nursing Tasks (total)
    const pendingTasksCount = await NursingTask.countDocuments({ status: 'Pending' });

    // Available Beds
    const availableBedsCount = await Bed.countDocuments({ status: 'Available' });

    // Medicine Requests
    const medicineRequestsCount = await ResourceRequest.aggregate([
      {
        $lookup: {
          from: 'inventoryitems', // Assumes collection is 'inventoryitems'
          localField: 'itemRequested',
          foreignField: '_id',
          as: 'itemData'
        }
      },
      { $unwind: '$itemData' },
      { $match: { 'itemData.category': 'Medicine', status: 'Pending' } }
    ]);
    
    // Equipment Requests
    const equipmentRequestsCount = await ResourceRequest.aggregate([
      {
        $lookup: {
          from: 'inventoryitems',
          localField: 'itemRequested',
          foreignField: '_id',
          as: 'itemData'
        }
      },
      { $unwind: '$itemData' },
      { $match: { 'itemData.category': 'Equipment', status: 'Pending' } }
    ]);

    // Emergency Alerts (Mocked for now since there is no Alert model)
    const emergencyAlertsCount = 2; // Fixed number for MVP UI demonstration

    res.json({
      assignedPatients: assignedPatientsCount,
      criticalPatients: criticalPatientsCount,
      vitalsPending: vitalsPendingCount,
      pendingTasks: pendingTasksCount,
      availableBeds: availableBedsCount,
      medicineRequests: medicineRequestsCount.length,
      equipmentRequests: equipmentRequestsCount.length,
      emergencyAlerts: emergencyAlertsCount
    });

  } catch (error) {
    console.error('Error fetching nurse dashboard data:', error);
    res.status(500).json({ message: 'Error fetching dashboard data', error: error.message });
  }
});

export default router;
