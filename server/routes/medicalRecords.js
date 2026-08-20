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

// POST a new medical record (vitals, diagnosis, etc)
// Accessible by Doctor, Nurse
router.post('/', protect, requireRole(['Doctor', 'Nurse']), async (req, res) => {
  const { patientId, vitals, diagnosis, treatment, notes } = req.body;
  try {
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient not found' });
    }

    const newRecord = new MedicalRecord({
      patientId,
      recordedBy: req.user._id,
      vitals,
      diagnosis,
      treatment,
      notes
    });

    const savedRecord = await newRecord.save();
    res.status(201).json(savedRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
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
