import express from 'express';
import mongoose from 'mongoose';
import Bed from '../models/Bed.js';
import Patient from '../models/Patient.js';
import EmergencyPatient from '../models/EmergencyPatient.js';
import BedAllocation from '../models/BedAllocation.js';
import BedReservation from '../models/BedReservation.js';
import BedTransfer from '../models/BedTransfer.js';
import BedHistory from '../models/BedHistory.js';
import AdmissionBedRequest from '../models/AdmissionBedRequest.js';
import TransferDischarge from '../models/TransferDischarge.js';
import Notification from '../models/Notification.js';
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
      const cleanWard = ward.replace(/\s*ward$/i, '').trim();
      const wardRegex = new RegExp(cleanWard, 'i');
      andConditions.push({ $or: [{ wardType: wardRegex }, { type: wardRegex }, { department: wardRegex }] });
    }
    
    if (status && status !== 'All') {
      andConditions.push({ status: status });
    }
    
    if (search) {
      andConditions.push({
        $or: [
          { bedNumber: { $regex: search, $options: 'i' } },
          { patientName: { $regex: search, $options: 'i' } },
          { patientId: { $regex: search, $options: 'i' } },
          { wardType: { $regex: search, $options: 'i' } },
          { department: { $regex: search, $options: 'i' } }
        ]
      });
    }

    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    let beds = await Bed.find(query).sort({ bedNumber: 1 });
    
    // Auto-seed Special, ICU, Emergency, and General beds if none or few exist
    const hasSpecial = await Bed.exists({ wardType: 'Special' });
    const hasEmergency = await Bed.exists({ wardType: 'Emergency' });
    if (!hasSpecial || !hasEmergency || beds.length === 0) {
      const seedBeds = [
        { bedNumber: 'SP-204', wardType: 'Special', status: 'Reserved', department: 'Private Suites', dailyRate: 4500, notes: 'Reserved for Inpatient Admission' },
        { bedNumber: 'SP-201', wardType: 'Special', status: 'Available', department: 'Private Suites', dailyRate: 4500, notes: 'Deluxe Private Suite with TV & Lounge' },
        { bedNumber: 'SP-202', wardType: 'Special', status: 'Available', department: 'Private Suites', dailyRate: 4500, notes: 'Single Occupancy Deluxe Room' },
        { bedNumber: 'SP-203', wardType: 'Special', status: 'Available', department: 'Private Suites', dailyRate: 5000, notes: 'Executive Patient Suite' },
        { bedNumber: 'G-101', wardType: 'General', status: 'Available', department: 'General Medicine', dailyRate: 1500 },
        { bedNumber: 'G-102', wardType: 'General', status: 'Occupied', patientName: 'Ananya Sharma', patientId: '9823-X', department: 'General Medicine', dailyRate: 1500, admissionDate: new Date() },
        { bedNumber: 'G-103', wardType: 'General', status: 'Available', department: 'General Medicine', dailyRate: 1500 },
        { bedNumber: 'G-108', wardType: 'General', status: 'Reserved', notes: 'Incoming Transfer', department: 'General Medicine', dailyRate: 1500 },
        { bedNumber: 'ICU-01', wardType: 'ICU', status: 'Occupied', patientName: 'Aarav Patel', patientId: '1122-A', department: 'Critical Care', dailyRate: 8500, admissionDate: new Date() },
        { bedNumber: 'ICU-02', wardType: 'ICU', status: 'Available', department: 'Critical Care', dailyRate: 8500 },
        { bedNumber: 'ICU-04', wardType: 'ICU', status: 'Available', department: 'Critical Care', dailyRate: 8500 },
        { bedNumber: 'EMG-01', wardType: 'Emergency', status: 'Available', department: 'Emergency / Trauma', dailyRate: 3000 },
        { bedNumber: 'EMG-02', wardType: 'Emergency', status: 'Available', department: 'Emergency / Trauma', dailyRate: 3000 },
        { bedNumber: 'S-201', wardType: 'Surgery', status: 'Available', department: 'Surgery', dailyRate: 3500 },
        { bedNumber: 'S-205', wardType: 'Surgery', status: 'Cleaning', notes: 'Routine', department: 'Surgery', dailyRate: 3500 }
      ];

      for (const sb of seedBeds) {
        await Bed.updateOne({ bedNumber: sb.bedNumber }, { $set: sb }, { upsert: true });
      }
      beds = await Bed.find(query).sort({ bedNumber: 1 });
    }

    // Enrich beds with latest Patient details & assigned doctor dynamically
    const bedsWithPatientInfo = await Promise.all(beds.map(async (bed) => {
      const bObj = bed.toObject ? bed.toObject() : { ...bed };
      
      let patientDoc = null;
      // Search patient by explicit identifiers or bed linking
      const patientQuery = [];
      if (bObj.patientId) patientQuery.push({ patientId: bObj.patientId });
      if (bObj._id) patientQuery.push({ bedId: bObj._id });
      if (bObj.bedNumber) {
        patientQuery.push({ bedNumber: bObj.bedNumber, status: 'Admitted' });
        patientQuery.push({ 'admissionSetup.bedNumber': bObj.bedNumber });
      }
      if (bObj.patientName && bObj.patientName.trim()) {
        patientQuery.push({ fullName: new RegExp(`^${bObj.patientName.trim()}$`, 'i') });
      }

      if (patientQuery.length > 0) {
        patientDoc = await Patient.findOne({ $or: patientQuery }).sort({ updatedAt: -1 }).lean();
      }

      // Check active AdmissionBedRequest or TransferDischarge if doctor or clinical note is missing
      let admissionDoc = null;
      if (patientDoc || bObj.patientName || bObj.patientId || bObj.bedNumber) {
        const admQuery = [];
        if (patientDoc?._id) admQuery.push({ patientId: patientDoc._id });
        if (patientDoc?.patientId || bObj.patientId) admQuery.push({ patientCustomId: patientDoc?.patientId || bObj.patientId });
        if (patientDoc?.fullName || bObj.patientName) admQuery.push({ patientName: patientDoc?.fullName || bObj.patientName });
        if (bObj.bedNumber) admQuery.push({ allocatedBedNumber: bObj.bedNumber });

        if (admQuery.length > 0) {
          admissionDoc = await AdmissionBedRequest.findOne({ $or: admQuery }).sort({ createdAt: -1 }).lean();
        }
      }

      if (patientDoc) {
        bObj.patientName = patientDoc.fullName || bObj.patientName;
        bObj.patientId = patientDoc.patientId || bObj.patientId;
        bObj.assignedDoctor = patientDoc.admissionSetup?.assignedDoctor || patientDoc.assignedDoctor || patientDoc.attendingDoctor || admissionDoc?.doctorName || bObj.assignedDoctor || 'Dr. Assigned Specialist';
        bObj.notes = patientDoc.clinicalInfo?.chiefComplaint || patientDoc.clinicalInfo?.diagnosis || patientDoc.chiefComplaint || admissionDoc?.admissionReason || admissionDoc?.clinicalNotes || bObj.notes || 'Inpatient Clinical Care';
        bObj.admissionDate = patientDoc.admissionSetup?.admissionDate || patientDoc.admissionDate || patientDoc.createdAt || bObj.admissionDate;
      } else if (admissionDoc) {
        if (!bObj.patientName) bObj.patientName = admissionDoc.patientName;
        if (!bObj.patientId) bObj.patientId = admissionDoc.patientCustomId;
        if (!bObj.assignedDoctor) bObj.assignedDoctor = admissionDoc.doctorName || 'Dr. Assigned Specialist';
        if (!bObj.notes) bObj.notes = admissionDoc.admissionReason || admissionDoc.clinicalNotes || 'Inpatient Admission';
      }

      return bObj;
    }));

    // Sort so Occupied/Reserved beds and Special ward beds are positioned right at the beginning
    bedsWithPatientInfo.sort((a, b) => {
      const aHasPatient = Boolean(a.patientName || a.status === 'Occupied' || a.status === 'Reserved');
      const bHasPatient = Boolean(b.patientName || b.status === 'Occupied' || b.status === 'Reserved');
      if (aHasPatient && !bHasPatient) return -1;
      if (!aHasPatient && bHasPatient) return 1;

      const aIsSpecial = (a.wardType || a.type || '').toLowerCase().includes('special');
      const bIsSpecial = (b.wardType || b.type || '').toLowerCase().includes('special');
      if (aIsSpecial && !bIsSpecial) return -1;
      if (!aIsSpecial && bIsSpecial) return 1;

      return (a.bedNumber || '').localeCompare(b.bedNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });

    res.json(bedsWithPatientInfo);
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
    const special = beds.filter(b => b.wardType === 'Special');
    const emergency = beds.filter(b => b.wardType === 'Emergency');
    const surgery = beds.filter(b => b.wardType === 'Surgery');

    res.json({
      total, occupied, available, reserved, cleaning, maintenance,
      icu: { total: icu.length, available: icu.filter(b => b.status === 'Available').length },
      general: { total: general.length, available: general.filter(b => b.status === 'Available').length },
      special: { total: special.length, available: special.filter(b => b.status === 'Available').length },
      emergency: { total: emergency.length, available: emergency.filter(b => b.status === 'Available').length },
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

    // Fetch corresponding full patient document if bed has patient
    let patientDetails = null;
    let doctorDetails = null;
    let admissionRequest = null;

    if (bed.patientId || bed.patientName) {
      patientDetails = await Patient.findOne({
        $or: [
          { patientId: bed.patientId },
          { fullName: new RegExp(`^${(bed.patientName || '').trim()}$`, 'i') }
        ]
      }).populate('bedId').lean();
    }

    if (patientDetails) {
      admissionRequest = await AdmissionBedRequest.findOne({
        $or: [
          { patientId: patientDetails._id },
          { patientCustomId: patientDetails.patientId }
        ]
      }).sort({ createdAt: -1 }).lean();
    }

    res.json({ 
      bed, 
      history, 
      activeAllocation, 
      activeReservation, 
      patient: patientDetails,
      admissionRequest 
    });
  } catch (error) {
    console.error('Error fetching bed details:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET Available beds only (optionally filtered by ward/type)
router.get('/available', protect, async (req, res) => {
  try {
    const { ward, wardType, bedType } = req.query;
    const query = { status: 'Available' };
    const w = ward || wardType;
    if (w && w !== 'All' && w !== 'All Wards') {
      const cleanWard = w.replace(/\s*ward$/i, '').trim();
      query.$or = [
        { wardType: new RegExp(cleanWard, 'i') },
        { type: new RegExp(cleanWard, 'i') }
      ];
    }
    if (bedType && bedType !== 'All') {
      query.bedType = new RegExp(bedType, 'i');
    }
    const availableBeds = await Bed.find(query).sort({ bedNumber: 1 });
    res.json(availableBeds);
  } catch (error) {
    console.error('Error fetching available beds:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT /api/beds/:id/allocate
// Allocate bed by ID directly
router.put('/:id/allocate', protect, requireRole(['Admin', 'Nurse', 'Receptionist']), async (req, res) => {
  try {
    const bedId = req.params.id;
    const { patientId, patientName, notes, admissionRequestId } = req.body;
    
    const bed = await Bed.findById(bedId);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });
    if (bed.status !== 'Available' && bed.status !== 'Reserved') {
      return res.status(400).json({ message: `Bed ${bed.bedNumber} is currently ${bed.status} and cannot be assigned.` });
    }

    let actualPatientId = patientId;
    let patient = null;
    if (actualPatientId) {
      if (mongoose.Types.ObjectId.isValid(actualPatientId)) {
        patient = await Patient.findById(actualPatientId);
      }
      if (!patient) {
        patient = await Patient.findOne({ patientId: actualPatientId });
      }
    }

    if (!patient && patientName) {
      patient = await Patient.findOne({ fullName: new RegExp(`^${patientName.trim()}$`, 'i') });
    }

    if (!patient) {
      const newPid = actualPatientId || `PX-${Math.floor(100000 + Math.random() * 900000)}`;
      patient = await Patient.create({
        patientId: newPid,
        fullName: patientName || 'Inpatient',
        gender: req.body.gender || 'Male',
        status: 'Admitted',
        admissionStatus: 'Admitted',
        bedId: bed._id,
        ward: bed.wardType,
        bedNumber: bed.bedNumber,
        admissionDate: new Date()
      });
    } else {
      // Release old bed if patient was already in another bed
      if (patient.bedId && String(patient.bedId) !== String(bed._id)) {
        const oldBed = await Bed.findById(patient.bedId);
        if (oldBed && oldBed.status === 'Occupied') {
          oldBed.status = 'Cleaning';
          oldBed.patientName = null;
          oldBed.patientId = null;
          oldBed.admissionDate = null;
          oldBed.notes = `Auto-released upon allocation to ${bed.bedNumber}`;
          await oldBed.save();
        }
      }
      patient.status = 'Admitted';
      patient.admissionStatus = 'Admitted';
      patient.bedId = bed._id;
      patient.ward = bed.wardType;
      patient.bedNumber = bed.bedNumber;
      if (!patient.admissionSetup) patient.admissionSetup = {};
      patient.admissionSetup.wardType = bed.wardType;
      patient.admissionSetup.admissionDate = new Date();
      await patient.save();
    }

    bed.status = 'Occupied';
    bed.patientName = patient.fullName;
    bed.patientId = patient.patientId;
    bed.admissionDate = new Date();
    bed.notes = notes || `Admitted to ${bed.wardType} Ward`;
    await bed.save();

    if (admissionRequestId) {
      const admQuery = mongoose.Types.ObjectId.isValid(admissionRequestId)
        ? { _id: admissionRequestId }
        : { admissionId: admissionRequestId };

      await AdmissionBedRequest.findOneAndUpdate(admQuery, {
        status: 'Bed Allocated',
        admissionStatus: 'Bed Allocated',
        allocatedBedId: bed._id,
        allocatedBedNumber: bed.bedNumber,
        allocatedWard: bed.wardType,
        allocationDate: new Date(),
        assignedBy: req.user._id
      });
    } else {
      // Auto-resolve any active AdmissionBedRequest for this patient
      await AdmissionBedRequest.updateMany(
        {
          $or: [
            { patientId: patient._id },
            { patientCustomId: patient.patientId },
            { patientName: patient.fullName }
          ],
          status: { $in: ['Doctor Approved', 'Pending Verification', 'Forwarded to Bed Management', 'Pending Approval', 'Pending', 'Awaiting Bed Allocation'] }
        },
        {
          status: 'Bed Allocated',
          admissionStatus: 'Bed Allocated',
          allocatedBedId: bed._id,
          allocatedBedNumber: bed.bedNumber,
          allocatedWard: bed.wardType,
          allocationDate: new Date(),
          assignedBy: req.user._id
        }
      );
    }

    // Also synchronize EmergencyPatient record if applicable
    try {
      const emg = await EmergencyPatient.findOne({
        $or: [
          { patientId: patient._id },
          { patientCustomId: patient.patientId },
          { patientName: new RegExp(`^${(patient.fullName || '').trim()}$`, 'i') }
        ]
      });
      if (emg) {
        emg.currentLocation = `${bed.wardType} - Bed ${bed.bedNumber}`;
        emg.allocatedBedId = bed._id;
        emg.allocatedBedNumber = bed.bedNumber;
        emg.allocatedWard = bed.wardType;
        if (emg.disposition) {
          emg.disposition.status = bed.wardType === 'ICU' ? 'Transferred to ICU' : 'Admitted to Ward';
          emg.disposition.transferredToBed = `${bed.wardType} - Bed ${bed.bedNumber}`;
          emg.disposition.updatedAt = new Date();
        }
        if (!Array.isArray(emg.actionsTaken)) emg.actionsTaken = [];
        emg.actionsTaken.push({
          action: `Bed Allocated: ${bed.wardType} - ${bed.bedNumber} by ${req.user.name || 'Nurse'}`,
          performedBy: req.user.name || 'Staff Nurse',
          timestamp: new Date()
        });
        await emg.save();
      }
    } catch (emgErr) {
      console.error('Emergency record sync notice:', emgErr.message);
    }

    await BedAllocation.create({
      patient: patient._id,
      bed: bed._id,
      allocatedBy: req.user._id,
      startTime: new Date()
    });

    await logBedHistory(bed._id, patient._id, 'Allocated', notes || `Allocated to ${patient.fullName} (${patient.patientId})`, req.user._id);

    // Notify Doctor that bed has been allocated
    try {
      const notifDoc = {
        title: `🛏️ BED ALLOCATED: ${patient.fullName} (${bed.bedNumber})`,
        message: `${bed.wardType} Bed ${bed.bedNumber} has been officially allocated to ${patient.fullName} (${patient.patientId}) by ${req.user.name || 'Nursing Staff'}. Notes: ${notes || 'Patient transferred to designated inpatient bed.'}`,
        category: 'Bed Allocation',
        notificationType: 'Bed Allocation',
        priority: 'Normal',
        recipientRole: 'Doctor',
        doctorName: typeof patient.assignedDoctor === 'string' ? patient.assignedDoctor : 'Dr. Assigned Specialist',
        patientId: patient._id,
        patientName: patient.fullName,
        patientCustomId: patient.patientId,
        targetLink: '/doctor/emergency'
      };
      if (patient.assignedDoctorId && mongoose.Types.ObjectId.isValid(patient.assignedDoctorId)) {
        notifDoc.doctorId = patient.assignedDoctorId;
      }
      await Notification.create(notifDoc);
    } catch (notifErr) {
      console.error('Doctor notification notice:', notifErr.message);
    }

    res.json({ success: true, bed, patient });
  } catch (error) {
    console.error('Error allocating bed via PUT:', error);
    res.status(500).json({ message: error.message || 'Error allocating bed' });
  }
});

// PUT /api/beds/:id/release
// Release occupied bed to Available / Cleaning
router.put('/:id/release', protect, requireRole(['Admin', 'Nurse', 'Receptionist', 'Doctor']), async (req, res) => {
  try {
    const bed = await Bed.findById(req.params.id);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    const oldPatientId = bed.patientId;
    if (oldPatientId) {
      const patient = await Patient.findOne({
        $or: [{ patientId: oldPatientId }, { _id: mongoose.Types.ObjectId.isValid(oldPatientId) ? oldPatientId : undefined }]
      });
      if (patient) {
        patient.bedId = null;
        patient.bedNumber = null;
        await patient.save();
      }
      await BedAllocation.findOneAndUpdate(
        { bed: bed._id, status: 'Active' },
        { status: 'Completed', endTime: new Date() }
      );
    }

    bed.status = req.body.status || 'Available';
    bed.patientName = null;
    bed.patientId = null;
    bed.admissionDate = null;
    bed.notes = req.body.notes || 'Bed released';
    await bed.save();

    await logBedHistory(bed._id, null, 'Available', req.body.notes || 'Bed released to Available', req.user._id);

    res.json({ success: true, message: `Bed ${bed.bedNumber} has been released.`, bed });
  } catch (error) {
    console.error('Error releasing bed:', error);
    res.status(500).json({ message: error.message || 'Error releasing bed' });
  }
});

// POST Allocate Bed
// Authorized for Bed Management (Admin, Nurse, Receptionist) - Doctors initiate admission requests only
router.post('/allocate', protect, requireRole(['Admin', 'Nurse', 'Receptionist']), async (req, res) => {
  try {
    const { bedId, patientId, notes, admissionRequestId } = req.body;
    
    // 1. Strict atomic check: ensure bed exists and is strictly Available or Reserved for this patient
    const bed = await Bed.findById(bedId);
    if (!bed) {
      return res.status(404).json({ message: 'Bed not found' });
    }
    if (bed.status !== 'Available' && bed.status !== 'Reserved') {
      return res.status(400).json({ message: `Bed ${bed.bedNumber} is currently ${bed.status} and cannot be assigned.` });
    }

    let actualPatientId = patientId;
    if (!actualPatientId) {
      actualPatientId = `PX-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    let patient = await Patient.findOne({ patientId: actualPatientId });
    if (!patient && actualPatientId) {
      patient = await Patient.findOne({ _id: actualPatientId }).catch(() => null);
    }

    if (!patient) {
      patient = await Patient.create({
        patientId: actualPatientId,
        fullName: req.body.patientName || 'Unknown Patient',
        dob: new Date(1980, 1, 1),
        gender: req.body.gender || 'Other',
        contactNumber: req.body.contactNumber || '0000000000',
        status: 'Admitted',
        admissionStatus: 'Admitted',
        bedId: bed._id,
        ward: bed.wardType,
        bedNumber: bed.bedNumber,
        admissionDate: new Date()
      });
    } else {
      // Automatic release of previous bed if patient was already occupying another bed
      if (patient.bedId && String(patient.bedId) !== String(bed._id)) {
        const oldBed = await Bed.findById(patient.bedId);
        if (oldBed && oldBed.status === 'Occupied') {
          oldBed.status = 'Cleaning';
          oldBed.patientName = null;
          oldBed.patientId = null;
          oldBed.admissionDate = null;
          oldBed.notes = `Released upon re-allocation of patient to ${bed.bedNumber}`;
          await oldBed.save();
          await logBedHistory(oldBed._id, patient._id, 'Cleaned', `Auto-released old bed upon transfer to ${bed.bedNumber}`, req.user._id);
        }
      }

      patient.status = 'Admitted';
      patient.admissionStatus = 'Admitted';
      patient.bedId = bed._id;
      patient.ward = bed.wardType;
      patient.bedNumber = bed.bedNumber;
      if (!patient.admissionSetup) patient.admissionSetup = {};
      patient.admissionSetup.wardType = bed.wardType;
      patient.admissionSetup.admissionDate = new Date();
      await patient.save();
    }

    // 2. Transition Bed to Occupied
    bed.status = 'Occupied';
    bed.patientName = patient.fullName;
    bed.patientId = patient.patientId;
    bed.admissionDate = new Date();
    bed.notes = notes || `Admitted to ${bed.wardType} Ward`;
    await bed.save();

    // 3. Update Admission Request if linked
    if (admissionRequestId) {
      const admQuery = mongoose.Types.ObjectId.isValid(admissionRequestId)
        ? { _id: admissionRequestId }
        : { admissionId: admissionRequestId };

      await AdmissionBedRequest.findOneAndUpdate(admQuery, {
        status: 'Bed Allocated',
        admissionStatus: 'Bed Allocated',
        allocatedBedId: bed._id,
        allocatedBedNumber: bed.bedNumber,
        allocatedWard: bed.wardType,
        allocationDate: new Date(),
        assignedBy: req.user._id
      });
    } else {
      await AdmissionBedRequest.updateMany(
        { patientId: patient._id, status: 'Pending' },
        {
          status: 'Bed Allocated',
          allocatedBedId: bed._id,
          allocatedBedNumber: bed.bedNumber,
          allocatedWard: bed.wardType,
          allocationDate: new Date(),
          assignedBy: req.user._id
        }
      );
    }

    // 4. Log Allocation & History
    await BedAllocation.create({
      patient: patient._id,
      bed: bed._id,
      allocatedBy: req.user._id,
      startTime: new Date()
    });

    await logBedHistory(bed._id, patient._id, 'Allocated', `Allocated to ${bed.patientName} (${patient.patientId})`, req.user._id);

    // 5. Broadcast notification
    await Notification.create({
      title: 'Bed Allocated',
      message: `Bed ${bed.bedNumber} in ${bed.wardType} ward allocated to patient ${patient.fullName} (${patient.patientId}).`,
      type: 'Admission Request',
      priority: 'Normal',
      senderId: req.user._id,
      senderRole: req.user.role || 'Admin'
    });

    res.json({ success: true, bed, patient });
  } catch (error) {
    console.error('Error allocating bed:', error);
    res.status(500).json({ message: 'Error allocating bed: ' + error.message });
  }
});

// POST Reserve Bed
router.post('/reserve', protect, requireRole(['Admin', 'Receptionist', 'Doctor']), async (req, res) => {
  try {
    const { bedId, patientId, expectedAdmission, reason } = req.body;
    
    const bed = await Bed.findById(bedId);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });
    if (bed.status !== 'Available') {
      return res.status(400).json({ message: `Bed ${bed.bedNumber} is ${bed.status} and cannot be reserved.` });
    }

    let actualPatientId = patientId;
    if (!actualPatientId) {
      actualPatientId = `PX-${Math.floor(100000 + Math.random() * 900000)}`;
    }

    let patient = await Patient.findOne({ patientId: actualPatientId });
    if (!patient) {
      patient = await Patient.create({
        patientId: actualPatientId,
        fullName: req.body.patientName || 'Reserved Patient',
        dob: new Date(1980, 1, 1),
        gender: 'Other',
        contactNumber: '0000000000',
        status: 'Registered'
      });
    }

    bed.status = 'Reserved';
    bed.notes = `Reserved for ${patient.fullName} (ID: ${patient.patientId}) - ${reason || 'Scheduled Admission'}`;
    await bed.save();

    await BedReservation.create({
      patient: patient._id,
      bed: bed._id,
      reservedBy: req.user._id,
      expectedAdmission,
      reason
    });

    await logBedHistory(bed._id, patient._id, 'Reserved', reason || 'Bed reserved', req.user._id);

    res.json(bed);
  } catch (error) {
    console.error('Error reserving bed:', error);
    res.status(500).json({ message: 'Error reserving bed: ' + error.message });
  }
});

// POST Transfer Patient
router.post('/transfer', protect, requireRole(['Admin', 'Doctor', 'Nurse']), async (req, res) => {
  try {
    const { fromBedId, toBedId, reason } = req.body;

    const fromBed = await Bed.findById(fromBedId);
    const toBed = await Bed.findById(toBedId);

    if (!fromBed || fromBed.status !== 'Occupied') return res.status(400).json({ message: 'Source bed is not occupied' });
    if (!toBed || toBed.status !== 'Available') return res.status(400).json({ message: `Destination bed ${toBed ? toBed.bedNumber : ''} is ${toBed ? toBed.status : 'not found'}.` });

    let patient;
    if (fromBed.patientId) {
      patient = await Patient.findOne({ patientId: fromBed.patientId });
      if (patient) {
        patient.bedId = toBed._id;
        patient.ward = toBed.wardType;
        patient.bedNumber = toBed.bedNumber;
        if (!patient.admissionSetup) patient.admissionSetup = {};
        patient.admissionSetup.wardType = toBed.wardType;
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

    // Update toBed
    toBed.status = 'Occupied';
    toBed.patientName = fromBed.patientName;
    toBed.patientId = fromBed.patientId;
    toBed.admissionDate = fromBed.admissionDate;
    toBed.notes = `Transferred from ${fromBed.bedNumber} - ${reason || 'Ward Transfer'}`;
    await toBed.save();

    // Automatically Release fromBed to Cleaning
    fromBed.status = 'Cleaning';
    fromBed.patientName = null;
    fromBed.patientId = null;
    fromBed.admissionDate = null;
    fromBed.notes = `Auto-released: Transferred patient to ${toBed.bedNumber}. Requires sanitization.`;
    await fromBed.save();

    await logBedHistory(toBed._id, patient ? patient._id : null, 'Transferred', `Transferred from ${fromBed.bedNumber}: ${reason || 'Ward Transfer'}`, req.user._id);
    await logBedHistory(fromBed._id, patient ? patient._id : null, 'Cleaned', `Marked for cleaning after transfer to ${toBed.bedNumber}`, req.user._id);

    // Update active TransferDischarge requests
    if (patient) {
      await TransferDischarge.updateMany(
        { patientId: patient._id, type: 'Transfer', status: { $ne: 'Completed' } },
        { status: 'Completed', completionDate: new Date() }
      );
    }

    res.json({ fromBed, toBed });
  } catch (error) {
    console.error('Transfer Error:', error);
    res.status(500).json({ message: 'Error transferring patient', error: error.message });
  }
});

// PUT Simple Status Update (e.g. Discharge, Maintenance, Blocked, Available)
router.put('/:id/status', protect, requireRole(['Doctor', 'Receptionist', 'Admin', 'Nurse', 'Inventory Manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const bed = await Bed.findById(id);
    if (!bed) return res.status(404).json({ message: 'Bed not found' });

    // Handle Discharge if occupied -> automatically release old bed and update patient status
    if (bed.status === 'Occupied' && (status === 'Cleaning' || status === 'Available')) {
      if (bed.patientId) {
        const patient = await Patient.findOne({ patientId: bed.patientId });
        if (patient) {
          patient.status = 'Discharged';
          patient.admissionStatus = 'Discharged';
          patient.bedId = null;
          patient.bedNumber = null;
          await patient.save();
          
          await BedAllocation.findOneAndUpdate(
            { bed: bed._id, patient: patient._id, status: 'Active' },
            { status: 'Completed', endTime: new Date() }
          );

          await TransferDischarge.updateMany(
            { patientId: patient._id, type: 'Discharge', status: { $ne: 'Completed' } },
            { status: 'Completed', completionDate: new Date() }
          );
        }
      }
    }

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
    
    await logBedHistory(
      bed._id,
      null,
      status === 'Cleaning' ? 'Cleaned' : status === 'Available' ? 'Available' : status === 'Maintenance' ? 'Maintenance' : status === 'Blocked' ? 'Blocked' : 'Updated',
      notes || `Status changed to ${status}`,
      req.user._id
    );

    res.json(bed);
  } catch (error) {
    console.error('Error updating bed:', error);
    res.status(500).json({ message: 'Error updating bed status: ' + error.message });
  }
});


// POST to register a completely new bed in the hospital
router.post('/', protect, requireRole(['Admin']), async (req, res) => {
  try {
    let { bedNumber, wardType, room, floor, bedType } = req.body;
    
    if (!bedNumber || bedNumber.startsWith('Gen-') || bedNumber.startsWith('ICU-') || bedNumber.startsWith('G-') || bedNumber.startsWith('S-')) {
        bedNumber = `BED-${Math.floor(100000 + Math.random() * 900000)}`;
    }
    
    const newBed = new Bed({ bedNumber, wardType, room, floor, bedType });
    await newBed.save();
    res.status(201).json(newBed);
  } catch (error) {
    console.error('Error creating bed:', error);
    res.status(500).json({ message: 'Error creating bed' });
  }
});

export default router;
