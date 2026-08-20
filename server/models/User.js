import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['Doctor', 'Nurse', 'Receptionist', 'Admin', 'Staff', 'Inventory Manager'],
    default: 'Staff'
  },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
