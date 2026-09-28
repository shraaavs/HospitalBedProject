import mongoose from 'mongoose';
import dotenv from 'dotenv';
import InventoryItem from './server/models/InventoryItem.js';
import ResourceRequest from './server/models/ResourceRequest.js';
import ResourceAllocation from './server/models/ResourceAllocation.js';
import Supplier from './server/models/Supplier.js';
import Patient from './server/models/Patient.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/hospitalbed';

async function runTest() {
  console.log('--- STARTING COMPLETE RESOURCE ALLOCATION WORKFLOW TEST ---');
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB.');

  // 1. Clean test records if any
  await Supplier.deleteMany({ supplierName: 'Test BioMed Supply Corp' });
  await InventoryItem.deleteMany({ itemName: 'Test Automated Ventilator' });
  await ResourceRequest.deleteMany({ patientName: 'Test Workflow Patient' });
  await Patient.deleteMany({ fullName: 'Test Workflow Patient' });

  // 2. Create Supplier & Equipment
  console.log('\n1. Creating Supplier & Equipment...');
  const supplier = await Supplier.create({
    supplierName: 'Test BioMed Supply Corp',
    contactPerson: 'Alex Turner',
    contactPhone: '+91 9988776655',
    supplyCategories: ['Ventilator', 'Critical Care']
  });
  console.log(`Supplier created: ${supplier.supplierName} (${supplier._id})`);

  const equipment = await InventoryItem.create({
    resourceId: 'EQ-TEST-99',
    itemName: 'Test Automated Ventilator',
    resourceType: 'Ventilator',
    category: 'Equipment',
    quantity: 10,
    availableQuantity: 10,
    allocatedQuantity: 0,
    inUseQuantity: 0,
    unit: 'units',
    condition: 'New',
    supplierId: supplier._id,
    supplierName: supplier.supplierName,
    locationWard: 'ICU Store',
    lowStockThreshold: 2
  });
  console.log(`Equipment created: ${equipment.itemName}, Total Qty: ${equipment.quantity}, Available: ${equipment.availableQuantity}`);

  // 3. Create Patient
  const patient = await Patient.create({
    patientId: 'PX-TEST-900',
    fullName: 'Test Workflow Patient',
    age: 45,
    gender: 'Male',
    contactNumber: '9876543210',
    admissionStatus: 'Admitted',
    ward: 'ICU Ward',
    bedNumber: 'ICU-B01'
  });
  console.log(`Patient created: ${patient.fullName} (${patient.patientId})`);

  // 4. Create Doctor/Nurse Resource Request
  console.log('\n2. Submitting Resource Request (Doctor/Nurse)...');
  const request = await ResourceRequest.create({
    requestId: 'RR-TEST-900',
    patientId: patient._id,
    patientName: patient.fullName,
    patientCustomId: patient.patientId,
    ward: patient.ward,
    bedNumber: patient.bedNumber,
    doctorName: 'Dr. Priya Sharma',
    requestedByModel: 'Doctor',
    resourceType: 'Ventilator',
    quantity: 2,
    priority: 'Emergency',
    clinicalReason: 'Severe respiratory distress, ARDS protocol',
    status: 'Pending'
  });
  console.log(`Request created: ${request.requestId}, Status: ${request.status}, Qty: ${request.quantity}`);

  // 5. Admin Availability Check & Approval
  console.log('\n3. Admin Availability Check & Approval...');
  const checkItem = await InventoryItem.findOne({ resourceType: request.resourceType });
  if (checkItem.availableQuantity < request.quantity) {
    throw new Error('Stock unavailable!');
  }
  request.status = 'Approved';
  request.approvedBy = 'Hospital Admin';
  request.approvedAt = new Date();
  await request.save();
  console.log(`Request approved. Status: ${request.status}`);

  // 6. Allocation
  console.log('\n4. Allocating Physical Equipment Asset...');
  const allocation = await ResourceAllocation.create({
    allocationId: 'ALC-TEST-900',
    requestId: request._id,
    resourceId: checkItem._id,
    resourceName: checkItem.itemName,
    resourceType: request.resourceType,
    patientId: patient._id,
    patientName: patient.fullName,
    patientCustomId: patient.patientId,
    ward: patient.ward,
    bedNumber: patient.bedNumber,
    quantity: request.quantity,
    assetTag: 'TAG-VENT-9001',
    serialNumber: 'SN-VENT-8899',
    deviceModel: checkItem.itemName,
    allocatedBy: 'Hospital Admin',
    status: 'Allocated'
  });

  // Decrement Available, Increment Allocated
  checkItem.availableQuantity -= request.quantity;
  checkItem.allocatedQuantity += request.quantity;
  await checkItem.save();

  request.status = 'Allocated';
  request.allocationId = allocation._id;
  await request.save();

  console.log(`Allocation complete!`);
  console.log(`Stock: Available=${checkItem.availableQuantity}, Allocated=${checkItem.allocatedQuantity}, InUse=${checkItem.inUseQuantity}`);

  // 7. In Use Confirmation
  console.log('\n5. Confirming Bedside In-Use (Nurse/Admin)...');
  request.status = 'In Use';
  await request.save();

  allocation.status = 'In Use';
  allocation.inUseConfirmedBy = 'Staff Nurse';
  allocation.inUseConfirmedAt = new Date();
  await allocation.save();

  checkItem.inUseQuantity += request.quantity;
  await checkItem.save();
  console.log(`Status is now In Use. Stock: Available=${checkItem.availableQuantity}, Allocated=${checkItem.allocatedQuantity}, InUse=${checkItem.inUseQuantity}`);

  // 8. Release Resource
  console.log('\n6. Releasing Equipment Asset & Returning to Stock...');
  request.status = 'Released';
  request.releasedBy = 'Hospital Admin';
  request.releasedAt = new Date();
  await request.save();

  allocation.status = 'Released';
  allocation.releasedBy = 'Hospital Admin';
  allocation.releasedAt = new Date();
  await allocation.save();

  checkItem.allocatedQuantity -= request.quantity;
  checkItem.inUseQuantity -= request.quantity;
  checkItem.availableQuantity += request.quantity;
  await checkItem.save();

  console.log(`Asset released! Stock Restored: Available=${checkItem.availableQuantity}, Allocated=${checkItem.allocatedQuantity}, InUse=${checkItem.inUseQuantity}`);

  // Verification Assertion
  if (checkItem.availableQuantity === 10 && checkItem.allocatedQuantity === 0 && checkItem.inUseQuantity === 0) {
    console.log('\n SUCCESS: Entire MongoDB workflow verified without discrepancies!');
  } else {
    console.error('\n FAILURE: Stock mismatch!');
  }

  // Cleanup
  await Supplier.deleteMany({ supplierName: 'Test BioMed Supply Corp' });
  await InventoryItem.deleteMany({ itemName: 'Test Automated Ventilator' });
  await ResourceRequest.deleteMany({ patientName: 'Test Workflow Patient' });
  await ResourceAllocation.deleteMany({ assetTag: 'TAG-VENT-9001' });
  await Patient.deleteMany({ fullName: 'Test Workflow Patient' });

  await mongoose.disconnect();
}

runTest().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
