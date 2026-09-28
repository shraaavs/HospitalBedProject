import express from 'express';
import Prescription from '../models/Prescription.js';
import Patient from '../models/Patient.js';
import MedicalRecord from '../models/MedicalRecord.js';
import BedAllocation from '../models/BedAllocation.js';
import Appointment from '../models/Appointment.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/prescriptions
// @desc    Get prescriptions (all, doctor-specific, or patient-specific)
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { patientId, patientCustomId, search, status, consultationId } = req.query;

    let query = {};

    // If Doctor, filter to this doctor's prescriptions or assigned patients
    if (req.user.role === 'Doctor') {
      const docName = req.user.name.replace(/^Dr\.\s*/i, '').trim();
      query.$or = [
        { doctorId: req.user._id },
        { doctorName: req.user.name },
        { doctorName: `Dr. ${docName}` },
        { doctorName: { $regex: docName, $options: 'i' } }
      ];
    }

    if (patientId) {
      query.patientId = patientId;
    }

    if (patientCustomId) {
      query.patientCustomId = patientCustomId;
    }

    if (consultationId) {
      query.consultationId = consultationId;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      const searchConditions = [
        { patientName: searchRegex },
        { patientCustomId: searchRegex },
        { diagnosis: searchRegex },
        { 'medications.medicineName': searchRegex },
        { 'medications.drugId': searchRegex }
      ];

      if (query.$or) {
        query = {
          $and: [
            { $or: query.$or },
            { $or: searchConditions }
          ]
        };
      } else {
        query.$or = searchConditions;
      }
    }

    const prescriptions = await Prescription.find(query)
      .populate('patientId')
      .populate('doctorId')
      .populate('consultationId')
      .populate('appointmentId')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching prescriptions:', error);
    res.status(500).json({ message: 'Server error fetching prescriptions' });
  }
});

// @route   GET /api/prescriptions/patient/:patientId
// @desc    Get all historical prescriptions for a specific patient
// @access  Protected
router.get('/patient/:patientId', protect, async (req, res) => {
  try {
    const pId = req.params.patientId;
    const prescriptions = await Prescription.find({
      $or: [
        { patientId: pId },
        { patientCustomId: pId }
      ]
    }).sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Error fetching patient prescription history:', error);
    res.status(500).json({ message: 'Server error fetching medication history' });
  }
});

// @route   GET /api/prescriptions/:id
// @desc    Get single prescription by ID
// @access  Protected
router.get('/:id', protect, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId')
      .populate('doctorId')
      .populate('consultationId')
      .populate('appointmentId');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    res.json(prescription);
  } catch (error) {
    console.error('Error fetching prescription details:', error);
    res.status(500).json({ message: 'Server error fetching prescription details' });
  }
});

// @route   POST /api/prescriptions
// @desc    Create and store a validated patient prescription
// @access  Protected (Doctor, Admin)
// Note: Doctor creates prescription; pharmacy inventory stock is NOT deducted here.
router.post('/', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientCustomId,
      consultationId,
      appointmentId,
      admissionId,
      admissionCustomId,
      ward,
      bedNumber,
      diagnosis,
      medications,
      notes,
      prescriptionDate
    } = req.body;

    if (!patientName || !medications || medications.length === 0) {
      return res.status(400).json({ message: 'Please provide patient name and at least one medication' });
    }

    // Validate medication items
    for (const med of medications) {
      if (!med.medicineName || !med.dosage || !med.frequency || !med.duration) {
        return res.status(400).json({ message: 'Each medication must specify Medicine Name, Dosage, Frequency, and Duration' });
      }
    }

    let linkedPatient = null;
    let linkedPatientId = patientId;

    if (linkedPatientId) {
      linkedPatient = await Patient.findById(linkedPatientId);
    } else if (patientCustomId) {
      linkedPatient = await Patient.findOne({ patientId: patientCustomId });
      if (linkedPatient) linkedPatientId = linkedPatient._id;
    }

    // Auto-detect ward / bed / admission if not explicitly passed
    let finalWard = ward || '';
    let finalBedNumber = bedNumber || '';
    let finalAdmissionId = admissionId || null;

    if (linkedPatient) {
      if (!finalWard && linkedPatient.admissionSetup?.wardType) {
        finalWard = linkedPatient.admissionSetup.wardType;
      }
      // Check for active bed allocation
      const activeAllocation = await BedAllocation.findOne({
        patientId: linkedPatient._id,
        status: { $in: ['Occupied', 'Active', 'Allocated'] }
      }).populate('bedId');

      if (activeAllocation) {
        finalAdmissionId = activeAllocation._id;
        if (!finalWard && activeAllocation.ward) finalWard = activeAllocation.ward;
        if (!finalBedNumber && activeAllocation.bedNumber) finalBedNumber = activeAllocation.bedNumber;
        if (!finalBedNumber && activeAllocation.bedId?.bedNumber) finalBedNumber = activeAllocation.bedId.bedNumber;
      }
    }

    // Sanitize medication items
    const sanitizedMedications = medications.map(med => ({
      medicineName: med.medicineName.trim(),
      drugId: med.drugId ? med.drugId.trim() : '',
      dosage: med.dosage.trim(),
      route: med.route || 'Oral',
      frequency: med.frequency || 'Once daily (OD)',
      duration: med.duration || '5 days',
      quantity: med.quantity ? String(med.quantity).trim() : '1',
      instructions: med.instructions ? med.instructions.trim() : '',
      timing: med.timing || 'After Food',
      startDate: med.startDate ? new Date(med.startDate) : new Date(),
      endDate: med.endDate ? new Date(med.endDate) : undefined,
      specialInstructions: med.specialInstructions ? med.specialInstructions.trim() : ''
    }));

    const newPrescription = new Prescription({
      patientId: linkedPatientId || null,
      patientName: patientName.trim(),
      patientCustomId: patientCustomId || (linkedPatient?.patientId || ''),
      doctorId: req.user._id,
      doctorName: req.user.name || 'Dr. Attending Doctor',
      doctorDepartment: req.user.department || 'General Medicine',
      consultationId: consultationId || null,
      appointmentId: appointmentId || null,
      admissionId: finalAdmissionId || null,
      admissionCustomId: admissionCustomId || '',
      ward: finalWard,
      bedNumber: finalBedNumber,
      diagnosis: diagnosis || 'Clinical Assessment',
      prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : new Date(),
      medications: sanitizedMedications,
      notes: notes ? notes.trim() : '',
      status: 'Active'
    });

    const savedPrescription = await newPrescription.save();

    // Auto-link to MedicalRecord history
    if (linkedPatientId) {
      try {
        await MedicalRecord.create({
          patientId: linkedPatientId,
          patientCustomId: patientCustomId || (linkedPatient?.patientId || ''),
          doctorId: req.user._id,
          recordedBy: req.user._id,
          diagnosis: diagnosis || 'Prescription Issued',
          treatment: `Prescribed: ${sanitizedMedications.map(m => `${m.medicineName} (${m.dosage}, ${m.frequency})`).join(', ')}`,
          treatmentPlan: `Medication therapy: ${sanitizedMedications.map(m => m.medicineName).join(', ')}`,
          notes: notes || 'Prescription generated via Doctor Rx Suite',
          doctorsMedicalNotes: notes || '',
          prescriptions: sanitizedMedications.map(m => ({
            medication: m.medicineName,
            dosage: m.dosage,
            frequency: m.frequency,
            duration: m.duration
          }))
        });
      } catch (mrErr) {
        console.error('Notice: Could not automatically sync medical record:', mrErr.message);
      }
    }

    res.status(201).json(savedPrescription);
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({ message: error.message || 'Server error creating prescription' });
  }
});

// @route   PUT /api/prescriptions/:id/status
// @desc    Update prescription status (Active -> Completed / Discontinued / Dispensed)
// @access  Protected
router.put('/:id/status', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const { status } = req.body;
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    prescription.status = status;
    const updated = await prescription.save();
    res.json(updated);
  } catch (error) {
    console.error('Error updating prescription status:', error);
    res.status(500).json({ message: 'Server error updating prescription' });
  }
});

export default router;
