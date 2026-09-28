import mongoose from 'mongoose';

const bedSchema = new mongoose.Schema({
  bedNumber: {
    type: String,
    required: true,
    unique: true,
  },
  wardType: {
    type: String,
    enum: ['ICU', 'General', 'Special', 'Surgery', 'Pediatric', 'Emergency', 'Isolation', 'Maternity', 'HDU', 'Other'],
    required: true,
  },
  department: {
    type: String,
    default: 'General Medicine'
  },
  type: {
    type: String,
    default: null
  },
  dailyRate: {
    type: Number,
    default: null
  },
  status: {
    type: String,
    enum: ['Available', 'Occupied', 'Cleaning', 'Reserved', 'Maintenance', 'Blocked'],
    default: 'Available'
  },
  floor: {
    type: String,
    default: null,
  },
  room: {
    type: String,
    default: null,
  },
  bedType: {
    type: String,
    enum: ['Standard', 'Motorized', 'Bariatric', 'Pediatric', 'ICU', 'Other'],
    default: 'Standard'
  },

  patientName: {
    type: String,
    default: null,
  },
  patientId: {
    type: String,
    default: null,
  },
  admissionDate: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: null,
  }
}, { timestamps: true });

export default mongoose.model('Bed', bedSchema);
