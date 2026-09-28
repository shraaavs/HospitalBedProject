import mongoose from 'mongoose';

const queueSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    unique: true
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
  patientName: {
    type: String,
    required: true
  },
  patientCustomId: {
    type: String,
    default: ''
  },
  appointmentTime: {
    type: String,
    required: true
  },
  queuePosition: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['Waiting', 'Called', 'In Consultation', 'Completed', 'Cancelled', 'No Show'],
    default: 'Waiting'
  },
  checkedInAt: {
    type: Date,
    default: Date.now
  },
  calledAt: {
    type: Date
  },
  consultationStartedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('Queue', queueSchema);
