import mongoose from 'mongoose';

const dischargeBillSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  patientCustomId: {
    type: String,
    required: true,
    index: true
  },
  admissionId: {
    type: String,
    default: ''
  },
  transferDischargeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TransferDischarge'
  },
  // Personal details snapshot at time of billing
  patientDetailsSnapshot: {
    fullName: { type: String, required: true },
    age: Number,
    gender: String,
    dateOfBirth: Date,
    contactNumber: String,
    email: String,
    address: String,
    emergencyContactName: String,
    emergencyContactPhone: String,
    emergencyContactRelationship: String,
    bloodGroup: String
  },
  // Admission details snapshot
  admissionDetailsSnapshot: {
    admissionId: String,
    admissionDate: Date,
    dischargeDate: Date,
    lengthOfStayDays: { type: Number, default: 1 },
    ward: String,
    bedNumber: String,
    bedType: String,
    doctorName: String,
    doctorDepartment: String,
    admissionReason: String,
    admissionType: { type: String, default: 'Inpatient' }
  },
  // Doctor discharge summary snapshot
  doctorDischargeSummarySnapshot: {
    dischargeDiagnosis: String,
    treatmentSummary: String,
    patientConditionAtDischarge: String,
    prescribedMedicines: [{
      medicineName: String,
      dosage: String,
      frequency: String,
      duration: String
    }],
    followUpInstructions: String,
    dietAndActivityAdvice: String,
    nextFollowUpDate: Date,
    doctorNotes: String,
    doctorName: String,
    recommendationDate: Date
  },
  // Itemized breakdown
  bedCharges: {
    wardType: String,
    bedNumber: String,
    dailyRate: { type: Number, default: 0 },
    days: { type: Number, default: 1 },
    total: { type: Number, default: 0 }
  },
  consultationCharges: [{
    doctorName: String,
    department: String,
    serviceName: String,
    rate: Number,
    quantity: { type: Number, default: 1 },
    total: Number
  }],
  diagnosticCharges: [{
    testName: String,
    dateRequested: Date,
    rate: Number,
    quantity: { type: Number, default: 1 },
    total: Number
  }],
  medicineCharges: [{
    medicineName: String,
    dosage: String,
    unitPrice: Number,
    quantity: { type: Number, default: 1 },
    total: Number,
    issueDate: Date
  }],
  resourceCharges: [{
    resourceName: String,
    resourceId: String,
    category: String,
    billingUnit: String,
    rate: Number,
    quantity: { type: Number, default: 1 },
    durationDays: { type: Number, default: 1 },
    durationHours: Number,
    total: Number,
    allocationDate: Date
  }],
  otherCharges: [{
    item: String,
    rate: Number,
    quantity: { type: Number, default: 1 },
    total: Number
  }],
  // Financial Totals
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  discountPercentage: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  taxPercentage: {
    type: Number,
    default: 5
  },
  grandTotal: {
    type: Number,
    required: true,
    default: 0
  },
  // Payments
  amountPaid: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Credit Card', 'Debit Card', 'UPI / Online', 'Insurance / TPA', 'Net Banking', 'Pending'],
    default: 'Pending'
  },
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Partially Paid', 'Paid'],
    default: 'Pending'
  },
  paymentTransactions: [{
    transactionId: String,
    amount: Number,
    paymentMethod: String,
    paidAt: { type: Date, default: Date.now },
    receivedBy: String,
    notes: String
  }],
  // Tracking
  generatedBy: {
    type: String,
    default: 'Front Desk Receptionist'
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  isFinalized: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('DischargeBill', dischargeBillSchema);
