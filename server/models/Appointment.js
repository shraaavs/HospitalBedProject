import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
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
  doctorName: {
    type: String,
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
  },
  department: {
    type: String,
    default: 'Cardiology'
  },
  appointmentDate: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  appointmentTime: {
    type: String, // e.g. "09:30 AM"
    required: true
  },
  reason: {
    type: String,
    default: 'General Consultation'
  },
  type: {
    type: String,
    enum: ['Consultation', 'Follow-up', 'Routine Checkup', 'Emergency', 'Post-Op Check'],
    default: 'Consultation'
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Checked In', 'Waiting', 'Called', 'In Consultation', 'Completed', 'Cancelled', 'No Show'],
    default: 'Scheduled'
  },
  queueStatus: {
    type: String,
    enum: ['None', 'Waiting', 'Called', 'In Consultation', 'Completed', 'Cancelled', 'No Show'],
    default: 'None'
  },
  priority: {
    type: String,
    enum: ['Routine', 'Intermediate', 'Urgent', 'High'],
    default: 'Routine'
  },
  consultationNotes: {
    diagnosis: String,
    treatment: String,
    prescriptions: [String],
    notes: String,
    completedAt: Date
  },
  checkInTime: {
    type: Date
  },
  calledAt: {
    type: Date
  },
  consultationStartedAt: {
    type: Date
  },
  consultationCompletedAt: {
    type: Date
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('Appointment', appointmentSchema);
