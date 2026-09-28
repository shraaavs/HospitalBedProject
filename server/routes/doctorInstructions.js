import express from 'express';
import mongoose from 'mongoose';
import DoctorInstruction from '../models/DoctorInstruction.js';
import Patient from '../models/Patient.js';
import Nurse from '../models/Nurse.js';
import Doctor from '../models/Doctor.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to seed initial realistic instructions linked to actual patients
const seedInitialInstructions = async () => {
  const count = await DoctorInstruction.countDocuments();
  if (count === 0) {
    const patients = await Patient.find().limit(5).lean();
    if (patients.length > 0) {
      const sampleOrders = [
        {
          instruction: 'Monitor SpO2 and BP every 2 hours. Notify on-call doctor if systolic BP > 160 or SpO2 < 92%.',
          priority: 'High',
          category: 'Vital Monitoring'
        },
        {
          instruction: 'Maintain IV Normal Saline at 75 mL/hr. Record strict intake/output balance at end of each shift.',
          priority: 'Medium',
          category: 'Medication & IV Fluid'
        },
        {
          instruction: 'Perform sterile surgical dressing change using povidone-iodine. Assess for erythema or discharge.',
          priority: 'Routine',
          category: 'Wound & Post-Op Care'
        },
        {
          instruction: 'Keep patient NPO after midnight for scheduled morning abdominal ultrasound.',
          priority: 'High',
          category: 'Diet & Nutrition'
        },
        {
          instruction: 'STAT: Administer Nebulization with Salbutamol 2.5mg + Budesonide 0.5mg immediately for acute wheezing.',
          priority: 'STAT / Critical',
          category: 'Medication & IV Fluid'
        }
      ];

      const docs = patients.map((p, idx) => {
        const order = sampleOrders[idx % sampleOrders.length];
        return {
          patientId: p._id,
          patientCustomId: p.patientId || `P-${p._id.toString().slice(-4)}`,
          patientName: p.fullName || p.name || 'Inpatient',
          ward: p.admissionSetup?.wardType || p.ward || 'General Ward',
          bedNumber: p.bedId?.bedNumber || p.bedNumber || 'Bed #01',
          doctorName: p.assignedDoctor || p.admissionSetup?.assignedDoctor || 'Dr. Sarah Jenkins',
          doctorDepartment: 'General Medicine',
          instructionCategory: order.category,
          instruction: order.instruction,
          priority: order.priority,
          status: idx === 0 ? 'Acknowledged' : idx === 2 ? 'Completed' : 'Pending',
          acknowledgedBy: idx === 0 ? {
            nurseName: 'Nurse Clara Vance (RN)',
            acknowledgedAt: new Date(Date.now() - 3600000)
          } : undefined,
          completedBy: idx === 2 ? {
            nurseName: 'Nurse Clara Vance (RN)',
            completedAt: new Date(Date.now() - 1800000)
          } : undefined,
          nursingRemarks: idx === 2 ? 'Incision dressing replaced with clean sterile pad; site clean without erythema.' : '',
          issuedAt: new Date(Date.now() - (idx + 1) * 7200000)
        };
      });

      await DoctorInstruction.insertMany(docs);
    }
  }
};

// @route   GET /api/doctor-instructions
// @desc    Get instructions with ward / patient / priority / status filters
// @access  Protected (Nurse, Doctor, Admin)
router.get('/', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    await seedInitialInstructions();
    const { patientId, patientCustomId, ward, priority, status, search } = req.query;

    let query = {};

    // Filter by patient if requested
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

    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { patientName: regex },
        { patientCustomId: regex },
        { doctorName: regex },
        { instruction: regex },
        { nursingRemarks: regex },
        { ward: regex }
      ];
    }

    const instructions = await DoctorInstruction.find(query)
      .populate('patientId', 'fullName patientId ward admissionSetup bedId')
      .sort({ issuedAt: -1, createdAt: -1 });

    res.json(instructions);
  } catch (error) {
    console.error('Error fetching doctor instructions:', error);
    res.status(500).json({ message: 'Server error retrieving doctor instructions: ' + error.message });
  }
});

// @route   GET /api/doctor-instructions/patient/:id
// @desc    Get all instructions for a specific patient
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

    const list = await DoctorInstruction.find(query).sort({ issuedAt: -1, createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Error fetching patient doctor instructions:', error);
    res.status(500).json({ message: 'Failed to retrieve patient instructions' });
  }
});

// @route   POST /api/doctor-instructions
// @desc    Create a new doctor instruction (Doctor / Admin) & trigger nurse notification
// @access  Protected (Doctor, Admin)
router.post('/', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const {
      patientId,
      patientCustomId,
      patientName,
      ward,
      bedNumber,
      instructionCategory,
      instruction,
      priority
    } = req.body;

    if (!instruction || !instruction.trim()) {
      return res.status(400).json({ message: 'Instruction text is required.' });
    }

    if (!patientId && !patientCustomId) {
      return res.status(400).json({ message: 'Patient selection is required.' });
    }

    // Resolve patient
    let patient = null;
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      patient = await Patient.findById(patientId);
    }
    if (!patient && patientCustomId) {
      patient = await Patient.findOne({ patientId: patientCustomId });
    }

    const finalPatientName = patient?.fullName || patient?.name || patientName || 'Inpatient';
    const finalPatientCustomId = patient?.patientId || patientCustomId || 'PAT-000';
    const finalWard = ward || patient?.admissionSetup?.wardType || patient?.ward || 'General Ward';
    const finalBed = bedNumber || patient?.bedId?.bedNumber || patient?.bedNumber || 'Assigned Bed';

    const newInstruction = new DoctorInstruction({
      patientId: patient ? patient._id : (patientId || null),
      patientCustomId: finalPatientCustomId,
      patientName: finalPatientName,
      ward: finalWard,
      bedNumber: finalBed,
      doctorId: req.user._id,
      doctorName: req.user.name ? (req.user.name.startsWith('Dr.') ? req.user.name : `Dr. ${req.user.name}`) : 'Attending Physician',
      doctorDepartment: req.user.department || 'General Medicine',
      instructionCategory: instructionCategory || 'General Nursing Care',
      instruction: instruction.trim(),
      priority: priority || 'Routine',
      status: 'Pending',
      issuedAt: new Date()
    });

    const saved = await newInstruction.save();

    // Generate real-time Notification for Nurse persona in MongoDB
    await Notification.create({
      title: `${priority === 'STAT / Critical' ? '🚨 STAT' : '🩺 NEW'} DOCTOR DIRECTIVE: ${finalPatientName} (${finalPatientCustomId})`,
      message: `Dr. ${req.user.name.replace(/^Dr\.\s*/i, '')} ordered [${saved.instructionCategory}]: "${saved.instruction}". Ward: ${finalWard} (Bed ${finalBed}). Priority: ${saved.priority}.`,
      category: 'Doctor Order',
      priority: saved.priority === 'STAT / Critical' ? 'Critical' : saved.priority === 'High' ? 'High' : 'Normal',
      recipientRole: 'Nurse',
      senderName: req.user.name,
      link: '/doctor-instructions'
    });

    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating doctor instruction:', error);
    res.status(500).json({ message: 'Server error saving doctor instruction: ' + error.message });
  }
});

// @route   PUT /api/doctor-instructions/:id/acknowledge
// @desc    Nurse acknowledges reading and taking responsibility for the directive
// @access  Protected (Nurse, Admin)
router.put('/:id/acknowledge', protect, requireRole(['Nurse', 'Admin']), async (req, res) => {
  try {
    const instruction = await DoctorInstruction.findById(req.params.id);
    if (!instruction) {
      return res.status(404).json({ message: 'Instruction directive not found.' });
    }

    instruction.status = 'Acknowledged';
    instruction.acknowledgedBy = {
      nurseId: req.user._id,
      nurseName: req.user.name || 'Staff Nurse',
      acknowledgedAt: new Date()
    };

    const updated = await instruction.save();
    res.json(updated);
  } catch (error) {
    console.error('Error acknowledging instruction:', error);
    res.status(500).json({ message: 'Server error acknowledging directive: ' + error.message });
  }
});

// @route   PUT /api/doctor-instructions/:id/complete
// @desc    Nurse completes the nursing action and logs optional nursing remarks
// @access  Protected (Nurse, Admin)
router.put('/:id/complete', protect, requireRole(['Nurse', 'Admin']), async (req, res) => {
  try {
    const { nursingRemarks, status = 'Completed' } = req.body;
    const instruction = await DoctorInstruction.findById(req.params.id);
    if (!instruction) {
      return res.status(404).json({ message: 'Instruction directive not found.' });
    }

    instruction.status = status;
    instruction.completedBy = {
      nurseId: req.user._id,
      nurseName: req.user.name || 'Staff Nurse',
      completedAt: new Date()
    };
    if (nursingRemarks !== undefined) {
      instruction.nursingRemarks = nursingRemarks.trim();
    }

    const updated = await instruction.save();
    res.json(updated);
  } catch (error) {
    console.error('Error completing instruction:', error);
    res.status(500).json({ message: 'Server error completing directive: ' + error.message });
  }
});

export default router;
