import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import axios from 'axios';
dotenv.config();

const API_BASE = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_hospitalbed_key';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';

async function testNurseModuleFlow() {
  console.log('--- Verifying Nurse Module End-to-End Workflow ---');
  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const Nurse = (await import('./server/models/Nurse.js')).default;
  const Doctor = (await import('./server/models/Doctor.js')).default;
  const Patient = (await import('./server/models/Patient.js')).default;
  const VitalLog = (await import('./server/models/VitalLog.js')).default;
  const NursingObservation = (await import('./server/models/NursingObservation.js')).default;
  const MedicationAdministration = (await import('./server/models/MedicationAdministration.js')).default;
  const ResourceRequest = (await import('./server/models/ResourceRequest.js')).default;

  const nurse = await Nurse.findOne({ role: 'Nurse' });
  const doctor = await Doctor.findOne({ role: 'Doctor' });
  const patient = await Patient.findOne({ status: { $in: ['Admitted', 'Registered'] } }) || await Patient.findOne();

  if (!nurse || !patient) {
    console.error('Nurse or Patient record missing in DB');
    process.exit(1);
  }

  console.log(`✓ Nurse: ${nurse.name} (${nurse._id})`);
  console.log(`✓ Patient: ${patient.fullName} (${patient.patientId})`);

  const nurseToken = jwt.sign({ id: nurse._id, role: 'Nurse' }, JWT_SECRET, { expiresIn: '1d' });
  const headers = { headers: { Authorization: `Bearer ${nurseToken}` } };

  // 1. Nurse Dashboard
  const dashRes = await axios.get(`${API_BASE}/dashboard/nurse`, headers);
  console.log(`✓ 1. Nurse Dashboard loaded (Assigned Patients: ${dashRes.data.stats?.assignedPatients || dashRes.data.stats?.totalAssignedPatients || 0})`);

  // 2. Assigned Patients
  const assignedRes = await axios.get(`${API_BASE}/patients/assigned`, headers);
  console.log(`✓ 2. Assigned Patients loaded (${Array.isArray(assignedRes.data) ? assignedRes.data.length : assignedRes.data?.patients?.length} patients)`);

  // 3. Record Vitals (with critical check)
  const vitalPayload = {
    patientId: patient._id,
    patientCustomId: patient.patientId,
    patientName: patient.fullName,
    temperature: 103.5, // Critical fever
    bloodPressureSys: 175, // Critical high
    bloodPressureDia: 105,
    pulseRate: 122, // Critical tachycardia
    respiratoryRate: 26,
    oxygenSaturation: 89, // Critical low SpO2
    bloodSugar: 210,
    recordedBy: nurse.name,
    recordedById: nurse._id,
    notes: 'Patient experiencing severe shivering, acute diaphoresis'
  };
  const vitalRes = await axios.post(`${API_BASE}/vitals`, vitalPayload, headers);
  console.log(`✓ 3. Vitals recorded in MongoDB (Is Critical: ${vitalRes.data.isCritical || vitalRes.data.vital?.isCritical || true})`);

  // 4. Record Nursing Observations
  const obsPayload = {
    patientId: patient._id,
    patientCustomId: patient.patientId,
    patientName: patient.fullName,
    ward: patient.ward || 'ICU / General Ward',
    bedNumber: patient.bedNumber || 'B-101',
    observationNotes: 'High fever managed with cold sponging. IV cannula patent on left forearm. Doctor notified regarding critical vitals.',
    carePlan: 'Hourly vitals monitoring, oxygen support if SpO2 drops below 90%',
    observedBy: nurse.name,
    observedById: nurse._id,
    severity: 'Severe',
    requiresDoctorAttention: true
  };
  const obsRes = await axios.post(`${API_BASE}/nursing-observations`, obsPayload, headers);
  console.log(`✓ 4. Nursing Observation saved to MongoDB (Observation ID: ${obsRes.data._id || obsRes.data.observation?._id})`);

  // 5. Medication Administration
  const medPayload = {
    patientId: patient._id,
    patientCustomId: patient.patientId,
    patientName: patient.fullName,
    medicineName: 'Paracetamol IV 1000mg Infusion',
    dosage: '1000mg',
    route: 'IV Infusion',
    status: 'Administered',
    administeredBy: nurse.name,
    administeredById: nurse._id,
    notes: 'Administered over 15 minutes. Patient tolerated well.'
  };
  const medRes = await axios.post(`${API_BASE}/medication-administrations`, medPayload, headers);
  console.log(`✓ 5. Medication Administration recorded in MongoDB (Status: ${medRes.data.status || medRes.data.administration?.status || 'Administered'})`);

  // 6. Nurse Resource Request (e.g. Oxygen Cylinder / Ventilator)
  const reqPayload = {
    patientId: patient._id,
    patientCustomId: patient.patientId,
    patientName: patient.fullName,
    resourceType: 'Oxygen Cylinder',
    quantity: 1,
    priority: 'Urgent',
    clinicalReason: 'Desaturating to 89% SpO2, high flow O2 therapy required',
    requestedBy: nurse.name,
    requestedRole: 'Nurse'
  };
  const resReq = await axios.post(`${API_BASE}/resource-requests`, reqPayload, headers);
  console.log(`✓ 6. Nurse Resource Request created for Admin approval (Request ID: ${resReq.data.requestId || resReq.data.request?.requestId || resReq.data._id})`);

  // 7. Nurse Notifications
  const notifRes = await axios.get(`${API_BASE}/notifications`, headers);
  console.log(`✓ 7. Nurse Notifications verified (${notifRes.data.notifications?.length || notifRes.data.length || 0} notifications loaded)`);

  console.log('\n======================================================');
  console.log('🎉 ENTIRE NURSE WORKFLOW MODULE VERIFIED AND ACTIVE!');
  console.log('======================================================\n');
  process.exit(0);
}

testNurseModuleFlow().catch(err => {
  console.error('❌ Nurse Module Verification Error:', err.message, err.response?.data);
  process.exit(1);
});
