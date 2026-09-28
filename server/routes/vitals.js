import express from 'express';
import VitalLog from '../models/VitalLog.js';
import Patient from '../models/Patient.js';
import BedAllocation from '../models/BedAllocation.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Seed initial realistic historical vitals for patients if collection is empty
const seedSampleVitals = async () => {
  const count = await VitalLog.countDocuments();
  if (count === 0) {
    const sampleData = [
      {
        patientName: 'Henry Green',
        patientCustomId: 'PM-445901',
        wardType: 'ICU',
        bedNumber: 'ICU-01',
        nurseName: 'Nurse Clara Vance',
        temperature: 99.4,
        bloodPressureSys: 148,
        bloodPressureDia: 96,
        pulseRate: 112,
        oxygenSaturation: 88, // Critical < 90%
        respiratoryRate: 26,
        bloodSugar: 142,
        weight: 78,
        painScore: 6,
        isCritical: true,
        criticalFlags: ['Critical SpO₂ (88%) < 90%'],
        warningFlags: ['Stage 2 High Systolic BP (148 mmHg)', 'Elevated Heart Rate (112 bpm)', 'Moderate Pain Score (6/10)'],
        notes: 'Patient feels breathlessness on room air. 2L O2 administered via nasal cannula. Attending physician alerted.',
        recordedAt: new Date(Date.now() - 30 * 60 * 1000)
      },
      {
        patientName: 'Henry Green',
        patientCustomId: 'PM-445901',
        wardType: 'ICU',
        bedNumber: 'ICU-01',
        nurseName: 'Nurse Clara Vance',
        temperature: 98.6,
        bloodPressureSys: 138,
        bloodPressureDia: 88,
        pulseRate: 98,
        oxygenSaturation: 94,
        respiratoryRate: 20,
        bloodSugar: 130,
        weight: 78,
        painScore: 4,
        isCritical: false,
        criticalFlags: [],
        warningFlags: ['Low SpO₂ (94%)'],
        notes: 'SpO2 improved post-oxygen support. Patient resting.',
        recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000)
      },
      {
        patientName: 'Henry Green',
        patientCustomId: 'PM-445901',
        wardType: 'ICU',
        bedNumber: 'ICU-01',
        nurseName: 'Nurse David Kim',
        temperature: 98.8,
        bloodPressureSys: 142,
        bloodPressureDia: 90,
        pulseRate: 104,
        oxygenSaturation: 93,
        respiratoryRate: 22,
        bloodSugar: 125,
        weight: 78,
        painScore: 3,
        isCritical: false,
        criticalFlags: [],
        warningFlags: ['Stage 2 High Systolic BP (142 mmHg)', 'Low SpO₂ (93%)'],
        notes: 'Evening monitoring routine check.',
        recordedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      },
      {
        patientName: 'Sarah Mitchell',
        patientCustomId: 'PM-445912',
        wardType: 'General Ward',
        bedNumber: 'G-102',
        nurseName: 'Nurse Elena Woods',
        temperature: 98.4,
        bloodPressureSys: 128,
        bloodPressureDia: 82,
        pulseRate: 74,
        oxygenSaturation: 99,
        respiratoryRate: 16,
        bloodSugar: 105,
        weight: 64,
        painScore: 1,
        isCritical: false,
        criticalFlags: [],
        warningFlags: [],
        notes: 'Routine morning shift vitals. Patient is comfortable and ambulatory.',
        recordedAt: new Date(Date.now() - 45 * 60 * 1000)
      },
      {
        patientName: 'Sarah Mitchell',
        patientCustomId: 'PM-445912',
        wardType: 'General Ward',
        bedNumber: 'G-102',
        nurseName: 'Nurse Elena Woods',
        temperature: 98.6,
        bloodPressureSys: 132,
        bloodPressureDia: 84,
        pulseRate: 76,
        oxygenSaturation: 98,
        respiratoryRate: 16,
        bloodSugar: 112,
        weight: 64,
        painScore: 2,
        isCritical: false,
        criticalFlags: [],
        warningFlags: [],
        notes: 'Post-lunch vitals checked.',
        recordedAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      },
      {
        patientName: 'Robert King',
        patientCustomId: 'PM-445945',
        wardType: 'General Ward',
        bedNumber: 'G-104',
        nurseName: 'Nurse Maya Patel',
        temperature: 102.4, // Critical High Fever >= 102.0
        bloodPressureSys: 130,
        bloodPressureDia: 82,
        pulseRate: 108,
        oxygenSaturation: 97,
        respiratoryRate: 20,
        bloodSugar: 118,
        weight: 82,
        painScore: 5,
        isCritical: true,
        criticalFlags: ['High Fever (102.4°F)'],
        warningFlags: ['Elevated Heart Rate (108 bpm)', 'Moderate Pain Score (5/10)'],
        notes: 'High fever spike observed. Paracetamol 650mg administered IV. Cold sponge applied.',
        recordedAt: new Date(Date.now() - 1 * 60 * 60 * 1000)
      }
    ];

    await VitalLog.insertMany(sampleData);
  }
};

// @route   GET /api/vitals
// @desc    Get latest vitals for all patients or doctor's assigned patients
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { patientCustomId, patientId, criticalOnly, ward } = req.query;
    await seedSampleVitals();

    let query = {};
    if (patientCustomId) {
      query.patientCustomId = patientCustomId;
    }
    if (patientId) {
      query.patientId = patientId;
    }
    if (ward && ward !== 'All') {
      query.wardType = ward;
    }
    if (criticalOnly === 'true') {
      query.isCritical = true;
    }

    const vitals = await VitalLog.find(query)
      .populate('patientId')
      .populate('recordedBy')
      .sort({ recordedAt: -1 });

    res.json(vitals);
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ message: 'Server error fetching vitals' });
  }
});

// @route   GET /api/vitals/patient/:id
// @desc    Get historical vitals and trends for a specific patient
// @access  Protected
router.get('/patient/:id', protect, async (req, res) => {
  try {
    const targetId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(targetId);
    
    const conditions = [{ patientCustomId: targetId }];
    if (isObjectId) {
      conditions.push({ patientId: targetId });
    }

    const vitals = await VitalLog.find({ $or: conditions })
      .populate('recordedBy')
      .sort({ recordedAt: 1 }); // Chronological order for trending graph

    res.json(vitals);
  } catch (error) {
    console.error('Error fetching patient vitals history:', error);
    res.status(500).json({ message: 'Server error fetching vitals trends' });
  }
});

// @route   POST /api/vitals
// @desc    Record actual clinical vitals with nurse ID, patient ID, timestamp, and clinical threshold alerts
// @access  Protected (Nurse, Doctor, Admin)
router.post('/', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientCustomId,
      wardType,
      bedNumber,
      temperature,
      bloodPressureSys,
      bloodPressureDia,
      pulseRate,
      oxygenSaturation,
      respiratoryRate,
      bloodSugar,
      weight,
      painScore,
      notes,
      remarks,
      recordedAt
    } = req.body;

    if (!temperature || !pulseRate || !oxygenSaturation) {
      return res.status(400).json({ message: 'Temperature, Heart Rate / Pulse, and Oxygen Saturation (SpO₂) are required.' });
    }

    const sys = Number(bloodPressureSys) || 120;
    const dia = Number(bloodPressureDia) || 80;

    let finalPatientName = patientName;
    let finalPatientCustomId = patientCustomId;
    let finalWard = wardType || 'General Ward';
    let finalBed = bedNumber || 'Unassigned';
    let patientObjId = patientId;

    // Auto-enrich and link to Patient collection if patientId is provided
    if (patientId) {
      const patient = await Patient.findById(patientId);
      if (patient) {
        patientObjId = patient._id;
        if (!finalPatientName) finalPatientName = patient.fullName || patient.name;
        if (!finalPatientCustomId) finalPatientCustomId = patient.patientId;
        if (patient.admissionSetup?.wardType) finalWard = patient.admissionSetup.wardType;
        if (patient.ward) finalWard = patient.ward;
        if (patient.bedNumber) finalBed = patient.bedNumber;
        if (patient.bedId?.bedNumber) finalBed = patient.bedId.bedNumber;
      }
    } else if (patientCustomId) {
      const patient = await Patient.findOne({ patientId: patientCustomId });
      if (patient) {
        patientObjId = patient._id;
        if (!finalPatientName) finalPatientName = patient.fullName || patient.name;
        if (patient.admissionSetup?.wardType) finalWard = patient.admissionSetup.wardType;
        if (patient.ward) finalWard = patient.ward;
        if (patient.bedNumber) finalBed = patient.bedNumber;
      }
    }

    const userModel = req.user.role === 'Nurse' ? 'Nurse' : req.user.role === 'Doctor' ? 'Doctor' : 'User';

    const newLog = new VitalLog({
      patientId: patientObjId || undefined,
      patientName: finalPatientName || 'Assigned Patient',
      patientCustomId: finalPatientCustomId || 'PM-000000',
      wardType: finalWard,
      bedNumber: finalBed,
      recordedBy: req.user._id,
      recordedByModel: userModel,
      nurseName: req.user.name || 'Staff Nurse',
      temperature: Number(temperature),
      bloodPressureSys: sys,
      bloodPressureDia: dia,
      bloodPressure: `${sys}/${dia}`,
      pulseRate: Number(pulseRate),
      oxygenSaturation: Number(oxygenSaturation),
      respiratoryRate: Number(respiratoryRate) || 16,
      bloodSugar: bloodSugar !== null && bloodSugar !== undefined && bloodSugar !== '' ? Number(bloodSugar) : null,
      weight: weight !== null && weight !== undefined && weight !== '' ? Number(weight) : null,
      painScore: painScore !== null && painScore !== undefined && painScore !== '' ? Number(painScore) : 0,
      notes: remarks || notes || `Logged by ${req.user.name || 'Nurse'} (${req.user.role || 'Staff'})`,
      recordedAt: recordedAt ? new Date(recordedAt) : new Date()
    });

    const saved = await newLog.save();

    // Clinical threshold detection & Automated Real-time Alerts
    if (saved.isCritical) {
      const alertReasons = saved.criticalFlags.join(' • ');
      
      // 1. Alert Doctors for urgent clinical attention
      await Notification.create({
        title: `🚨 CRITICAL VITALS ALERT: ${saved.patientName} (${saved.patientCustomId})`,
        message: `Abnormal critical value in ${saved.wardType} (Bed ${saved.bedNumber}). Critical Flags: ${alertReasons}. Recorded by ${saved.nurseName}. Immediate physician review required.`,
        category: 'Critical Vitals',
        priority: 'Critical',
        recipientRole: 'Doctor',
        senderName: saved.nurseName,
        link: '/vitals'
      });

      // 2. Alert Nursing team on duty in that ward
      await Notification.create({
        title: `⚠️ CRITICAL PATIENT MONITORED: ${saved.patientName}`,
        message: `Vitals alert recorded in ${saved.wardType} (Bed ${saved.bedNumber}). Critical Flags: ${alertReasons}. Continuous vitals monitoring active.`,
        category: 'Critical Vitals',
        priority: 'Critical',
        recipientRole: 'Nurse',
        senderName: saved.nurseName,
        link: '/vitals'
      });
    }

    res.status(201).json(saved);
  } catch (error) {
    console.error('Error recording vitals in MongoDB:', error);
    res.status(500).json({ message: error.message || 'Server error recording vitals' });
  }
});

// @route   PUT /api/vitals/:id
// @desc    Disallow arbitrary modification of historical medical records to maintain clinical audit integrity
// @access  Protected
router.put('/:id', protect, async (req, res) => {
  return res.status(403).json({
    message: 'Audit Integrity Rule: Historical vital logs cannot be overwritten. To update vitals, please record a new reading with the current timestamp.'
  });
});

export default router;
