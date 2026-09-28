import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from './server/models/Admin.js';
import Doctor from './server/models/Doctor.js';
import Nurse from './server/models/Nurse.js';
import Receptionist from './server/models/Receptionist.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed');
    console.log('Connected to MongoDB');

    // Wipe old collections
    await Admin.deleteMany({});
    await Doctor.deleteMany({});
    await Nurse.deleteMany({});
    await Receptionist.deleteMany({});
    console.log('Cleared existing auth records.');

    // Seed Admin
    const admin = new Admin({
      adminId: 'ADM-001',
      name: 'System Admin',
      email: 'admin@mediflow.com',
      username: 'admin',
      password: 'password123'
    });
    await admin.save();
    
    // Seed Doctor
    const doctor = new Doctor({
      doctorId: 'DOC-001',
      name: 'Dr. Sarah Chen',
      email: 'schen@mediflow.com',
      username: 'doctor',
      password: 'password123',
      department: 'Cardiology'
    });
    await doctor.save();
    
    // Seed Nurse
    const nurse = new Nurse({
      nurseId: 'NUR-001',
      name: 'Nurse Joy',
      email: 'joy@mediflow.com',
      username: 'nurse',
      password: 'password123',
      department: 'ICU',
      assignedWard: 'General'
    });
    await nurse.save();
    
    // Seed Receptionist
    const receptionist = new Receptionist({
      receptionistId: 'REC-001',
      name: 'Emma Desk',
      email: 'emma@mediflow.com',
      username: 'receptionist',
      password: 'password123'
    });
    await receptionist.save();

    console.log('Successfully seeded 1 Admin, 1 Doctor, 1 Nurse, 1 Receptionist.');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

run();
