import mongoose from 'mongoose';

const medicationItemSchema = new mongoose.Schema({
  medicineName: {
    type: String,
    required: true,
    trim: true
  },
  drugId: {
    type: String,
    default: '',
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true // e.g., "500 mg", "10 ml", "1 tablet"
  },
  route: {
    type: String,
    enum: [
      'Oral',
      'Intravenous (IV)',
      'Intramuscular (IM)',
      'Subcutaneous',
      'Topical',
      'Inhalation',
      'Sublingual',
      'Rectal',
      'Ophthalmic',
      'Otic',
      'Other'
    ],
    default: 'Oral'
  },
  frequency: {
    type: String,
    required: true,
    default: 'Once daily (OD)'
  },
  duration: {
    type: String,
    required: true,
    default: '5 days'
  },
  quantity: {
    type: String,
    default: '1'
  },
  instructions: {
    type: String,
    default: 'Take with plenty of water'
  },
  timing: {
    type: String,
    enum: ['Before Food', 'After Food', 'With Food', 'Empty Stomach', 'Bedtime', 'As Directed'],
    default: 'After Food'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  specialInstructions: {
    type: String,
    default: ''
  }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },
  patientName: {
    type: String,
    required: true
  },
  patientCustomId: {
    type: String,
    default: ''
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
  },
  doctorName: {
    type: String,
    required: true
  },
  doctorDepartment: {
    type: String,
    default: 'General Medicine'
  },
  consultationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord',
    required: false
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: false
  },
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BedAllocation',
    required: false
  },
  admissionCustomId: {
    type: String,
    default: ''
  },
  ward: {
    type: String,
    default: ''
  },
  bedNumber: {
    type: String,
    default: ''
  },
  diagnosis: {
    type: String,
    default: 'Clinical Assessment'
  },
  prescriptionDate: {
    type: Date,
    default: Date.now
  },
  medications: {
    type: [medicationItemSchema],
    validate: [v => Array.isArray(v) && v.length > 0, 'At least one medication is required']
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Discontinued', 'Dispensed', 'Pending Pharmacy'],
    default: 'Active'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('Prescription', prescriptionSchema);
