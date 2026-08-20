import mongoose from 'mongoose';

const nursingTaskSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  taskType: {
    type: String,
    enum: ['Vitals', 'Medication', 'General', 'Hygiene', 'Assessment'],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Completed'],
    default: 'Pending'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  dueDate: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

export default mongoose.model('NursingTask', nursingTaskSchema);
