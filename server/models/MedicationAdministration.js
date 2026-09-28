import mongoose from 'mongoose';

const medicationAdministrationSchema = new mongoose.Schema({
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: false
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },
  patientCustomId: {
    type: String,
    required: true,
    trim: true
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  ward: {
    type: String,
    default: 'General Ward'
  },
  bedNumber: {
    type: String,
    default: 'Bed #01'
  },
  // Medication details from Doctor's prescription
  medicineName: {
    type: String,
    required: true,
    trim: true
  },
  prescribedDosage: {
    type: String,
    required: true,
    trim: true
  },
  prescribedRoute: {
    type: String,
    default: 'Oral'
  },
  prescribedFrequency: {
    type: String,
    default: 'Once daily (OD)'
  },
  prescribedDuration: {
    type: String,
    default: '5 days'
  },
  scheduledTime: {
    type: String,
    default: '08:00 AM'
  },
  doctorInstructions: {
    type: String,
    default: 'Take as prescribed by doctor'
  },
  prescribedDoctorName: {
    type: String,
    default: 'Attending Physician'
  },
  
  // Nurse administration details
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: false
  },
  nurseName: {
    type: String,
    required: true,
    default: 'Staff Nurse'
  },
  status: {
    type: String,
    enum: ['Administered', 'Not Administered', 'Refused', 'Held', 'Pending'],
    required: true,
    default: 'Administered'
  },
  administeredDose: {
    type: String,
    default: ''
  },
  administeredRoute: {
    type: String,
    default: 'Oral'
  },
  administeredDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  administeredTime: {
    type: String,
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  recordedAt: {
    type: Date,
    default: Date.now
  },
  remarks: {
    type: String,
    default: ''
  },
  reasonNotAdministered: {
    type: String,
    default: ''
  },
  vitalCheckBeforeAdmin: {
    bloodPressure: { type: String, default: '' },
    pulseRate: { type: String, default: '' },
    bloodSugar: { type: String, default: '' }
  }
}, { timestamps: true });

export default mongoose.model('MedicationAdministration', medicationAdministrationSchema);
