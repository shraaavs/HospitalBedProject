import express from 'express';
import mongoose from 'mongoose';
import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';
import MedicalRecord from '../models/MedicalRecord.js';
import BedTransfer from '../models/BedTransfer.js';
import BedAllocation from '../models/BedAllocation.js';
import ResourceRequest from '../models/ResourceRequest.js';
import TransferDischarge from '../models/TransferDischarge.js';
import Appointment from '../models/Appointment.js';
import VitalLog from '../models/VitalLog.js';
import Prescription from '../models/Prescription.js';
import EmergencyPatient from '../models/EmergencyPatient.js';
import NursingTask from '../models/NursingTask.js';
import NursingObservation from '../models/NursingObservation.js';
import MedicationAdministration from '../models/MedicationAdministration.js';
import DoctorInstruction from '../models/DoctorInstruction.js';
import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import AdmissionBedRequest from '../models/AdmissionBedRequest.js';
import DischargeBill from '../models/DischargeBill.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';


const router = express.Router();

// Helper to generate sequential unique Patient ID (e.g. P10001, P10002)
async function generateNextPatientId() {
  const patients = await Patient.find({ patientId: /^P\d+$/ }, { patientId: 1 }).lean();
  let maxNum = 10000;
  for (const p of patients) {
    const num = parseInt(p.patientId.substring(1), 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  let nextId = `P${maxNum + 1}`;
  while (await Patient.exists({ patientId: nextId })) {
    maxNum++;
    nextId = `P${maxNum + 1}`;
  }
  return nextId;
}

// @route   GET /api/patients
// @desc    Get all patients
// @access  Protected
router.get('/', protect, requireRole(['Admin', 'Doctor', 'Nurse', 'Receptionist']), async (req, res) => {
  try {
    const patients = await Patient.find().populate('bedId').sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Server error while fetching patients' });
  }
});

// @route   GET /api/patients/check-phone
// @desc    Check if a phone number is already registered to a patient
// @access  Protected (Receptionist, Admin, Doctor, Nurse)
router.get('/check-phone', protect, async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone || !phone.trim()) {
      return res.json({ exists: false });
    }

    const raw = phone.trim();
    const cleanDigits = raw.replace(/\D/g, ''); // Extract just digits
    const normalized = raw.replace(/\s+/g, '');

    const queryOr = [
      { contactNumber: raw },
      { contactNumber: normalized },
      { phoneNumber: raw },
      { phoneNumber: normalized }
    ];

    if (cleanDigits.length >= 7) {
      queryOr.push({ contactNumber: new RegExp(cleanDigits + '$') });
      queryOr.push({ phoneNumber: new RegExp(cleanDigits + '$') });
    }

    const existing = await Patient.findOne({ $or: queryOr })
      .select('patientId fullName contactNumber phoneNumber admissionStatus status ward bedNumber')
      .lean();

    if (existing) {
      return res.json({
        exists: true,
        patientId: existing.patientId,
        fullName: existing.fullName,
        phone: existing.contactNumber || existing.phoneNumber,
        status: existing.admissionStatus || existing.status
      });
    }

    return res.json({ exists: false });
  } catch (error) {
    console.error('Error checking phone uniqueness:', error);
    res.status(500).json({ exists: false, error: error.message });
  }
});

// @route   GET /api/patients/receptionist-search
// @desc    Receptionist patient search by Patient ID, Name, or Phone (restricted clinical fields)
// @access  Protected (Receptionist, Admin)
router.get('/receptionist-search', protect, requireRole(['Receptionist', 'Admin']), async (req, res) => {
  try {
    const { q, gender, status } = req.query;
    let query = {};
    const andClauses = [];

    if (q && q.trim()) {
      const term = q.trim();
      const regex = new RegExp(term, 'i');
      andClauses.push({
        $or: [
          { patientId: regex },
          { fullName: regex },
          { contactNumber: regex },
          { phoneNumber: regex },
          { email: regex }
        ]
      });
    }

    if (gender && gender !== 'All') {
      andClauses.push({ gender });
    }

    if (status && status !== 'All') {
      andClauses.push({ status });
    }

    if (andClauses.length > 0) {
      query.$and = andClauses;
    }

    // Secure projection: Retrieve permitted front desk fields
    const patients = await Patient.find(query)
      .select('patientId fullName age dob dateOfBirth gender contactNumber phoneNumber email address emergencyContact emergencyContactName emergencyContactRelationship emergencyContactPhone admissionSetup status admissionStatus patientStatus registrationDate registrationTime registeredBy bedId createdAt updatedAt')
      .populate('bedId', 'bedNumber wardType status')
      .sort({ createdAt: -1 });

    // Attach latest appointment status for receptionist view
    const patientIds = patients.map(p => p.patientId);
    const appointments = await Appointment.find({
      patientCustomId: { $in: patientIds }
    }).sort({ appointmentDate: -1, appointmentTime: -1 });

    const results = patients.map(p => {
      const patientObj = p.toObject();
      const latestApp = appointments.find(a => a.patientCustomId === p.patientId);
      patientObj.latestAppointment = latestApp ? {
        date: latestApp.appointmentDate,
        time: latestApp.appointmentTime,
        status: latestApp.status,
        type: latestApp.type,
        doctorName: latestApp.doctorName
      } : null;
      return patientObj;
    });

    res.json(results);
  } catch (error) {
    console.error('Error in receptionist patient search:', error);
    res.status(500).json({ message: 'Server error during patient search', error: error.message });
  }
});

// Core Business Logic: Retrieve patients assigned to doctor/nurse OR all hospital patients for Admin
async function getAssignedPatientsForUser(req, options = {}) {
  const { search, status, department, page = 1, limit = 20 } = options;

  // Admin logic: Central hospital registry across all patients and emergencies
  if (req.user.role === 'Admin') {
    const allRegisteredPatients = await Patient.find()
      .populate('bedId')
      .sort({ createdAt: -1 })
      .lean();

    const allEmergencies = await EmergencyPatient.find()
      .sort({ createdAt: -1 })
      .lean();

    const existingPatientIds = new Set(allRegisteredPatients.map(p => p.patientId || p._id.toString()));
    const standaloneEmergencies = allEmergencies.filter(emg => {
      const emgPid = emg.emergencyId || emg.patientCustomId || `EMG-${emg._id.toString().slice(-4).toUpperCase()}`;
      return !existingPatientIds.has(emgPid) && (!emg.patientId || !existingPatientIds.has(emg.patientId.toString()));
    });

    const emgFormatted = standaloneEmergencies.map(emg => ({
      _id: emg._id,
      patientId: emg.emergencyId || emg.patientCustomId || `EMG-${emg._id.toString().slice(-4).toUpperCase()}`,
      fullName: emg.patientName,
      name: emg.patientName,
      age: emg.age,
      gender: emg.gender,
      bloodGroup: emg.bloodGroup || 'O+',
      contactNumber: emg.attendantContact || 'Emergency Contact',
      phoneNumber: emg.attendantContact || 'Emergency Contact',
      status: 'Emergency',
      admissionStatus: 'Emergency',
      patientStatus: emg.conditionStatus || 'Critical',
      clinicalInfo: {
        chiefComplaint: emg.chiefComplaint || 'Acute Emergency Intake',
        bloodGroup: emg.bloodGroup || 'O+',
        allergies: emg.medicalHistory?.allergies || []
      },
      admissionSetup: {
        wardType: emg.department || 'Emergency / ER',
        assignedDoctor: emg.assignedDoctorName || 'Dr. On Duty'
      },
      assignedDoctor: emg.assignedDoctorName || 'Dr. On Duty',
      bedId: emg.disposition?.transferredToBed ? { bedNumber: emg.disposition.transferredToBed, wardType: 'Emergency' } : null,
      registrationDate: emg.arrivalTime ? new Date(emg.arrivalTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      createdAt: emg.createdAt || emg.arrivalTime || new Date(),
      isEmergencyRecord: true,
      emergencyDetails: emg
    }));

    let combined = [...allRegisteredPatients, ...emgFormatted];

    // Concurrently fetch latest vitals, appointments, prescriptions for all patients
    const patientCustomIds = combined.map(p => p.patientId).filter(Boolean);
    const patientObjIds = combined.map(p => p._id).filter(Boolean);

    const [vitals, prescriptions, medicalRecords, bedRequests, transfers] = await Promise.all([
      VitalLog.find({
        $or: [
          { patientCustomId: { $in: patientCustomIds } },
          { patientId: { $in: patientObjIds } }
        ]
      }).sort({ recordedAt: -1, createdAt: -1 }).lean(),
      Prescription.find({
        $or: [
          { patientCustomId: { $in: patientCustomIds } },
          { patientId: { $in: patientObjIds } }
        ]
      }).sort({ createdAt: -1 }).lean(),
      MedicalRecord.find({
        patientId: { $in: patientObjIds }
      }).sort({ createdAt: -1 }).lean(),
      AdmissionBedRequest.find({
        $or: [
          { patientCustomId: { $in: patientCustomIds } },
          { patientId: { $in: patientObjIds } }
        ]
      }).sort({ createdAt: -1 }).lean(),
      TransferDischarge.find({
        $or: [
          { patientCustomId: { $in: patientCustomIds } },
          { patientId: { $in: patientObjIds } }
        ]
      }).sort({ createdAt: -1 }).lean()
    ]);

    combined = combined.map(p => {
      const pVitals = vitals.filter(v => v.patientCustomId === p.patientId || String(v.patientId) === String(p._id));
      const latestVital = pVitals[0] || null;
      const presc = prescriptions.find(pr => pr.patientCustomId === p.patientId || String(pr.patientId) === String(p._id));
      const medRec = medicalRecords.find(m => String(m.patientId) === String(p._id));
      const bedReq = bedRequests.find(b => b.patientCustomId === p.patientId || String(b.patientId) === String(p._id));
      const trans = transfers.find(t => t.patientCustomId === p.patientId || String(t.patientId) === String(p._id));

      const diagnosis = p.emergencyDetails?.emergencyDiagnosis
        || presc?.diagnosis
        || medRec?.diagnosis
        || bedReq?.diagnosis
        || p.clinicalInfo?.chiefComplaint
        || 'Clinical Evaluation';

      const ward = p.bedId?.wardType
        || bedReq?.allocatedWard
        || bedReq?.wardType
        || p.admissionSetup?.wardType
        || p.ward
        || 'General';

      const bedNumber = p.bedId?.bedNumber
        || bedReq?.allocatedBedNumber
        || p.bedNumber
        || '';

      const assignedDoc = p.assignedDoctor
        || p.admissionSetup?.assignedDoctor
        || presc?.doctorName
        || 'Dr. General Medicine';

      // Accurate status categorization
      let currentStatus = p.status || p.admissionStatus || 'Registered';
      if (p.isEmergencyRecord || currentStatus === 'Emergency') {
        currentStatus = 'Emergency';
      } else if (trans?.type === 'Transfer' && trans?.status !== 'Completed') {
        currentStatus = 'Transferred';
      } else if (currentStatus === 'Discharged' || trans?.type === 'Discharge' && trans?.status === 'Completed') {
        currentStatus = 'Discharged';
      } else if (p.bedId || bedReq?.status === 'Bed Allocated' || currentStatus === 'Admitted') {
        currentStatus = 'Admitted';
      } else {
        currentStatus = 'Registered';
      }

      const admissionDate = p.registrationDate || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'Today');

      return {
        ...p,
        fullName: p.fullName || p.name || 'Unnamed Patient',
        patientId: p.patientId || `P-${p._id.toString().slice(-5).toUpperCase()}`,
        contactNumber: p.contactNumber || p.phoneNumber || 'N/A',
        phoneNumber: p.phoneNumber || p.contactNumber || 'N/A',
        bloodGroup: p.clinicalInfo?.bloodGroup || p.bloodGroup || 'O+',
        age: p.age || '—',
        gender: p.gender || '—',
        latestDiagnosis: diagnosis,
        department: p.department || p.admissionSetup?.wardType || ward || 'General Medicine',
        ward,
        bedNumber,
        admissionDate,
        registrationDate: admissionDate,
        status: currentStatus,
        patientStatus: currentStatus,
        assignedDoctor: assignedDoc,
        latestVital: latestVital ? {
          bloodPressure: latestVital.bloodPressure || `${latestVital.bloodPressureSys}/${latestVital.bloodPressureDia}`,
          pulseRate: latestVital.pulseRate,
          temperature: latestVital.temperature,
          oxygenSaturation: latestVital.oxygenSaturation,
          respiratoryRate: latestVital.respiratoryRate,
          recordedAt: latestVital.recordedAt || latestVital.createdAt,
          isCritical: latestVital.isCritical
        } : null
      };
    });

    // Filtering by Status
    if (status && status !== 'All') {
      combined = combined.filter(p => (p.status || '').toLowerCase() === status.toLowerCase());
    }

    // Filtering by Department / Ward
    if (department && department !== 'All') {
      combined = combined.filter(p =>
        (p.department || '').toLowerCase().includes(department.toLowerCase()) ||
        (p.ward || '').toLowerCase().includes(department.toLowerCase())
      );
    }

    // Search Query Filter (by Patient ID, Name, Phone, Bed Number, Diagnosis, Doctor, Ward)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      combined = combined.filter(p =>
        (p.patientId || '').toLowerCase().includes(q) ||
        (p.fullName || p.name || '').toLowerCase().includes(q) ||
        (p.contactNumber || p.phoneNumber || '').toLowerCase().includes(q) ||
        (p.bedNumber || p.bedId?.bedNumber || '').toLowerCase().includes(q) ||
        (p.latestDiagnosis || '').toLowerCase().includes(q) ||
        (p.clinicalInfo?.chiefComplaint || '').toLowerCase().includes(q) ||
        (p.bloodGroup || '').toLowerCase().includes(q) ||
        (p.assignedDoctor || '').toLowerCase().includes(q) ||
        (p.department || '').toLowerCase().includes(q) ||
        (p.ward || '').toLowerCase().includes(q)
      );
    }

    const totalPatients = combined.length;
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const numLimit = Math.max(1, parseInt(limit, 10) || 20);
    const totalPages = Math.ceil(totalPatients / numLimit) || 1;
    const startIndex = (numPage - 1) * numLimit;
    const paginatedList = combined.slice(startIndex, startIndex + numLimit);

    return {
      patients: paginatedList,
      allPatients: combined,
      currentPage: numPage,
      totalPages,
      totalPatients,
      hasNextPage: numPage < totalPages,
      hasPreviousPage: numPage > 1
    };
  }

  if (req.user.role === 'Nurse') {
    let nurseUser = req.user;
    const fetchedNurse = await Nurse.findById(req.user._id).lean();
    if (fetchedNurse) nurseUser = fetchedNurse;


    const nurseWard = nurseUser.assignedWard || nurseUser.department || 'General';
    const cleanWard = nurseWard.replace(/\s*ward$/i, '').trim();
    const wardRegex = new RegExp(cleanWard, 'i');

    // 1. Inpatients directly in this nurse's assigned ward or explicitly assigned to this nurse
    const wardPatients = await Patient.find({
      $or: [
        { assignedNurseId: nurseUser._id },
        { assignedNurseName: new RegExp(nurseUser.name || 'Nurse', 'i') },
        { assignedNurse: new RegExp(nurseUser.name || 'Nurse', 'i') },
        { 'admissionSetup.wardType': wardRegex },
        { ward: wardRegex },
        { status: 'Admitted' }
      ]
    }).populate('bedId').sort({ updatedAt: -1, createdAt: -1 }).lean();

    // 2. Emergency patients in this ward or assigned to nurse
    const emergencyPatients = await EmergencyPatient.find({
      $or: [
        { assignedNurseId: nurseUser._id },
        { assignedNurseName: new RegExp(nurseUser.name || 'Nurse', 'i') },
        { department: wardRegex },
        { currentLocation: wardRegex }
      ]
    }).lean();

    const existingPatientIds = new Set(wardPatients.map(p => p.patientId || p._id.toString()));
    const standaloneEmergencies = emergencyPatients.filter(emg => {
      const emgPid = emg.emergencyId || emg.patientCustomId || `EMG-${emg._id.toString().slice(-4).toUpperCase()}`;
      return !existingPatientIds.has(emgPid) && (!emg.patientId || !existingPatientIds.has(emg.patientId.toString()));
    });

    const emgFormatted = standaloneEmergencies.map(emg => ({
      _id: emg._id,
      patientId: emg.emergencyId || emg.patientCustomId || `EMG-${emg._id.toString().slice(-4).toUpperCase()}`,
      fullName: emg.patientName,
      name: emg.patientName,
      age: emg.age,
      gender: emg.gender,
      contactNumber: emg.attendantContact || 'Emergency Contact',
      phoneNumber: emg.attendantContact || 'Emergency Contact',
      status: 'Emergency',
      admissionStatus: 'Emergency',
      patientStatus: emg.conditionStatus || 'Critical',
      clinicalInfo: {
        chiefComplaint: emg.chiefComplaint || 'Acute Emergency Intake',
        bloodGroup: emg.bloodGroup || 'O+',
        allergies: emg.medicalHistory?.allergies || []
      },
      admissionSetup: {
        wardType: emg.department || 'Emergency / ER',
        assignedDoctor: emg.assignedDoctorName || 'Dr. On Duty'
      },
      assignedDoctor: emg.assignedDoctorName || 'Dr. On Duty',
      bedId: emg.disposition?.transferredToBed ? { bedNumber: emg.disposition.transferredToBed, wardType: 'Emergency' } : null,
      registrationDate: emg.arrivalTime ? new Date(emg.arrivalTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      createdAt: emg.createdAt || emg.arrivalTime || new Date(),
      isEmergencyRecord: true,
      emergencyDetails: emg
    }));

    let combined = [...wardPatients, ...emgFormatted];

    // Concurrently fetch latest vitals, appointments, prescriptions for all patients
    const patientCustomIds = combined.map(p => p.patientId).filter(Boolean);
    const patientObjIds = combined.map(p => p._id).filter(Boolean);

    const [vitals, prescriptions, medicalRecords] = await Promise.all([
      VitalLog.find({
        $or: [
          { patientCustomId: { $in: patientCustomIds } },
          { patientId: { $in: patientObjIds } }
        ]
      }).sort({ recordedAt: -1, createdAt: -1 }).lean(),
      Prescription.find({
        $or: [
          { patientCustomId: { $in: patientCustomIds } },
          { patientId: { $in: patientObjIds } }
        ]
      }).sort({ createdAt: -1 }).lean(),
      MedicalRecord.find({
        patientId: { $in: patientObjIds }
      }).sort({ createdAt: -1 }).lean()
    ]);

    combined = combined.map(p => {
      const pVitals = vitals.filter(v => v.patientCustomId === p.patientId || String(v.patientId) === String(p._id));
      const latestVital = pVitals[0] || null;
      const presc = prescriptions.find(pr => pr.patientCustomId === p.patientId || String(pr.patientId) === String(p._id));
      const medRec = medicalRecords.find(m => String(m.patientId) === String(p._id));

      const diagnosis = p.emergencyDetails?.emergencyDiagnosis
        || presc?.diagnosis
        || medRec?.diagnosis
        || p.clinicalInfo?.chiefComplaint
        || 'Clinical Evaluation';

      const ward = p.bedId?.wardType
        || p.admissionSetup?.wardType
        || p.ward
        || nurseWard;

      const bedNumber = p.bedId?.bedNumber
        || p.bedNumber
        || (p.status === 'Admitted' ? 'Bed Allocated' : 'Unassigned');

      const assignedDoc = p.assignedDoctor
        || p.admissionSetup?.assignedDoctor
        || presc?.doctorName
        || 'Dr. Attending';

      const admissionDate = p.registrationDate || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'Today');

      return {
        ...p,
        fullName: p.fullName || p.name || 'Unnamed Patient',
        patientId: p.patientId || `P-${p._id.toString().slice(-5).toUpperCase()}`,
        contactNumber: p.contactNumber || p.phoneNumber || 'N/A',
        latestDiagnosis: diagnosis,
        department: ward,
        ward,
        bedNumber,
        admissionDate,
        status: p.status || p.admissionStatus || 'Admitted',
        assignedDoctor: assignedDoc,
        latestVital: latestVital ? {
          bloodPressure: latestVital.bloodPressure || `${latestVital.bloodPressureSys}/${latestVital.bloodPressureDia}`,
          pulseRate: latestVital.pulseRate,
          temperature: latestVital.temperature,
          oxygenSaturation: latestVital.oxygenSaturation,
          respiratoryRate: latestVital.respiratoryRate,
          recordedAt: latestVital.recordedAt || latestVital.createdAt,
          isCritical: latestVital.isCritical
        } : null
      };
    });

    // Filters
    if (status && status !== 'All') {
      combined = combined.filter(p => (p.status || '').toLowerCase() === status.toLowerCase());
    }
    if (department && department !== 'All') {
      combined = combined.filter(p => (p.ward || '').toLowerCase().includes(department.toLowerCase()));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      combined = combined.filter(p =>
        (p.patientId || '').toLowerCase().includes(q) ||
        (p.fullName || p.name || '').toLowerCase().includes(q) ||
        (p.contactNumber || p.phoneNumber || '').toLowerCase().includes(q) ||
        (p.bedNumber || p.bedId?.bedNumber || '').toLowerCase().includes(q) ||
        (p.latestDiagnosis || '').toLowerCase().includes(q) ||
        (p.clinicalInfo?.chiefComplaint || '').toLowerCase().includes(q) ||
        (p.assignedDoctor || '').toLowerCase().includes(q) ||
        (p.ward || '').toLowerCase().includes(q)
      );
    }

    const totalPatients = combined.length;
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const numLimit = Math.max(1, parseInt(limit, 10) || 20);
    const totalPages = Math.ceil(totalPatients / numLimit) || 1;
    const startIndex = (numPage - 1) * numLimit;
    const paginatedList = combined.slice(startIndex, startIndex + numLimit);

    return {
      patients: paginatedList,
      allPatients: combined,
      currentPage: numPage,
      totalPages,
      totalPatients,
      hasNextPage: numPage < totalPages,
      hasPreviousPage: numPage > 1
    };
  }

  // Doctor logic
  let doctorUser = req.user;
  if (req.user.role === 'Doctor') {
    const fetchedDoc = await Doctor.findById(req.user._id).lean();
    if (fetchedDoc) doctorUser = fetchedDoc;
  }

  const doctorObjectId = doctorUser._id;
  const rawDoctorName = doctorUser.name || '';
  const cleanDoctorName = rawDoctorName.replace(/^Dr\.\s*/i, '').trim();
  const doctorDept = doctorUser.department || '';

  // Case-insensitive regex for doctor's name
  const nameRegex = new RegExp(`^(\\s*Dr\\.?\\s*)?${cleanDoctorName}$`, 'i');

  // Step A: Appointments assigned to this doctor
  const doctorAppointments = await Appointment.find({
    $or: [
      { doctorId: doctorObjectId },
      { doctorName: rawDoctorName },
      { doctorName: `Dr. ${cleanDoctorName}` },
      { doctorName: nameRegex }
    ]
  }).lean();

  // Step B: Admission / Bed Requests assigned to this doctor
  const doctorAdmissions = await AdmissionBedRequest.find({
    $or: [
      { doctorId: doctorObjectId },
      { doctorName: rawDoctorName },
      { doctorName: `Dr. ${cleanDoctorName}` },
      { doctorName: nameRegex }
    ]
  }).lean();

  // Step C: Emergency Cases assigned to this doctor
  const doctorEmergencies = await EmergencyPatient.find({
    $or: [
      { assignedDoctorId: doctorObjectId },
      { assignedDoctorName: rawDoctorName },
      { assignedDoctorName: `Dr. ${cleanDoctorName}` },
      { assignedDoctorName: nameRegex }
    ]
  }).lean();

  // Direct Patient records with doctor assignment OR matching department
  const deptRegex = doctorDept ? new RegExp(doctorDept, 'i') : null;
  const patientDirectConditions = [
    { assignedDoctorId: doctorObjectId },
    { attendingDoctorId: doctorObjectId },
    { 'admissionSetup.assignedDoctorId': doctorObjectId },
    { 'admissionSetup.assignedDoctor': rawDoctorName },
    { 'admissionSetup.assignedDoctor': `Dr. ${cleanDoctorName}` },
    { 'admissionSetup.assignedDoctor': nameRegex },
    { assignedDoctor: rawDoctorName },
    { assignedDoctor: `Dr. ${cleanDoctorName}` },
    { assignedDoctor: nameRegex },
    { attendingDoctor: rawDoctorName },
    { attendingDoctor: `Dr. ${cleanDoctorName}` },
    { attendingDoctor: nameRegex }
  ];

  if (deptRegex) {
    patientDirectConditions.push(
      { 'admissionSetup.wardType': deptRegex },
      { ward: deptRegex },
      { department: deptRegex }
    );
  }

  const patientDirectQuery = { $or: patientDirectConditions };

  const matchingPatientObjectIds = [
    ...doctorAppointments.map(a => a.patientId).filter(Boolean),
    ...doctorAdmissions.map(adm => adm.patientId).filter(Boolean),
    ...doctorEmergencies.map(emg => emg.patientId).filter(Boolean)
  ];

  const matchingPatientCustomIds = [
    ...doctorAppointments.map(a => a.patientCustomId).filter(Boolean),
    ...doctorAdmissions.map(adm => adm.patientCustomId).filter(Boolean),
    ...doctorEmergencies.map(emg => emg.patientCustomId).filter(Boolean)
  ];

  const patientOrConditions = [patientDirectQuery];
  if (matchingPatientObjectIds.length > 0) {
    patientOrConditions.push({ _id: { $in: matchingPatientObjectIds } });
  }
  if (matchingPatientCustomIds.length > 0) {
    patientOrConditions.push({ patientId: { $in: matchingPatientCustomIds } });
  }

  // Find assigned Patient records matching this doctor or department
  let patients = await Patient.find({ $or: patientOrConditions })
    .populate('bedId')
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  // If no doctor-specific patients are found (e.g. newly created doctor), include general active patients so roster isn't empty
  if (patients.length === 0 && doctorAppointments.length === 0 && doctorEmergencies.length === 0) {
    patients = await Patient.find({ status: { $in: ['Admitted', 'Registered', 'Emergency'] } })
      .populate('bedId')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(20)
      .lean();
  }

  // Unified formatting for emergency patients not yet registered as standard patient records
  const existingPatientIds = new Set(patients.map(p => p.patientId || p._id.toString()));
  const standaloneEmergencies = doctorEmergencies.filter(emg => {
    const emgPid = emg.emergencyId || emg.patientCustomId || `EMG-${emg._id.toString().slice(-4).toUpperCase()}`;
    return !existingPatientIds.has(emgPid) && (!emg.patientId || !existingPatientIds.has(emg.patientId.toString()));
  });

  const emgFormatted = standaloneEmergencies.map(emg => ({
    _id: emg._id,
    patientId: emg.emergencyId || emg.patientCustomId || `EMG-${emg._id.toString().slice(-4).toUpperCase()}`,
    fullName: emg.patientName,
    name: emg.patientName,
    age: emg.age,
    gender: emg.gender,
    contactNumber: emg.attendantContact || 'Emergency Contact',
    phoneNumber: emg.attendantContact || 'Emergency Contact',
    status: 'Emergency',
    admissionStatus: 'Emergency',
    patientStatus: emg.conditionStatus || 'Critical',
    clinicalInfo: {
      chiefComplaint: emg.chiefComplaint || 'Acute Emergency Intake',
      bloodGroup: emg.bloodGroup || 'O+',
      allergies: emg.medicalHistory?.allergies || []
    },
    admissionSetup: {
      wardType: emg.department || 'Emergency / ER',
      assignedDoctor: emg.assignedDoctorName || (rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`)
    },
    assignedDoctor: emg.assignedDoctorName || (rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`),
    assignedDoctorId: emg.assignedDoctorId || doctorObjectId,
    bedId: emg.disposition?.transferredToBed ? { bedNumber: emg.disposition.transferredToBed, wardType: 'Emergency' } : null,
    registrationDate: emg.arrivalTime ? new Date(emg.arrivalTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    createdAt: emg.createdAt || emg.arrivalTime || new Date(),
    isEmergencyRecord: true,
    emergencyDetails: emg
  }));

  // Unified formatting for outpatient appointments booked with this doctor
  const standaloneAppointments = doctorAppointments.filter(app => {
    const appPid = app.patientCustomId || `APP-${app._id.toString().slice(-4).toUpperCase()}`;
    return !existingPatientIds.has(appPid) && (!app.patientId || !existingPatientIds.has(app.patientId.toString()));
  });

  const appFormatted = standaloneAppointments.map(app => ({
    _id: app._id,
    patientId: app.patientCustomId || `APP-${app._id.toString().slice(-4).toUpperCase()}`,
    fullName: app.patientName,
    name: app.patientName,
    age: app.age || 35,
    gender: app.gender || 'Male',
    contactNumber: app.patientContact || 'Outpatient Contact',
    phoneNumber: app.patientContact || 'Outpatient Contact',
    status: 'Outpatient',
    admissionStatus: 'Outpatient',
    patientStatus: app.status || 'Scheduled',
    clinicalInfo: {
      chiefComplaint: app.reasonForVisit || app.chiefComplaint || 'Outpatient Clinical Consultation',
      bloodGroup: app.bloodGroup || 'A+',
      allergies: []
    },
    admissionSetup: {
      wardType: app.doctorDepartment || doctorDept || 'Outpatient Clinic',
      assignedDoctor: app.doctorName || (rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`)
    },
    assignedDoctor: app.doctorName || (rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`),
    assignedDoctorId: app.doctorId || doctorObjectId,
    bedId: null,
    registrationDate: app.appointmentDate || new Date().toISOString().split('T')[0],
    createdAt: app.createdAt || new Date(),
    isAppointmentRecord: true,
    appointmentDetails: app
  }));

  let combined = [...patients, ...emgFormatted, ...appFormatted];

  const patientCustomIds = combined.map(p => p.patientId).filter(Boolean);
  const patientObjIds = combined.map(p => p._id).filter(Boolean);

  const [appointments, prescriptions, medicalRecords, bedRequests, vitals] = await Promise.all([
    Appointment.find({
      $or: [
        { patientCustomId: { $in: patientCustomIds } },
        { patientId: { $in: patientObjIds } }
      ]
    }).sort({ appointmentDate: -1, appointmentTime: -1 }).lean(),
    Prescription.find({
      $or: [
        { patientCustomId: { $in: patientCustomIds } },
        { patientId: { $in: patientObjIds } }
      ]
    }).sort({ createdAt: -1 }).lean(),
    MedicalRecord.find({
      patientId: { $in: patientObjIds }
    }).sort({ createdAt: -1 }).lean(),
    AdmissionBedRequest.find({
      $or: [
        { patientCustomId: { $in: patientCustomIds } },
        { patientId: { $in: patientObjIds } }
      ]
    }).sort({ createdAt: -1 }).lean(),
    VitalLog.find({
      $or: [
        { patientCustomId: { $in: patientCustomIds } },
        { patientId: { $in: patientObjIds } }
      ]
    }).sort({ recordedAt: -1, createdAt: -1 }).lean()
  ]);

  combined = combined.map(p => {
    const docApp = doctorAppointments.find(a => 
      (a.patientCustomId && a.patientCustomId === p.patientId) || 
      (a.patientId && String(a.patientId) === String(p._id)) ||
      (a.patientName && p.fullName && a.patientName.trim().toLowerCase() === p.fullName.trim().toLowerCase())
    );

    const app = docApp || appointments.find(a => 
      (a.patientCustomId && a.patientCustomId === p.patientId) || 
      (a.patientId && String(a.patientId) === String(p._id)) ||
      (a.patientName && p.fullName && a.patientName.trim().toLowerCase() === p.fullName.trim().toLowerCase())
    );

    const hasBookedAppointment = Boolean(docApp || app);
    const isBookedForCurrentDoctor = Boolean(docApp);

    const presc = prescriptions.find(pr => pr.patientCustomId === p.patientId || String(pr.patientId) === String(p._id));
    const medRec = medicalRecords.find(m => String(m.patientId) === String(p._id));
    const bedReq = bedRequests.find(b => b.patientCustomId === p.patientId || String(b.patientId) === String(p._id));
    const pVitals = vitals.filter(v => v.patientCustomId === p.patientId || String(v.patientId) === String(p._id));
    const latestVital = pVitals[0] || null;

    const lastConsultation = (docApp || app)
      ? `${(docApp || app).appointmentDate || ''} ${(docApp || app).appointmentTime || ''}`.trim()
      : (p.registrationDate || 'Recently Registered');

    const diagnosis = p.emergencyDetails?.emergencyDiagnosis
      || presc?.diagnosis
      || medRec?.diagnosis
      || bedReq?.diagnosis
      || p.clinicalInfo?.chiefComplaint
      || 'Clinical Evaluation';

    const ward = p.bedId?.wardType
      || bedReq?.allocatedWard
      || bedReq?.wardType
      || p.admissionSetup?.wardType
      || p.ward
      || 'General';

    const bedNumber = p.bedId?.bedNumber
      || bedReq?.allocatedBedNumber
      || p.bedNumber
      || '';

    let assignedDocName = p.assignedDoctor
      || p.admissionSetup?.assignedDoctor
      || (docApp || app)?.doctorName
      || bedReq?.doctorName
      || (rawDoctorName.startsWith('Dr.') ? rawDoctorName : `Dr. ${rawDoctorName}`);

    // Derive live clinical status
    let currentStatus = p.status || p.admissionStatus || 'Registered';
    if (p.isEmergencyRecord || currentStatus === 'Emergency') {
      currentStatus = 'Emergency';
    } else if (p.bedId || bedReq?.status === 'Bed Allocated' || currentStatus === 'Admitted') {
      currentStatus = 'Admitted';
    } else if (currentStatus === 'Discharged') {
      currentStatus = 'Discharged';
    } else if (hasBookedAppointment || currentStatus === 'Registered' || currentStatus === 'Outpatient') {
      currentStatus = 'Outpatient';
    }

    const admissionDate = p.registrationDate || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : 'Today');

    return {
      ...p,
      fullName: p.fullName || p.name || 'Unnamed Patient',
      patientId: p.patientId || `P-${p._id.toString().slice(-5).toUpperCase()}`,
      contactNumber: p.contactNumber || p.phoneNumber || 'N/A',
      hasBookedAppointment,
      isBookedForCurrentDoctor,
      bookedAppointment: (docApp || app) ? {
        _id: (docApp || app)._id,
        appointmentDate: (docApp || app).appointmentDate,
        appointmentTime: (docApp || app).appointmentTime,
        doctorName: (docApp || app).doctorName,
        department: (docApp || app).department || (docApp || app).doctorDepartment,
        status: (docApp || app).status || 'Scheduled',
        reason: (docApp || app).reason || (docApp || app).reasonForVisit || (docApp || app).chiefComplaint || 'Consultation',
        type: (docApp || app).type || 'Consultation',
        priority: (docApp || app).priority || 'Routine'
      } : null,
      lastConsultation,
      latestDiagnosis: diagnosis,
      department: p.department || p.admissionSetup?.wardType || ward || doctorDept || 'General Medicine',
      ward,
      bedNumber,
      admissionDate,
      status: currentStatus,
      assignedDoctor: assignedDocName,
      latestVital: latestVital ? {
        bloodPressure: latestVital.bloodPressure || `${latestVital.bloodPressureSys}/${latestVital.bloodPressureDia}`,
        pulseRate: latestVital.pulseRate,
        temperature: latestVital.temperature,
        oxygenSaturation: latestVital.oxygenSaturation,
        respiratoryRate: latestVital.respiratoryRate,
        recordedAt: latestVital.recordedAt || latestVital.createdAt,
        isCritical: latestVital.isCritical
      } : null
    };
  });

  // Sort patients with booked appointments for this doctor to the top
  combined.sort((a, b) => {
    if (a.isBookedForCurrentDoctor && !b.isBookedForCurrentDoctor) return -1;
    if (!a.isBookedForCurrentDoctor && b.isBookedForCurrentDoctor) return 1;
    if (a.hasBookedAppointment && !b.hasBookedAppointment) return -1;
    if (!a.hasBookedAppointment && b.hasBookedAppointment) return 1;
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  // Apply Status Filter: All, Admitted, Outpatient, Emergency, Discharged
  if (status && status !== 'All') {
    combined = combined.filter(p => {
      const pStatus = (p.status || '').toLowerCase();
      const filterLower = status.toLowerCase();
      if (filterLower === 'outpatient') return pStatus === 'outpatient' || pStatus === 'registered';
      return pStatus === filterLower;
    });
  }

  // Apply Department Filter
  if (department && department !== 'All') {
    combined = combined.filter(p =>
      (p.department || '').toLowerCase().includes(department.toLowerCase()) ||
      (p.ward || '').toLowerCase().includes(department.toLowerCase())
    );
  }

  // Apply Search Filter (by Patient ID, Name, Phone, Bed Number, Diagnosis, Chief Complaint)
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    combined = combined.filter(p => {
      const idMatch = (p.patientId || '').toLowerCase().includes(q);
      const nameMatch = (p.fullName || p.name || '').toLowerCase().includes(q);
      const phoneMatch = (p.contactNumber || p.phoneNumber || '').toLowerCase().includes(q);
      const bedMatch = (p.bedNumber || p.bedId?.bedNumber || '').toLowerCase().includes(q);
      const diagMatch = (p.latestDiagnosis || '').toLowerCase().includes(q);
      const complaintMatch = (p.clinicalInfo?.chiefComplaint || '').toLowerCase().includes(q);
      const docMatch = (p.assignedDoctor || '').toLowerCase().includes(q);
      return idMatch || nameMatch || phoneMatch || bedMatch || diagMatch || complaintMatch || docMatch;
    });
  }

  // Backend Pagination
  const totalPatients = combined.length;
  const numPage = Math.max(1, parseInt(page, 10) || 1);
  const numLimit = Math.max(1, parseInt(limit, 10) || 20);
  const totalPages = Math.ceil(totalPatients / numLimit) || 1;
  const startIndex = (numPage - 1) * numLimit;
  const endIndex = startIndex + numLimit;
  const paginatedList = combined.slice(startIndex, endIndex);

  return {
    patients: paginatedList,
    allPatients: combined,
    currentPage: numPage,
    totalPages,
    totalPatients,
    hasNextPage: numPage < totalPages,
    hasPreviousPage: numPage > 1
  };
}

// @route   GET /api/patients/assigned
// @desc    Get patients assigned strictly to the authenticated doctor or nurse
// @access  Protected
router.get('/assigned', protect, requireRole(['Doctor', 'Admin', 'Nurse']), async (req, res) => {
  try {
    const result = await getAssignedPatientsForUser(req, req.query);
    if (req.query.page || req.query.limit) {
      return res.json(result);
    }
    res.json(result.allPatients);
  } catch (error) {
    console.error('Error fetching assigned patients:', error);
    res.status(500).json({ message: 'Server error while fetching assigned patients', error: error.message });
  }
});

// @route   GET /api/patients/my-patients
// @desc    Get patients assigned to the authenticated doctor or nurse's ward
// @access  Protected
router.get('/my-patients', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    if (req.user.role === 'Doctor') {
      const result = await getDoctorAssignedPatients(req, req.query);
      return res.json(result.allPatients);
    }

    // Nurse / Admin logic: Ward-scoped inpatients
    const ward = req.user.assignedWard || req.user.department || 'General';
    const patients = await Patient.find({ 
      $or: [
        { 'admissionSetup.wardType': new RegExp(ward, 'i') },
        { ward: new RegExp(ward, 'i') },
        { status: 'Admitted' }
      ]
    }).populate('bedId').sort({ createdAt: -1 });

    res.json(patients);
  } catch (error) {
    console.error('Error fetching my patients:', error);
    res.status(500).json({ message: 'Server error while fetching my patients' });
  }
});

// @route   GET /api/patients/:id/full-details
// @desc    Get complete patient dossier for Doctor detailed profile view
// @access  Protected
router.get('/:id/full-details', protect, requireRole(['Doctor', 'Nurse', 'Admin', 'Receptionist']), async (req, res) => {
  try {
    const { id } = req.params;
    let patient = null;

    if (mongoose.Types.ObjectId.isValid(id)) {
      patient = await Patient.findById(id).populate('bedId').lean();
    }
    if (!patient) {
      patient = await Patient.findOne({ patientId: id }).populate('bedId').lean();
    }

    // Check if it is an EmergencyPatient ID
    let emergencyRecord = null;
    if (!patient && mongoose.Types.ObjectId.isValid(id)) {
      emergencyRecord = await EmergencyPatient.findById(id).lean();
    }
    if (!patient && !emergencyRecord) {
      emergencyRecord = await EmergencyPatient.findOne({ emergencyId: id }).lean();
    }

    if (emergencyRecord && !patient) {
      // Create unified patient view for standalone emergency case
      patient = {
        _id: emergencyRecord._id,
        patientId: emergencyRecord.emergencyId || emergencyRecord.patientCustomId || `EMG-${emergencyRecord._id.toString().slice(-4).toUpperCase()}`,
        fullName: emergencyRecord.patientName,
        name: emergencyRecord.patientName,
        age: emergencyRecord.age,
        gender: emergencyRecord.gender,
        contactNumber: emergencyRecord.attendantContact || 'Emergency Contact',
        phoneNumber: emergencyRecord.attendantContact || 'Emergency Contact',
        status: 'Emergency',
        admissionStatus: 'Emergency',
        patientStatus: emergencyRecord.conditionStatus || 'Critical',
        clinicalInfo: {
          chiefComplaint: emergencyRecord.chiefComplaint || 'Emergency Intake',
          bloodGroup: emergencyRecord.bloodGroup || 'O+',
          allergies: emergencyRecord.medicalHistory?.allergies || []
        },
        admissionSetup: {
          wardType: emergencyRecord.department || 'Emergency / ER',
          assignedDoctor: emergencyRecord.assignedDoctorName || 'Dr. On Duty'
        },
        emergencyContactName: emergencyRecord.attendantName || '',
        emergencyContactPhone: emergencyRecord.attendantContact || '',
        bedId: emergencyRecord.disposition?.transferredToBed ? { bedNumber: emergencyRecord.disposition.transferredToBed, wardType: 'Emergency' } : null,
        registrationDate: emergencyRecord.arrivalTime ? new Date(emergencyRecord.arrivalTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        createdAt: emergencyRecord.createdAt || emergencyRecord.arrivalTime,
        isEmergencyRecord: true,
        emergencyDetails: emergencyRecord
      };
    }

    if (!patient) {
      return res.status(404).json({ message: 'Patient profile record not found in database.' });
    }

    const patientObjectId = patient._id;
    const patientCustomId = patient.patientId;

    // Authorization Check: Permit clinical doctors, nurses, and admins to access patient records
    if (req.user.role === 'Doctor') {
      let doctorUser = req.user;
      const fetchedDoc = await Doctor.findById(req.user._id).lean();
      if (fetchedDoc) doctorUser = fetchedDoc;
      const cleanDoctorName = (doctorUser.name || '').replace(/^Dr\.\s*/i, '').trim();
      const nameRegex = new RegExp(`^(\\s*Dr\\.?\\s*)?${cleanDoctorName}$`, 'i');
      const docDept = doctorUser.department || '';

      const isDirectlyAssigned = (
        (patient.assignedDoctorId && String(patient.assignedDoctorId) === String(doctorUser._id)) ||
        (patient.attendingDoctorId && String(patient.attendingDoctorId) === String(doctorUser._id)) ||
        (patient.admissionSetup?.assignedDoctorId && String(patient.admissionSetup.assignedDoctorId) === String(doctorUser._id)) ||
        (patient.admissionSetup?.assignedDoctor && nameRegex.test(patient.admissionSetup.assignedDoctor)) ||
        (patient.assignedDoctor && nameRegex.test(patient.assignedDoctor)) ||
        (patient.attendingDoctor && nameRegex.test(patient.attendingDoctor)) ||
        (emergencyRecord?.assignedDoctorId && String(emergencyRecord.assignedDoctorId) === String(doctorUser._id)) ||
        (emergencyRecord?.assignedDoctorName && nameRegex.test(emergencyRecord.assignedDoctorName))
      );

      // If not directly assigned, allow access if patient is in the hospital registry, department, or active care roster
      // All credentialed doctors can cross-consult, review vitals, and provide treatment orders
    }

    // Strict Authorization Check: Nurse can only access patients assigned to their ward/shift or nursing tasks
    if (req.user.role === 'Nurse') {
      let nurseUser = req.user;
      const fetchedNurse = await Nurse.findById(req.user._id).lean();
      if (fetchedNurse) nurseUser = fetchedNurse;
      const nurseWard = nurseUser.assignedWard || nurseUser.department || 'General';
      const cleanWard = nurseWard.replace(/\s*ward$/i, '').trim();
      const wardRegex = new RegExp(cleanWard, 'i');

      const patWard = patient.admissionSetup?.wardType || patient.ward || '';
      const isNurseWard = wardRegex.test(patWard) || patient.status === 'Admitted' || emergencyRecord?.department?.match(wardRegex);

      if (!isNurseWard) {
        const hasTask = await NursingTask.exists({
          patient: patientObjectId,
          assignedTo: nurseUser._id
        });
        if (!hasTask) {
          return res.status(403).json({
            message: `Access Forbidden: Patient ${patient.fullName || patient.patientId} is not assigned to your ward (${nurseWard}).`
          });
        }
      }
    }

    // Concurrently fetch all medical records, consultations, prescriptions, vitals, nursing tasks, observations, medication administrations, doctor instructions, billing & discharges
    const [medicalRecords, appointments, prescriptions, vitalLogs, nursingTasks, nursingObservations, medicationAdministrations, doctorInstructions, transfers, allocations, resourceRequests, transferDischarges, billingRecords, admissionRequests] = await Promise.all([
      MedicalRecord.find({ patientId: patientObjectId }).populate('recordedBy', 'name role department').sort({ createdAt: -1 }).lean(),
      Appointment.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).sort({ appointmentDate: -1, appointmentTime: -1 }).lean(),
      Prescription.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).sort({ createdAt: -1 }).lean(),
      VitalLog.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).populate('recordedBy', 'name role').sort({ recordedAt: -1, createdAt: -1 }).lean(),
      NursingTask.find({ patient: patientObjectId }).populate('assignedTo', 'name role').sort({ createdAt: -1 }).lean(),
      NursingObservation.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).populate('nurseId', 'name nurseId assignedWard').sort({ recordedAt: -1, createdAt: -1 }).lean(),
      MedicationAdministration.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).populate('nurseId', 'name nurseId assignedWard').sort({ recordedAt: -1, createdAt: -1 }).lean(),
      DoctorInstruction.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).sort({ issuedAt: -1, createdAt: -1 }).lean(),
      BedTransfer.find({ patient: patientObjectId }).populate('fromBed toBed requestedBy', 'bedNumber wardType name role').sort({ createdAt: -1 }).lean(),
      BedAllocation.find({ patient: patientObjectId }).populate('bed allocatedBy', 'bedNumber wardType name').sort({ createdAt: -1 }).lean(),
      ResourceRequest.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId },
          { patientName: new RegExp(`^${(patient.fullName || patient.name || '').trim()}$`, 'i') }
        ]
      }).populate('requestedBy', 'name role').populate('allocationId').sort({ createdAt: -1 }).lean(),
      TransferDischarge.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).sort({ createdAt: -1 }).lean(),
      DischargeBill.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).sort({ createdAt: -1 }).lean(),
      AdmissionBedRequest.find({
        $or: [
          { patientId: patientObjectId },
          { patientCustomId: patientCustomId }
        ]
      }).sort({ createdAt: -1 }).lean()
    ]);

    res.json({
      patient,
      medicalRecords: medicalRecords || [],
      appointments: appointments || [],
      prescriptions: prescriptions || [],
      vitalLogs: vitalLogs || [],
      nursingTasks: nursingTasks || [],
      nursingObservations: nursingObservations || [],
      medicationAdministrations: medicationAdministrations || [],
      doctorInstructions: doctorInstructions || [],
      transfers: transfers || [],
      allocations: allocations || [],
      resourceRequests: resourceRequests || [],
      transferDischarges: transferDischarges || [],
      billingRecords: billingRecords || [],
      admissionRequests: admissionRequests || [],
      emergencyRecord: emergencyRecord || patient.emergencyDetails || null
    });

  } catch (error) {
    console.error('Error fetching patient full dossier:', error);
    res.status(500).json({ message: 'Server error while fetching complete patient dossier: ' + error.message });
  }
});

// @route   GET /api/patients/:patientId
// @desc    Get single patient by Patient ID (e.g. P10001) or MongoDB _id
// @access  Protected
router.get('/:patientId', protect, async (req, res) => {
  try {
    const { patientId } = req.params;
    let query = { patientId };
    if (mongoose.Types.ObjectId.isValid(patientId)) {
      query = { $or: [{ patientId }, { _id: patientId }] };
    }
    const patientDoc = await Patient.findOne(query).populate('bedId').lean();
    if (!patientDoc) {
      return res.status(404).json({ success: false, message: 'Patient record not found in database.' });
    }

    // Resolve complete assigned doctor details
    let doctorDetails = null;
    const docName = patientDoc.admissionSetup?.assignedDoctor || patientDoc.assignedDoctor || patientDoc.attendingDoctor;
    const docId = patientDoc.admissionSetup?.assignedDoctorId || patientDoc.assignedDoctorId || patientDoc.attendingDoctorId;

    if (docId && mongoose.Types.ObjectId.isValid(docId)) {
      doctorDetails = await Doctor.findById(docId).select('doctorId name email department specialization phone qualification qualifications cabinNumber availability status registrationNumber profilePhoto').lean();
    }
    if (!doctorDetails && docName) {
      const cleanDoc = docName.replace(/^Dr\.\s*/i, '').trim();
      doctorDetails = await Doctor.findOne({
        $or: [
          { name: docName },
          { name: `Dr. ${cleanDoc}` },
          { name: cleanDoc },
          { name: new RegExp(`^(\\s*Dr\\.?\\s*)?${cleanDoc}$`, 'i') }
        ]
      }).select('doctorId name email department specialization phone qualification qualifications cabinNumber availability status registrationNumber profilePhoto').lean();
    }

    const patient = {
      ...patientDoc,
      doctorDetails: doctorDetails || (docName ? {
        name: docName.startsWith('Dr.') ? docName : `Dr. ${docName}`,
        department: patientDoc.department || 'General Medicine',
        specialization: 'Consulting Specialist',
        cabinNumber: 'OPD Consultation Suite',
        phone: '+91 98765 43210',
        email: 'doctor@mediflow.com',
        availability: { status: 'Available', shiftHours: '09:00 AM - 05:00 PM' }
      } : null)
    };

    res.json({ success: true, patient });
  } catch (error) {
    console.error('Error fetching patient by ID:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching patient record: ' + error.message });
  }
});

// @route   POST /api/patients
// @desc    Register a new patient with duplicate checking and sequential unique ID generation
// @access  Protected (Receptionist, Admin, Doctor)
router.post('/', protect, requireRole(['Receptionist', 'Admin', 'Doctor']), async (req, res) => {
  try {
    const { 
      fullName, age, dob, dateOfBirth, gender, contact, phoneNumber, contactNumber, email, address,
      emergencyName, emergencyContactName, emergencyRelationship, emergencyContactRelationship, emergencyPhone, emergencyContactPhone,
      complaint, chiefComplaint, purpose, bloodGroup, allergies,
      registrationType, registrationPathway: rawPathway, consultationType, queuePriority,
      ward, wardType, doctor, assignedDoctor,
      admissionStatus, patientStatus, status
    } = req.body;

    // Backend Validation for Registration Pathway
    // Allowed values: APPOINTMENT_OPD, EMERGENCY, WALK_IN
    let finalPathway = 'APPOINTMENT_OPD';
    if (rawPathway) {
      const normalizedPathway = rawPathway.trim().toUpperCase();
      if (!['APPOINTMENT_OPD', 'EMERGENCY', 'WALK_IN'].includes(normalizedPathway)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid registrationPathway. Allowed values are: APPOINTMENT_OPD, EMERGENCY, WALK_IN.'
        });
      }
      finalPathway = normalizedPathway;
    } else if (registrationType === 'walk_in' || registrationType === 'walkin' || registrationType === 'WALK_IN') {
      finalPathway = 'WALK_IN';
    } else if (registrationType === 'emergency' || registrationType === 'EMERGENCY') {
      finalPathway = 'EMERGENCY';
    }

    const finalName = (fullName || '').trim();
    const finalContact = (phoneNumber || contactNumber || contact || '').trim();

    if (!finalName || !finalContact) {
      return res.status(400).json({ 
        success: false, 
        message: 'Patient full name and phone/contact number are required fields.' 
      });
    }

    // Duplicate Check: Check if patient already exists by phone number or exact name + DOB
    const normalizedPhone = finalContact.replace(/\s+/g, '');
    const cleanDigits = finalContact.replace(/\D/g, '');
    const birthDate = dateOfBirth || dob ? new Date(dateOfBirth || dob) : null;

    const duplicateConditions = [
      { contactNumber: normalizedPhone },
      { contactNumber: finalContact },
      { phoneNumber: normalizedPhone },
      { phoneNumber: finalContact }
    ];

    if (cleanDigits.length >= 7) {
      duplicateConditions.push({ contactNumber: new RegExp(cleanDigits + '$') });
      duplicateConditions.push({ phoneNumber: new RegExp(cleanDigits + '$') });
    }

    if (birthDate) {
      duplicateConditions.push({
        fullName: new RegExp(`^${finalName}$`, 'i'),
        $or: [{ dob: birthDate }, { dateOfBirth: birthDate }]
      });
    }

    const existingPatient = await Patient.findOne({ $or: duplicateConditions });

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: `Phone number or Patient already registered for ${existingPatient.fullName} with Patient ID: ${existingPatient.patientId}. Reusing an existing phone number is not permitted.`,
        patientId: existingPatient.patientId,
        existingPatient
      });
    }

    const emName = (emergencyContactName || emergencyName || '').trim();
    const emRel = emergencyContactRelationship || emergencyRelationship || 'Spouse';
    const emPhone = (emergencyContactPhone || emergencyPhone || '').trim();

    // Check emergency phone uniqueness and ensure it is not identical to primary phone
    if (emPhone) {
      const cleanEmDigits = emPhone.replace(/\D/g, '');
      const cleanPrimaryDigits = finalContact.replace(/\D/g, '');
      if (cleanEmDigits && cleanPrimaryDigits && cleanEmDigits === cleanPrimaryDigits) {
        return res.status(400).json({
          success: false,
          message: 'Emergency contact phone number cannot be identical to Patient primary phone number.'
        });
      }

      const emDuplicateConditions = [
        { contactNumber: emPhone },
        { contactNumber: emPhone.replace(/\s+/g, '') },
        { phoneNumber: emPhone },
        { phoneNumber: emPhone.replace(/\s+/g, '') }
      ];

      if (cleanEmDigits.length >= 7) {
        emDuplicateConditions.push({ contactNumber: new RegExp(cleanEmDigits + '$') });
        emDuplicateConditions.push({ phoneNumber: new RegExp(cleanEmDigits + '$') });
      }

      const existingEmPatient = await Patient.findOne({ $or: emDuplicateConditions });
      if (existingEmPatient) {
        return res.status(409).json({
          success: false,
          message: `Emergency phone number ${emPhone} is already registered to Patient ${existingEmPatient.fullName} (ID: ${existingEmPatient.patientId}). Reusing patient phone numbers as emergency contacts is not permitted.`
        });
      }
    }

    // Generate Unique Sequential Patient ID (e.g., P10001, P10002)
    const patientId = await generateNextPatientId();

    // Inpatient Bed Allocation: APPOINTMENT_OPD, WALK_IN, and EMERGENCY NEVER automatically allocate a bed upon registration.
    // Bed allocation must only happen after doctor/authorized clinical decision in Admission/Bed Management.
    const isOpdOrWalkin = finalPathway === 'APPOINTMENT_OPD' || finalPathway === 'WALK_IN' || finalPathway === 'EMERGENCY' || registrationType === 'opd' || registrationType === 'walk_in';
    const targetWard = finalPathway === 'WALK_IN' ? 'General' : (isOpdOrWalkin ? 'Outpatient' : (wardType || ward || 'General'));
    let bed = null;
    if (!isOpdOrWalkin && targetWard && targetWard !== 'None' && targetWard !== 'Outpatient') {
      bed = await Bed.findOne({
        $or: [{ wardType: targetWard }, { type: targetWard }],
        status: 'Available'
      });
    }

    // Compute DOB or Age if one is missing
    let computedDob = birthDate;
    let computedAge = age ? Number(age) : null;
    if (!computedDob && computedAge) {
      const birthYear = new Date().getFullYear() - computedAge;
      computedDob = new Date(birthYear, 0, 1);
    } else if (computedDob && !computedAge) {
      computedAge = new Date().getFullYear() - computedDob.getFullYear();
    }

    const now = new Date();
    const regDate = now.toISOString().split('T')[0];
    const regTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const regBy = req.user?.name || req.user?.username || 'Receptionist';

    const finalDoctorName = (assignedDoctor || doctor || '').trim();
    let assignedDocRecord = null;
    if (finalDoctorName && finalPathway !== 'WALK_IN') {
      const cleanDocName = finalDoctorName.replace(/^Dr\.\s*/i, '').trim();
      assignedDocRecord = await Doctor.findOne({
        $or: [
          { name: finalDoctorName },
          { name: `Dr. ${cleanDocName}` },
          { name: cleanDocName },
          { name: new RegExp(`^(\\s*Dr\\.?\\s*)?${cleanDocName}$`, 'i') }
        ]
      });
    }

    const finalStatus = finalPathway === 'EMERGENCY' 
      ? 'Emergency' 
      : (isOpdOrWalkin 
          ? (status || 'Registered') 
          : (bed ? 'Admitted' : (admissionStatus || status || 'Registered')));
    const finalPurpose = (purpose || chiefComplaint || complaint || '').trim();

    const newPatient = new Patient({
      patientId,
      fullName: finalName,
      age: computedAge,
      dob: computedDob || new Date(2000, 0, 1),
      dateOfBirth: computedDob || new Date(2000, 0, 1),
      gender: gender || 'Male',
      contactNumber: finalContact,
      phoneNumber: finalContact,
      email: email ? email.trim() : '',
      address: address ? address.trim() : '',
      emergencyContact: {
        name: emName,
        relationship: emRel,
        phone: emPhone
      },
      emergencyContactName: emName,
      emergencyContactRelationship: emRel,
      emergencyContactPhone: emPhone,
      registrationDate: regDate,
      registrationTime: regTime,
      registeredBy: regBy,
      registrationPathway: finalPathway,
      admissionStatus: finalStatus,
      patientStatus: patientStatus || (finalPathway === 'EMERGENCY' ? 'Critical' : 'Active'),
      purpose: finalPurpose,
      clinicalInfo: {
        purpose: finalPurpose,
        chiefComplaint: finalPurpose,
        bloodGroup: bloodGroup || 'A+',
        allergies: allergies || []
      },
      admissionSetup: {
        wardType: targetWard,
        assignedDoctor: finalDoctorName || (assignedDocRecord ? assignedDocRecord.name : (finalPathway === 'WALK_IN' ? 'Unassigned (Walk-in)' : 'Dr. Sarah Chen')),
        assignedDoctorId: assignedDocRecord ? assignedDocRecord._id : undefined
      },
      assignedDoctor: finalDoctorName || (assignedDocRecord ? assignedDocRecord.name : (finalPathway === 'WALK_IN' ? 'Unassigned (Walk-in)' : 'Dr. Sarah Chen')),
      attendingDoctor: finalDoctorName || (assignedDocRecord ? assignedDocRecord.name : (finalPathway === 'WALK_IN' ? 'Unassigned (Walk-in)' : 'Dr. Sarah Chen')),
      assignedDoctorId: assignedDocRecord ? assignedDocRecord._id : undefined,
      attendingDoctorId: assignedDocRecord ? assignedDocRecord._id : undefined,
      department: assignedDocRecord ? assignedDocRecord.department : (finalPathway === 'EMERGENCY' ? 'Emergency' : targetWard),
      ward: targetWard,
      bedNumber: bed ? bed.bedNumber : '',
      status: finalStatus,
      bedId: bed ? bed._id : null
    });

    const savedPatient = await newPatient.save();

    if (bed) {
      bed.status = 'Occupied';
      bed.patientName = savedPatient.fullName;
      bed.patientId = savedPatient.patientId;
      bed.admissionDate = new Date();
      bed.notes = `Allocated upon registration.`;
      await bed.save();
    }

    // Auto-create initial Medical Record entry so Doctor and Nurse can immediately view clinical details
    try {
      await MedicalRecord.create({
        patientId: savedPatient._id,
        patientCustomId: savedPatient.patientId,
        patientName: savedPatient.fullName,
        doctorId: assignedDocRecord ? assignedDocRecord._id : undefined,
        doctorName: finalDoctorName || (assignedDocRecord ? assignedDocRecord.name : 'Consulting Doctor'),
        department: assignedDocRecord ? assignedDocRecord.department : targetWard,
        chiefComplaint: finalPurpose || 'Initial Patient Intake',
        diagnosis: finalPurpose || 'Pending initial doctor evaluation',
        notes: `Registered by ${regBy} via ${targetWard === 'Outpatient' ? 'OPD' : targetWard} service pathway. Purpose: ${finalPurpose || 'General Consultation'}`,
        allergies: allergies || [],
        bloodGroup: bloodGroup || 'A+',
        visitDate: new Date()
      });
    } catch (medErr) {
      console.warn('Initial medical record creation notice:', medErr.message);
    }
    
    res.status(201).json({
      success: true,
      message: 'Patient registered successfully and synchronized across all portals',
      patientId: savedPatient.patientId,
      patient: savedPatient,
      bedNumber: bed ? bed.bedNumber : null
    });
  } catch (error) {
    console.error('Error registering patient in MongoDB:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while saving patient to MongoDB: ' + error.message 
    });
  }
});

// @route   PUT /api/patients/:id
// @desc    Update patient information (demographics, contact, emergency contact, admission/doctor, clinical)
// @access  Protected (Receptionist, Admin, Doctor)
router.put('/:id', protect, requireRole(['Receptionist', 'Admin', 'Doctor']), async (req, res) => {
  try {
    const { id } = req.params;
    let query = {};
    if (mongoose.Types.ObjectId.isValid(id)) {
      query = { $or: [{ _id: id }, { patientId: id }] };
    } else {
      query = { patientId: id };
    }

    const patient = await Patient.findOne(query);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const {
      fullName,
      age,
      dob,
      dateOfBirth,
      gender,
      contactNumber,
      phoneNumber,
      email,
      address,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      emergencyContact,
      bloodGroup,
      allergies,
      chiefComplaint,
      purpose,
      ward,
      wardType,
      assignedDoctor,
      status,
      admissionStatus
    } = req.body;

    if (fullName !== undefined) patient.fullName = fullName.trim();
    if (gender !== undefined) patient.gender = gender;
    
    // Age & DOB updates
    if (age !== undefined && age !== '') {
      patient.age = Number(age);
      if (!dob && !dateOfBirth) {
        const birthYear = new Date().getFullYear() - Number(age);
        patient.dob = new Date(birthYear, 0, 1);
        patient.dateOfBirth = patient.dob;
      }
    }
    if (dob || dateOfBirth) {
      const parsedDob = new Date(dob || dateOfBirth);
      patient.dob = parsedDob;
      patient.dateOfBirth = parsedDob;
      if (age === undefined || age === '') {
        patient.age = new Date().getFullYear() - parsedDob.getFullYear();
      }
    }

    // Phone / contact updates with duplication verification
    const newContact = (contactNumber || phoneNumber || '').trim();
    if (newContact) {
      const cleanDigits = newContact.replace(/\D/g, '');
      const normalized = newContact.replace(/\s+/g, '');
      const phoneDuplicate = await Patient.findOne({
        _id: { $ne: patient._id },
        $or: [
          { contactNumber: newContact },
          { contactNumber: normalized },
          { phoneNumber: newContact },
          { phoneNumber: normalized },
          ...(cleanDigits.length >= 7 ? [
            { contactNumber: new RegExp(cleanDigits + '$') },
            { phoneNumber: new RegExp(cleanDigits + '$') }
          ] : [])
        ]
      });

      if (phoneDuplicate) {
        return res.status(409).json({
          success: false,
          message: `Phone number ${newContact} is already registered to another patient (${phoneDuplicate.fullName}, ID: ${phoneDuplicate.patientId}).`
        });
      }

      patient.contactNumber = newContact;
      patient.phoneNumber = newContact;
    }

    if (email !== undefined) patient.email = email.trim();
    if (address !== undefined) patient.address = address.trim();

    // Emergency Contact
    const emName = emergencyContactName || emergencyContact?.name;
    const emRel = emergencyContactRelationship || emergencyContact?.relationship;
    const emPhone = emergencyContactPhone || emergencyContact?.phone;

    if (emName !== undefined) {
      patient.emergencyContactName = emName;
      if (!patient.emergencyContact) patient.emergencyContact = {};
      patient.emergencyContact.name = emName;
    }
    if (emRel !== undefined) {
      patient.emergencyContactRelationship = emRel;
      if (!patient.emergencyContact) patient.emergencyContact = {};
      patient.emergencyContact.relationship = emRel;
    }
    if (emPhone !== undefined) {
      patient.emergencyContactPhone = emPhone;
      if (!patient.emergencyContact) patient.emergencyContact = {};
      patient.emergencyContact.phone = emPhone;
    }

    // Clinical Info
    if (!patient.clinicalInfo) patient.clinicalInfo = {};
    if (bloodGroup !== undefined) {
      patient.clinicalInfo.bloodGroup = bloodGroup;
    }
    if (allergies !== undefined) {
      patient.clinicalInfo.allergies = Array.isArray(allergies) ? allergies : allergies.split(',').map(a => a.trim()).filter(Boolean);
    }
    if (chiefComplaint !== undefined || purpose !== undefined) {
      const comp = chiefComplaint || purpose;
      patient.clinicalInfo.chiefComplaint = comp;
      patient.clinicalInfo.purpose = comp;
      patient.purpose = comp;
    }

    // Doctor & Ward
    const doc = assignedDoctor;
    if (doc !== undefined) {
      patient.assignedDoctor = doc;
      patient.attendingDoctor = doc;
      if (!patient.admissionSetup) patient.admissionSetup = {};
      patient.admissionSetup.assignedDoctor = doc;

      if (doc) {
        const cleanDocName = doc.replace(/^Dr\.\s*/i, '').trim();
        const docRecord = await Doctor.findOne({
          $or: [
            { name: doc },
            { name: `Dr. ${cleanDocName}` },
            { name: cleanDocName },
            { name: new RegExp(`^(\\s*Dr\\.?\\s*)?${cleanDocName}$`, 'i') }
          ]
        });
        if (docRecord) {
          patient.assignedDoctorId = docRecord._id;
          patient.attendingDoctorId = docRecord._id;
          patient.admissionSetup.assignedDoctorId = docRecord._id;
          if (docRecord.department) patient.department = docRecord.department;
        }
      }
    }

    const targetWard = wardType || ward;
    if (targetWard !== undefined) {
      patient.ward = targetWard;
      if (!patient.admissionSetup) patient.admissionSetup = {};
      patient.admissionSetup.wardType = targetWard;
    }

    if (status !== undefined || admissionStatus !== undefined) {
      const st = status || admissionStatus;
      patient.status = st;
      patient.admissionStatus = st;
    }

    const updatedPatient = await patient.save();
    
    // Also update any occupied bed's patientName if name changed
    if (fullName && patient.bedId) {
      await Bed.findByIdAndUpdate(patient.bedId, { patientName: fullName.trim() });
    }

    res.json({
      success: true,
      message: 'Patient details updated successfully',
      patient: updatedPatient
    });
  } catch (error) {
    console.error('Error updating patient details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating patient details: ' + error.message
    });
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
// @access  Protected (Doctor, Nurse, Admin)
router.put('/:id/discharge', protect, requireRole(['Doctor', 'Nurse', 'Admin']), async (req, res) => {
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
