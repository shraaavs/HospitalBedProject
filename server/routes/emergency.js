import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import EmergencyPatient from '../models/EmergencyPatient.js';
import Patient from '../models/Patient.js';
import MedicalRecord from '../models/MedicalRecord.js';
import AdmissionBedRequest from '../models/AdmissionBedRequest.js';
import ResourceRequest from '../models/ResourceRequest.js';
import Doctor from '../models/Doctor.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// GET all emergency patients (Doctor assigned or general ER filter)
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, myPatients, search } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter['disposition.status'] = status;
    }

    if (priority && priority !== 'All') {
      filter.triagePriority = new RegExp(priority, 'i');
    }

    if (req.user.role === 'Doctor' && (myPatients === 'true' || myPatients === true)) {
      const docName = (req.user.name || '').replace(/^Dr\.\s*/i, '').trim();
      filter.$or = [
        { assignedDoctorId: req.user._id },
        { assignedDoctorName: req.user.name },
        { assignedDoctorName: `Dr. ${docName}` },
        { assignedDoctorName: { $regex: docName, $options: 'i' } }
      ];
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { patientName: searchRegex },
        { patientCustomId: searchRegex },
        { emergencyId: searchRegex },
        { chiefComplaint: searchRegex },
        { emergencyDiagnosis: searchRegex },
        { currentLocation: searchRegex }
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const emergencies = await EmergencyPatient.find(filter)
      .populate('patientId')
      .populate('allocatedBedId')
      .sort({ createdAt: -1 });

    res.json(emergencies);
  } catch (err) {
    console.error('Error fetching emergency patients:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET single emergency record
router.get('/:id', protect, async (req, res) => {
  try {
    const record = await EmergencyPatient.findById(req.params.id)
      .populate('patientId')
      .populate('allocatedBedId');

    if (!record) return res.status(404).json({ message: 'Emergency patient record not found' });
    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST register new emergency patient (Receptionist / ER Nurse)
router.post('/', protect, async (req, res) => {
    const {
      patientId,
      patientName,
      patientCustomId,
      age,
      gender,
      attendantName,
      attendantContact,
      arrivalMode,
      arrivalTime,
      arrivalNotes,
      triagePriority,
      emergencyCode,
      customEmergencyCode,
      assignedDoctorName,
      assignedNurseName,
      currentLocation,
      department,
      chiefComplaint,
      currentVitals
    } = req.body;

  try {
    const count = await EmergencyPatient.countDocuments();
    const emergencyId = `EMG-${9000 + count + 1}`;

    let linkedPatientId = patientId;
    let customId = patientCustomId;

    if (patientId) {
      const existingPat = await Patient.findById(patientId);
      if (existingPat) customId = existingPat.patientId;
    } else if (customId) {
      const existingPat = await Patient.findOne({ patientId: customId });
      if (existingPat) linkedPatientId = existingPat._id;
    } else {
      const newPat = new Patient({
        patientId: `PID-${Math.floor(100000 + Math.random() * 900000)}`,
        fullName: patientName,
        age: Number(age) || 40,
        gender: gender || 'Male',
        phone: attendantContact || 'Emergency Intake',
        emergencyContact: {
          name: attendantName || 'Attendant',
          phone: attendantContact || 'N/A',
          relationship: 'Emergency Contact'
        },
        status: 'Emergency'
      });
      const savedPat = await newPat.save();
      linkedPatientId = savedPat._id;
      customId = savedPat.patientId;
    }

    const docName = assignedDoctorName || 'Dr. Priya Sharma';
    let assignedDocId = req.user?._id;
    
    // Look up Doctor ID by name if present
    if (docName) {
      const cleanDoc = docName.replace(/^Dr\.\s*/i, '').trim();
      const docRecord = await Doctor.findOne({
        $or: [
          { name: docName },
          { name: `Dr. ${cleanDoc}` },
          { name: cleanDoc },
          { name: new RegExp(`^(\\s*Dr\\.?\\s*)?${cleanDoc}$`, 'i') }
        ]
      }).select('_id name department');
      if (docRecord) {
        assignedDocId = docRecord._id;
      }
    }

    const newRecord = new EmergencyPatient({
      emergencyId,
      patientId: linkedPatientId,
      patientName,
      patientCustomId: customId,
      age: Number(age) || 40,
      gender: gender || 'Male',
      attendantName: attendantName || '',
      attendantContact: attendantContact || '',
      arrivalMode: arrivalMode || 'Ambulance (108/EMS)',
      arrivalTime: arrivalTime ? new Date(arrivalTime) : new Date(),
      arrivalNotes: arrivalNotes || '',
      triagePriority: triagePriority || 'Red - Immediate / Resuscitation',
      emergencyCode: emergencyCode || 'Code Trauma (Major Multiple Trauma / MVA)',
      customEmergencyCode: customEmergencyCode || '',
      assignedDoctorId: assignedDocId,
      assignedDoctorName: docName,
      assignedNurseName: assignedNurseName || 'ER Staff Nurse',
      currentLocation: currentLocation || 'Emergency Trauma Bay 01',
      department: department || 'Emergency / Trauma',
      chiefComplaint: chiefComplaint || 'Emergency arrival requiring immediate clinical triage.',
      medicalHistory: { allergies: [], chronicConditions: [], pastSurgeries: [] },
      currentVitals: currentVitals || {
        heartRate: 110,
        bloodPressure: '140/90',
        respiratoryRate: 22,
        oxygenSaturation: 90,
        temperature: 98.6,
        painScore: 7,
        gcsScore: 15
      },
      emergencyDiagnosis: '',
      immediateTreatment: '',
      conditionStatus: 'Critical',
      disposition: {
        status: 'Active in ER',
        recommendedAction: 'Emergency intake registered. Awaiting primary medical evaluation by ER Doctor.',
        updatedAt: new Date()
      }
    });

    const saved = await newRecord.save();

    // Trigger high-priority broadcast Notification for all medical and front-desk portals
    try {
      const activeCode = emergencyCode === 'Other' && customEmergencyCode ? customEmergencyCode : (emergencyCode || 'Code Trauma');
      await Notification.create({
        title: `🚨 Emergency Intake: ${patientName} (${emergencyId}) [${activeCode}]`,
        message: `Emergency patient ${patientName} (${customId}) arrived via ${arrivalMode || 'Ambulance'}. Code: ${activeCode}. Priority: ${triagePriority}. Location: ${currentLocation || 'ER Bay'}. Assigned to ${docName}.`,
        category: 'Emergency Patient',
        priority: 'Critical',
        recipientRole: 'All',
        doctorName: docName,
        patientId: linkedPatientId,
        patientName,
        patientCustomId: customId,
        emergencyId,
        targetLink: '/emergency',
        link: '/emergency',
        isRead: false
      });
    } catch (notifErr) {
      console.error('Error creating emergency notification:', notifErr.message);
    }

    res.status(201).json(saved);
  } catch (err) {
    console.error('Error registering emergency:', err);
    res.status(400).json({ message: err.message });
  }
});

// POST /api/emergency/:id/assessment
// Doctor submits complete Emergency Clinical Assessment
router.post('/:id/assessment', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const {
      emergencyDiagnosis,
      immediateTreatment,
      criticalFindings,
      requiredBedType,
      requiredMedicalResources,
      emergencyMedicalNotes,
      treatmentInstructions,
      conditionStatus,
      currentVitals
    } = req.body;

    const record = await EmergencyPatient.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: 'Emergency patient record not found' });
    }

    const doctorName = req.user.name || 'Dr. Attending';

    record.emergencyDiagnosis = emergencyDiagnosis || record.emergencyDiagnosis;
    record.immediateTreatment = immediateTreatment || record.immediateTreatment;
    record.criticalFindings = criticalFindings || record.criticalFindings;
    record.requiredBedType = requiredBedType || record.requiredBedType;
    record.emergencyMedicalNotes = emergencyMedicalNotes || record.emergencyMedicalNotes;
    record.treatmentInstructions = treatmentInstructions || record.treatmentInstructions;
    if (conditionStatus) record.conditionStatus = conditionStatus;
    if (currentVitals) record.currentVitals = { ...record.currentVitals, ...currentVitals };

    if (Array.isArray(requiredMedicalResources)) {
      record.requiredMedicalResources = requiredMedicalResources;
    }

    record.actionsTaken.push({
      action: `Emergency Assessment: ${emergencyDiagnosis || 'Evaluation complete'}. Immediate Rx: ${immediateTreatment || 'Stabilization initiated'}.`,
      performedBy: doctorName,
      timestamp: new Date()
    });

    const saved = await record.save();

    // Link and store in MedicalRecord collection
    try {
      await MedicalRecord.create({
        patientId: record.patientId,
        patientCustomId: record.patientCustomId || record.emergencyId,
        doctorId: req.user._id,
        recordedBy: req.user._id,
        diagnosis: emergencyDiagnosis || 'Emergency Medical Assessment',
        diagnosisNotes: criticalFindings || '',
        severity: conditionStatus === 'Critical' ? 'Critical' : 'Severe',
        treatment: immediateTreatment || 'Emergency Stabilization',
        treatmentPlan: treatmentInstructions || 'Acute ER Management',
        doctorsMedicalNotes: emergencyMedicalNotes || '',
        chiefComplaint: record.chiefComplaint,
        clinicalObservations: `Emergency Vitals: BP ${record.currentVitals?.bloodPressure || 'N/A'}, Pulse ${record.currentVitals?.heartRate || 'N/A'} bpm, SpO2 ${record.currentVitals?.oxygenSaturation || 'N/A'}%. Location: ${record.currentLocation}.`,
        notes: `Emergency ID: ${record.emergencyId}. Immediate Treatment: ${immediateTreatment || 'Stabilized'}`
      });
    } catch (mrErr) {
      console.error('Notice: Could not automatically sync medical record:', mrErr.message);
    }

    res.json({
      success: true,
      message: 'Emergency clinical assessment recorded successfully.',
      emergency: saved
    });
  } catch (err) {
    console.error('Error saving emergency assessment:', err);
    res.status(500).json({ message: err.message || 'Server error saving emergency assessment' });
  }
});

// POST /api/emergency/:id/escalate-bed
// Doctor requests an ICU or specialized bed directly into the Bed Management pipeline (Single-use per emergency stay)
router.post('/:id/escalate-bed', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  try {
    const { requestedWard = 'ICU', bedType = 'ICU Bed', requestedBedNumber = '', reason, priority = 'Emergency' } = req.body;
    const record = await EmergencyPatient.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Emergency patient not found' });

    // Check if bed request was already submitted for this emergency patient
    const existingReq = await AdmissionBedRequest.findOne({
      $or: [
        { patientId: record.patientId },
        { patientCustomId: record.patientCustomId || record.emergencyId }
      ],
      status: { $in: ['Doctor Approved', 'Pending', 'Under Review', 'Allocated', 'Approved'] }
    });

    if (record.bedRequested || existingReq) {
      const refId = record.bedRequestRef || existingReq?.admissionId || 'ADM-EXISTING';
      return res.status(400).json({
        success: false,
        message: `An ICU Bed request has already been submitted for ${record.patientName} (Ref: ${refId}). Repeated bed requests are not allowed.`
      });
    }

    const count = await AdmissionBedRequest.countDocuments();
    const admissionId = `ADM${10000 + count + 1}`;
    const docName = req.user.name || record.assignedDoctorName || 'Dr. Attending';

    const newBedReq = new AdmissionBedRequest({
      admissionId,
      patientId: record.patientId,
      patientName: record.patientName,
      patientCustomId: record.patientCustomId || record.emergencyId,
      doctorId: req.user._id,
      doctorName: docName,
      doctorDepartment: 'Emergency / Trauma',
      admissionReason: reason || `Emergency ICU bed requested for ${record.patientName} (${record.emergencyDiagnosis || record.chiefComplaint})`,
      clinicalReason: `Acute emergency presentation: ${record.emergencyDiagnosis || record.chiefComplaint}. Current vitals: SpO2 ${record.currentVitals?.oxygenSaturation}%, BP ${record.currentVitals?.bloodPressure}.`,
      diagnosis: record.emergencyDiagnosis || record.chiefComplaint,
      wardType: requestedWard,
      requestedWard: requestedWard,
      bedType: bedType,
      allocatedBedNumber: requestedBedNumber,
      priority: priority,
      specialRequirements: ['Continuous Cardiac Monitoring', 'Emergency Resuscitation Access'],
      status: 'Doctor Approved',
      admissionStatus: 'Doctor Approved'
    });

    const savedBedReq = await newBedReq.save();

    // Mark bed request as submitted (single-use lock)
    record.bedRequested = true;
    record.bedRequestRef = admissionId;
    record.bedRequestedAt = new Date();

    // Log action on emergency record
    const bedDesc = requestedBedNumber ? `${requestedWard} Bed ${requestedBedNumber} (${bedType})` : `${requestedWard} (${bedType})`;
    record.actionsTaken.push({
      action: `Escalated to Bed Management: Requested ${bedDesc} - Ref ${admissionId}`,
      performedBy: docName,
      timestamp: new Date()
    });
    await record.save();

    // Auto-dispatch Notification to Nursing Staff, Front Desk & Bed Management
    try {
      // 1. Notification for Nurses (Station alert for urgent bed allocation)
      await Notification.create({
        title: `🚨 EMERGENCY ICU BED REQUEST: ${record.patientName} (${admissionId})`,
        message: `${docName} requested urgent ${requestedWard}${requestedBedNumber ? ` (Bed ${requestedBedNumber})` : ''} (${bedType}) for emergency patient ${record.patientName} (${record.patientCustomId || record.emergencyId}). Location: ${record.currentLocation}. Priority: Emergency. Immediate bed allocation requested.`,
        category: 'Emergency Bed Request',
        notificationType: 'Emergency Bed Request',
        priority: 'Critical',
        recipientRole: 'Nurse',
        patientId: record.patientId,
        patientName: record.patientName,
        patientCustomId: record.patientCustomId || record.emergencyId,
        requestId: admissionId,
        requestedWard: requestedWard,
        requestedBedType: bedType,
        requestedBedNumber: requestedBedNumber,
        doctorId: req.user._id,
        doctorName: docName,
        targetLink: '/nurse/notifications'
      });

      // 2. Notification for Receptionists & Admission Processing
      await Notification.create({
        title: `🚨 EMERGENCY ICU BED REQUEST: ${record.patientName} (${admissionId})`,
        message: `${docName} requested urgent ${requestedWard}${requestedBedNumber ? ` (Bed ${requestedBedNumber})` : ''} (${bedType}) for emergency patient ${record.patientName} located in ${record.currentLocation}. Priority: Emergency.`,
        category: 'Bed Request',
        notificationType: 'Bed Request',
        priority: 'Critical',
        recipientRole: 'Receptionist',
        patientId: record.patientId,
        patientName: record.patientName,
        patientCustomId: record.patientCustomId || record.emergencyId,
        requestId: admissionId,
        requestedWard: requestedWard,
        requestedBedType: bedType,
        requestedBedNumber: requestedBedNumber,
        doctorId: req.user._id,
        doctorName: docName,
        targetLink: '/receptionist/admissions'
      });

      // 3. Notification for Admin / Bed Management
      await Notification.create({
        title: `🚨 EMERGENCY BED ESCALATION: ${record.patientName} (${admissionId})`,
        message: `Direct doctor escalation for ${requestedWard}${requestedBedNumber ? ` (Bed ${requestedBedNumber})` : ''} (${bedType}) by ${docName}. Patient: ${record.patientName} (${record.patientCustomId || record.emergencyId}).`,
        category: 'Bed Allocation',
        notificationType: 'Bed Allocation',
        priority: 'Critical',
        recipientRole: 'Admin',
        patientId: record.patientId,
        patientName: record.patientName,
        patientCustomId: record.patientCustomId || record.emergencyId,
        requestId: admissionId,
        requestedWard: requestedWard,
        requestedBedType: bedType,
        requestedBedNumber: requestedBedNumber,
        doctorId: req.user._id,
        doctorName: docName,
        targetLink: '/beds'
      });
    } catch (notifErr) {
      console.error('Notification dispatch notice:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: `Emergency Bed Request ${admissionId} forwarded to Nursing Staff & Bed Management Administration.`,
      admissionRequest: savedBedReq
    });
  } catch (err) {
    console.error('Error escalating bed request:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/emergency/:id/allocate-bed
// Doctor/Admin directly allocates an available bed to this emergency patient
router.post('/:id/allocate-bed', protect, requireRole(['Doctor', 'Admin', 'Nurse']), async (req, res) => {
  try {
    const { bedId, bedNumber, requestedWard, notes } = req.body;
    const record = await EmergencyPatient.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Emergency patient not found' });

    // Find the target bed
    let bed = null;
    if (bedId) {
      bed = await (await import('../models/Bed.js')).default.findById(bedId);
    } else if (bedNumber) {
      bed = await (await import('../models/Bed.js')).default.findOne({ bedNumber: bedNumber.trim() });
    }

    if (!bed) {
      return res.status(404).json({ message: 'Selected bed not found in hospital inventory.' });
    }

    if (bed.status !== 'Available') {
      return res.status(400).json({ message: `Bed ${bed.bedNumber} is currently ${bed.status} and cannot be allocated.` });
    }

    const docName = req.user.name || record.assignedDoctorName || 'Dr. Attending';

    // 1. Link or update Patient model record
    let patient = null;
    if (record.patientId) {
      patient = await Patient.findById(record.patientId);
    }
    if (!patient && record.patientCustomId) {
      patient = await Patient.findOne({ patientId: record.patientCustomId });
    }
    if (!patient) {
      patient = await Patient.findOne({ fullName: new RegExp(`^${(record.patientName || '').trim()}$`, 'i') });
    }

    if (!patient) {
      patient = await Patient.create({
        patientId: record.patientCustomId || record.emergencyId || `PX-${Math.floor(100000 + Math.random() * 900000)}`,
        fullName: record.patientName,
        age: record.age,
        gender: record.gender || 'Male',
        contactNumber: record.attendantContact || '',
        status: 'Admitted',
        admissionStatus: 'Admitted',
        patientStatus: 'Active',
        bedId: bed._id,
        ward: bed.wardType,
        bedNumber: bed.bedNumber,
        admissionDate: new Date(),
        assignedDoctor: docName
      });
      record.patientId = patient._id;
    } else {
      patient.status = 'Admitted';
      patient.admissionStatus = 'Admitted';
      patient.patientStatus = 'Active';
      patient.bedId = bed._id;
      patient.ward = bed.wardType;
      patient.bedNumber = bed.bedNumber;
      if (!patient.admissionSetup) patient.admissionSetup = {};
      patient.admissionSetup.wardType = bed.wardType;
      patient.admissionSetup.admissionDate = new Date();
      patient.admissionSetup.assignedDoctor = docName;
      await patient.save();
    }

    // 2. Mark Bed as Occupied
    bed.status = 'Occupied';
    bed.patientName = record.patientName;
    bed.patientId = record.patientCustomId || record.emergencyId || patient.patientId;
    bed.admissionDate = new Date();
    bed.assignedDoctor = docName;
    bed.notes = notes || `Allocated for Emergency patient: ${record.emergencyDiagnosis || record.chiefComplaint}`;
    await bed.save();

    // 3. Update Emergency Patient Record
    record.allocatedBedId = bed._id;
    record.allocatedBedNumber = bed.bedNumber;
    record.allocatedWard = bed.wardType;
    record.currentLocation = `${bed.wardType} - Bed ${bed.bedNumber}`;
    record.bedRequested = true;
    record.bedRequestRef = `ALLOC-${bed.bedNumber}`;
    record.bedRequestedAt = new Date();
    
    if (record.disposition) {
      record.disposition.status = bed.wardType === 'ICU' ? 'Transferred to ICU' : 'Admitted to Ward';
      record.disposition.transferredToBed = `${bed.wardType} - Bed ${bed.bedNumber}`;
      record.disposition.updatedAt = new Date();
    }

    record.actionsTaken.push({
      action: `Bed Allocated Directly: ${bed.wardType} - ${bed.bedNumber} by ${docName}`,
      performedBy: docName,
      timestamp: new Date()
    });
    await record.save();

    // 4. Create BedAllocation log
    try {
      const BedAllocation = (await import('../models/BedAllocation.js')).default;
      await BedAllocation.create({
        patient: patient._id,
        bed: bed._id,
        allocatedBy: req.user._id,
        startTime: new Date()
      });
    } catch (allocErr) {
      console.warn('BedAllocation record log notice:', allocErr.message);
    }

    // 5. Auto-resolve any pending AdmissionBedRequests
    try {
      await AdmissionBedRequest.updateMany(
        {
          $or: [
            { patientId: patient._id },
            { patientCustomId: record.patientCustomId || record.emergencyId },
            { patientName: record.patientName }
          ],
          status: { $in: ['Doctor Approved', 'Pending Verification', 'Forwarded to Bed Management', 'Pending', 'Awaiting Bed Allocation'] }
        },
        {
          status: 'Bed Allocated',
          admissionStatus: 'Bed Allocated',
          allocatedBedId: bed._id,
          allocatedBedNumber: bed.bedNumber,
          allocatedWard: bed.wardType,
          allocationDate: new Date(),
          assignedBy: req.user._id
        }
      );
    } catch (admErr) {
      console.warn('AdmissionBedRequest auto-resolve notice:', admErr.message);
    }

    // 6. Broadcast Real-time Notifications to Nurse and Doctor
    try {
      // Station Notification for Nurses
      await Notification.create({
        title: `🛏️ BED ALLOCATED: ${record.patientName} (${bed.bedNumber})`,
        message: `${bed.wardType} Bed ${bed.bedNumber} has been allocated to Emergency patient ${record.patientName} (${record.patientCustomId || record.emergencyId}) by ${docName}. Patient location updated to ${record.currentLocation}.`,
        category: 'Bed Allocation',
        notificationType: 'Bed Allocation',
        priority: 'Critical',
        recipientRole: 'Nurse',
        patientId: patient._id,
        patientName: record.patientName,
        patientCustomId: record.patientCustomId || record.emergencyId,
        doctorId: req.user._id,
        doctorName: docName,
        targetLink: '/nurse/admissions'
      });

      // Notification for Receptionist & Bed Management
      await Notification.create({
        title: `🛏️ BED OCCUPIED: ${bed.bedNumber} (${record.patientName})`,
        message: `${bed.wardType} Bed ${bed.bedNumber} is now occupied by ${record.patientName} (${record.emergencyDiagnosis || record.chiefComplaint}).`,
        category: 'Bed Allocation',
        notificationType: 'Bed Allocation',
        priority: 'Normal',
        recipientRole: 'Admin',
        patientId: patient._id,
        patientName: record.patientName,
        patientCustomId: record.patientCustomId || record.emergencyId,
        doctorId: req.user._id,
        doctorName: docName,
        targetLink: '/beds'
      });
    } catch (notifErr) {
      console.warn('Notification broadcast notice:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Bed ${bed.bedNumber} (${bed.wardType}) successfully allocated to ${record.patientName}. Patient record synchronized for Doctors and Nurses.`,
      emergency: record,
      bed: bed,
      patient: patient
    });
  } catch (err) {
    console.error('Error allocating bed to emergency patient:', err);
    res.status(500).json({ message: err.message || 'Server error allocating bed' });
  }
});

// POST /api/emergency/:id/request-resource
// Doctor requests emergency medical equipment directly into Resource Allocation pipeline
router.post('/:id/request-resource', protect, requireRole(['Doctor', 'Admin']), async (req, res) => {
  const { resourceType, reason, quantity = 1, priority = 'Emergency' } = req.body;
  try {
    const record = await EmergencyPatient.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Emergency patient not found' });

    const docName = req.user.name || record.assignedDoctorName || 'Dr. Attending';
    const count = await ResourceRequest.countDocuments();
    const requestId = `RR-${1000 + count + 1}`;

    const newReq = new ResourceRequest({
      requestId,
      patientId: record.patientId,
      patientName: record.patientName,
      patientCustomId: record.patientCustomId || record.emergencyId,
      ward: 'Emergency',
      bedNumber: record.currentLocation,
      doctorId: req.user._id,
      doctorName: docName,
      doctorDepartment: 'Emergency',
      requestedBy: req.user._id,
      requestedByModel: 'Doctor',
      resourceType,
      quantity: Math.max(1, Number(quantity) || 1),
      reason: reason || `Emergency equipment requirement for ${record.patientName} (${record.emergencyDiagnosis || record.chiefComplaint})`,
      clinicalReason: reason || `Emergency equipment requirement for ${record.patientName} (${record.emergencyDiagnosis || record.chiefComplaint})`,
      priority: priority,
      urgency: priority,
      status: 'Pending',
      allocatedBy: 'Resource / BioMed Staff'
    });

    const savedReq = await newReq.save();

    // Link resource to emergency patient
    record.requestedResources.push({
      resourceType,
      status: 'Requested',
      requestedAt: new Date()
    });
    record.actionsTaken.push({
      action: `Emergency Resource Requested: ${quantity}x ${resourceType} - Ref ${requestId}`,
      performedBy: docName,
      timestamp: new Date()
    });
    await record.save();

    // Notify BioMed / Resource Coordinator
    try {
      await Notification.create({
        title: `🚨 CRITICAL RESOURCE NEEDED: ${resourceType} (${record.patientName})`,
        message: `Urgent emergency equipment needed in ${record.currentLocation} for ${record.patientName}. Requested by ${docName}. Immediate allocation requested.`,
        category: 'Resource Request',
        priority: 'Critical',
        recipientRole: 'Admin',
        senderName: docName,
        link: '/resources'
      });
    } catch (notifErr) {
      console.error('Notification dispatch notice:', notifErr.message);
    }

    res.json({
      success: true,
      message: `Emergency resource request for ${quantity}x ${resourceType} created (${requestId}) and routed to BioMed/Central Inventory.`,
      resourceRequest: savedReq,
      emergencyPatient: record
    });
  } catch (err) {
    console.error('Error requesting emergency resource:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST /api/emergency/:id/nurse-log
// Nurse records emergency observations, actions taken, critical findings, and alerts doctor
router.post('/:id/nurse-log', protect, requireRole(['Nurse', 'Admin', 'Doctor']), async (req, res) => {
  try {
    const {
      nursingAction,
      criticalFindings,
      emergencyNotes,
      conditionStatus,
      currentVitals,
      notifyDoctor = true
    } = req.body;

    const record = await EmergencyPatient.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Emergency patient record not found.' });

    const nurseName = req.user.name || 'ER Staff Nurse';

    if (conditionStatus) record.conditionStatus = conditionStatus;
    if (currentVitals) record.currentVitals = { ...record.currentVitals, ...currentVitals };
    if (criticalFindings) record.criticalFindings = criticalFindings;

    const actionText = nursingAction ? `Nurse Action: ${nursingAction}` : 'Emergency nurse check performed';
    record.actionsTaken.push({
      action: `${actionText}${emergencyNotes ? ` | Note: ${emergencyNotes}` : ''}`,
      performedBy: nurseName,
      timestamp: new Date()
    });

    const saved = await record.save();

    // Trigger urgent alert to attending doctor if flagged or critical
    if (notifyDoctor || conditionStatus === 'Critical' || conditionStatus === 'Severe' || conditionStatus === 'Unstable') {
      const docName = record.assignedDoctorName || 'Attending Physician';
      try {
        await Notification.create({
          title: `🚨 EMERGENCY NURSE ALERT: ${record.patientName} (${record.emergencyId})`,
          message: `${nurseName} flagged urgent update in ${record.currentLocation}: "${criticalFindings || nursingAction || 'Critical vital instability noted'}". Condition: ${record.conditionStatus}. Immediate doctor review requested.`,
          category: 'Clinical Alert',
          priority: 'Critical',
          recipientRole: 'Doctor',
          doctorName: docName,
          senderName: nurseName,
          link: '/emergency'
        });
      } catch (notifErr) {
        console.error('Error creating nurse emergency notification:', notifErr.message);
      }
    }

    res.json({
      success: true,
      message: 'Emergency nursing assessment logged and attending physician notified in MongoDB.',
      emergencyPatient: saved
    });
  } catch (err) {
    console.error('Error logging emergency nursing action:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// PUT /api/emergency/:id/coordinate
// Admin coordinates emergency beds, ICU availability, equipment, and staff assignments
router.put('/:id/coordinate', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const {
      allocatedBedNumber,
      allocatedWard,
      allocatedBedId,
      assignedDoctorName,
      assignedNurseName,
      currentLocation,
      conditionStatus,
      requiredMedicalResources,
      dispositionStatus,
      coordinationNotes
    } = req.body;

    const record = await EmergencyPatient.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Emergency patient record not found' });

    if (allocatedBedNumber !== undefined) record.allocatedBedNumber = allocatedBedNumber;
    if (allocatedWard !== undefined) record.allocatedWard = allocatedWard;
    if (allocatedBedId !== undefined) record.allocatedBedId = allocatedBedId || null;
    if (assignedDoctorName) record.assignedDoctorName = assignedDoctorName;
    if (assignedNurseName) record.assignedNurseName = assignedNurseName;
    if (currentLocation) record.currentLocation = currentLocation;
    if (conditionStatus) record.conditionStatus = conditionStatus;
    if (Array.isArray(requiredMedicalResources)) record.requiredMedicalResources = requiredMedicalResources;

    if (dispositionStatus) {
      record.disposition.status = dispositionStatus;
      record.disposition.updatedAt = new Date();
    }

    const adminName = req.user.name || 'Admin Coordinator';
    record.actionsTaken.push({
      action: `Operational Coordination by Admin: Bed ${allocatedBedNumber || 'Triage'}, Ward: ${allocatedWard || 'Emergency'}, Doc: ${assignedDoctorName || record.assignedDoctorName}, Nurse: ${assignedNurseName || record.assignedNurseName}. ${coordinationNotes ? `Notes: ${coordinationNotes}` : ''}`,
      performedBy: adminName,
      timestamp: new Date()
    });

    const saved = await record.save();

    // Trigger Notification for assigned Doctor and Nurse
    try {
      await Notification.create({
        title: `⚡ Emergency Coordination Update: ${record.patientName}`,
        message: `Admin ${adminName} updated coordination for ${record.patientName} (${record.emergencyId}). Bed: ${record.allocatedBedNumber || record.currentLocation}, Ward: ${record.allocatedWard}. Assigned: ${record.assignedDoctorName} & ${record.assignedNurseName}.`,
        category: 'Emergency Patient',
        priority: 'High',
        recipientRole: 'Doctor',
        doctorName: record.assignedDoctorName,
        senderName: adminName,
        link: '/emergency'
      });
    } catch (notifErr) {
      console.error('Notification dispatch notice:', notifErr.message);
    }

    res.json({
      success: true,
      message: 'Emergency operational coordination updated successfully in MongoDB.',
      emergencyPatient: saved
    });
  } catch (err) {
    console.error('Error in emergency operational coordination:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
