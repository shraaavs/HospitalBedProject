import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    // Remove duplicate/auto-provisioned test accounts with timestamps
    const nurseDel = await db.collection('nurses').deleteMany({
      email: { $regex: '_1789' }
    });
    console.log('Removed duplicate nurses:', nurseDel.deletedCount);

    const recDel = await db.collection('receptionists').deleteMany({
      email: { $regex: '_1789' }
    });
    console.log('Removed duplicate receptionists:', recDel.deletedCount);

    const adminDel = await db.collection('admins').deleteMany({
      email: { $regex: '_1789' }
    });
    console.log('Removed duplicate admins:', adminDel.deletedCount);

    const docDel = await db.collection('doctors').deleteMany({
      email: { $regex: '_1789' }
    });
    console.log('Removed duplicate doctors:', docDel.deletedCount);

    const docs = await db.collection('doctors').find().toArray();
    const nurses = await db.collection('nurses').find().toArray();
    const recs = await db.collection('receptionists').find().toArray();
    const admins = await db.collection('admins').find().toArray();

    console.log('\n================ ACCURATE STAFF COUNTS ================');
    console.log(`Total Doctors: ${docs.length}`);
    console.log(`Total Nurses: ${nurses.length}`);
    console.log(`Total Receptionists: ${recs.length}`);
    console.log(`Total Admins: ${admins.length}`);

    console.log('\n--- REGISTERED DOCTORS ---');
    docs.forEach((d, i) => console.log(`${i+1}. ${d.name} (${d.doctorId}) - ${d.email}`));

    console.log('\n--- REGISTERED NURSES ---');
    nurses.forEach((n, i) => console.log(`${i+1}. ${n.name} (${n.nurseId}) - ${n.email}`));

    console.log('\n--- REGISTERED RECEPTIONISTS ---');
    recs.forEach((r, i) => console.log(`${i+1}. ${r.name} (${r.receptionistId}) - ${r.email}`));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
