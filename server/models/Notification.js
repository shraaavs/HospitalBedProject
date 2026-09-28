import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Critical Vitals',
      'Emergency Patient',
      'New Patient Assignment',
      'Doctor Instruction',
      'Medication Reminder',
      'Resource Request Update',
      'Transfer Request',
      'Discharge Instruction',
      'Patient Update',
      'New Appointment',
      'Patient Check-In',
      'Admission Request Status',
      'Bed Request',
      'Emergency Bed Request',
      'Bed Request Approval',
      'Bed Allocation',
      'Resource Request Approval',
      'Resource Allocation',
      'Critical Nursing Observation',
      'Transfer Status Change',
      'Discharge Processing Update',
      'General'
    ],
    default: 'General'
  },
  notificationType: {
    type: String,
    default: 'General'
  },
  relatedModule: {
    type: String,
    default: 'Dashboard'
  },
  priority: {
    type: String,
    enum: ['Critical', 'High', 'Normal', 'Info'],
    default: 'Normal'
  },
  recipientRole: {
    type: String,
    enum: ['Doctor', 'Nurse', 'Admin', 'Receptionist', 'All'],
    default: 'Doctor'
  },
  recipientNurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse'
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse'
  },
  nurseName: {
    type: String,
    default: ''
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    enum: ['Doctor', 'Nurse', 'Admin', 'Receptionist', 'User'],
    default: 'Doctor'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  doctorName: {
    type: String,
    default: 'Dr. Priya Sharma'
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  patientName: {
    type: String,
    default: ''
  },
  patientCustomId: {
    type: String,
    default: ''
  },
  appointmentId: {
    type: String,
    default: ''
  },
  emergencyId: {
    type: String,
    default: ''
  },
  requestId: {
    type: String,
    default: ''
  },
  requestedWard: {
    type: String,
    default: ''
  },
  requestedBedType: {
    type: String,
    default: ''
  },
  requestedBedNumber: {
    type: String,
    default: ''
  },
  transferDischargeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransferDischarge'
  },
  targetLink: {
    type: String,
    default: '/my-patients'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
