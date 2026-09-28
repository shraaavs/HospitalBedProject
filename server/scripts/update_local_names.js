import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const indianNames = [
  'Aarav Patel',
  'Ananya Sharma',
  'Rohan Verma',
  'Priya Iyer',
  'Vikram Malhotra',
  'Deepak Gupta',
  'Siddharth Reddy',
  'Kavita Joshi',
  'Neha Deshmukh',
  'Amitabh Sengupta',
  'Aditi Rao',
  'Rajesh Nair',
  'Suresh Pillai',
  'Meera Kulkarni',
  'Sanjay Chawla',
  'Sunita Singhania',
  'Varun Bhatia',
  'Pooja Hegde',
  'Manoj Tiwari',
  'Tanvi Saxena'
];

async function updateAllPatientNames() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb+srv://shravyaacharya85_db_user:Shravya%40%231305@hospitalbed.uummffz.mongodb.net/HospitalDB?retryWrites=true&w=majority';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;

    // 1. Update Patients
    const patients = await db.collection('patients').find({}).toArray();
    console.log(`Found ${patients.length} patients in MongoDB`);
    
    let nameIdx = 0;
    for (const pat of patients) {
      const currentName = pat.fullName || pat.name || '';
      // If it looks like placeholder / English dummy name
      if (!currentName || /John|Jane|Doe|Smith|Robert|Johnson|Green|Mitchell|King|Lee|Holt|Davies|Test|Sample/i.test(currentName)) {
        const newLocalName = indianNames[nameIdx % indianNames.length];
        nameIdx++;
        await db.collection('patients').updateOne(
          { _id: pat._id },
          { 
            $set: { 
              fullName: newLocalName,
              name: newLocalName
            } 
          }
        );
        console.log(`Updated patient ${pat._id} from "${currentName}" -> "${newLocalName}"`);
      }
    }

    // 2. Update Appointments
    const appointments = await db.collection('appointments').find({}).toArray();
    for (let i = 0; i < appointments.length; i++) {
      const appt = appointments[i];
      const cur = appt.patientName || '';
      if (!cur || /John|Jane|Doe|Smith|Robert|Johnson|Green|Mitchell|King|Lee|Holt|Davies|Test|Sample/i.test(cur)) {
        const newName = indianNames[(i + 2) % indianNames.length];
        await db.collection('appointments').updateOne(
          { _id: appt._id },
          { $set: { patientName: newName } }
        );
        console.log(`Updated appointment patient name "${cur}" -> "${newName}"`);
      }
    }

    // 3. Update Beds
    const beds = await db.collection('beds').find({}).toArray();
    for (let i = 0; i < beds.length; i++) {
      const bed = beds[i];
      const cur = bed.patientName || '';
      if (cur && /John|Jane|Doe|Smith|Robert|Johnson|Green|Mitchell|King|Lee|Holt|Davies|Test|Sample|Elena Rodriguez/i.test(cur)) {
        const newName = indianNames[(i + 4) % indianNames.length];
        await db.collection('beds').updateOne(
          { _id: bed._id },
          { $set: { patientName: newName } }
        );
        console.log(`Updated bed patient name "${cur}" -> "${newName}"`);
      }
    }

    // 4. Update VitalLogs
    const vitals = await db.collection('vitallogs').find({}).toArray();
    for (let i = 0; i < vitals.length; i++) {
      const v = vitals[i];
      const cur = v.patientName || '';
      if (cur && /John|Jane|Doe|Smith|Robert|Johnson|Green|Mitchell|King|Lee|Holt|Davies|Test|Sample/i.test(cur)) {
        const newName = indianNames[(i + 1) % indianNames.length];
        await db.collection('vitallogs').updateOne(
          { _id: v._id },
          { $set: { patientName: newName } }
        );
      }
    }

    // 5. Update AdmissionBedRequests
    const bedReqs = await db.collection('admissionbedrequests').find({}).toArray();
    for (let i = 0; i < bedReqs.length; i++) {
      const b = bedReqs[i];
      const cur = b.patientName || '';
      if (cur && /John|Jane|Doe|Smith|Robert|Johnson|Green|Mitchell|King|Lee|Holt|Davies|Test|Sample/i.test(cur)) {
        const newName = indianNames[(i + 3) % indianNames.length];
        await db.collection('admissionbedrequests').updateOne(
          { _id: b._id },
          { $set: { patientName: newName } }
        );
      }
    }

    // 6. Update EmergencyPatients
    const emgs = await db.collection('emergencypatients').find({}).toArray();
    for (let i = 0; i < emgs.length; i++) {
      const em = emgs[i];
      const cur = em.patientName || '';
      if (cur && /John|Jane|Doe|Smith|Robert|Johnson|Green|Mitchell|King|Lee|Holt|Davies|Test|Sample/i.test(cur)) {
        const newName = indianNames[(i + 5) % indianNames.length];
        await db.collection('emergencypatients').updateOne(
          { _id: em._id },
          { $set: { patientName: newName } }
        );
      }
    }

    console.log('All names successfully updated to local Indian names!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating names:', error);
    process.exit(1);
  }
}

updateAllPatientNames();
