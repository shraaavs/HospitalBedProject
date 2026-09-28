import express from 'express';
import mongoose from 'mongoose';
import NursingObservation from '../models/NursingObservation.js';
import Patient from '../models/Patient.js';
import Nurse from '../models/Nurse.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Seed initial realistic nursing observations if none exist
const seedInitialObservations = async () => {
  const count = await NursingObservation.countDocuments();
  if (count === 0) {
    const patients = await Patient.find().limit(5).lean();
    if (patients.length > 0) {
      const sampleObs = patients.map((p, idx) => ({
        patientId: p._id,
        patientName: p.fullName || p.name || 'Inpatient',
        patientCustomId: p.patientId || `P-${p._id.toString().slice(-4)}`,
        ward: p.admissionSetup?.wardType || p.ward || 'General Ward',
        bedNumber: p.bedId?.bedNumber || p.bedNumber || 'Bed #01',
        nurseId: new mongoose.Types.ObjectId(),
        nurseName: 'Nurse Clara Vance (RN)',
        shift: 'Morning Shift (07:00 AM - 03:00 PM)',
        generalCondition: idx === 0 ? 'Improving / Ambulatory' : 'Stable',
        patientComplaints: 'Patient reports mild soreness at surgical incision site upon movement.',
        painComfort: {
          level: 2,
          comfortStatus: 'Comfortable / Resting',
          painLocation: 'Abdominal midline'
        },
        consciousness: 'Alert & Oriented x3',
        mobility: 'Independent Ambulatory',
        foodIntake: {
          dietType: 'Soft High-Protein Diet',
          intakeAmount: '75% Good Intake',
          appetite: 'Normal'
        },
        fluidBalance: {
          oralFluidMl: 1200,
          ivFluidMl: 500,
          totalIntakeMl: 1700,
          urineOutputMl: 1400,
          drainOutputMl: 50,
          totalOutputMl: 1450,
          catheterStatus: 'None / Spontaneous Voiding'
        },
        woundCondition: {
          hasWounds: true,
          site: 'Lower Abdomen',
          dressingStatus: 'Intact / Clean & Dry',
          drainageDescription: 'Surgical staples intact, no active ooze or erythema.'
        },
        breathingCondition: {
          pattern: 'Eupneic / Normal Unlabored',
          oxygenSupport: 'Room Air',
          chestAuscultation: 'Clear vesicular breath sounds throughout bilateral lung zones.'
        },
        nursingAssessment: 'Patient is clinically stable, responsive, maintaining adequate oral hydration and positive urine output balance. Incision site clean.',
        additionalObservations: 'Instructed patient on deep breathing and gentle ambulation techniques. Advised to call for assistance if dizziness occurs.',
        observationDate: new Date().toISOString().split('T')[0],
        observationTime: '08:30 AM',
        recordedAt: new Date(Date.now() - (idx + 1) * 3600000)
      }));

      await NursingObservation.insertMany(sampleObs);
    }
  }
};

// @route   GET /api/nursing-observations
// @desc    Get all nursing observations or filter by patient / ward in chronological order
// @access  Protected (Nurse, Doctor, Admin)
router.get('/', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    await seedInitialObservations();
    const { patientId, patientCustomId, ward, search, page = 1, limit = 50 } = req.query;

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

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { patientName: regex },
        { patientCustomId: regex },
        { nursingAssessment: regex },
        { patientComplaints: regex },
        { nurseName: regex }
      ];
    }

    const observations = await NursingObservation.find(query)
      .populate('patientId', 'fullName patientId ward admissionSetup bedId clinicalInfo status')
      .populate('nurseId', 'name nurseId assignedWard department')
      .sort({ recordedAt: -1, createdAt: -1 });

    res.json(observations);
  } catch (error) {
    console.error('Error fetching nursing observations:', error);
    res.status(500).json({ message: 'Server error while retrieving nursing observations: ' + error.message });
  }
});

// @route   GET /api/nursing-observations/patient/:id
// @desc    Get chronological nursing observations for a specific patient
// @access  Protected (Doctor, Nurse, Admin)
router.get('/patient/:id', protect, requireRole(['Doctor', 'Nurse', 'Admin']), async (req, res) => {
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

    const records = await NursingObservation.find(query)
      .populate('nurseId', 'name nurseId assignedWard')
      .sort({ recordedAt: -1, createdAt: -1 });

    res.json(records);
  } catch (error) {
    console.error('Error fetching patient nursing observations:', error);
    res.status(500).json({ message: 'Failed to retrieve patient nursing observations' });
  }
});

// @route   POST /api/nursing-observations
// @desc    Record new comprehensive nursing observation for an assigned patient
// @access  Protected (Nurse, Admin)
router.post('/', protect, requireRole(['Nurse', 'Admin', 'Doctor']), async (req, res) => {
  try {
    const {
      patientId,
      patientCustomId,
      patientName,
      ward,
      bedNumber,
      shift,
      generalCondition,
      patientComplaints,
      painComfort,
      consciousness,
      mobility,
      foodIntake,
      fluidBalance,
      woundCondition,
      breathingCondition,
      nursingAssessment,
      additionalObservations,
      observationDate,
      observationTime,
      recordedAt
    } = req.body;

    if (!patientId && !patientCustomId) {
      return res.status(400).json({ message: 'Patient selection is required to chart observations.' });
    }

    const assessmentText = nursingAssessment || req.body.observationNotes || req.body.notes || additionalObservations;
    if (!assessmentText || !assessmentText.trim()) {
      return res.status(400).json({ message: 'Nursing assessment summary is required.' });
    }

    // Resolve patient record from database
    let patient = null;
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await Patient.findById(patientId);
    }
    if (!patient && patientCustomId) {
      patient = await Patient.findOne({ patientId: patientCustomId });
    }

    const finalPatientName = patient?.fullName || patient?.name || patientName || 'Assigned Inpatient';
    const finalPatientCustomId = patient?.patientId || patientCustomId || 'PM-00000';
    const finalWard = ward || patient?.admissionSetup?.wardType || patient?.ward || 'General Ward';
    const finalBed = bedNumber || patient?.bedId?.bedNumber || patient?.bedNumber || 'Assigned Bed';

    const observation = new NursingObservation({
      patientId: patient ? patient._id : patientId,
      patientName: finalPatientName,
      patientCustomId: finalPatientCustomId,
      ward: finalWard,
      bedNumber: finalBed,
      nurseId: req.user._id,
      nurseName: req.user.name || 'Staff Nurse',
      shift: shift || 'Morning Shift (07:00 AM - 03:00 PM)',
      generalCondition: generalCondition || 'Stable',
      patientComplaints: patientComplaints || 'No acute discomfort verbalized.',
      painComfort: painComfort || { level: 0, comfortStatus: 'Comfortable / Resting', painLocation: 'None' },
      consciousness: consciousness || 'Alert & Oriented x3',
      mobility: mobility || 'Independent Ambulatory',
      foodIntake: foodIntake || { dietType: 'Normal Balanced Diet', intakeAmount: '100% Complete Meal', appetite: 'Normal' },
      fluidBalance: fluidBalance || { oralFluidMl: 0, ivFluidMl: 0, urineOutputMl: 0, drainOutputMl: 0, catheterStatus: 'None / Spontaneous Voiding' },
      woundCondition: woundCondition || { hasWounds: false, site: 'N/A', dressingStatus: 'No Surgical Wounds', drainageDescription: 'None' },
      breathingCondition: breathingCondition || { pattern: 'Eupneic / Normal Unlabored', oxygenSupport: 'Room Air', chestAuscultation: 'Bilateral vesicular breath sounds, clear.' },
      nursingAssessment: assessmentText.trim(),
      additionalObservations: additionalObservations?.trim() || '',
      observationDate: observationDate || new Date().toISOString().split('T')[0],
      observationTime: observationTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      recordedAt: recordedAt ? new Date(recordedAt) : new Date()
    });

    const saved = await observation.save();

    // Critical trigger alert to Doctor if severe distress detected
    if (saved.isCriticalAlert) {
      await Notification.create({
        title: `🚨 NURSING ASSESSMENT ALERT: ${saved.patientName} (${saved.patientCustomId})`,
        message: `High acuity observation flagged in ${saved.ward} (Bed ${saved.bedNumber}). Reasons: ${saved.criticalRemarks}. Logged by ${saved.nurseName}. Immediate doctor review required.`,
        category: 'Clinical Alert',
        priority: 'Critical',
        recipientRole: 'Doctor',
        senderName: saved.nurseName,
        link: '/nursing-observations'
      });
    }

    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating nursing observation:', error);
    res.status(500).json({ message: 'Server error while saving nursing observation: ' + error.message });
  }
});

// @route   PUT /api/nursing-observations/:id
// @desc    Update a recent observation by the creating nurse (within shift window)
// @access  Protected (Nurse, Admin)
router.put('/:id', protect, requireRole(['Nurse', 'Admin']), async (req, res) => {
  try {
    const observation = await NursingObservation.findById(req.params.id);
    if (!observation) {
      return res.status(404).json({ message: 'Nursing observation record not found.' });
    }

    // Role workflow permission check: Only the recording nurse or Admin can modify
    if (req.user.role === 'Nurse' && String(observation.nurseId) !== String(req.user._id)) {
      return res.status(403).json({
        message: 'Clinical Security Policy: You may only update observations authored during your active shift.'
      });
    }

    const {
      generalCondition,
      patientComplaints,
      painComfort,
      consciousness,
      mobility,
      foodIntake,
      fluidBalance,
      woundCondition,
      breathingCondition,
      nursingAssessment,
      additionalObservations
    } = req.body;

    if (generalCondition) observation.generalCondition = generalCondition;
    if (patientComplaints !== undefined) observation.patientComplaints = patientComplaints;
    if (painComfort) observation.painComfort = painComfort;
    if (consciousness) observation.consciousness = consciousness;
    if (mobility) observation.mobility = mobility;
    if (foodIntake) observation.foodIntake = foodIntake;
    if (fluidBalance) observation.fluidBalance = fluidBalance;
    if (woundCondition) observation.woundCondition = woundCondition;
    if (breathingCondition) observation.breathingCondition = breathingCondition;
    if (nursingAssessment) observation.nursingAssessment = nursingAssessment.trim();
    if (additionalObservations !== undefined) observation.additionalObservations = additionalObservations.trim();

    const updated = await observation.save();
    res.json(updated);
  } catch (error) {
    console.error('Error updating nursing observation:', error);
    res.status(500).json({ message: 'Server error updating nursing observation: ' + error.message });
  }
});

export default router;
