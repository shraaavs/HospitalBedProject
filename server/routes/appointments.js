import express from 'express';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Seed sample appointments if collection is empty
const seedSampleAppointments = async (doctorName) => {
  const count = await Appointment.countDocuments();
  if (count === 0) {
    const today = formatDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    const cleanDoctor = doctorName || 'Dr. Priya Sharma';

    const initial = [
      {
        patientName: 'Henry Green',
        patientCustomId: 'PM-445901',
        doctorName: cleanDoctor,
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '09:30 AM',
        type: 'Consultation',
        reason: 'Chest tightness and shortness of breath upon exertion',
        priority: 'Urgent',
        status: 'Waiting',
        checkInTime: new Date()
      },
      {
        patientName: 'Sarah Mitchell',
        patientCustomId: 'PM-445912',
        doctorName: cleanDoctor,
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '10:45 AM',
        type: 'Follow-up',
        reason: 'Hypertension review and ECG assessment',
        priority: 'Routine',
        status: 'Checked In',
        checkInTime: new Date()
      },
      {
        patientName: 'Robert King',
        patientCustomId: 'PM-445945',
        doctorName: cleanDoctor,
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '01:15 PM',
        type: 'Routine Checkup',
        reason: 'Post-stent 3-month evaluation',
        priority: 'Intermediate',
        status: 'Scheduled'
      },
      {
        patientName: 'Amanda Lee',
        patientCustomId: 'PM-445988',
        doctorName: cleanDoctor,
        department: 'Cardiology',
        appointmentDate: today,
        appointmentTime: '03:00 PM',
        type: 'Consultation',
        reason: 'Palpitations and irregular heart rhythm',
        priority: 'Intermediate',
        status: 'Scheduled'
      },
      {
        patientName: 'James Holt',
        patientCustomId: 'PM-446002',
        doctorName: cleanDoctor,
        department: 'Cardiology',
        appointmentDate: tomorrowStr,
        appointmentTime: '11:00 AM',
        type: 'Follow-up',
        reason: 'Lipid profile review',
        priority: 'Routine',
        status: 'Scheduled'
      },
      {
        patientName: 'Elena Davies',
        patientCustomId: 'PM-445890',
        doctorName: cleanDoctor,
        department: 'Cardiology',
        appointmentDate: yesterdayStr,
        appointmentTime: '04:30 PM',
        type: 'Consultation',
        reason: 'Cardiac wellness clearance',
        priority: 'Routine',
        status: 'Completed',
        consultationNotes: {
          diagnosis: 'Essential Hypertension - Controlled',
          treatment: 'Continue Amlodipine 5mg OD',
          notes: 'BP normal at 118/76. Return in 3 months.'
        }
      }
    ];

    await Appointment.insertMany(initial);
  }
};

// @route   GET /api/appointments
// @route   GET /api/appointments
// @desc    Get all appointments (supports filtering by doctor, date, status)
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { doctor, date, status, department, view } = req.query;

    let query = {};

    // If logged in user is a Doctor, match their name or department
    if (req.user.role === 'Doctor') {
      const docName = (req.user.name || '').replace(/^Dr\.\s*/i, '').trim();
      const docDept = req.user.department || '';

      const docOrConditions = [
        { doctorName: req.user.name },
        { doctorName: `Dr. ${docName}` },
        { doctorName: { $regex: docName, $options: 'i' } }
      ];

      // Check if this doctor already has directly assigned appointments
      const directCount = await Appointment.countDocuments({ $or: docOrConditions });

      if (directCount > 0) {
        query.$or = docOrConditions;
      } else if (docDept) {
        // Fallback: If no direct appointment has been assigned specifically to this doctor yet, show departmental consultation queue
        query.department = { $regex: docDept, $options: 'i' };
      }
    } else if (doctor && doctor !== 'All') {
      query.doctorName = { $regex: doctor, $options: 'i' };
    }

    if (department && department !== 'All') {
      query.department = { $regex: department, $options: 'i' };
    }

    if (date) {
      query.appointmentDate = date;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    let appointments = await Appointment.find(query)
      .populate('patientId')
      .sort({ appointmentDate: 1, appointmentTime: 1 })
      .lean();

    // If query returned 0 and it's a doctor with no specific department matches, return hospital appointments so they can triage
    if (appointments.length === 0 && req.user.role === 'Doctor') {
      appointments = await Appointment.find({})
        .populate('patientId')
        .sort({ appointmentDate: 1, appointmentTime: 1 })
        .limit(25)
        .lean();
    }

    // Look up previous visit history for each patient
    const patientIds = appointments.map(a => a.patientCustomId || a.patientId?._id).filter(Boolean);
    const completedPast = await Appointment.find({
      $or: [
        { patientCustomId: { $in: patientIds } }
      ],
      status: 'Completed'
    }).sort({ appointmentDate: -1, appointmentTime: -1 }).lean();

    const results = appointments.map(app => {
      const past = completedPast.find(p => 
        String(p._id) !== String(app._id) && 
        p.patientCustomId === app.patientCustomId &&
        (p.appointmentDate < app.appointmentDate || (p.appointmentDate === app.appointmentDate && p.appointmentTime < app.appointmentTime))
      );
      return {
        ...app,
        previousVisit: past ? `${past.appointmentDate} (${past.type || 'Consultation'})` : 'First Visit'
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Server error while fetching appointments' });
  }
});

// @route   POST /api/appointments
// @desc    Create / Book a new appointment with doctor availability checking
// @access  Protected
router.post('/', protect, async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientCustomId,
      doctorName,
      department,
      appointmentDate,
      appointmentTime,
      type,
      reason,
      priority
    } = req.body;

    if (!patientName || !appointmentDate || !appointmentTime) {
      return res.status(400).json({ message: 'Patient name, date, and time slot are required.' });
    }

    const assignedDoctor = doctorName || req.user.name || 'Dr. Priya Sharma';
    const cleanDoc = assignedDoctor.replace(/^Dr\.\s*/i, '').trim();

    // 1. Check Doctor Master Availability Record (if Doctor model has On Leave / Off Duty)
    const Doctor = (await import('../models/Doctor.js')).default;
    const doctorRecord = await Doctor.findOne({
      $or: [
        { name: assignedDoctor },
        { name: `Dr. ${cleanDoc}` },
        { name: { $regex: cleanDoc, $options: 'i' } }
      ]
    });

    if (doctorRecord && doctorRecord.availability) {
      if (doctorRecord.availability.status === 'On Leave' || doctorRecord.availability.status === 'Off Duty') {
        return res.status(400).json({
          message: `${assignedDoctor} is currently ${doctorRecord.availability.status} and cannot accept appointments.`
        });
      }

      // Check day of week
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const appointmentDay = dayNames[new Date(appointmentDate).getDay()];
      if (doctorRecord.availability.days?.length > 0 && !doctorRecord.availability.days.includes(appointmentDay)) {
        return res.status(400).json({
          message: `${assignedDoctor} is not available on ${appointmentDay}s. Available days: ${doctorRecord.availability.days.join(', ')}`
        });
      }
    }

    // 2. Check for time slot clash on the same doctor and date
    const slotConflict = await Appointment.findOne({
      doctorName: { $regex: cleanDoc, $options: 'i' },
      appointmentDate,
      appointmentTime,
      status: { $nin: ['Cancelled', 'Completed'] }
    });

    if (slotConflict) {
      return res.status(409).json({
        message: `${assignedDoctor} already has an appointment booked at ${appointmentTime} on ${appointmentDate}. Please choose another time slot.`
      });
    }

    // Normalize appointment type to prevent enum validation failure
    const validTypes = ['Consultation', 'Follow-up', 'Routine Checkup', 'Emergency', 'Post-Op Check'];
    let normalizedType = 'Consultation';
    if (type && validTypes.includes(type)) {
      normalizedType = type;
    } else if (type && typeof type === 'string') {
      if (type.toLowerCase().includes('follow')) normalizedType = 'Follow-up';
      else if (type.toLowerCase().includes('checkup') || type.toLowerCase().includes('routine')) normalizedType = 'Routine Checkup';
      else if (type.toLowerCase().includes('emergency')) normalizedType = 'Emergency';
      else if (type.toLowerCase().includes('post-op')) normalizedType = 'Post-Op Check';
      else normalizedType = 'Consultation';
    }

    // Normalize priority
    const validPriorities = ['Routine', 'Intermediate', 'Urgent', 'High'];
    let normalizedPriority = 'Routine';
    if (priority && validPriorities.includes(priority)) {
      normalizedPriority = priority;
    } else if (priority && typeof priority === 'string' && priority.toLowerCase().includes('urgent')) {
      normalizedPriority = 'Urgent';
    }

    const newAppointment = new Appointment({
      patientId: patientId || null,
      patientName,
      patientCustomId: patientCustomId || `PM-${Math.floor(100000 + Math.random() * 900000)}`,
      doctorName: assignedDoctor,
      department: department || doctorRecord?.department || 'Cardiology',
      appointmentDate,
      appointmentTime,
      type: normalizedType,
      reason: reason || 'Clinical Consultation',
      priority: normalizedPriority,
      status: 'Scheduled'
    });

    const saved = await newAppointment.save();
    res.status(201).json({
      message: 'Appointment booked successfully and stored in MongoDB.',
      appointment: saved
    });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ message: 'Server error while creating appointment: ' + error.message });
  }
});

// @route   PUT /api/appointments/:id/reschedule
// @desc    Reschedule appointment date, time, and doctor with conflict verification
// @access  Protected
router.put('/:id/reschedule', protect, async (req, res) => {
  try {
    const { appointmentDate, appointmentTime, doctorName, reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Doctor isolation guard: If Doctor, must only modify their own appointments
    if (req.user.role === 'Doctor') {
      const loggedInClean = req.user.name.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      const appDocClean = (appointment.doctorName || '').replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      if (loggedInClean !== appDocClean) {
        return res.status(403).json({ message: 'Unauthorized: You can only reschedule your own assigned appointments.' });
      }
    }

    const targetDoc = doctorName || appointment.doctorName;
    const cleanDoc = targetDoc.replace(/^Dr\.\s*/i, '').trim();

    // Check slot clash for new timing
    const slotConflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorName: { $regex: cleanDoc, $options: 'i' },
      appointmentDate: appointmentDate || appointment.appointmentDate,
      appointmentTime: appointmentTime || appointment.appointmentTime,
      status: { $nin: ['Cancelled', 'Completed'] }
    });

    if (slotConflict) {
      return res.status(409).json({
        message: `Conflict: ${targetDoc} already has an appointment at ${appointmentTime || appointment.appointmentTime} on ${appointmentDate || appointment.appointmentDate}.`
      });
    }

    if (appointmentDate) appointment.appointmentDate = appointmentDate;
    if (appointmentTime) appointment.appointmentTime = appointmentTime;
    if (doctorName) appointment.doctorName = doctorName;
    if (reason) appointment.reason = reason;
    appointment.status = 'Scheduled'; // Reset status to Scheduled upon rescheduling

    const updated = await appointment.save();
    res.json({ message: 'Appointment rescheduled successfully.', appointment: updated });
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ message: 'Server error rescheduling appointment' });
  }
});

// @route   PUT /api/appointments/:id/cancel
// @desc    Cancel an appointment
// @access  Protected
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Doctor isolation guard
    if (req.user.role === 'Doctor') {
      const loggedInClean = req.user.name.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      const appDocClean = (appointment.doctorName || '').replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      if (loggedInClean !== appDocClean) {
        return res.status(403).json({ message: 'Unauthorized: You can only cancel your own assigned appointments.' });
      }
    }

    appointment.status = 'Cancelled';
    if (cancelReason) appointment.reason = `${appointment.reason} [Cancelled: ${cancelReason}]`;

    const updated = await appointment.save();
    res.json({ message: 'Appointment cancelled successfully.', appointment: updated });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ message: 'Server error cancelling appointment' });
  }
});

// @route   GET /api/appointments/queue/consultation-queue
// @desc    Get live consultation queue for today (grouped and sorted by queue position and check-in time)
// @access  Protected
router.get('/queue/consultation-queue', protect, async (req, res) => {
  try {
    const today = formatDate(new Date());
    const { doctorName } = req.query;
    
    let query = {
      appointmentDate: today,
      status: { $in: ['Checked In', 'Waiting', 'Called', 'In Consultation', 'Completed', 'No Show', 'Cancelled', 'Scheduled'] }
    };

    if (doctorName && doctorName !== 'All') {
      const cleanDoc = doctorName.replace(/^Dr\.\s*/i, '').trim();
      query.doctorName = { $regex: cleanDoc, $options: 'i' };
    } else if (req.user.role === 'Doctor') {
      const cleanDoc = req.user.name.replace(/^Dr\.\s*/i, '').trim();
      query.doctorName = { $regex: cleanDoc, $options: 'i' };
    }

    const appointments = await Appointment.find(query)
      .populate('patientId')
      .populate('doctorId')
      .sort({ checkInTime: 1, createdAt: 1 })
      .lean();

    // Fetch Doctor availability statuses
    const Doctor = (await import('../models/Doctor.js')).default;
    const doctors = await Doctor.find({ status: 'Active' }).select('name department availability doctorId').lean();
    
    const docMap = {};
    doctors.forEach(d => {
      const clean = d.name.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      docMap[clean] = d.availability?.status || 'Available';
      docMap[d.name.toLowerCase()] = d.availability?.status || 'Available';
    });

    let queuePositionCounter = 1;
    const enrichedQueue = appointments.map(app => {
      const cleanDocName = (app.doctorName || '').replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      const currentDocAvailability = docMap[cleanDocName] || 'Available';
      
      let qPos = null;
      if (app.status === 'Checked In' || app.status === 'Waiting' || app.status === 'Called') {
        qPos = queuePositionCounter++;
      }

      return {
        ...app,
        queuePosition: qPos,
        doctorAvailability: currentDocAvailability
      };
    });

    res.json(enrichedQueue);
  } catch (error) {
    console.error('Error fetching consultation queue:', error);
    res.status(500).json({ message: 'Server error fetching consultation queue' });
  }
});

// @route   POST /api/appointments/:id/check-in
// @desc    Receptionist checks in patient for consultation -> status becomes Checked In, queueStatus = Waiting
// @access  Protected (Receptionist, Admin)
router.post('/:id/check-in', protect, requireRole(['Receptionist', 'Admin']), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.status === 'Cancelled') {
      return res.status(400).json({ message: 'Cannot check-in a cancelled appointment.' });
    }

    if (appointment.status === 'Completed') {
      return res.status(400).json({ message: 'Appointment is already completed.' });
    }

    appointment.status = 'Checked In';
    appointment.queueStatus = 'Waiting';
    appointment.checkInTime = new Date();

    const updated = await appointment.save();

    // Queue entry management
    const Queue = (await import('../models/Queue.js')).default;
    const existingQueue = await Queue.findOne({ appointmentId: appointment._id });
    
    const queueCount = await Queue.countDocuments({
      status: { $in: ['Waiting', 'Called'] },
      doctorName: { $regex: (appointment.doctorName || '').replace(/^Dr\.\s*/i, '').trim(), $options: 'i' }
    });

    if (!existingQueue) {
      await Queue.create({
        patientId: appointment.patientId || null,
        appointmentId: appointment._id,
        doctorId: appointment.doctorId || null,
        doctorName: appointment.doctorName,
        patientName: appointment.patientName,
        patientCustomId: appointment.patientCustomId || '',
        appointmentTime: appointment.appointmentTime,
        queuePosition: queueCount + 1,
        status: 'Waiting',
        checkedInAt: appointment.checkInTime
      });
    } else {
      existingQueue.status = 'Waiting';
      existingQueue.checkedInAt = appointment.checkInTime;
      await existingQueue.save();
    }

    // Real-time Events
    const { emitQueueEvent } = await import('../socket.js');
    const payload = {
      appointmentId: appointment._id,
      patientName: appointment.patientName,
      patientCustomId: appointment.patientCustomId || 'PM-NEW',
      doctorName: appointment.doctorName,
      appointmentTime: appointment.appointmentTime,
      department: appointment.department,
      checkInTime: appointment.checkInTime,
      status: 'Checked In',
      queueStatus: 'Waiting'
    };

    emitQueueEvent('PATIENT_CHECKED_IN', payload);
    emitQueueEvent('PATIENT_WAITING', payload);

    // Create Doctor in-app notification
    const Notification = (await import('../models/Notification.js')).default;
    try {
      await Notification.create({
        title: `👤 Patient Ready: ${appointment.patientName}`,
        message: `${appointment.patientName} (${appointment.patientCustomId || 'ID: Pending'}) checked in at reception for ${appointment.appointmentTime} consultation.`,
        category: 'Patient Check-In',
        priority: 'Normal',
        recipientRole: 'Doctor',
        doctorName: appointment.doctorName,
        patientName: appointment.patientName,
        patientCustomId: appointment.patientCustomId || '',
        targetLink: '/appointments',
        isRead: false
      });
    } catch (notifErr) {
      console.error('Failed to create check-in notification:', notifErr.message);
    }

    res.json({ message: 'Patient checked in successfully', appointment: updated });
  } catch (error) {
    console.error('Error in patient check-in:', error);
    res.status(500).json({ message: 'Server error during check-in: ' + error.message });
  }
});

// @route   POST /api/appointments/:id/send-patient
// @desc    Receptionist sends checked-in waiting patient to the Available doctor -> status becomes In Consultation
// @access  Protected (Receptionist, Admin)
router.post('/:id/send-patient', protect, requireRole(['Receptionist', 'Admin']), async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Rule 2 & 3: Must be Checked In / Waiting before being sent
    if (!['Checked In', 'Waiting', 'Called'].includes(appointment.status)) {
      return res.status(400).json({
        message: `Patient cannot be sent. Current appointment status is "${appointment.status}". Patient must be Checked In first.`
      });
    }

    const cleanDoc = (appointment.doctorName || '').replace(/^Dr\.\s*/i, '').trim();
    const Doctor = (await import('../models/Doctor.js')).default;
    const doctorRecord = await Doctor.findOne({
      $or: [
        { name: appointment.doctorName },
        { name: `Dr. ${cleanDoc}` },
        { name: { $regex: cleanDoc, $options: 'i' } }
      ]
    });

    // Rule 4 & 5: Doctor must be explicitly Available
    if (!doctorRecord || (doctorRecord.availability && doctorRecord.availability.status !== 'Available')) {
      const currentStatus = doctorRecord?.availability?.status || 'Unavailable';
      return res.status(400).json({
        message: `Cannot send patient. ${appointment.doctorName} is currently "${currentStatus}". Doctor must confirm "Available" before sending patients.`
      });
    }

    // Rule 6: Only one patient can be In Consultation at a time for this doctor
    const activeConsultation = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctorName: { $regex: cleanDoc, $options: 'i' },
      appointmentDate: appointment.appointmentDate,
      status: 'In Consultation'
    });

    if (activeConsultation) {
      return res.status(409).json({
        message: `Cannot send patient. ${appointment.doctorName} is currently in consultation with ${activeConsultation.patientName}.`
      });
    }

    // Atomic update
    appointment.status = 'In Consultation';
    appointment.queueStatus = 'In Consultation';
    appointment.startTime = new Date();
    appointment.consultationStartedAt = new Date();
    await appointment.save();

    // Update Doctor status in MongoDB to 'In Consultation'
    if (!doctorRecord.availability) doctorRecord.availability = {};
    doctorRecord.availability.status = 'In Consultation';
    await doctorRecord.save();

    // Update Queue record
    const Queue = (await import('../models/Queue.js')).default;
    await Queue.findOneAndUpdate(
      { appointmentId: appointment._id },
      {
        status: 'In Consultation',
        consultationStartedAt: appointment.consultationStartedAt
      },
      { upsert: true, new: true }
    );

    // Real-time Event
    const { emitQueueEvent } = await import('../socket.js');
    const payload = {
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      patientCustomId: appointment.patientCustomId,
      doctorName: appointment.doctorName,
      doctorId: doctorRecord._id,
      appointmentTime: appointment.appointmentTime,
      department: appointment.department,
      status: 'In Consultation',
      doctorAvailability: 'In Consultation',
      startedAt: appointment.consultationStartedAt
    };

    emitQueueEvent('PATIENT_CALLED', payload);
    emitQueueEvent('CONSULTATION_STARTED', payload);

    // Notify Doctor
    const Notification = (await import('../models/Notification.js')).default;
    try {
      await Notification.create({
        title: `🩺 Patient In Consultation: ${appointment.patientName}`,
        message: `${appointment.patientName} has entered your consultation room. Clinical suite is ready.`,
        category: 'Doctor Instruction',
        priority: 'High',
        recipientRole: 'Doctor',
        doctorName: appointment.doctorName,
        doctorId: doctorRecord._id,
        targetLink: '/consultations',
        isRead: false
      });
    } catch (errNotif) {
      console.error('Notification error:', errNotif.message);
    }

    res.json({
      message: `Patient ${appointment.patientName} sent to ${appointment.doctorName}. Consultation initiated.`,
      appointment,
      doctorAvailability: 'In Consultation'
    });
  } catch (error) {
    console.error('Error sending patient:', error);
    res.status(500).json({ message: 'Server error sending patient: ' + error.message });
  }
});

// @route   POST /api/appointments/:id/complete-consultation
// @desc    Doctor completes consultation -> appointment status = COMPLETED, doctor availability = AVAILABLE, notifies receptionist
// @access  Protected (Doctor only)
router.post('/:id/complete-consultation', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const { diagnosis, treatment, prescriptions, notes } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const rxArray = Array.isArray(prescriptions)
      ? prescriptions
      : (prescriptions ? prescriptions.split(',').map(p => p.trim()).filter(Boolean) : []);

    const completedTime = new Date();
    appointment.status = 'Completed';
    appointment.queueStatus = 'Completed';
    appointment.endTime = completedTime;
    appointment.consultationCompletedAt = completedTime;
    appointment.consultationNotes = {
      diagnosis: diagnosis || 'General Clinical Review',
      treatment: treatment || 'Standard medical management',
      prescriptions: rxArray,
      notes: notes || '',
      completedAt: completedTime
    };

    await appointment.save();

    // Auto-save to MedicalRecord collection
    const MedicalRecord = (await import('../models/MedicalRecord.js')).default;
    try {
      if (appointment.patientId) {
        await MedicalRecord.create({
          patientId: appointment.patientId,
          diagnosis: appointment.consultationNotes.diagnosis,
          treatment: appointment.consultationNotes.treatment,
          notes: appointment.consultationNotes.notes,
          prescriptions: rxArray.map(m => ({
            medication: typeof m === 'string' ? m : (m.medication || 'Medication'),
            dosage: typeof m === 'object' ? (m.dosage || 'Standard') : 'Standard',
            frequency: typeof m === 'object' ? (m.frequency || 'Per Doctor Advice') : 'Per Doctor Advice',
            duration: typeof m === 'object' ? (m.duration || 'As Prescribed') : 'As Prescribed'
          }))
        });
      }
    } catch (mErr) {
      console.warn('Medical record sync warning:', mErr.message);
    }

    // Update Queue record in MongoDB
    const Queue = (await import('../models/Queue.js')).default;
    await Queue.findOneAndUpdate(
      { appointmentId: appointment._id },
      {
        status: 'Completed',
        completedAt: completedTime
      },
      { new: true }
    );

    // Rule 7: Automatically make Doctor AVAILABLE again in MongoDB
    const cleanDoc = (appointment.doctorName || '').replace(/^Dr\.\s*/i, '').trim();
    const Doctor = (await import('../models/Doctor.js')).default;
    const doctorRecord = await Doctor.findOne({
      $or: [
        { name: appointment.doctorName },
        { name: `Dr. ${cleanDoc}` },
        { name: { $regex: cleanDoc, $options: 'i' } }
      ]
    });

    if (doctorRecord) {
      if (!doctorRecord.availability) doctorRecord.availability = {};
      doctorRecord.availability.status = 'Available';
      await doctorRecord.save();
    }

    // Rule 8: Notify receptionist in real-time that doctor is ready for the next patient
    const { emitQueueEvent } = await import('../socket.js');
    const payload = {
      appointmentId: appointment._id,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      doctorId: doctorRecord?._id,
      doctorAvailability: 'Available',
      completedAt: completedTime,
      status: 'Completed'
    };

    emitQueueEvent('CONSULTATION_COMPLETED', payload);
    emitQueueEvent('DOCTOR_AVAILABLE', {
      doctorId: doctorRecord?._id,
      doctorName: appointment.doctorName,
      availabilityStatus: 'Available',
      timestamp: completedTime
    });

    const Notification = (await import('../models/Notification.js')).default;
    try {
      await Notification.create({
        title: `✅ Consultation Completed: ${appointment.doctorName} Ready`,
        message: `${appointment.doctorName} finished consultation for ${appointment.patientName}. Doctor is now Available for the next checked-in patient.`,
        category: 'Discharge Processing Update',
        priority: 'Normal',
        recipientRole: 'Receptionist',
        doctorName: appointment.doctorName,
        targetLink: '/receptionist/queue',
        isRead: false
      });
    } catch (nErr) {
      console.error('Notification create error:', nErr.message);
    }

    res.json({
      message: 'Consultation completed successfully. Doctor is now Available.',
      appointment,
      doctorAvailability: 'Available'
    });
  } catch (error) {
    console.error('Error completing consultation:', error);
    res.status(500).json({ message: 'Server error completing consultation: ' + error.message });
  }
});

// @route   PUT /api/appointments/:id/status
// @desc    Update appointment status (Scheduled -> Checked In -> Waiting -> In Consultation -> Completed)
// @access  Protected
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status, consultationNotes } = req.body;
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = status;
    if (status === 'Checked In' && !appointment.checkInTime) {
      appointment.checkInTime = new Date();
      appointment.queueStatus = 'Waiting';
    } else if (status === 'In Consultation' && !appointment.startTime) {
      appointment.startTime = new Date();
      appointment.queueStatus = 'In Consultation';
    } else if (status === 'Completed') {
      appointment.endTime = new Date();
      appointment.queueStatus = 'Completed';
      if (consultationNotes) {
        appointment.consultationNotes = {
          ...consultationNotes,
          completedAt: new Date()
        };
      }
    } else if (status === 'Cancelled' || status === 'No Show') {
      appointment.queueStatus = status;
    }

    const updated = await appointment.save();

    // Sync Queue record
    const Queue = (await import('../models/Queue.js')).default;
    await Queue.findOneAndUpdate(
      { appointmentId: appointment._id },
      { status: appointment.queueStatus || status },
      { upsert: true }
    );

    // Emit event
    const { emitQueueEvent } = await import('../socket.js');
    emitQueueEvent('PATIENT_WAITING', {
      appointmentId: appointment._id,
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      status
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({ message: 'Server error updating appointment status' });
  }
});

export default router;
