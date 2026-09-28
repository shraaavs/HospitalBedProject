import mongoose from 'mongoose';
import Bed from './server/models/Bed.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const beds = await Bed.find();
    console.log(`Found ${beds.length} beds. Updating bed numbers...`);

    for (let bed of beds) {
      // Generate a unique 6-digit number
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      bed.bedNumber = `BED-${randomNum}`;

      // Fix wardType for old data that might only have `type`
      const validWardTypes = ['ICU', 'General', 'Surgery'];
      if (!bed.wardType) {
         bed.wardType = validWardTypes.includes(bed.type) ? bed.type : 'General';
      }

      await bed.save();
    }

    console.log('Successfully updated all bed numbers to randomly generated unique numbers!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

run();
