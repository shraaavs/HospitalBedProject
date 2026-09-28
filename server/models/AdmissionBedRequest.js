import mongoose from 'mongoose';

const admissionBedRequestSchema = new mongoose.Schema({
  admissionId: {
    type: String,
    unique: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: false
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientCustomId: {
    type: String,
    default: '',
    trim: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
  },
  doctorName: {
    type: String,
    required: true,
    trim: true
  },
  doctorDepartment: {
    type: String,
    default: 'General Medicine'
  },
  department: {
    type: String,
    default: 'General Medicine'
  },
  admissionReason: {
    type: String,
    required: true,
    trim: true
  },
  clinicalReason: {
    type: String,
    default: '',
    trim: true
  },
  diagnosis: {
    type: String,
    default: 'Provisional Diagnosis',
    trim: true
  },
  wardType: {
    type: String,
    enum: [
      'General Ward',
      'Special Ward',
      'ICU',
      'Emergency',
      'Emergency Ward',
      'General',
      'Special',
      'CCU',
      'Pediatric',
      'Maternity',
      'Surgery',
      'Isolation',
      'HDU',
      'Other'
    ],
    default: 'General Ward'
  },
  requestedWard: {
    type: String,
    default: 'General Ward'
  },
  bedType: {
    type: String,
    enum: [
      'Standard Bed',
      'Standard',
      'ICU Bed',
      'Cardiac Monitor Bed',
      'Ventilator Bed',
      'Isolation Bed',
      'Deluxe Room',
      'Semi-Private Bed',
      'Emergency Bay',
      'Motorized',
      'Bariatric',
      'Pediatric',
      'Other'
    ],
    default: 'Standard Bed'
  },
  priority: {
    type: String,
    enum: ['Normal', 'Routine', 'Intermediate', 'Urgent', 'Emergency', 'Emergency / High', 'High'],
    default: 'Normal'
  },
  specialRequirements: {
    type: [String],
    default: []
  },
  expectedDuration: {
    type: String,
    default: '3-5 days'
  },
  doctorNotes: {
    type: String,
    default: ''
  },
  clinicalNotes: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: [
      'Pending Verification',
      'Pending Approval',
      'Pending',
      'Doctor Approved',
      'Awaiting Bed Allocation',
      'Forwarded to Bed Management',
      'Bed Allocated',
      'Allocated',
      'Admission Confirmed',
      'Approved',
      'Rejected',
      'Cancelled'
    ],
    default: 'Doctor Approved'
  },
  admissionStatus: {
    type: String,
    default: 'Doctor Approved'
  },
  allocatedBedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    required: false
  },
  bedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    required: false
  },
  allocatedBedNumber: {
    type: String,
    default: ''
  },
  allocatedWard: {
    type: String,
    default: ''
  },
  verifiedBy: {
    type: String,
    default: ''
  },
  verifiedAt: {
    type: Date
  },
  allocatedBy: {
    type: String,
    default: ''
  },
  allocatedAt: {
    type: Date
  },
  confirmedBy: {
    type: String,
    default: ''
  },
  admissionConfirmedAt: {
    type: Date
  }
}, { timestamps: true });

// Sync aliases pre-save (Mongoose 9 compatible)
admissionBedRequestSchema.pre('save', function () {
  if (this.department && !this.doctorDepartment) this.doctorDepartment = this.department;
  if (this.doctorDepartment && !this.department) this.department = this.doctorDepartment;

  if (this.requestedWard && !this.wardType) this.wardType = this.requestedWard;
  if (this.wardType && !this.requestedWard) this.requestedWard = this.wardType;

  if (this.admissionReason && !this.reason) this.reason = this.admissionReason;
  if (this.reason && !this.admissionReason) this.admissionReason = this.reason;

  if (this.doctorNotes && !this.clinicalNotes) this.clinicalNotes = this.doctorNotes;
  if (this.clinicalNotes && !this.doctorNotes) this.doctorNotes = this.clinicalNotes;

  if (this.admissionStatus && !this.status) this.status = this.admissionStatus;
  if (this.status && !this.admissionStatus) this.admissionStatus = this.status;

  if (this.bedId && !this.allocatedBedId) this.allocatedBedId = this.bedId;
  if (this.allocatedBedId && !this.bedId) this.bedId = this.allocatedBedId;
});

export default mongoose.model('AdmissionBedRequest', admissionBedRequestSchema);
