import mongoose from 'mongoose';
import NursingTask from './server/models/NursingTask.js';
import Patient from './server/models/Patient.js';
import User from './server/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // get a patient
    const patient = await Patient.findOne();
    const user = await User.findOne({ role: 'Nurse' });

    if (!patient || !user) {
        console.log('No patient or nurse user found to link tasks to.');
        process.exit(1);
    }

    const tasks = [
        {
            patient: patient._id,
            taskType: 'Vitals',
            description: 'Check blood pressure and temperature',
            status: 'Pending',
            assignedTo: user._id
        },
        {
            patient: patient._id,
            taskType: 'Medication',
            description: 'Administer antibiotics IV',
            status: 'Pending',
            assignedTo: user._id
        },
        {
            patient: patient._id,
            taskType: 'General',
            description: 'Update patient chart notes',
            status: 'Completed',
            assignedTo: user._id
        }
    ];

    await NursingTask.insertMany(tasks);
    console.log('Nursing tasks seeded successfully!');
    process.exit(0);

  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
