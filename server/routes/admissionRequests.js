import express from 'express';
import mongoose from 'mongoose';
import AdmissionBedRequest from '../models/AdmissionBedRequest.js';
import Bed from '../models/Bed.js';
import Patient from '../models/Patient.js';
import Notification from '../models/Notification.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to generate sequential unique Admission ID (e.g. ADM10001, ADM10002)
async function generateNextAdmissionId() {
  const admissions = await AdmissionBedRequest.find({ admissionId: /^ADM\d+$/ }, { admissionId: 1 }).lean();
  let maxNum = 10000;
  for (const a of admissions) {
    const num = parseInt(a.admissionId.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxNum) {
      maxNum = num;
    }
  }
  let nextId = `ADM${maxNum + 1}`;
  while (await AdmissionBedRequest.exists({ admissionId: nextId })) {
    maxNum++;
    nextId = `ADM${maxNum + 1}`;
  }
  return nextId;
}

// @route   GET /api/admission-requests
// @desc    Get admission requests with server-side filtering, doctor query, search, and live MongoDB stats
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const { status, wardType, search, q, myRequests } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 50);
    const skip = (page - 1) * limit;

    const andConditions = [];

    // Role-specific filtering if doctor wants their own requests
    if (req.user.role === 'Doctor' && (myRequests === 'true' || myRequests === true)) {
      const docName = req.user.name.replace(/^Dr\.\s*/i, '').trim();
      andConditions.push({
        $or: [
          { doctorId: req.user._id },
          { doctorName: req.user.name },
          { doctorName: `Dr. ${docName}` },
          { doctorName: { $regex: docName, $options: 'i' } }
        ]
      });
    }

    // Status Filter
    if (status && status !== 'All') {
      const s = status.trim();
      if (s === 'Pending' || s === 'Pending Verification' || s === 'Pending Approval') {
        andConditions.push({ status: { $in: ['Pending Verification', 'Pending Approval', 'Pending', 'Doctor Approved', 'Awaiting Bed Allocation'] } });
      } else if (s === 'Doctor Approved') {
        andConditions.push({ status: { $in: ['Doctor Approved', 'Awaiting Bed Allocation'] } });
      } else if (s === 'Forwarded' || s === 'Forwarded to Bed Management') {
        andConditions.push({ status: 'Forwarded to Bed Management' });
      } else if (s === 'Allocated' || s === 'Bed Allocated' || s === 'Admission Confirmed') {
        andConditions.push({ status: { $in: ['Allocated', 'Bed Allocated', 'Admission Confirmed', 'Approved'] } });
      } else {
        andConditions.push({ status: s });
      }
    }

    // Ward Type Filter
    if (wardType && wardType !== 'All') {
      andConditions.push({
        $or: [
          { wardType: new RegExp(wardType, 'i') },
          { requestedWard: new RegExp(wardType, 'i') }
        ]
      });
    }

    // Search Query (Patient name, Patient ID, Doctor, Admission ID, Diagnosis, Reason)
    const searchTerm = (search || q || '').trim();
    if (searchTerm) {
      const searchRegex = new RegExp(searchTerm, 'i');
      andConditions.push({
        $or: [
          { patientName: searchRegex },
          { patientCustomId: searchRegex },
          { admissionId: searchRegex },
          { doctorName: searchRegex },
          { admissionReason: searchRegex },
          { clinicalReason: searchRegex },
          { diagnosis: searchRegex },
          { wardType: searchRegex }
        ]
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const [totalRecords, requests, awaitingCount, forwardedCount, allocatedCount, vacantBedsCount] = await Promise.all([
      AdmissionBedRequest.countDocuments(query),
      AdmissionBedRequest.find(query)
        .populate('bedId allocatedBedId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AdmissionBedRequest.countDocuments({ status: { $in: ['Pending Verification', 'Pending Approval', 'Pending', 'Doctor Approved', 'Awaiting Bed Allocation'] } }),
      AdmissionBedRequest.countDocuments({ status: 'Forwarded to Bed Management' }),
      AdmissionBedRequest.countDocuments({ status: { $in: ['Allocated', 'Bed Allocated', 'Admission Confirmed', 'Approved'] } }),
      Bed.countDocuments({ status: 'Available' })
    ]);

    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.json({
      success: true,
      admissions: requests,
      requests, // array returned directly for frontend consumption
      pagination: {
        currentPage: page,
        totalPages,
        totalRecords,
        limit
      },
      stats: {
        awaitingVerification: awaitingCount,
        forwardedToBedMgmt: forwardedCount,
        bedsAllocated: allocatedCount,
        vacantBeds: vacantBedsCount
      }
    });
  } catch (error) {
    console.error('Error fetching admission requests from MongoDB:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error fetching admission requests from MongoDB', 
      error: error.message 
    });
  }
});

// @route   POST /api/admission-requests
// @desc    Doctor creates an admission & bed request for an outpatient or emergency patient
// @access  Protected (Doctor, Admin, Receptionist)
// Workflow: Doctor -> Admission Request -> Receptionist/Admin Verification -> Bed Management -> Bed Allocation -> Admission Confirmed
router.post('/', protect, requireRole(['Doctor', 'Admin', 'Receptionist']), async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientCustomId,
      admissionReason,
      clinicalReason,
      diagnosis,
      wardType,
      requestedWard,
      bedType,
      priority,
      specialRequirements,
      expectedDuration,
      doctorNotes,
      clinicalNotes,
      doctorName,
      department
    } = req.body;

    const finalReason = admissionReason || req.body.reason;
    const finalWard = requestedWard || wardType || 'General Ward';
    const finalBedType = bedType || 'Standard Bed';
    const finalPriority = priority || 'Normal';

    if (!finalReason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admission Reason is required.' 
      });
    }

    // Verify and retrieve actual Patient from MongoDB
    let actualPatient = null;
    if (patientId && mongoose.Types.ObjectId.isValid(patientId)) {
      actualPatient = await Patient.findById(patientId);
    }
    if (!actualPatient && patientCustomId) {
      actualPatient = await Patient.findOne({ patientId: patientCustomId.trim() });
    }
    if (!actualPatient && patientName) {
      actualPatient = await Patient.findOne({ fullName: new RegExp(`^${patientName.trim()}$`, 'i') });
    }

    if (!actualPatient) {
      return res.status(400).json({
        success: false,
        message: 'Could not locate registered patient in MongoDB. Please select a valid patient.'
      });
    }

    const admissionId = await generateNextAdmissionId();
    const requestingDoctorName = doctorName || req.user.name || 'Dr. Attending';
    const requestingDept = department || req.user.department || 'General Medicine';

    // Format special requirements array
    let reqArray = [];
    if (Array.isArray(specialRequirements)) {
      reqArray = specialRequirements;
    } else if (typeof specialRequirements === 'string' && specialRequirements.trim()) {
      reqArray = specialRequirements.split(',').map(s => s.trim()).filter(Boolean);
    }

    const newRequest = new AdmissionBedRequest({
      admissionId,
      patientId: actualPatient._id,
      patientName: actualPatient.fullName,
      patientCustomId: actualPatient.patientId,
      doctorId: req.user._id,
      doctorName: requestingDoctorName,
      doctorDepartment: requestingDept,
      department: requestingDept,
      admissionReason: finalReason,
      reason: finalReason,
      clinicalReason: clinicalReason ? clinicalReason.trim() : '',
      diagnosis: diagnosis ? diagnosis.trim() : (actualPatient.clinicalInfo?.chiefComplaint || 'Provisional Assessment'),
      wardType: finalWard,
      requestedWard: finalWard,
      bedType: finalBedType,
      priority: finalPriority,
      specialRequirements: reqArray,
      expectedDuration: expectedDuration ? expectedDuration.trim() : '3-5 days',
      doctorNotes: doctorNotes || clinicalNotes || '',
      clinicalNotes: doctorNotes || clinicalNotes || '',
      status: 'Doctor Approved',
      admissionStatus: 'Doctor Approved'
    });

    const saved = await newRequest.save();

    // Update Patient master document so that clinical info, chief complaint, ward, and status reflect in Doctor and Nurse rosters immediately
    actualPatient.status = actualPatient.status === 'Admitted' ? 'Admitted' : 'Registered';
    if (!actualPatient.clinicalInfo) actualPatient.clinicalInfo = {};
    if (finalReason) actualPatient.clinicalInfo.chiefComplaint = finalReason;
    if (diagnosis) actualPatient.clinicalInfo.diagnosis = diagnosis;
    if (!actualPatient.admissionSetup) actualPatient.admissionSetup = {};
    actualPatient.admissionSetup.wardType = finalWard;
    actualPatient.ward = finalWard;
    if (requestingDoctorName) {
      actualPatient.admissionSetup.assignedDoctor = requestingDoctorName;
      actualPatient.assignedDoctor = requestingDoctorName;
    }
    await actualPatient.save();

    // Auto-dispatch Notification to Nurse Station for immediate bed allocation
    try {
      await Notification.create({
        title: `🛏️ Admission Approved by Doctor: ${actualPatient.fullName} (${admissionId})`,
        message: `${requestingDoctorName} approved inpatient admission for ${actualPatient.fullName} to ${finalWard} (${finalBedType}). Priority: ${finalPriority}. Nurse please allocate destination bed.`,
        category: 'Bed Request',
        priority: finalPriority === 'Emergency' || finalPriority === 'Emergency / High' ? 'Critical' : 'Normal',
        recipientRole: 'Nurse',
        patientId: actualPatient._id,
        patientName: actualPatient.fullName,
        patientCustomId: actualPatient.patientId,
        senderName: requestingDoctorName,
        targetLink: `/beds?search=${encodeURIComponent(actualPatient.fullName)}`
      });
    } catch (notifErr) {
      console.error('Notification dispatch notice:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Admission request authorized by Doctor and forwarded to Nursing staff for bed assignment.',
      admission: saved,
      request: saved
    });
  } catch (error) {
    console.error('Error creating admission request in MongoDB:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error creating admission request' 
    });
  }
});

// @route   PUT /api/admission-requests/:id/verify-forward
// @desc    Receptionist verifies administrative/registration info and forwards to Bed Management
// @access  Protected (Receptionist, Admin)
router.put('/:id/verify-forward', protect, requireRole(['Receptionist', 'Admin']), async (req, res) => {
  try {
    const { emergencyContactVerified, insuranceOrPaymentVerified, frontDeskNotes } = req.body;
    const request = await AdmissionBedRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Admission request not found in MongoDB' });
    }

    const verifierName = req.user.name || req.user.username || 'Receptionist Desk';
    request.status = 'Forwarded to Bed Management';
    request.admissionStatus = 'Forwarded to Bed Management';
    request.verifiedBy = verifierName;
    request.verifiedAt = new Date();
    request.clinicalNotes = `${request.clinicalNotes || ''}\n[Verified by ${verifierName} on ${new Date().toLocaleString()}: Contact=${emergencyContactVerified ? 'Yes' : 'No'}, Billing=${insuranceOrPaymentVerified ? 'Yes' : 'No'}. Notes: ${frontDeskNotes || 'Administrative details confirmed'}]`.trim();

    const saved = await request.save();

    res.json({ 
      success: true, 
      message: 'Admission details verified and forwarded to Bed Management.', 
      request: saved,
      admission: saved
    });
  } catch (error) {
    console.error('Error verifying admission request:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error verifying request' });
  }
});

export default router;
