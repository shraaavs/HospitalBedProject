import mongoose from 'mongoose';

const resourceAllocationSchema = new mongoose.Schema({
  allocationId: {
    type: String,
    unique: true,
    index: true
  },
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ResourceRequest',
    required: true,
    index: true
  },
  requestCustomId: {
    type: String,
    default: ''
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true
  },
  resourceName: {
    type: String,
    required: true
  },
  resourceType: {
    type: String,
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
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
  admissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdmissionBedRequest'
  },
  admissionCustomId: {
    type: String,
    default: ''
  },
  ward: {
    type: String,
    default: 'General Ward'
  },
  bedNumber: {
    type: String,
    default: 'Unassigned'
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  assetTag: {
    type: String,
    required: true,
    trim: true
  },
  serialNumber: {
    type: String,
    default: '',
    trim: true
  },
  deviceModel: {
    type: String,
    default: '',
    trim: true
  },
  allocatedBy: {
    type: String,
    default: 'Hospital Admin'
  },
  allocatedAt: {
    type: Date,
    default: Date.now
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
  },
  status: {
    type: String,
    enum: ['Allocated', 'In Use', 'Released'],
    default: 'Allocated'
  },
  notes: {
    type: String,
    default: ''
  }
}, { timestamps: true });

export default mongoose.model('ResourceAllocation', resourceAllocationSchema);
