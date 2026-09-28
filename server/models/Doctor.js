import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const doctorSchema = new mongoose.Schema({
  doctorId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  specialization: { type: String, default: 'Interventional Cardiology & Electrophysiology' },
  phone: { type: String, default: '+91 98765 43210' },
  qualification: { type: String, default: 'MBBS, MD (General Medicine), DM (Cardiology), FACC' },
  qualifications: { type: String, default: 'MBBS, MD (General Medicine), DM (Cardiology), FACC' },
  registrationNumber: { type: String, default: 'MCI-2015-88491' },
  profilePhoto: { type: String, default: '' },
  assignedShift: { type: String, default: 'Morning Shift (09:00 AM - 05:00 PM)' },
  cabinNumber: { type: String, default: 'Consultation Suite 304, Block B' },
  bio: { type: String, default: 'Consultant Cardiologist specializing in coronary interventions, acute STEMI triage, and heart failure management.' },
  availability: {
    status: {
      type: String,
      enum: ['Available', 'Unavailable', 'In Consultation', 'On Duty', 'In Emergency / OT', 'On Leave', 'Off Duty', 'On Call', 'Active'],
      default: 'Available'
    },
    days: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    },
    shiftHours: {
      type: String,
      default: '09:00 AM - 05:00 PM'
    },
    emergencyOnCall: {
      type: Boolean,
      default: true
    }
  },
  role: { type: String, default: 'Doctor' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

doctorSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

doctorSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Doctor', doctorSchema);

