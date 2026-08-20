import mongoose from 'mongoose';

const bedTransferSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  fromBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    required: true
  },
  toBed: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transferDate: {
    type: Date,
    default: Date.now,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('BedTransfer', bedTransferSchema);
