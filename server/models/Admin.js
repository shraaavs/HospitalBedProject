import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  adminId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'Admin' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  designation: { type: String, default: 'Hospital Administrator & Operations Director' },
  department: { type: String, default: 'Hospital Administration & Clinical Operations' },
  phone: { type: String, default: '+91 98765 00001' },
  profilePhoto: {
    type: String,
    default: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256&h=256'
  },
  qualification: { type: String, default: 'MHA (Hospital Administration), MBBS' },
  emergencyContact: { type: String, default: '+91 98765 00002' },
  officeLocation: { type: String, default: 'Admin Block, Level 4, Room 401' }
}, { timestamps: true });

adminSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('Admin', adminSchema);
