import mongoose from 'mongoose';
import User from './server/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const result = await User.updateMany(
      { role: 'Nurse' },
      { $set: { assignedWard: 'General' } }
    );
    
    console.log(`Updated ${result.modifiedCount} nurses with assignedWard: 'General'.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
