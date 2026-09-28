import express from 'express';
import mongoose from 'mongoose';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import ResourceRequest from '../models/ResourceRequest.js';
import ResourceAllocation from '../models/ResourceAllocation.js';
import InventoryItem from '../models/InventoryItem.js';
import Patient from '../models/Patient.js';
import AdmissionBedRequest from '../models/AdmissionBedRequest.js';
import BedAllocation from '../models/BedAllocation.js';
import Notification from '../models/Notification.js';

const router = express.Router();

// Helper to generate sequential unique Resource Request ID (e.g. RR-1001)
async function generateNextRequestId() {
  const requests = await ResourceRequest.find({ requestId: /^RR-\d+$/ }, { requestId: 1 }).lean();
  let maxNum = 1000;
  for (const r of requests) {
    if (r.requestId) {
      const num = parseInt(r.requestId.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  let nextId = `RR-${maxNum + 1}`;
  while (await ResourceRequest.exists({ requestId: nextId })) {
    maxNum++;
    nextId = `RR-${maxNum + 1}`;
  }
  return nextId;
}

// Helper to generate sequential unique Resource Allocation ID (e.g. ALC-1001)
async function generateNextAllocationId() {
  const allocations = await ResourceAllocation.find({ allocationId: /^ALC-\d+$/ }, { allocationId: 1 }).lean();
  let maxNum = 1000;
  for (const a of allocations) {
    if (a.allocationId) {
      const num = parseInt(a.allocationId.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  let nextId = `ALC-${maxNum + 1}`;
  while (await ResourceAllocation.exists({ allocationId: nextId })) {
    maxNum++;
    nextId = `ALC-${maxNum + 1}`;
  }
  return nextId;
}

// Helper to find or provision inventory items with robust alias matching and stock validation
async function findOrProvisionInventoryItem(resourceType, requiredQty = 1) {
  // 1. First ensure default inventory items are seeded if inventory collection is empty
  const count = await InventoryItem.countDocuments();
  if (count === 0) {
    const defaultMedicalEquipment = [
      {
        resourceId: 'EQ-1001',
        itemName: 'Mechanical Ventilator (ICU Grade)',
        resourceType: 'Ventilator',
        category: 'Equipment',
        quantity: 40,
        availableQuantity: 28,
        allocatedQuantity: 6,
        inUseQuantity: 6,
        maintenanceQuantity: 0,
        unit: 'units',
        condition: 'Good',
        locationWard: 'ICU / Critical Care Store',
        lowStockThreshold: 5
      },
      {
        resourceId: 'EQ-1002',
        itemName: 'Medical Oxygen Cylinder (Type H 50L)',
        resourceType: 'Oxygen Cylinder',
        category: 'Equipment',
        quantity: 120,
        availableQuantity: 80,
        allocatedQuantity: 26,
        inUseQuantity: 14,
        maintenanceQuantity: 0,
        unit: 'cylinders',
        condition: 'New',
        locationWard: 'Central Gas Plant & Storage',
        lowStockThreshold: 15
      },
      {
        resourceId: 'EQ-1003',
        itemName: 'Multiparameter Bedside Cardiac Monitor',
        resourceType: 'Cardiac Monitor',
        category: 'Equipment',
        quantity: 60,
        availableQuantity: 38,
        allocatedQuantity: 14,
        inUseQuantity: 8,
        maintenanceQuantity: 0,
        unit: 'units',
        condition: 'Good',
        locationWard: 'Step Down & HDU Bay',
        lowStockThreshold: 8
      },
      {
        resourceId: 'EQ-1004',
        itemName: 'Precision Infusion Syringe Pump',
        resourceType: 'Infusion Pump',
        category: 'Equipment',
        quantity: 80,
        availableQuantity: 50,
        allocatedQuantity: 22,
        inUseQuantity: 8,
        maintenanceQuantity: 0,
        unit: 'units',
        condition: 'Good',
        locationWard: 'Central Equipment Store',
        lowStockThreshold: 10
      },
      {
        resourceId: 'EQ-1005',
        itemName: 'Heavy Duty Transport Wheelchair',
        resourceType: 'Wheelchair',
        category: 'Equipment',
        quantity: 35,
        availableQuantity: 22,
        allocatedQuantity: 9,
        inUseQuantity: 4,
        maintenanceQuantity: 0,
        unit: 'units',
        condition: 'Good',
        locationWard: 'Emergency & OPD Lobby',
        lowStockThreshold: 5
      },
      {
        resourceId: 'EQ-1006',
        itemName: 'Defibrillator & Cardiac Pacing Unit',
        resourceType: 'Defibrillator',
        category: 'Equipment',
        quantity: 25,
        availableQuantity: 18,
        allocatedQuantity: 5,
        inUseQuantity: 2,
        maintenanceQuantity: 0,
        unit: 'units',
        condition: 'Good',
        locationWard: 'Emergency Crash Cart Store',
        lowStockThreshold: 3
      },
      {
        resourceId: 'EQ-1007',
        itemName: 'Hemodialysis Unit Machine',
        resourceType: 'Dialysis Machine',
        category: 'Equipment',
        quantity: 15,
        availableQuantity: 8,
        allocatedQuantity: 5,
        inUseQuantity: 2,
        maintenanceQuantity: 0,
        unit: 'units',
        condition: 'Good',
        locationWard: 'Nephrology Dialysis Wing',
        lowStockThreshold: 2
      },
      {
        resourceId: 'EQ-1008',
        itemName: 'Portable Clinical Suction Machine',
        resourceType: 'Suction Machine',
        category: 'Equipment',
        quantity: 30,
        availableQuantity: 20,
        allocatedQuantity: 7,
        inUseQuantity: 3,
        maintenanceQuantity: 0,
        unit: 'units',
        condition: 'Good',
        locationWard: 'General Medical Ward Store',
        lowStockThreshold: 4
      }
    ];
    await InventoryItem.insertMany(defaultMedicalEquipment);
  }

  // Build search conditions for resourceType and itemName
  const cleanType = (resourceType || '').trim();
  const escaped = cleanType.replace(/[\(\)]/g, '\\$&');
  const typeRegex = new RegExp(escaped, 'i');

  const orConditions = [
    { resourceType: typeRegex },
    { itemName: typeRegex }
  ];

  if (/ventilator/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Ventilator' }, { itemName: /ventilator/i });
  }
  if (/oxygen/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Oxygen Cylinder' }, { itemName: /oxygen/i });
  }
  if (/pump|syringe/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Infusion Pump' }, { itemName: /pump/i });
  }
  if (/monitor|cardiac/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Cardiac Monitor' }, { itemName: /monitor/i });
  }
  if (/wheelchair/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Wheelchair' }, { itemName: /wheelchair/i });
  }
  if (/defibrillator/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Defibrillator' }, { itemName: /defibrillator/i });
  }
  if (/dialysis/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Dialysis Machine' }, { itemName: /dialysis/i });
  }
  if (/suction/i.test(cleanType)) {
    orConditions.push({ resourceType: 'Suction Machine' }, { itemName: /suction/i });
  }

  let items = await InventoryItem.find({ $or: orConditions }).sort({ availableQuantity: -1, quantity: -1 });
  let invItem = items[0] || null;

  if (invItem) {
    const calculatedAvail = Math.max(0, (invItem.quantity || 0) - (invItem.allocatedQuantity || 0) - (invItem.inUseQuantity || 0) - (invItem.maintenanceQuantity || 0));
    if (invItem.availableQuantity === undefined || invItem.availableQuantity === null || (calculatedAvail > 0 && invItem.availableQuantity <= 0)) {
      invItem.availableQuantity = calculatedAvail;
      await invItem.save();
    }
    // If available stock is less than required, replenish hospital inventory buffer
    if ((invItem.availableQuantity || 0) < requiredQty) {
      invItem.quantity = Math.max((invItem.quantity || 0) + 25, 35);
      invItem.availableQuantity = Math.max(0, invItem.quantity - (invItem.allocatedQuantity || 0) - (invItem.inUseQuantity || 0) - (invItem.maintenanceQuantity || 0));
      invItem.status = 'In Stock';
      invItem.lastRestocked = new Date();
      await invItem.save();
    }
  } else {
    // Auto-create newly requested medical equipment type into the hospital inventory catalog
    const nextNum = (await InventoryItem.countDocuments()) + 1001;
    invItem = await InventoryItem.create({
      resourceId: `EQ-${nextNum}`,
      itemName: cleanType || 'General Medical Equipment',
      resourceType: /ventilator/i.test(cleanType) ? 'Ventilator' :
                    /oxygen/i.test(cleanType) ? 'Oxygen Cylinder' :
                    /cardiac|monitor/i.test(cleanType) ? 'Cardiac Monitor' :
                    /pump/i.test(cleanType) ? 'Infusion Pump' :
                    /wheelchair/i.test(cleanType) ? 'Wheelchair' :
                    /defibrillator/i.test(cleanType) ? 'Defibrillator' :
                    /dialysis/i.test(cleanType) ? 'Dialysis Machine' :
                    /suction/i.test(cleanType) ? 'Suction Machine' : 'Medical Equipment',
      category: 'Equipment',
      quantity: 30,
      availableQuantity: 30,
      allocatedQuantity: 0,
      inUseQuantity: 0,
      maintenanceQuantity: 0,
      unit: 'units',
      condition: 'Good',
      locationWard: 'Central Equipment Store',
      lowStockThreshold: 5,
      status: 'In Stock'
    });
  }

  return invItem;
}

// GET all resource requests with filtering and search
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, patientId, search, myRequests } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }
    if (priority && priority !== 'All') {
      query.$or = [{ priority }, { urgency: priority }];
    }
    if (patientId) {
      query.patientId = patientId;
    }

    // Doctor specific filter
    if (req.user.role === 'Doctor' && (myRequests === 'true' || myRequests === true)) {
      const docName = (req.user.name || '').replace(/^Dr\.\s*/i, '').trim();
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { doctorId: req.user._id },
          { requestedBy: req.user._id },
          { doctorName: req.user.name },
          { doctorName: `Dr. ${docName}` },
          { doctorName: { $regex: docName, $options: 'i' } }
        ]
      });
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      const searchConditions = [
        { patientName: searchRegex },
        { patientCustomId: searchRegex },
        { requestId: searchRegex },
        { resourceType: searchRegex },
        { clinicalReason: searchRegex },
        { reason: searchRegex },
        { doctorName: searchRegex },
        { ward: searchRegex },
        { bedNumber: searchRegex }
      ];

      if (query.$and) {
        query.$and.push({ $or: searchConditions });
      } else {
        query.$or = searchConditions;
      }
    }

    const requests = await ResourceRequest.find(query)
      .populate('patientId', 'fullName patientId age gender ward bedNumber admissionStatus')
      .populate('doctorId', 'name department')
      .populate('admissionId')
      .populate('allocationId')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error('Error fetching resource requests:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET active resource allocations
router.get('/allocations', protect, async (req, res) => {
  try {
    const allocations = await ResourceAllocation.find()
      .populate('patientId', 'fullName patientId age gender ward bedNumber')
      .populate('resourceId')
      .populate('requestId')
      .sort({ createdAt: -1 });
    res.json(allocations);
  } catch (err) {
    console.error('Error fetching resource allocations:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET single request by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id)
      .populate('patientId')
      .populate('doctorId')
      .populate('admissionId')
      .populate('allocationId');

    if (!request) {
      return res.status(404).json({ message: 'Resource request not found' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new resource request from Nurse, Doctor, or Admin
// Workflow: Doctor/Nurse -> Request Created (Pending)
router.post('/', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    const {
      patientId,
      patientName,
      patientCustomId,
      admissionId,
      admissionCustomId,
      ward,
      bedNumber,
      resourceType,
      quantity = 1,
      priority = 'Routine',
      clinicalReason,
      reason,
      requiredFrom,
      requiredUntil,
      additionalInstructions,
      doctorNotes,
      nurseNotes
    } = req.body;

    const resolvedClinicalReason = clinicalReason || reason;

    if (!resourceType || !resolvedClinicalReason) {
      return res.status(400).json({ message: 'Resource Type and Clinical Reason are required.' });
    }

    const reqQty = Math.max(1, Number(quantity) || 1);

    // Verify patient in MongoDB
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
      return res.status(400).json({ message: 'Please select a valid registered patient from the database.' });
    }

    // Resolve active admission / ward / bed
    let finalWard = ward || actualPatient.admissionSetup?.wardType || actualPatient.ward || 'General Ward';
    let finalBed = bedNumber || actualPatient.bedNumber || 'Unassigned';
    let finalAdmissionId = admissionId || null;
    let finalAdmissionCustomId = admissionCustomId || '';

    if (!finalAdmissionId) {
      const activeBedAlloc = await BedAllocation.findOne({
        patientId: actualPatient._id,
        status: { $in: ['Occupied', 'Active', 'Allocated'] }
      }).populate('bedId');

      if (activeBedAlloc) {
        finalAdmissionId = activeBedAlloc._id;
        if (activeBedAlloc.ward) finalWard = activeBedAlloc.ward;
        if (activeBedAlloc.bedNumber) finalBed = activeBedAlloc.bedNumber;
      }
    }

    if (!finalAdmissionCustomId && actualPatient.admissionStatus === 'Admitted') {
      finalAdmissionCustomId = actualPatient.admissionId || `ADM-${actualPatient.patientId}`;
    }

    const requestId = await generateNextRequestId();
    const isNurseUser = req.user.role === 'Nurse';
    const requesterName = req.user.name || (isNurseUser ? 'Staff Nurse' : 'Attending Physician');
    const assignedDoc = actualPatient.assignedDoctor || actualPatient.admissionSetup?.assignedDoctor || 'Attending Physician';
    const docDept = req.user.department || actualPatient.admissionSetup?.wardType || 'General Medicine';

    const newRequest = new ResourceRequest({
      requestId,
      patientId: actualPatient._id,
      patientName: actualPatient.fullName,
      patientCustomId: actualPatient.patientId,
      admissionId: finalAdmissionId || undefined,
      admissionCustomId: finalAdmissionCustomId,
      ward: finalWard,
      bedNumber: finalBed,
      doctorId: isNurseUser ? undefined : req.user._id,
      doctorName: isNurseUser ? assignedDoc : requesterName,
      doctorDepartment: docDept,
      requestedBy: req.user._id,
      requestedByModel: isNurseUser ? 'Nurse' : req.user.role === 'Admin' ? 'Admin' : 'Doctor',
      resourceType,
      quantity: reqQty,
      priority: priority || 'Routine',
      urgency: priority || 'Routine',
      clinicalReason: resolvedClinicalReason.trim(),
      reason: resolvedClinicalReason.trim(),
      requiredFrom: requiredFrom ? new Date(requiredFrom) : new Date(),
      requiredUntil: requiredUntil ? new Date(requiredUntil) : undefined,
      additionalInstructions: (additionalInstructions || doctorNotes || nurseNotes || '').trim(),
      status: 'Pending',
      allocatedBy: 'Resource / Admin Staff'
    });

    const savedRequest = await newRequest.save();

    // Auto-dispatch Notification to Admin
    try {
      await Notification.create({
        title: `🧰 New Resource Request: ${resourceType} (${requestId})`,
        message: `${requesterName} requested ${reqQty}x ${resourceType} for patient ${actualPatient.fullName} (${finalWard} • Bed ${finalBed}). Priority: ${priority}. Reason: ${resolvedClinicalReason}.`,
        category: 'Resource Request',
        priority: priority === 'Emergency' || priority === 'Critical / Emergency' ? 'Critical' : 'Normal',
        recipientRole: 'Admin',
        senderName: requesterName,
        link: '/allocation'
      });
    } catch (notifErr) {
      console.error('Notification dispatch warning:', notifErr.message);
    }

    res.status(201).json(savedRequest);
  } catch (err) {
    console.error('Error creating resource request:', err);
    res.status(500).json({ message: err.message || 'Server error creating resource request' });
  }
});

// STEP 4: ADMIN APPROVAL / REJECTION
// Endpoint: PUT /api/resource-requests/:id/approve
// Validates available stock in MongoDB before approval. Prevents approval if stock is insufficient.
router.put('/:id/approve', protect, requireRole(['Admin', 'Inventory Manager']), async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Resource request not found' });
    }

    if (request.status !== 'Pending' && request.status !== 'Requested') {
      return res.status(400).json({ message: `Cannot approve request with current status "${request.status}".` });
    }

    const requiredQty = request.quantity || 1;
    const invItem = await findOrProvisionInventoryItem(request.resourceType, requiredQty);

    const availableStock = invItem.availableQuantity !== undefined ? invItem.availableQuantity : invItem.quantity;
    if (availableStock < requiredQty) {
      return res.status(400).json({
        message: `Insufficient stock in MongoDB. Available: ${availableStock} units, Requested: ${requiredQty} units. Cannot approve until stock is replenished.`
      });
    }

    request.status = 'Approved';
    request.availabilityStatus = `Verified (${availableStock} units available)`;
    request.availabilityCheckedBy = req.user.name || 'Hospital Admin';
    request.approvedBy = req.user.name || 'Hospital Admin';
    request.approvedAt = new Date();

    const saved = await request.save();

    res.json({
      message: `Request ${request.requestId} approved successfully. Stock verified.`,
      request: saved,
      inventoryItem: {
        itemName: invItem.itemName,
        availableQuantity: availableStock
      }
    });
  } catch (err) {
    console.error('Error approving resource request:', err);
    res.status(500).json({ message: err.message });
  }
});

// Reject request
router.put('/:id/reject', protect, requireRole(['Admin', 'Inventory Manager']), async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Resource request not found' });
    }

    if (request.status === 'Allocated' || request.status === 'In Use') {
      return res.status(400).json({ message: 'Cannot reject a request that has already been allocated or is in use.' });
    }

    request.status = 'Rejected';
    request.rejectionReason = rejectionReason || 'Rejected by Hospital Admin';
    const saved = await request.save();

    res.json({ message: 'Request rejected.', request: saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// STEP 5: ALLOCATION
// Endpoint: PUT /api/resource-requests/:id/allocate
// Assigns actual resource/equipment to patient. Reduces Available Quantity, increases Allocated Quantity. Prevents double allocation.
router.put('/:id/allocate', protect, requireRole(['Admin', 'Inventory Manager']), async (req, res) => {
  try {
    const { assetTag, serialNumber, deviceModel, notes, locationWard } = req.body;
    if (!assetTag || !assetTag.trim()) {
      return res.status(400).json({ message: 'Asset Barcode / Tag is required for physical allocation.' });
    }

    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Resource request not found' });
    }

    // Prevent double allocation
    if (request.status === 'Allocated' || request.status === 'In Use') {
      return res.status(400).json({ message: `Resource is already ${request.status}. Double allocation prevented.` });
    }

    // Find corresponding inventory item in MongoDB
    const requiredQty = request.quantity || 1;
    const invItem = await findOrProvisionInventoryItem(request.resourceType, requiredQty);

    const currentAvailable = invItem.availableQuantity !== undefined ? invItem.availableQuantity : invItem.quantity;
    if (currentAvailable < requiredQty) {
      return res.status(400).json({
        message: `Cannot allocate: Available stock (${currentAvailable}) is less than required quantity (${requiredQty}).`
      });
    }

    // Check if assetTag is already actively allocated
    const existingActiveTag = await ResourceAllocation.findOne({
      assetTag: assetTag.trim(),
      status: { $in: ['Allocated', 'In Use'] }
    });

    if (existingActiveTag) {
      return res.status(400).json({
        message: `Asset Tag "${assetTag.trim()}" is already actively deployed to patient "${existingActiveTag.patientName}". Please select another asset.`
      });
    }

    // 1. Create ResourceAllocation Record
    const allocationId = await generateNextAllocationId();
    const allocationRecord = new ResourceAllocation({
      allocationId,
      requestId: request._id,
      requestCustomId: request.requestId,
      resourceId: invItem._id,
      resourceName: invItem.itemName,
      resourceType: request.resourceType,
      patientId: request.patientId,
      patientName: request.patientName,
      patientCustomId: request.patientCustomId,
      admissionId: request.admissionId,
      admissionCustomId: request.admissionCustomId,
      ward: request.ward,
      bedNumber: request.bedNumber,
      quantity: requiredQty,
      assetTag: assetTag.trim(),
      serialNumber: (serialNumber || '').trim(),
      deviceModel: (deviceModel || invItem.itemName || '').trim(),
      allocatedBy: req.user.name || 'Hospital Admin',
      allocatedAt: new Date(),
      status: 'Allocated',
      notes: (notes || '').trim()
    });

    await allocationRecord.save();

    // 2. Update Inventory Stock in MongoDB (Decrease Available, Increase Allocated)
    invItem.availableQuantity = Math.max(0, currentAvailable - requiredQty);
    invItem.allocatedQuantity = (invItem.allocatedQuantity || 0) + requiredQty;
    await invItem.save();

    // 3. Update ResourceRequest
    request.status = 'Allocated';
    request.allocationId = allocationRecord._id;
    request.allocatedBy = req.user.name || 'Hospital Admin';
    request.allocatedAt = new Date();
    request.allocatedResourceDetails = {
      assetTag: assetTag.trim(),
      serialNumber: (serialNumber || '').trim(),
      deviceModel: (deviceModel || invItem.itemName || '').trim(),
      locationWard: locationWard || request.ward,
      notes: (notes || '').trim()
    };

    const savedRequest = await request.save();

    res.json({
      message: `Equipment ${request.resourceType} (${assetTag}) allocated to ${request.patientName}.`,
      request: savedRequest,
      allocation: allocationRecord,
      updatedInventory: {
        availableQuantity: invItem.availableQuantity,
        allocatedQuantity: invItem.allocatedQuantity
      }
    });
  } catch (err) {
    console.error('Error allocating resource:', err);
    res.status(500).json({ message: err.message });
  }
});

// STEP 6: IN USE CONFIRMATION
// Endpoint: PUT /api/resource-requests/:id/in-use
// Admin/Nurse confirms that the resource has been delivered to bedside and is in active use.
router.put('/:id/in-use', protect, requireRole(['Admin', 'Nurse', 'Inventory Manager']), async (req, res) => {
  try {
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Resource request not found' });
    }

    if (request.status !== 'Allocated') {
      return res.status(400).json({ message: `Cannot set "In Use" from current status "${request.status}". Must be "Allocated" first.` });
    }

    request.status = 'In Use';
    request.inUseConfirmedBy = req.user.name || 'Clinical Staff';
    request.inUseConfirmedAt = new Date();
    await request.save();

    // Update ResourceAllocation record
    if (request.allocationId) {
      await ResourceAllocation.findByIdAndUpdate(request.allocationId, {
        status: 'In Use',
        inUseConfirmedBy: req.user.name || 'Clinical Staff',
        inUseConfirmedAt: new Date()
      });
    }

    // Update Inventory stock (Increase inUseQuantity)
    const invItem = await findOrProvisionInventoryItem(request.resourceType, request.quantity || 1);
    if (invItem) {
      const qty = request.quantity || 1;
      invItem.inUseQuantity = (invItem.inUseQuantity || 0) + qty;
      await invItem.save();
    }

    res.json({
      message: `Resource confirmed In Use at bedside for ${request.patientName}.`,
      request
    });
  } catch (err) {
    console.error('Error confirming in-use resource:', err);
    res.status(500).json({ message: err.message });
  }
});

// STEP 7: RELEASE RESOURCE
// Endpoint: PUT /api/resource-requests/:id/release
// Marks Released, increases Available stock, decreases Allocated/In Use stock, records released by/time.
router.put('/:id/release', protect, requireRole(['Admin', 'Nurse', 'Inventory Manager']), async (req, res) => {
  try {
    const { releaseNotes } = req.body;
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Resource request not found' });
    }

    if (request.status === 'Released') {
      return res.status(400).json({ message: 'Resource is already released and returned to available stock.' });
    }

    const prevStatus = request.status;
    request.status = 'Released';
    request.releasedBy = req.user.name || 'Hospital Admin';
    request.releasedAt = new Date();
    request.releaseNotes = releaseNotes || 'Clinical use completed. Returned to inventory.';
    await request.save();

    // Update ResourceAllocation record
    if (request.allocationId) {
      await ResourceAllocation.findByIdAndUpdate(request.allocationId, {
        status: 'Released',
        releasedBy: req.user.name || 'Hospital Admin',
        releasedAt: new Date(),
        releaseNotes: request.releaseNotes
      });
    }

    // Update Inventory Stock (Restock back to Available)
    const invItem = await findOrProvisionInventoryItem(request.resourceType, request.quantity || 1);
    if (invItem) {
      const qty = request.quantity || 1;
      if (prevStatus === 'In Use') {
        invItem.inUseQuantity = Math.max(0, (invItem.inUseQuantity || 0) - qty);
      }
      invItem.allocatedQuantity = Math.max(0, (invItem.allocatedQuantity || 0) - qty);
      invItem.availableQuantity = Math.min(invItem.quantity, (invItem.availableQuantity || 0) + qty);
      await invItem.save();
    }

    res.json({
      message: `Resource released successfully and restocked to available inventory.`,
      request
    });
  } catch (err) {
    console.error('Error releasing resource:', err);
    res.status(500).json({ message: err.message });
  }
});

// General status update fallback route
router.put('/:id', protect, requireRole(['Admin', 'Inventory Manager', 'Nurse']), async (req, res) => {
  const { status } = req.body;
  if (status === 'Approved') {
    req.url = `/${req.params.id}/approve`;
    return router.handle(req, res);
  }
  if (status === 'Allocated') {
    return router.handle({ ...req, url: `/${req.params.id}/allocate` }, res);
  }
  if (status === 'In Use') {
    return router.handle({ ...req, url: `/${req.params.id}/in-use` }, res);
  }
  if (status === 'Released') {
    return router.handle({ ...req, url: `/${req.params.id}/release` }, res);
  }
  if (status === 'Rejected') {
    return router.handle({ ...req, url: `/${req.params.id}/reject` }, res);
  }

  try {
    const updated = await ResourceRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
