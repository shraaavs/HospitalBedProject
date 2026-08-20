import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  vitals: {
    heartRate: Number,
    bloodPressure: String, // e.g., '120/80'
    temperature: Number, // in Celsius or Fahrenheit
    oxygenSaturation: Number, // percentage
  },
  diagnosis: {
    type: String,
  },
  treatment: {
    type: String,
  },
  notes: {
    type: String,
  },
  prescriptions: [{
    medication: String,
    dosage: String,
    frequency: String,
    duration: String,
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
