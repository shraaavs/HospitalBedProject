import mongoose from 'mongoose';

const doctorInstructionSchema = new mongoose.Schema({
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
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
  },
  doctorName: {
    type: String,
    required: true,
    default: 'Attending Physician'
  },
  doctorDepartment: {
    type: String,
    default: 'General Medicine'
  },
  instructionCategory: {
    type: String,
    enum: [
      'Vital Monitoring',
      'Medication & IV Fluid',
      'Wound & Post-Op Care',
      'Diet & Nutrition',
      'Mobility & Positioning',
      'Diagnostic & Lab Order',
      'Special Observation',
      'General Nursing Care'
    ],
    default: 'General Nursing Care'
  },
  instruction: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Routine', 'Medium', 'High', 'STAT / Critical'],
    default: 'Routine'
  },
  status: {
    type: String,
    enum: ['Pending', 'Acknowledged', 'In Progress', 'Completed', 'Discontinued'],
    default: 'Pending'
  },
  acknowledgedBy: {
    nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
    nurseName: { type: String, default: '' },
    acknowledgedAt: { type: Date }
  },
  completedBy: {
    nurseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Nurse' },
    nurseName: { type: String, default: '' },
    completedAt: { type: Date }
  },
  nursingRemarks: {
    type: String,
    default: '',
    trim: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('DoctorInstruction', doctorInstructionSchema);
