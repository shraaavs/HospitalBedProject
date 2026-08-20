import mongoose from 'mongoose';
import Bed from './server/models/Bed.js';
import Patient from './server/models/Patient.js';
import BedAllocation from './server/models/BedAllocation.js';
import BedTransfer from './server/models/BedTransfer.js';
import BedHistory from './server/models/BedHistory.js';

async function test() {
  await mongoose.connect('mongodb+srv://hospitalbed.uummffz.mongodb.net/HospitalDB?retryWrites=true&w=majority', {
    auth: { username: 'shravyaacharya85_db_user', password: 'Shravya@#1305' }
  });

  const fromBed = await Bed.findOne({ status: 'Occupied' });
  const toBed = await Bed.findOne({ status: 'Available' });

  if (!fromBed || !toBed) {
    console.log('Need both occupied and available beds');
    return;
  }

  let patient = null;
  if (fromBed.patientId) {
    patient = await Patient.findOne({ patientId: fromBed.patientId });
  }

  const validWardTypes = ['ICU', 'General', 'Surgery'];
  if (!toBed.wardType) toBed.wardType = validWardTypes.includes(toBed.type) ? toBed.type : 'General';
  if (!fromBed.wardType) fromBed.wardType = validWardTypes.includes(fromBed.type) ? fromBed.type : 'General';

  try {
    if (patient) {
        patient.bedId = toBed._id;
        await patient.save();

        await BedAllocation.findOneAndUpdate(
            { bed: fromBed._id, patient: patient._id, status: 'Active' },
            { status: 'Transferred', endTime: new Date() }
        );

        await BedAllocation.create({
            patient: patient._id,
            bed: toBed._id,
            allocatedBy: fromBed._id,
            startTime: new Date()
        });

        await BedTransfer.create({
            patient: patient._id,
            fromBed: fromBed._id,
            toBed: toBed._id,
            reason: 'test',
            requestedBy: fromBed._id
        });
    }

    // Update toBed
    toBed.status = 'Occupied';
    toBed.patientName = fromBed.patientName;
    toBed.patientId = fromBed.patientId;
    toBed.admissionDate = fromBed.admissionDate;
    toBed.notes = `Transferred from ${fromBed.bedNumber}`;
    await toBed.save();

    // Update fromBed
    fromBed.status = 'Cleaning';
    fromBed.patientName = null;
    fromBed.patientId = null;
    fromBed.admissionDate = null;
    fromBed.notes = 'Requires cleaning after transfer';
    await fromBed.save();

    await BedHistory.create({
        bed: toBed._id,
        patient: patient ? patient._id : null,
        action: 'Transferred',
        details: `Transferred from ${fromBed.bedNumber}`,
        user: fromBed._id
    });
    
    await BedHistory.create({
        bed: fromBed._id,
        patient: patient ? patient._id : null,
        action: 'Cleaned',
        details: `Marked for cleaning`,
        user: fromBed._id
    });

    console.log('Success!');
  } catch(e) {
    console.error('Error during patient block:', e);
  }

  await mongoose.disconnect();
}

test().catch(console.error);
