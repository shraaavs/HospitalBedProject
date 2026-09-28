import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  patientCustomId: {
    type: String,
    default: ''
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false,
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false,
  },
  doctorName: {
    type: String,
    default: ''
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: false,
  },
  consultationDate: {
    type: Date,
    default: Date.now
  },
  chiefComplaint: {
    type: String,
    default: ''
  },
  symptoms: {
    type: String,
    default: ''
  },
  durationOfSymptoms: {
    type: String,
    default: ''
  },
  presentIllness: {
    type: String,
    default: ''
  },
  relevantMedicalHistory: {
    type: String,
    default: ''
  },
  allergies: {
    type: [String],
    default: []
  },
  currentMedications: {
    type: String,
    default: ''
  },
  clinicalObservations: {
    type: String,
    default: ''
  },
  diagnosis: {
    type: String,
    default: ''
  },
  diagnosisNotes: {
    type: String,
    default: ''
  },
  severity: {
    type: String,
    enum: ['Mild', 'Moderate', 'Severe', 'Critical'],
    default: 'Moderate'
  },
  treatmentPlan: {
    type: String,
    default: ''
  },
  treatment: {
    type: String,
    default: ''
  },
  recommendedTests: [{
    testName: String,
    urgency: { type: String, enum: ['Routine', 'Urgent', 'Stat'], default: 'Routine' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    dateRequested: { type: Date, default: Date.now },
    results: String
  }],
  doctorsMedicalNotes: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  followUpInstructions: {
    type: String,
    default: ''
  },
  vitals: {
    heartRate: Number,
    bloodPressure: String, // e.g., '120/80'
    temperature: Number, // in Celsius or Fahrenheit
    oxygenSaturation: Number, // percentage
    respiratoryRate: Number
  },
  prescriptions: [{
    medication: String,
    dosage: String,
    frequency: String,
    duration: String,
    route: { type: String, default: 'Oral' },
    dateAdded: { type: Date, default: Date.now }
  }],
  labRequests: [{
    testName: String,
    urgency: { type: String, enum: ['Routine', 'Urgent', 'Stat'], default: 'Routine' },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending' },
    dateRequested: { type: Date, default: Date.now },
    results: String
  }]
}, { timestamps: true });

export default mongoose.model('MedicalRecord', medicalRecordSchema);
