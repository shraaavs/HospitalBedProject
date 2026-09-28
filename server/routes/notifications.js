import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';
import Patient from '../models/Patient.js';

const router = express.Router();

// Auto-seed comprehensive notification events across all categories if empty
const seedNotifications = async () => {
  try {
    const count = await Notification.countDocuments();
    if (count === 0) {
      const patients = await Patient.find().limit(5);
      const initial = [
        {
          title: '🚨 Critical Vital Alert: SpO₂ Hypoxia Detected',
          message: `Nurse Clara Vance recorded critical oxygen saturation 88% and elevated pulse 112 bpm for ${patients[0]?.fullName || 'Henry Green'} in ICU (Bed ICU-01). Immediate clinical review requested.`,
          category: 'Critical Vitals',
          priority: 'Critical',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientId: patients[0]?._id,
          patientName: patients[0]?.fullName || 'Henry Green',
          patientCustomId: patients[0]?.patientId || 'PM-445901',
          targetLink: '/vitals',
          isRead: false
        },
        {
          title: '🚑 Emergency Patient Assigned: Red Triage (STEMI)',
          message: 'Ambulance triage dispatched Karan Malhotra (52y, Male) with Acute Anterolateral STEMI to your emergency trauma care in Trauma Bay 01.',
          category: 'Emergency Patient',
          priority: 'Critical',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientName: 'Karan Malhotra',
          patientCustomId: 'EMG-9021',
          emergencyId: 'EMG-9021',
          targetLink: '/emergency',
          isRead: false
        },
        {
          title: '📅 New Consultation Appointment Scheduled',
          message: 'Front Desk registered an outpatient consultation with Sarah Mitchell for Cardiology evaluation today at 14:30.',
          category: 'New Appointment',
          priority: 'Normal',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientId: patients[1]?._id,
          patientName: patients[1]?.fullName || 'Sarah Mitchell',
          patientCustomId: patients[1]?.patientId || 'PM-445912',
          appointmentId: 'APT-10025',
          targetLink: '/appointments',
          isRead: false
        },
        {
          title: '✅ Patient Checked In at Reception Desk',
          message: 'Patient Robert King (PM-445945) has checked in at the hospital reception and is waiting in the Cardiology OPD lobby.',
          category: 'Patient Check-In',
          priority: 'Normal',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientId: patients[2]?._id,
          patientName: patients[2]?.fullName || 'Robert King',
          patientCustomId: patients[2]?.patientId || 'PM-445945',
          targetLink: '/appointments',
          isRead: false
        },
        {
          title: '🏥 Admission Request Verified & Forwarded',
          message: `Inpatient admission request ADM10025 for ${patients[1]?.fullName || 'Sarah Mitchell'} verified by Receptionist and forwarded to Bed Management for bed assignment.`,
          category: 'Admission Request Status',
          priority: 'Normal',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientId: patients[1]?._id,
          patientName: patients[1]?.fullName || 'Sarah Mitchell',
          patientCustomId: patients[1]?.patientId || 'PM-445912',
          requestId: 'ADM10025',
          targetLink: '/bed-requests',
          isRead: false
        },
        {
          title: '🛏️ Bed Request Approved & Allocated: ICU Bed #04',
          message: `Bed allocation approved: Patient ${patients[0]?.fullName || 'Henry Green'} allocated to ICU Bed #04 by Bed Management Administration.`,
          category: 'Bed Request Approval',
          priority: 'High',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientId: patients[0]?._id,
          patientName: patients[0]?.fullName || 'Henry Green',
          patientCustomId: patients[0]?.patientId || 'PM-445901',
          targetLink: '/bed-requests',
          isRead: false
        },
        {
          title: '🧰 Resource Request Approved: BioMed Calibration Complete',
          message: 'Requisition RR-1002 for Mechanical Ventilator approved by BioMed Administration. Delivery in transit to ICU Bed 01.',
          category: 'Resource Request Approval',
          priority: 'High',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientName: 'Henry Green',
          patientCustomId: 'PM-445901',
          requestId: 'RR-1002',
          targetLink: '/resource-requests',
          isRead: false
        },
        {
          title: '📦 Medical Equipment Allocated & Bedside Active',
          message: 'Bedside Cardiac Monitor (TAG-CM-8821) allocated and active at ICU Bed 01 for continuous 5-lead ECG monitoring.',
          category: 'Resource Allocation',
          priority: 'Normal',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientName: 'Henry Green',
          patientCustomId: 'PM-445901',
          requestId: 'RR-1001',
          targetLink: '/resource-requests',
          isRead: true
        },
        {
          title: '👩‍⚕️ Critical Nursing Observation Logged',
          message: 'Staff Nurse Elena Woods recorded: Patient reports sudden spike in sternal pain (Pain Score 8/10). Cold clammy extremities noted.',
          category: 'Critical Nursing Observation',
          priority: 'Critical',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientId: patients[0]?._id,
          patientName: patients[0]?.fullName || 'Henry Green',
          patientCustomId: patients[0]?.patientId || 'PM-445901',
          targetLink: '/vitals',
          isRead: false
        },
        {
          title: '🔄 Inpatient Bed Transfer Approved: Step-Down Unit',
          message: 'Transfer recommendation for Robert King approved by Bed Management. SDU-04 allocated; prepare patient for transit.',
          category: 'Transfer Status Change',
          priority: 'High',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientId: patients[2]?._id,
          patientName: patients[2]?.fullName || 'Robert King',
          patientCustomId: patients[2]?.patientId || 'PM-445945',
          targetLink: '/transfer-discharge',
          isRead: true
        },
        {
          title: '📋 Discharge Processing Update: Bill Settled & Bed Released',
          message: 'Receptionist finalized billing settlement for Priya Patel. Final discharge clearance confirmed and bed released.',
          category: 'Discharge Processing Update',
          priority: 'Normal',
          recipientRole: 'Doctor',
          doctorName: 'Dr. Priya Sharma',
          patientName: 'Priya Patel',
          patientCustomId: 'PM-445912',
          targetLink: '/transfer-discharge',
          isRead: true
        }
      ];

      await Notification.insertMany(initial);
      console.log('✅ Seeded real system Notification events');
    }
  } catch (err) {
    console.error('Error seeding notifications:', err.message);
  }
};

seedNotifications();

// GET all notifications for doctor/user with dynamic filtering
router.get('/', protect, async (req, res) => {
  try {
    const { category, priority, unreadOnly, search } = req.query;
    const filter = {};

    // Filter to Role relevant notifications
    if (req.user.role === 'Doctor') {
      const docName = (req.user.name || '').replace(/^Dr\.\s*/i, '').trim();
      filter.$and = [
        {
          $or: [
            { recipientRole: { $in: ['Doctor', 'All'] } },
            { doctorId: req.user._id },
            { doctorName: req.user.name },
            { doctorName: `Dr. ${docName}` },
            { doctorName: { $regex: docName, $options: 'i' } }
          ]
        }
      ];
    } else if (req.user.role === 'Nurse') {
      const nurseName = (req.user.name || '').trim();
      filter.$and = [
        {
          $or: [
            { recipientRole: { $in: ['Nurse', 'All'] } },
            { recipientNurseId: req.user._id },
            { nurseId: req.user._id },
            { recipientId: req.user._id },
            { nurseName: req.user.name },
            { nurseName: { $regex: nurseName, $options: 'i' } }
          ]
        }
      ];
    } else if (req.user.role) {
      filter.recipientRole = { $in: [req.user.role, 'All'] };
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    if (priority && priority !== 'All') {
      filter.priority = priority;
    }

    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.isRead = false;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchOr = [
        { title: searchRegex },
        { message: searchRegex },
        { patientName: searchRegex },
        { patientCustomId: searchRegex },
        { category: searchRegex },
        { notificationType: searchRegex },
        { relatedModule: searchRegex },
        { requestId: searchRegex },
        { emergencyId: searchRegex }
      ];

      if (filter.$and) {
        filter.$and.push({ $or: searchOr });
      } else {
        filter.$or = searchOr;
      }
    }

    const notifications = await Notification.find(filter)
      .populate('patientId', 'fullName patientId ward bedNumber age gender')
      .sort({ createdAt: -1 });

    // Dynamic unread count calculation from MongoDB
    let unreadQuery = { isRead: false };
    if (req.user.role === 'Doctor') {
      unreadQuery.$or = [
        { recipientRole: { $in: ['Doctor', 'All'] } },
        { doctorId: req.user._id },
        { doctorName: req.user.name },
        { doctorName: { $regex: (req.user.name || '').replace(/^Dr\.\s*/i, '').trim(), $options: 'i' } }
      ];
    } else if (req.user.role === 'Nurse') {
      unreadQuery.$or = [
        { recipientRole: { $in: ['Nurse', 'All'] } },
        { recipientNurseId: req.user._id },
        { nurseId: req.user._id },
        { recipientId: req.user._id },
        { nurseName: req.user.name }
      ];
    } else {
      unreadQuery.recipientRole = { $in: [req.user.role || 'Admin', 'All'] };
    }

    const unreadCount = await Notification.countDocuments(unreadQuery);

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET unread count
router.get('/unread-count', protect, async (req, res) => {
  try {
    let unreadQuery = { isRead: false };
    if (req.user.role === 'Doctor') {
      unreadQuery.$or = [
        { recipientRole: { $in: ['Doctor', 'All'] } },
        { doctorId: req.user._id },
        { doctorName: req.user.name },
        { doctorName: { $regex: (req.user.name || '').replace(/^Dr\.\s*/i, '').trim(), $options: 'i' } }
      ];
    } else if (req.user.role === 'Nurse') {
      unreadQuery.$or = [
        { recipientRole: { $in: ['Nurse', 'All'] } },
        { recipientNurseId: req.user._id },
        { nurseId: req.user._id },
        { recipientId: req.user._id },
        { nurseName: req.user.name }
      ];
    } else {
      unreadQuery.recipientRole = { $in: [req.user.role || 'Admin', 'All'] };
    }

    const unreadCount = await Notification.countDocuments(unreadQuery);
    res.json({ unreadCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT mark single notification as read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json(notification);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT mark all user notifications as read
router.put('/mark-all-read', protect, async (req, res) => {
  try {
    let unreadQuery = { isRead: false };
    if (req.user.role === 'Doctor') {
      unreadQuery.$or = [
        { recipientRole: { $in: ['Doctor', 'All'] } },
        { doctorId: req.user._id },
        { doctorName: req.user.name },
        { doctorName: { $regex: (req.user.name || '').replace(/^Dr\.\s*/i, '').trim(), $options: 'i' } }
      ];
    } else if (req.user.role === 'Nurse') {
      unreadQuery.$or = [
        { recipientRole: { $in: ['Nurse', 'All'] } },
        { recipientNurseId: req.user._id },
        { nurseId: req.user._id },
        { recipientId: req.user._id },
        { nurseName: req.user.name }
      ];
    } else {
      unreadQuery.recipientRole = { $in: [req.user.role || 'Admin', 'All'] };
    }

    await Notification.updateMany(unreadQuery, { isRead: true, readAt: new Date() });
    res.json({ message: 'All notifications marked as read in MongoDB' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create notification (from system events or admin announcements)
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      message,
      category,
      priority,
      recipientRole,
      patientId,
      patientName,
      patientCustomId,
      appointmentId,
      emergencyId,
      requestId,
      targetLink,
      notificationType,
      relatedModule
    } = req.body;

    const assignedRole = recipientRole || (req.user.role === 'Admin' ? 'All' : (req.user.role || 'Doctor'));

    const newNotification = new Notification({
      title,
      message,
      category: category || 'General',
      priority: priority || 'Normal',
      recipientRole: assignedRole,
      notificationType: notificationType || 'Announcement',
      relatedModule: relatedModule || 'Notifications',
      doctorId: req.user.role === 'Doctor' ? req.user._id : undefined,
      doctorName: req.user.role === 'Doctor' ? (req.user.name || 'Doctor') : undefined,
      patientId: patientId || undefined,
      patientName,
      patientCustomId,
      appointmentId,
      emergencyId,
      requestId,
      targetLink: targetLink || (assignedRole === 'Doctor' ? '/my-patients' : (assignedRole === 'Nurse' ? '/nurse/dashboard' : (assignedRole === 'Receptionist' ? '/receptionist/dashboard' : '/notifications'))),
      isRead: false
    });

    const saved = await newNotification.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE single notification
router.delete('/:id', protect, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification removed' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
