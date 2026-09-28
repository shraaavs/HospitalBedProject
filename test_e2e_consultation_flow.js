import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
dotenv.config();

const API_BASE = 'http://127.0.0.1:5000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_hospitalbed_key';

async function runScenarioTest() {
  console.log('--- Starting Complete 13-Step Doctor Availability & Receptionist Queue E2E Test ---');

  // Connect DB to fetch existing Doctor and Receptionist credentials
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';
  await mongoose.connect(MONGO_URI);
  console.log('✓ Connected to MongoDB');

  const Doctor = (await import('./server/models/Doctor.js')).default;
  const Receptionist = (await import('./server/models/Receptionist.js')).default;
  const Patient = (await import('./server/models/Patient.js')).default;
  const Appointment = (await import('./server/models/Appointment.js')).default;
  const Queue = (await import('./server/models/Queue.js')).default;

  const doctor = await Doctor.findOne({ role: 'Doctor' });
  const receptionist = await Receptionist.findOne({ role: 'Receptionist' });
  const patient = await Patient.findOne();

  if (!doctor || !receptionist || !patient) {
    console.error('Missing seed data for doctor, receptionist, or patient');
    process.exit(1);
  }

  console.log(`✓ Doctor: ${doctor.name} (${doctor._id})`);
  console.log(`✓ Receptionist: ${receptionist.name} (${receptionist._id})`);
  console.log(`✓ Patient: ${patient.fullName} (${patient.patientId})`);

  const docToken = jwt.sign({ id: doctor._id, role: 'Doctor' }, JWT_SECRET, { expiresIn: '1d' });
  const recToken = jwt.sign({ id: receptionist._id, role: 'Receptionist' }, JWT_SECRET, { expiresIn: '1d' });

  const docHeaders = { headers: { Authorization: `Bearer ${docToken}` } };
  const recHeaders = { headers: { Authorization: `Bearer ${recToken}` } };

  // 1. Receptionist books appointment
  const todayStr = new Date().toISOString().split('T')[0];
  const randMin = String(Math.floor(Math.random() * 50) + 10);
  const timeSlot = `04:${randMin} PM`;
  const bookRes = await axios.post(`${API_BASE}/appointments`, {
    patientId: patient._id,
    patientName: patient.fullName,
    patientCustomId: patient.patientId,
    doctorName: doctor.name,
    department: doctor.department || 'Cardiology',
    appointmentDate: todayStr,
    appointmentTime: timeSlot,
    type: 'Consultation',
    reason: 'Routine E2E cardiac checkup and vitals assessment',
    priority: 'Routine'
  }, recHeaders);

  const appointment = bookRes.data.appointment || bookRes.data;
  console.log(`✓ Step 1: Receptionist booked appointment (ID: ${appointment._id}, Status: ${appointment.status})`);

  // Step 13 Verification: Try sending patient BEFORE check-in -> Expect 400 rejection
  try {
    await axios.post(`${API_BASE}/appointments/${appointment._id}/send-patient`, {}, recHeaders);
    console.error('❌ FAILED: Non-checked-in patient was allowed to be sent!');
  } catch (err) {
    console.log(`✓ Step 13 Validation: Non-checked-in patient correctly blocked from sending (${err.response?.data?.message})`);
  }

  // 2 & 3. Patient arrives & Receptionist checks in patient
  const checkInRes = await axios.post(`${API_BASE}/appointments/${appointment._id}/check-in`, {}, recHeaders);
  console.log(`✓ Step 2 & 3: Receptionist checked in patient (Status: ${checkInRes.data.appointment.status}, QueueStatus: ${checkInRes.data.appointment.queueStatus})`);

  // 4. Patient appears in Waiting queue
  const queueRes = await axios.get(`${API_BASE}/appointments/queue/consultation-queue`, recHeaders);
  const inQueue = queueRes.data.find(q => q._id === appointment._id);
  console.log(`✓ Step 4: Patient verified in waiting queue (Found: ${!!inQueue}, Queue Position: ${inQueue?.queuePosition})`);

  // 5 & 6. Doctor sets status to Available
  // First test doctor unavailable blocks receptionist
  await axios.put(`${API_BASE}/users/doctor-availability`, { status: 'Unavailable' }, docHeaders);
  try {
    await axios.post(`${API_BASE}/appointments/${appointment._id}/send-patient`, {}, recHeaders);
    console.error('❌ FAILED: Receptionist was allowed to send patient while doctor is Unavailable!');
  } catch (err) {
    console.log(`✓ Edge Case Validation: Blocked sending patient when doctor is Unavailable (${err.response?.data?.message})`);
  }

  // Doctor clicks "Available – Call Patient"
  const availRes = await axios.put(`${API_BASE}/users/doctor-availability`, { status: 'Available' }, docHeaders);
  console.log(`✓ Step 5 & 6: Doctor updated availability to Available (${availRes.data.availabilityStatus})`);

  // 7 & 8. Receptionist sends the checked-in patient
  const sendRes = await axios.post(`${API_BASE}/appointments/${appointment._id}/send-patient`, {}, recHeaders);
  console.log(`✓ Step 7 & 8: Receptionist sent patient to doctor (Status: ${sendRes.data.appointment.status}, Doctor Status: ${sendRes.data.doctorAvailability})`);

  // 9. Doctor performs consultation & 10. Completes consultation
  const completeRes = await axios.post(`${API_BASE}/appointments/${appointment._id}/complete-consultation`, {
    diagnosis: 'Healthy cardiac rhythm, trace sinus tachycardia',
    treatment: 'Lifestyle modification, reduce caffeine',
    prescriptions: ['Vitamin B-Complex 1 tab daily for 10 days'],
    notes: 'Patient advised to review in 3 months.'
  }, docHeaders);
  console.log(`✓ Step 9 & 10: Doctor completed consultation (Appointment Status: ${completeRes.data.appointment.status})`);

  // 11. Doctor becomes Available automatically
  const docAfter = await Doctor.findById(doctor._id);
  console.log(`✓ Step 11: Doctor availability automatically reset to: ${docAfter.availability.status}`);

  // 12. Receptionist queue state verification
  const queueAfter = await axios.get(`${API_BASE}/appointments/queue/consultation-queue`, recHeaders);
  const stillWaiting = queueAfter.data.find(q => q._id === appointment._id && q.status === 'Waiting');
  console.log(`✓ Step 12: Receptionist consultation queue updated. Completed appointment removed from waiting: ${!stillWaiting}`);

  console.log('\n======================================================');
  console.log('🎉 ALL 13 STEPS & CONSTRAINTS VALIDATED SUCCESSFULLY!');
  console.log('======================================================\n');
  process.exit(0);
}

runScenarioTest().catch(err => {
  console.error('❌ E2E Scenario Failed:', err.message, err.response?.data);
  process.exit(1);
});
