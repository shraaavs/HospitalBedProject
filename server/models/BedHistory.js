import mongoose from 'mongoose';

const bedHistorySchema = new mongoose.Schema({
  bed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    default: null
  },
  action: {
    type: String,
    enum: ['Allocated', 'Reserved', 'Cleaned', 'Maintenance', 'Transferred', 'Available', 'Registered'],
    required: true
  },
  details: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('BedHistory', bedHistorySchema);
