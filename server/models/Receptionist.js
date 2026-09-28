import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const receptionistSchema = new mongoose.Schema({
  receptionistId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '+91 98765 11223' },
  department: { type: String, default: 'Central Reception & OPD' },
  deskLocation: { type: String, default: 'Ground Floor, Front Desk A' },
  shiftHours: { type: String, default: '08:00 AM - 04:00 PM' },
  role: { type: String, default: 'Receptionist' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

receptionistSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

receptionistSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Receptionist', receptionistSchema);
