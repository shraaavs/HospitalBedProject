import express from 'express';
import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/patients
// @desc    Get all patients
// @access  Protected
router.get('/', protect, requireRole(['Admin', 'Doctor', 'Nurse', 'Receptionist']), async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Server error while fetching patients' });
  }
});

// @route   GET /api/patients/assigned
// @desc    Get patients assigned to the logged-in doctor
// @access  Protected
router.get('/assigned', protect, requireRole(['Doctor']), async (req, res) => {
  try {
    const patients = await Patient.find({ 
      'admissionSetup.assignedDoctor': req.user.name,
      status: { $in: ['Registered', 'Admitted'] } 
    }).sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    console.error('Error fetching assigned patients:', error);
    res.status(500).json({ message: 'Server error while fetching assigned patients' });
  }
});

// @route   POST /api/patients
// @desc    Register a new patient
// @access  Protected (Receptionist, Admin)
router.post('/', protect, requireRole(['Receptionist', 'Admin']), async (req, res) => {
  try {
    const { 
      fullName, dob, gender, contact, email,
      emergencyName, emergencyRelationship, emergencyPhone,
      complaint, bloodGroup, allergies,
      ward, doctor 
    } = req.body;

    // Generate a unique Patient ID (e.g., PM-123456)
    const patientId = `PM-${Math.floor(100000 + Math.random() * 900000)}`;

    // Try to auto-allocate a bed
    const bed = await Bed.findOne({
      $or: [{ wardType: ward }, { type: ward }],
      status: 'Available'
    });

    const newPatient = new Patient({
      patientId,
      fullName,
      dob,
      gender,
      contactNumber: contact,
      email,
      emergencyContact: {
        name: emergencyName,
        relationship: emergencyRelationship,
        phone: emergencyPhone
      },
      clinicalInfo: {
        chiefComplaint: complaint,
        bloodGroup,
        allergies
      },
      admissionSetup: {
        wardType: ward,
        assignedDoctor: doctor
      },
      status: bed ? 'Admitted' : 'Registered',
      bedId: bed ? bed._id : null
    });

    const savedPatient = await newPatient.save();

    if (bed) {
      bed.status = 'Occupied';
      bed.patientName = savedPatient.fullName;
      bed.patientId = savedPatient.patientId;
      bed.admissionDate = new Date();
      bed.notes = `Auto-allocated during registration.`;
      await bed.save();
    }
    
    res.status(201).json({
      message: 'Patient registered successfully',
      patientId: savedPatient.patientId,
      patient: savedPatient,
      bedNumber: bed ? bed.bedNumber : null
    });
  } catch (error) {
    console.error('Error registering patient:', error);
    res.status(500).json({ message: 'Server error while registering patient' });
  }
});

// @route   PUT /api/patients/:id/admit
// @desc    Admit a patient and assign a bed
// @access  Protected (Doctor, Receptionist, Admin)
router.put('/:id/admit', protect, requireRole(['Doctor', 'Receptionist', 'Admin']), async (req, res) => {
  try {
    const { bedId } = req.body;
    
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (patient.status === 'Admitted') {
      return res.status(400).json({ message: 'Patient is already admitted' });
    }

    const bed = await Bed.findById(bedId);
    if (!bed || bed.status !== 'Available') {
      return res.status(400).json({ message: 'Selected bed is not available' });
    }

    // Update Bed Status
    bed.status = 'Occupied';
    bed.patientName = patient.fullName;
    bed.patientId = patient.patientId;
    bed.admissionDate = new Date();
    await bed.save();

    // Update Patient Status
    patient.status = 'Admitted';
    patient.bedId = bedId;
    await patient.save();

    res.json({ message: 'Patient admitted successfully', patient, bed });
  } catch (error) {
    console.error('Error admitting patient:', error);
    res.status(500).json({ message: 'Server error while admitting patient' });
  }
});

// @route   PUT /api/patients/:id/discharge
// @desc    Discharge a patient and free their bed
// @access  Protected (Doctor, Admin)
router.put('/:id/discharge', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    if (patient.status !== 'Admitted') {
      return res.status(400).json({ message: 'Patient is not currently admitted' });
    }

    if (patient.bedId) {
      const bed = await Bed.findById(patient.bedId);
      if (bed) {
        bed.status = 'Cleaning';
        bed.patientName = null;
        bed.patientId = null;
        bed.admissionDate = null;
        bed.notes = 'Requires cleaning post-discharge';
        await bed.save();
      }
    }

    // Update Patient Status
    patient.status = 'Discharged';
    patient.bedId = null;
    await patient.save();

    res.json({ message: 'Patient discharged successfully', patient });
  } catch (error) {
    console.error('Error discharging patient:', error);
    res.status(500).json({ message: 'Server error while discharging patient' });
  }
});

export default router;
