import express from 'express';
import Bed from '../models/Bed.js';
import Patient from '../models/Patient.js';
import BedAllocation from '../models/BedAllocation.js';
import BedReservation from '../models/BedReservation.js';
import BedTransfer from '../models/BedTransfer.js';
import BedHistory from '../models/BedHistory.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to log history
const logBedHistory = async (bedId, patientId, action, details, userId) => {
  await BedHistory.create({
    bed: bedId,
    patient: patientId,
    action,
    details,
    user: userId
  });
};

// GET all beds
router.get('/', protect, async (req, res) => {
  try {
    const { ward, status, search } = req.query;
    let query = {};
    let andConditions = [];
    
    if (ward && ward !== 'All Wards' && ward !== 'All') {
      andConditions.push({ $or: [{ wardType: ward }, { type: ward }] });
    }
    
    if (status && status !== 'All') {
      andConditions.push({ status: status });
    }
    
    if (search) {
      andConditions.push({
        $or: [
          { bedNumber: { $regex: search, $options: 'i' } },
          { patientName: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    let beds = await Bed.find(query).sort({ bedNumber: 1 });
    
    // Auto-seed if completely empty (just for initial setup)
    if (beds.length === 0 && Object.keys(query).length === 0) {
      const seedBeds = [
        { bedNumber: 'G-102', wardType: 'General', status: 'Occupied', patientName: 'Elena Rodriguez', patientId: '9823-X', admissionDate: new Date() },
        { bedNumber: 'G-103', wardType: 'General', status: 'Available' },
        { bedNumber: 'G-108', wardType: 'General', status: 'Reserved', notes: 'Incoming Transfer' },
        { bedNumber: 'ICU-01', wardType: 'ICU', status: 'Occupied', patientName: 'John Doe', patientId: '1122-A', admissionDate: new Date() },
        { bedNumber: 'ICU-04', wardType: 'ICU', status: 'Available' },
        { bedNumber: 'S-201', wardType: 'Surgery', status: 'Available' },
        { bedNumber: 'S-205', wardType: 'Surgery', status: 'Cleaning', notes: 'Routine' }
      ];
      await Bed.insertMany(seedBeds);
      beds = await Bed.find().sort({ bedNumber: 1 });
    }
    
    res.json(beds);
  } catch (error) {
    console.error('Error fetching beds:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET bed stats
router.get('/stats', protect, async (req, res) => {
  try {
    const beds = await Bed.find();
    const total = beds.length;
    const occupied = beds.filter(b => b.status === 'Occupied').length;
    const available = beds.filter(b => b.status === 'Available').length;
    const reserved = beds.filter(b => b.status === 'Reserved').length;
    const cleaning = beds.filter(b => b.status === 'Cleaning').length;
    const maintenance = beds.filter(b => b.status === 'Maintenance').length;

    const icu = beds.filter(b => b.wardType === 'ICU');
    const general = beds.filter(b => b.wardType === 'General');
    const surgery = beds.filter(b => b.wardType === 'Surgery');

    res.json({
      total, occupied, available, reserved, cleaning, maintenance,
      icu: { total: icu.length, available: icu.filter(b => b.status === 'Available').length },
      general: { total: general.length, available: general.filter(b => b.status === 'Available').length },
      surgery: { total: surgery.length, available: surgery.filter(b => b.status === 'Available').length },
      occupancyRate: total === 0 ? 0 : Math.round((occupied / total) * 100)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET bed details by ID
router.get('/:id/details', protect, async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.id);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    const history = await BedHistory.find({ bed: bed._id }).sort({ timestamp: -1 }).limit(10).populate('user', 'name role');
    const activeAllocation = await BedAllocation.findOne({ bed: bed._id, status: 'Active' }).populate('patient');
    const activeReservation = await BedReservation.findOne({ bed: bed._id, status: 'Active' }).populate('patient');

    res.json({ bed, history, activeAllocation, activeReservation });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST Allocate Bed
router.post('/allocate', protect, requireRole(['Admin', 'Doctor', 'Receptionist', 'Nurse']), async (req, res) => {
  try {
    const { bedId, patientId, notes } = req.body;
    
    const bed = await Bed.findById(bedId);
    if (!bed || bed.status !== 'Available') {
      return res.status(400).json({ message: 'Bed is not available for allocation' });
    }

    let patient;
    if (patientId) {
       // Check if patient exists, if not create dummy for now to avoid breaking without actual patient records
       patient = await Patient.findOne({ patientId });
       if (!patient) {
           patient = await Patient.create({
               patientId,
               fullName: req.body.patientName || 'Unknown Patient',
               dob: new Date(1980, 1, 1),
               gender: 'Other',
               contactNumber: '0000000000',
               status: 'Admitted'
           });
       } else {
           patient.status = 'Admitted';
           patient.bedId = bed._id;
           await patient.save();
       }
    }

    // Ensure wardType exists for validation
    const validWardTypes = ['ICU', 'General', 'Surgery'];
    if (!bed.wardType) bed.wardType = validWardTypes.includes(bed.type) ? bed.type : 'General';

    bed.status = 'Occupied';
    bed.patientName = patient ? patient.fullName : req.body.patientName;
    bed.patientId = patientId;
    bed.admissionDate = new Date();
    bed.notes = notes;
    await bed.save();

    if (patient) {
        await BedAllocation.create({
            patient: patient._id,
            bed: bed._id,
            allocatedBy: req.user._id,
            startTime: new Date()
        });
    }

    await logBedHistory(bed._id, patient ? patient._id : null, 'Allocated', `Allocated to ${bed.patientName}`, req.user._id);

    res.json(bed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error allocating bed' });
  }
});

// POST Reserve Bed
router.post('/reserve', protect, requireRole(['Admin', 'Receptionist', 'Doctor']), async (req, res) => {
  try {
    const { bedId, patientId, expectedAdmission, reason } = req.body;
    
    const bed = await Bed.findById(bedId);
    if (!bed || bed.status !== 'Available') {
      return res.status(400).json({ message: 'Bed is not available' });
    }

    let patient = await Patient.findOne({ patientId });

    // Ensure wardType exists for validation
    const validWardTypes = ['ICU', 'General', 'Surgery'];
    if (!bed.wardType) bed.wardType = validWardTypes.includes(bed.type) ? bed.type : 'General';

    bed.status = 'Reserved';
    bed.notes = `Reserved for ${patient ? patient.fullName : patientId} - ${reason}`;
    await bed.save();

    if (patient) {
        await BedReservation.create({
            patient: patient._id,
            bed: bed._id,
            reservedBy: req.user._id,
            expectedAdmission,
            reason
        });
    }

    await logBedHistory(bed._id, patient ? patient._id : null, 'Reserved', reason, req.user._id);

    res.json(bed);
  } catch (error) {
    res.status(500).json({ message: 'Error reserving bed' });
  }
});

// POST Transfer Patient
router.post('/transfer', protect, requireRole(['Admin', 'Doctor', 'Nurse']), async (req, res) => {
  try {
    const { fromBedId, toBedId, reason } = req.body;

    const fromBed = await Bed.findById(fromBedId);
    const toBed = await Bed.findById(toBedId);

    if (!fromBed || fromBed.status !== 'Occupied') return res.status(400).json({ message: 'Source bed is not occupied' });
    if (!toBed || toBed.status !== 'Available') return res.status(400).json({ message: 'Destination bed is not available' });

    let patient;
    if (fromBed.patientId) {
        patient = await Patient.findOne({ patientId: fromBed.patientId });
        if (patient) {
            patient.bedId = toBed._id;
            await patient.save();

            // End old allocation
            await BedAllocation.findOneAndUpdate(
                { bed: fromBed._id, patient: patient._id, status: 'Active' },
                { status: 'Transferred', endTime: new Date() }
            );

            // Start new allocation
            await BedAllocation.create({
                patient: patient._id,
                bed: toBed._id,
                allocatedBy: req.user._id,
                startTime: new Date()
            });

            await BedTransfer.create({
                patient: patient._id,
                fromBed: fromBed._id,
                toBed: toBed._id,
                reason,
                requestedBy: req.user._id
            });
        }
    }

    // Ensure wardType exists and is valid for validation (fallback for seeded data)
    const validWardTypes = ['ICU', 'General', 'Surgery'];
    if (!toBed.wardType) toBed.wardType = validWardTypes.includes(toBed.type) ? toBed.type : 'General';
    if (!fromBed.wardType) fromBed.wardType = validWardTypes.includes(fromBed.type) ? fromBed.type : 'General';

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

    await logBedHistory(toBed._id, patient ? patient._id : null, 'Transferred', `Transferred from ${fromBed.bedNumber}: ${reason}`, req.user._id);
    await logBedHistory(fromBed._id, patient ? patient._id : null, 'Cleaned', `Marked for cleaning after transfer to ${toBed.bedNumber}`, req.user._id);

    res.json({ fromBed, toBed });
  } catch (error) {
    console.error('Transfer Error:', error);
    res.status(500).json({ message: 'Error transferring patient', error: error.message });
  }
});

// PUT Simple Status Update (e.g. Cleaning -> Available)
router.put('/:id/status', protect, requireRole(['Doctor', 'Receptionist', 'Admin', 'Nurse', 'Inventory Manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const bed = await Bed.findById(id);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    // Handle Discharge if occupied
    if (bed.status === 'Occupied' && (status === 'Cleaning' || status === 'Available')) {
         if (bed.patientId) {
             const patient = await Patient.findOne({ patientId: bed.patientId });
             if (patient) {
                 patient.status = 'Discharged';
                 patient.bedId = null;
                 await patient.save();
                 
                 await BedAllocation.findOneAndUpdate(
                    { bed: bed._id, patient: patient._id, status: 'Active' },
                    { status: 'Completed', endTime: new Date() }
                 );
             }
         }
    }
    
    // Ensure wardType exists for validation (fallback for seeded data)
    const validWardTypes = ['ICU', 'General', 'Surgery'];
    if (!bed.wardType) bed.wardType = validWardTypes.includes(bed.type) ? bed.type : 'General';

    bed.status = status;
    if (status === 'Available') {
      bed.patientName = null;
      bed.patientId = null;
      bed.admissionDate = null;
      bed.notes = null;
    } else {
      if (notes) bed.notes = notes;
    }

    await bed.save();
    
    await logBedHistory(bed._id, null, status === 'Cleaning' ? 'Cleaned' : status === 'Available' ? 'Available' : status === 'Maintenance' ? 'Maintenance' : 'Updated', notes || `Status changed to ${status}`, req.user._id);

    res.json(bed);
  } catch (error) {
    console.error('Error updating bed:', error);
    res.status(500).json({ message: 'Error updating bed status' });
  }
});

// POST to register a completely new bed in the hospital
router.post('/', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const { bedNumber, wardType, room, floor, bedType } = req.body;
    const newBed = new Bed({ bedNumber, wardType, room, floor, bedType });
    await newBed.save();
    res.status(201).json(newBed);
  } catch (error) {
    console.error('Error creating bed:', error);
    res.status(500).json({ message: 'Error creating bed' });
  }
});

export default router;
