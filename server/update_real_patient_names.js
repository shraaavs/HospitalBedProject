import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const realNames = [
  { match: /test.*real/i, name: 'Ananya Sharma' },
  { match: /second.*patient/i, name: 'Rohan Verma' },
  { match: /test.*patient/i, name: 'Priya Iyer' },
  { match: /test/i, name: 'Vikram Malhotra' },
  { match: /patient/i, name: 'Aarav Deshmukh' }
];

const fallbackNames = [
  'Ananya Sharma', 'Rohan Verma', 'Priya Iyer', 'Vikram Malhotra', 
  'Aarav Deshmukh', 'Kavita Sundaram', 'Rajesh Kulkarni', 'Sneha Nair'
];

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    const patientsColl = db.collection('patients');
    const appointmentsColl = db.collection('appointments');
    const emergenciesColl = db.collection('emergencies');
    const bedsColl = db.collection('beds');

    const patients = await patientsColl.find({}).toArray();
    console.log('Total patient records found:', patients.length);

    let idx = 0;
    for (const p of patients) {
      const currentName = p.fullName || p.name || '';
      if (
        currentName.toLowerCase().includes('test') || 
        currentName.toLowerCase().includes('second') || 
        currentName.toLowerCase().includes('sample') ||
        currentName.toLowerCase() === 'patient'
      ) {
        let newName = null;
        for (const rn of realNames) {
          if (rn.match.test(currentName)) {
            newName = rn.name;
            break;
          }
        }
        if (!newName) {
          newName = fallbackNames[idx % fallbackNames.length];
          idx++;
        }

        console.log(`Updating: "${currentName}" -> "${newName}" (${p.patientId || p._id})`);

        await patientsColl.updateOne(
          { _id: p._id },
          { $set: { fullName: newName, name: newName } }
        );

        if (p.patientId) {
          await appointmentsColl.updateMany(
            { patientId: p.patientId },
            { $set: { patientName: newName } }
          );
          await emergenciesColl.updateMany(
            { patientId: p.patientId },
            { $set: { patientName: newName } }
          );
          await bedsColl.updateMany(
            { 'currentPatient.patientId': p.patientId },
            { $set: { 'currentPatient.name': newName, 'currentPatient.patientName': newName } }
          );
        }
      }
    }

    // Clean any remaining appointments with test patient names
    await appointmentsColl.updateMany(
      { patientName: { $regex: /test/i } },
      { $set: { patientName: 'Priya Iyer' } }
    );
    await emergenciesColl.updateMany(
      { patientName: { $regex: /test/i } },
      { $set: { patientName: 'Vikram Malhotra' } }
    );

    console.log('✅ All test names successfully converted to real patient names!');
  } catch (err) {
    console.error('Error updating patient names:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
