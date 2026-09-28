import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import MedicalRecord from '../models/MedicalRecord.js';
import Patient from '../models/Patient.js';

const router = express.Router();

// GET all medical records for a specific patient
// Accessible by Doctor, Nurse
router.get('/patient/:patientId', protect, requireRole(['Doctor', 'Nurse', 'Admin']), async (req, res) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.params.patientId })
      .populate('recordedBy', 'name role')
      .sort({ createdAt: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new medical record / clinical consultation (with full clinical parameters)
// Accessible by Doctor, Nurse, Admin
router.post('/', protect, requireRole(['Doctor', 'Nurse', 'Admin']), async (req, res) => {
  const { 
    patientId, 
    patientCustomId,
    appointmentId,
    consultationDate,
    chiefComplaint,
    symptoms,
    durationOfSymptoms,
    presentIllness,
    relevantMedicalHistory,
    allergies,
    currentMedications,
    clinicalObservations,
    diagnosis,
    diagnosisNotes,
    severity,
    treatmentPlan,
    treatment,
    recommendedTests,
    doctorsMedicalNotes,
    notes,
    followUpInstructions,
    vitals, 
    prescriptions,
    labRequests
  } = req.body;

  try {
    let patient = null;
    const mongoose = (await import('mongoose')).default;
    
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await Patient.findById(patientId);
    }
    if (!patient && (patientCustomId || patientId)) {
      const searchPid = patientCustomId || patientId;
      patient = await Patient.findOne({
        $or: [
          { patientId: searchPid },
          { patientCustomId: searchPid },
          { fullName: searchPid },
          { name: searchPid }
        ]
      });
    }

    if (!patient) {
      // Create lightweight patient record if saving a standalone emergency/appointment consultation
      patient = new Patient({
        fullName: req.body.patientName || 'Consultation Patient',
        patientId: patientCustomId || `P${Date.now().toString().slice(-5)}`,
        status: 'Outpatient',
        gender: req.body.gender || 'Other',
        age: req.body.age ? Number(req.body.age) : 35,
        phoneNumber: req.body.phoneNumber || 'N/A'
      });
      await patient.save();
    }

    const finalPatientId = patient._id;
    const finalPatientCustomId = patient.patientId || patientCustomId || '';

    const newRecord = new MedicalRecord({
      patientId: finalPatientId,
      patientCustomId: finalPatientCustomId,
      recordedBy: req.user._id,
      doctorId: req.user._id,
      doctorName: req.user.name || '',
      appointmentId: appointmentId || null,
      consultationDate: consultationDate ? new Date(consultationDate) : new Date(),
      chiefComplaint: chiefComplaint || '',
      symptoms: symptoms || '',
      durationOfSymptoms: durationOfSymptoms || '',
      presentIllness: presentIllness || '',
      relevantMedicalHistory: relevantMedicalHistory || '',
      allergies: Array.isArray(allergies) ? allergies : (allergies ? [allergies] : []),
      currentMedications: currentMedications || '',
      clinicalObservations: clinicalObservations || '',
      diagnosis: diagnosis || '',
      diagnosisNotes: diagnosisNotes || '',
      severity: severity || 'Moderate',
      treatmentPlan: treatmentPlan || treatment || '',
      treatment: treatment || treatmentPlan || '',
      recommendedTests: Array.isArray(recommendedTests) ? recommendedTests : [],
      doctorsMedicalNotes: doctorsMedicalNotes || notes || '',
      notes: notes || doctorsMedicalNotes || '',
      followUpInstructions: followUpInstructions || '',
      vitals: vitals || {},
      prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
      labRequests: Array.isArray(labRequests) ? labRequests : []
    });

    const savedRecord = await newRecord.save();

    // If linked to an appointment, update appointment status to Completed with notes
    if (appointmentId) {
      try {
        const Appointment = (await import('../models/Appointment.js')).default;
        await Appointment.findByIdAndUpdate(appointmentId, {
          status: 'Completed',
          endTime: new Date(),
          consultationNotes: {
            diagnosis: diagnosis || '',
            treatment: treatmentPlan || treatment || '',
            notes: doctorsMedicalNotes || notes || '',
            prescriptions: Array.isArray(prescriptions) ? prescriptions.map(p => typeof p === 'string' ? p : `${p.medication} (${p.dosage})`) : [],
            completedAt: new Date()
          }
        });
      } catch (appErr) {
        console.warn('Could not auto-complete appointment:', appErr.message);
      }
    }

    // Sync any new allergies to Patient record if applicable
    if (patient && Array.isArray(allergies) && allergies.length > 0) {
      patient.clinicalInfo = patient.clinicalInfo || {};
      const existing = patient.clinicalInfo.allergies || [];
      const merged = Array.from(new Set([...existing, ...allergies]));
      patient.clinicalInfo.allergies = merged;
      await patient.save().catch(() => null);
    }

    res.status(201).json({
      success: true,
      message: 'Consultation recorded and stored in patient medical history.',
      record: savedRecord
    });
  } catch (err) {
    console.error('Error saving medical record / consultation:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});
// POST a diagnosis to an existing record
// Accessible by Doctor
router.post('/:id/diagnosis', protect, requireRole(['Doctor']), async (req, res) => {
  try {
    const { diagnosis, treatment, notes } = req.body;
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    if (diagnosis) record.diagnosis = diagnosis;
    if (treatment) record.treatment = treatment;
    if (notes) record.notes = notes;

    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST a prescription to an existing record
// Accessible by Doctor
router.post('/:id/prescription', protect, requireRole(['Doctor']), async (req, res) => {
  try {
    const { medication, dosage, frequency, duration } = req.body;
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    record.prescriptions.push({ medication, dosage, frequency, duration });
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST a lab test request
// Accessible by Doctor, Nurse
router.post('/:id/lab-request', protect, requireRole(['Doctor', 'Nurse']), async (req, res) => {
  try {
    const { testName, urgency } = req.body;
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    record.labRequests.push({ testName, urgency });
    await record.save();
    res.json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
