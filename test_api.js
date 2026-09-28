import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './server/models/User.js';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed');
    
    // get an admin or nurse user
    const user = await User.findOne({ role: 'Admin' }) || await User.findOne({ role: 'Nurse' });
    if (!user) {
      console.log('No user found');
      process.exit(1);
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'fallback_secret', {
      expiresIn: '30d',
    });

    console.log(`Testing with user role: ${user.role}`);

    const res1 = await fetch('http://localhost:5000/api/patients/my-patients', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('My Patients response status:', res1.status);
    if (!res1.ok) {
        console.log('My Patients error body:', await res1.text());
    }

    const res2 = await fetch('http://localhost:5000/api/nursing-tasks', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('Nursing tasks response status:', res2.status);
    if (!res2.ok) {
        console.log('Nursing tasks error body:', await res2.text());
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
