import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import Admin from '../models/Admin.js';
import Receptionist from '../models/Receptionist.js';

const router = express.Router();

// Handler for fetching all registered doctors (deduplicated)
export const getDoctorsListHandler = async (req, res) => {
  try {
    const doctors = await Doctor.find().select('-password').sort({ name: 1 });
    
    // Department-specific specialization mapping
    const deptSpecializations = {
      'Cardiology': {
        specialization: 'Interventional Cardiology & Electrophysiology',
        cabin: 'Suite 304, Block B (Cardio Wing)'
      },
      'Orthopedics': {
        specialization: 'Joint Replacement & Arthroscopic Trauma Surgery',
        cabin: 'Suite 208, Block A (Ortho Wing)'
      },
      'Neurology': {
        specialization: 'Stroke Management & Neuro-Rehabilitation',
        cabin: 'Suite 412, Block C (Neuro Center)'
      },
      'General Medicine': {
        specialization: 'Internal Medicine, Diabetes & Chronic Disease Care',
        cabin: 'Suite 105, Block A (OPD Suite)'
      },
      'Pediatrics': {
        specialization: 'Pediatric Critical Care & Child Development',
        cabin: 'Suite 118, Block D (Children Wing)'
      },
      'Emergency Care': {
        specialization: 'Trauma Resuscitation & Acute Critical Care',
        cabin: 'ER Trauma Command 01'
      },
      'Pulmonology': {
        specialization: 'Interventional Pulmonology & Respiratory Medicine',
        cabin: 'Suite 215, Block B (Chest Clinic)'
      },
      'Surgery': {
        specialization: 'Minimally Invasive & Laparoscopic Surgery',
        cabin: 'Suite 310, Block A (Surgical Suite)'
      }
    };

    // Deduplicate by doctor name and assign authentic specialty
    const seen = new Set();
    const uniqueDoctors = [];
    
    for (const doc of doctors) {
      const clean = doc.name.trim().toLowerCase();
      if (seen.has(clean)) continue;
      seen.add(clean);

      const dObj = doc.toObject ? doc.toObject() : { ...doc };
      const dept = dObj.department || 'General Medicine';
      const specMeta = deptSpecializations[dept] || deptSpecializations['General Medicine'];

      // If doctor has generic/default specialization or needs alignment with their department
      if (!dObj.specialization || dObj.specialization === 'Interventional Cardiology & Electrophysiology' || dObj.specialization === 'Clinical Specialist') {
        dObj.specialization = specMeta.specialization;
      }
      if (!dObj.cabinNumber || dObj.cabinNumber === 'Consultation Suite 304, Block B') {
        dObj.cabinNumber = specMeta.cabin;
      }

      uniqueDoctors.push(dObj);
    }

    res.json(uniqueDoctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.get('/staff/doctors', protect, getDoctorsListHandler);
router.get('/doctors', protect, getDoctorsListHandler);

// GET all users
// Accessible by Admin, Doctor, Nurse, Receptionist
router.get('/', protect, requireRole(['Admin', 'Doctor', 'Nurse', 'Receptionist']), async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    const doctors = await Doctor.find().select('-password');
    const nurses = await Nurse.find().select('-password');
    const receptionists = await Receptionist.find().select('-password');
    res.json([...admins, ...doctors, ...nurses, ...receptionists]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a user
// Accessible by Admin
router.delete('/:id', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const id = req.params.id;
    let user = await Admin.findById(id);
    if (!user) user = await Doctor.findById(id);
    if (!user) user = await Nurse.findById(id);
    if (!user) user = await Receptionist.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await user.deleteOne();
    res.json({ message: 'User removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Admin activates or deactivates a user account
// @access  Protected (Admin only)
router.put('/:id/status', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Status must be Active or Inactive' });
    }

    const id = req.params.id;
    let user = await Admin.findById(id);
    if (!user) user = await Doctor.findById(id);
    if (!user) user = await Nurse.findById(id);
    if (!user) user = await Receptionist.findById(id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString() && status === 'Inactive') {
      return res.status(400).json({ message: 'You cannot deactivate your own admin account' });
    }

    user.status = status;
    await user.save();

    res.json({
      message: `Account status updated to ${status}`,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @route   GET /api/users/doctor-availability
// @route   GET /api/users/doctor-availability/:doctorId
// @desc    Get availability status for current doctor or specified doctor
// @access  Protected
const getDoctorAvailabilityHandler = async (req, res) => {
  try {
    let targetDocId = req.params.doctorId;
    let doctor = null;

    if (targetDocId && targetDocId !== 'me') {
      doctor = await Doctor.findById(targetDocId).select('-password');
      if (!doctor) {
        doctor = await Doctor.findOne({
          $or: [
            { doctorId: targetDocId },
            { name: { $regex: targetDocId.replace(/^Dr\.\s*/i, '').trim(), $options: 'i' } }
          ]
        }).select('-password');
      }
    } else if (req.user.role === 'Doctor') {
      doctor = await Doctor.findById(req.user._id).select('-password');
    }

    if (!doctor) {
      return res.status(404).json({ message: 'Doctor record not found' });
    }

    res.json({
      doctorId: doctor._id,
      doctorCustomId: doctor.doctorId,
      doctorName: doctor.name,
      department: doctor.department,
      availabilityStatus: doctor.availability?.status || 'Available',
      availability: doctor.availability || { status: 'Available' }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

router.get('/doctor-availability', protect, getDoctorAvailabilityHandler);
router.get('/doctor-availability/:doctorId', protect, getDoctorAvailabilityHandler);

// @route   PUT /api/users/doctor-availability
// @desc    Doctor updates consultation availability status (Available, Unavailable, In Consultation)
// @access  Protected (Doctor only)
router.put('/doctor-availability', protect, requireRole(['Doctor']), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Available', 'Unavailable', 'In Consultation', 'On Duty', 'In Emergency / OT', 'On Leave', 'Off Duty'];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const doctor = await Doctor.findById(req.user._id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (!doctor.availability) doctor.availability = {};
    doctor.availability.status = status;
    await doctor.save();

    const { emitQueueEvent } = await import('../socket.js');
    const Notification = (await import('../models/Notification.js')).default;

    // Real-time event to receptionists & system
    emitQueueEvent('DOCTOR_AVAILABLE', {
      doctorId: doctor._id,
      doctorCustomId: doctor.doctorId,
      doctorName: doctor.name,
      department: doctor.department,
      availabilityStatus: status,
      timestamp: new Date()
    });

    // Create system notification when doctor becomes Available or calls patient
    if (status === 'Available') {
      try {
        await Notification.create({
          title: `👨‍⚕️ ${doctor.name} is now Available`,
          message: `${doctor.name} (${doctor.department}) has set status to Available and is ready to consult the next waiting patient.`,
          category: 'General',
          priority: 'Normal',
          recipientRole: 'Receptionist',
          doctorName: doctor.name,
          doctorId: doctor._id,
          targetLink: '/receptionist/queue',
          isRead: false
        });
      } catch (notifErr) {
        console.error('Failed to create availability notification:', notifErr.message);
      }
    }

    res.json({
      message: `Doctor availability updated to ${status}`,
      doctorName: doctor.name,
      availabilityStatus: doctor.availability.status
    });
  } catch (err) {
    console.error('Error updating doctor availability:', err);
    res.status(500).json({ message: err.message });
  }
});

import bcrypt from 'bcryptjs';

// GET current user profile
// Accessible by all authenticated roles (Doctor, Nurse, Admin, Receptionist)
router.get('/profile', protect, async (req, res) => {
  try {
    let userRecord = req.user;
    if (req.user.role === 'Doctor') {
      userRecord = await Doctor.findById(req.user._id).select('-password');
    }
    if (!userRecord) {
      return res.status(404).json({ message: 'Profile not found' });
    }
    res.json(userRecord);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update user profile
// Allows updating permitted personal, contact, and availability details while strictly protecting role, permissions, and system settings
router.put('/profile', protect, async (req, res) => {
  try {
    if (req.user.role === 'Doctor') {
      const doctor = await Doctor.findById(req.user._id);
      if (!doctor) {
        return res.status(404).json({ message: 'Doctor account not found' });
      }

      // Permitted Doctor Updates
      if (req.body.name) doctor.name = req.body.name.trim();
      if (req.body.email) doctor.email = req.body.email.trim();
      if (req.body.phone) doctor.phone = req.body.phone.trim();
      if (req.body.profilePhoto !== undefined) doctor.profilePhoto = req.body.profilePhoto.trim();
      if (req.body.specialization) doctor.specialization = req.body.specialization.trim();
      if (req.body.qualification) doctor.qualification = req.body.qualification.trim();
      if (req.body.qualifications) {
        doctor.qualifications = req.body.qualifications.trim();
        doctor.qualification = req.body.qualifications.trim();
      }
      if (req.body.cabinNumber) doctor.cabinNumber = req.body.cabinNumber.trim();
      if (req.body.bio) doctor.bio = req.body.bio.trim();
      
      // Availability Updates (Permitted: doctor's own clinic hours, days, live status, on-call)
      if (req.body.availability) {
        doctor.availability = {
          ...doctor.availability,
          ...req.body.availability
        };
      }

      // Optional Password Update
      if (req.body.password && req.body.password.length >= 6) {
        const salt = await bcrypt.genSalt(10);
        doctor.password = await bcrypt.hash(req.body.password, salt);
      }

      // STRICT PROTECTION: Role, hospital permissions, department assignment, admin-controlled shift, and doctorId CANNOT be modified by Doctor
      doctor.role = 'Doctor';
      doctor.status = 'Active';

      const updated = await doctor.save();
      const response = updated.toObject();
      delete response.password;

      return res.json({
        message: 'Doctor profile updated successfully in MongoDB',
        profile: response
      });
    }

    // Receptionist Profile Update
    if (req.user.role === 'Receptionist') {
      const receptionist = await Receptionist.findById(req.user._id);
      if (!receptionist) return res.status(404).json({ message: 'Receptionist account not found' });

      // Permitted Receptionist Updates
      if (req.body.name) receptionist.name = req.body.name.trim();
      if (req.body.email) receptionist.email = req.body.email.trim();
      if (req.body.phone) receptionist.phone = req.body.phone.trim();
      if (req.body.department) receptionist.department = req.body.department.trim();
      if (req.body.deskLocation) receptionist.deskLocation = req.body.deskLocation.trim();
      if (req.body.shiftHours) receptionist.shiftHours = req.body.shiftHours.trim();

      // Optional Password Update
      if (req.body.password && req.body.password.length >= 6) {
        receptionist.password = req.body.password; // pre-save hook will hash it
      }

      // STRICT: Role, permissions, and ID cannot be changed by receptionist
      receptionist.role = 'Receptionist';
      receptionist.status = 'Active';

      const updated = await receptionist.save();
      const response = updated.toObject();
      delete response.password;
      return res.json({ message: 'Receptionist profile updated successfully in MongoDB', profile: response });
    }

    // Nurse Profile Update
    if (req.user.role === 'Nurse') {
      const nurse = await Nurse.findById(req.user._id);
      if (!nurse) return res.status(404).json({ message: 'Nurse account not found' });

      // Permitted Nurse updates: Name, Email, Phone, Profile Picture, Qualification, Working Days, Availability
      if (req.body.name) nurse.name = req.body.name.trim();
      if (req.body.email) nurse.email = req.body.email.trim();
      if (req.body.phone) nurse.phone = req.body.phone.trim();
      if (req.body.profilePicture !== undefined) nurse.profilePicture = req.body.profilePicture;
      if (req.body.qualification) nurse.qualification = req.body.qualification.trim();
      if (Array.isArray(req.body.workingDays)) nurse.workingDays = req.body.workingDays;
      if (req.body.availability) {
        nurse.availability = {
          ...nurse.availability,
          ...req.body.availability
        };
      }

      // Optional Password Update
      if (req.body.password && req.body.password.length >= 6) {
        nurse.password = req.body.password; // pre-save hook will hash it
      }

      // STRICT SAFEGUARDS: Role, hospital permissions, assignedWard, department, nurseId, status CANNOT be altered by Nurse
      nurse.role = 'Nurse';
      nurse.status = 'Active';

      const updated = await nurse.save();
      const response = updated.toObject();
      delete response.password;
      return res.json({ message: 'Nurse profile updated successfully in MongoDB', profile: response });
    }

    // Admin Profile Update
    const user = await Admin.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Permitted Admin Updates
    if (req.body.name) user.name = req.body.name.trim();
    if (req.body.email) user.email = req.body.email.trim();
    if (req.body.phone) user.phone = req.body.phone.trim();
    if (req.body.designation) user.designation = req.body.designation.trim();
    if (req.body.department) user.department = req.body.department.trim();
    if (req.body.qualification) user.qualification = req.body.qualification.trim();
    if (req.body.officeLocation) user.officeLocation = req.body.officeLocation.trim();
    if (req.body.profilePhoto) user.profilePhoto = req.body.profilePhoto.trim();

    // Password change (optional)
    if (req.body.password && req.body.password.length >= 6) {
      user.password = req.body.password;
    }

    // STRICT SAFEGUARD: Role, status, and adminId CANNOT be modified via profile
    user.role = 'Admin';
    user.status = 'Active';

    const updated = await user.save();
    const response = updated.toObject();
    delete response.password;
    res.json({ message: 'Admin profile updated successfully in MongoDB', profile: response });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// @route   POST /api/users/staff
// @desc    Admin creates a new staff profile (Doctor, Nurse, Receptionist, Admin)
// @access  Protected (Admin only)
router.post('/staff', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const {
      role,
      name,
      email,
      username,
      password,
      department,
      specialization,
      qualification,
      phone,
      workingDays,
      shift,
      assignedShift,
      shiftHours,
      assignedWard,
      deskLocation,
      cabinNumber,
      availabilityStatus,
      status
    } = req.body;

    if (!name || !email || !username || !password || !role) {
      return res.status(400).json({ message: 'Name, email, username, password, and role are required.' });
    }

    // Check uniqueness across collections
    const exists = 
      await Admin.findOne({ $or: [{ email }, { username }] }) ||
      await Doctor.findOne({ $or: [{ email }, { username }] }) ||
      await Nurse.findOne({ $or: [{ email }, { username }] }) ||
      await Receptionist.findOne({ $or: [{ email }, { username }] });

    if (exists) {
      return res.status(400).json({ message: 'A user with this email or username already exists.' });
    }

    let createdStaff;

    if (role === 'Doctor') {
      const docCount = await Doctor.countDocuments();
      const doctorId = `DOC-${String(docCount + 101).padStart(3, '0')}`;
      createdStaff = await Doctor.create({
        doctorId,
        name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
        email,
        username,
        password,
        department: department || 'Cardiology',
        specialization: specialization || 'General Medicine',
        qualification: qualification || 'MBBS, MD',
        qualifications: qualification || 'MBBS, MD',
        phone: phone || '+91 98765 43210',
        assignedShift: assignedShift || shift || 'Morning Shift (09:00 AM - 05:00 PM)',
        cabinNumber: cabinNumber || 'Suite 101, Block A',
        availability: {
          status: availabilityStatus || 'Available',
          days: Array.isArray(workingDays) && workingDays.length ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          shiftHours: shiftHours || '09:00 AM - 05:00 PM',
          emergencyOnCall: true
        },
        status: status || 'Active'
      });
    } else if (role === 'Nurse') {
      const nurseCount = await Nurse.countDocuments();
      const nurseId = `NUR-${String(nurseCount + 101).padStart(3, '0')}`;
      createdStaff = await Nurse.create({
        nurseId,
        name,
        email,
        username,
        password,
        department: department || 'General Medicine',
        assignedWard: assignedWard || department || 'General Ward',
        qualification: qualification || 'B.Sc. Nursing, RN',
        phone: phone || '+91 98765 43219',
        shift: shift || assignedShift || 'Morning Shift (07:00 AM - 03:00 PM)',
        workingDays: Array.isArray(workingDays) && workingDays.length ? workingDays : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availability: {
          status: availabilityStatus || 'On Duty',
          isAvailable: availabilityStatus !== 'Off Duty',
          shiftHours: shiftHours || '07:00 AM - 03:00 PM'
        },
        status: status || 'Active'
      });
    } else if (role === 'Receptionist') {
      const repCount = await Receptionist.countDocuments();
      const receptionistId = `REC-${String(repCount + 101).padStart(3, '0')}`;
      createdStaff = await Receptionist.create({
        receptionistId,
        name,
        email,
        username,
        password,
        phone: phone || '+91 98765 11223',
        department: department || 'Central Reception & OPD',
        deskLocation: deskLocation || 'Ground Floor, Front Desk A',
        shiftHours: shiftHours || '08:00 AM - 04:00 PM',
        status: status || 'Active'
      });
    } else if (role === 'Admin') {
      const admCount = await Admin.countDocuments();
      const adminId = `ADM-${String(admCount + 101).padStart(3, '0')}`;
      createdStaff = await Admin.create({
        adminId,
        name,
        email,
        username,
        password,
        status: status || 'Active'
      });
    } else {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const response = createdStaff.toObject();
    delete response.password;
    res.status(201).json({ message: 'Staff member created successfully in MongoDB', staff: response });
  } catch (err) {
    console.error('Error creating staff:', err);
    res.status(500).json({ message: 'Server error creating staff: ' + err.message });
  }
});

// @route   PUT /api/users/staff/:id
// @desc    Admin updates staff profile, department assignment, and duty schedules
// @access  Protected (Admin only)
router.put('/staff/:id', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const id = req.params.id;
    let user = await Doctor.findById(id);
    let role = 'Doctor';
    if (!user) {
      user = await Nurse.findById(id);
      role = 'Nurse';
    }
    if (!user) {
      user = await Receptionist.findById(id);
      role = 'Receptionist';
    }
    if (!user) {
      user = await Admin.findById(id);
      role = 'Admin';
    }

    if (!user) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const {
      name,
      email,
      phone,
      department,
      specialization,
      qualification,
      assignedWard,
      deskLocation,
      cabinNumber,
      shift,
      assignedShift,
      shiftHours,
      workingDays,
      availabilityStatus,
      status,
      password
    } = req.body;

    if (name) user.name = name.trim();
    if (email) user.email = email.trim();
    if (phone) user.phone = phone.trim();
    if (department) user.department = department.trim();
    if (status) user.status = status;

    if (password && password.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    if (role === 'Doctor') {
      if (specialization) user.specialization = specialization.trim();
      if (qualification) {
        user.qualification = qualification.trim();
        user.qualifications = qualification.trim();
      }
      if (cabinNumber) user.cabinNumber = cabinNumber.trim();
      if (assignedShift || shift) user.assignedShift = assignedShift || shift;

      user.availability = {
        ...user.availability,
        status: availabilityStatus || user.availability?.status || 'Available',
        days: Array.isArray(workingDays) ? workingDays : (user.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
        shiftHours: shiftHours || user.availability?.shiftHours || '09:00 AM - 05:00 PM'
      };
    } else if (role === 'Nurse') {
      if (assignedWard) user.assignedWard = assignedWard.trim();
      if (qualification) user.qualification = qualification.trim();
      if (shift || assignedShift) user.shift = shift || assignedShift;
      if (Array.isArray(workingDays)) user.workingDays = workingDays;

      user.availability = {
        ...user.availability,
        status: availabilityStatus || user.availability?.status || 'On Duty',
        isAvailable: (availabilityStatus || user.availability?.status) !== 'Off Duty',
        shiftHours: shiftHours || user.availability?.shiftHours || '07:00 AM - 03:00 PM'
      };
    } else if (role === 'Receptionist') {
      if (deskLocation) user.deskLocation = deskLocation.trim();
      if (shiftHours) user.shiftHours = shiftHours.trim();
    }

    const updated = await user.save();
    const response = updated.toObject();
    delete response.password;

    res.json({ message: 'Staff profile and schedules updated successfully in MongoDB', staff: response });
  } catch (err) {
    console.error('Error updating staff:', err);
    res.status(500).json({ message: 'Server error updating staff: ' + err.message });
  }
});

export default router;



