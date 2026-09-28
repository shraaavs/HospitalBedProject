import mongoose from 'mongoose';

const bedReservationSchema = new mongoose.Schema({
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
  reservedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receptionist',
    required: true
  },
  reservationDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  expectedAdmission: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Cancelled', 'Admitted'],
    default: 'Active'
  }
}, { timestamps: true });

export default mongoose.model('BedReservation', bedReservationSchema);
