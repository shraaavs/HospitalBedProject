import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const nurseSchema = new mongoose.Schema({
  nurseId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: { type: String, required: true },
  assignedWard: { type: String, default: 'General Medicine' },
  qualification: { type: String, default: 'B.Sc. Nursing, RN (Critical Care Certified)' },
  shift: { type: String, default: 'Morning Shift (07:00 AM - 03:00 PM)' },
  workingDays: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  availability: {
    status: { type: String, enum: ['On Duty', 'Available', 'Off Duty', 'On Break', 'On Call', 'In Ward', 'On Leave', 'Active'], default: 'On Duty' },
    isAvailable: { type: Boolean, default: true },
    shiftHours: { type: String, default: '07:00 AM - 03:00 PM' }
  },
  phone: { type: String, default: '+91 98765 43219' },
  profilePicture: { type: String, default: '' },
  role: { type: String, default: 'Nurse' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

nurseSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

nurseSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Nurse', nurseSchema);
