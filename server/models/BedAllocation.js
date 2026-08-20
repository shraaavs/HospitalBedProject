import mongoose from 'mongoose';

const bedAllocationSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  bed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    required: true
  },
  allocatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  endTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Transferred'],
    default: 'Active'
  }
}, { timestamps: true });

export default mongoose.model('BedAllocation', bedAllocationSchema);
