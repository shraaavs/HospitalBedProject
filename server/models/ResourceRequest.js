import mongoose from 'mongoose';

const resourceRequestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientCustomId: {
    type: String,
    default: '',
    trim: true
  },
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdmissionBedRequest',
    required: false
  },
  admissionCustomId: {
    type: String,
    default: '',
    trim: true
  },
  ward: {
    type: String,
    default: 'General Ward'
  },
  bedNumber: {
    type: String,
    default: 'Unassigned'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
  },
  doctorName: {
    type: String,
    required: true,
    trim: true
  },
  doctorDepartment: {
    type: String,
    default: 'General Medicine',
    trim: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'requestedByModel'
  },
  requestedByModel: {
    type: String,
    enum: ['Doctor', 'Nurse', 'Admin'],
    default: 'Doctor'
  },
  resourceType: {
    type: String,
    required: true,
    enum: [
      'Ventilator',
      'Mechanical Ventilator',
      'Oxygen Cylinder',
      'Cardiac Monitor',
      'Infusion Pump',
      'Syringe Pump',
      'Wheelchair',
      'Defibrillator',
      'Dialysis Machine',
      'Suction Machine',
      'Nebulizer',
      'ECG Machine',
      'Hospital Bed / Specialty Mattress',
      'Medical Equipment',
      'Other Medical Equipment',
      'Other'
    ],
    default: 'Ventilator'
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  priority: {
    type: String,
    enum: ['Routine', 'Urgent', 'Emergency', 'Normal', 'High', 'High Priority', 'Critical', 'Critical / Emergency', 'Low', 'Medium'],
    default: 'Routine'
  },
  urgency: {
    type: String,
    default: 'Routine'
  },
  clinicalReason: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    trim: true
  },
  requiredFrom: {
    type: Date,
    default: Date.now
  },
  requiredUntil: {
    type: Date
  },
  additionalInstructions: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: [
      'Pending',
      'Approved',
      'Allocated',
      'In Use',
      'Released',
      'Unavailable',
      'Rejected',
      'Requested'
    ],
    default: 'Pending'
  },
  // Workflow & Audit Tracking
  availabilityCheckedBy: {
    type: String,
    default: ''
  },
  availabilityStatus: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: String,
    default: ''
  },
  approvedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  allocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceAllocation'
  },
  allocatedResourceDetails: {
    assetTag: String,
    serialNumber: String,
    deviceModel: String,
    locationWard: String,
    deviceTag: String,
    notes: String
  },
  allocatedBy: {
    type: String,
    default: ''
  },
  allocatedAt: {
    type: Date
  },
  inUseConfirmedBy: {
    type: String,
    default: ''
  },
  inUseConfirmedAt: {
    type: Date
  },
  releasedBy: {
    type: String,
    default: ''
  },
  releasedAt: {
    type: Date
  },
  releaseNotes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Pre-save alias syncing
resourceRequestSchema.pre('save', function () {
  if (this.clinicalReason && !this.reason) this.reason = this.clinicalReason;
  if (this.reason && !this.clinicalReason) this.clinicalReason = this.reason;

  if (this.priority && !this.urgency) this.urgency = this.priority;
  if (this.urgency && !this.priority) this.priority = this.urgency;

  if (this.status === 'Requested') this.status = 'Pending';
});

export default mongoose.model('ResourceRequest', resourceRequestSchema);
