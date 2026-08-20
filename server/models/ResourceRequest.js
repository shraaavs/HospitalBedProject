import mongoose from 'mongoose';

const resourceRequestSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  itemRequested: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'InventoryItem',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  urgency: {
    type: String,
    enum: ['Normal', 'High', 'Critical'],
    default: 'Normal',
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Fulfilled', 'Denied'],
    default: 'Pending',
  },
  fulfilledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }
}, { timestamps: true });

export default mongoose.model('ResourceRequest', resourceRequestSchema);
