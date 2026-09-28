import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number
  },
  dob: {
    type: Date
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  contactNumber: {
    type: String,
    trim: true
  },
  phoneNumber: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    default: ''
  },
  address: {
    type: String,
    trim: true,
    default: ''
  },
  emergencyContact: {
    name: { type: String, default: '' },
    relationship: { type: String, default: '' },
    phone: { type: String, default: '' }
  },
  emergencyContactName: {
    type: String,
    default: ''
  },
  emergencyContactRelationship: {
    type: String,
    default: ''
  },
  emergencyContactPhone: {
    type: String,
    default: ''
  },
  registrationDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  registrationTime: {
    type: String,
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  registeredBy: {
    type: String,
    default: 'Receptionist'
  },
  registrationPathway: {
    type: String,
    enum: ['APPOINTMENT_OPD', 'EMERGENCY', 'WALK_IN'],
    default: 'APPOINTMENT_OPD'
  },
  admissionStatus: {
    type: String,
    enum: ['Registered', 'Admitted', 'Discharged'],
    default: 'Registered'
  },
  patientStatus: {
    type: String,
    default: 'Active'
  },
  clinicalInfo: {
    purpose: { type: String, default: '' },
    chiefComplaint: { type: String, default: '' },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
      default: 'A+'
    },
    allergies: { type: [String], default: [] }
  },
  purpose: { type: String, default: '' },
  admissionSetup: {
    wardType: {
      type: String,
      default: 'General'
    },
    assignedDoctor: {
      type: String,
      default: ''
    },
    assignedDoctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor'
    }
  },
  assignedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  attendingDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  assignedDoctor: {
    type: String,
    default: ''
  },
  attendingDoctor: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: ''
  },
  ward: {
    type: String,
    default: ''
  },
  bedNumber: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Registered', 'Admitted', 'Outpatient', 'Emergency', 'Discharged', 'Active', 'In Consultation'],
    default: 'Registered'
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  bedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed',
    default: null
  }
}, { timestamps: true });

// Sync aliases pre-save (Mongoose 9 compatible)
patientSchema.pre('save', function () {
  if (this.name && !this.fullName) this.fullName = this.name;
  if (this.fullName && !this.name) this.name = this.fullName;

  if (this.dob && !this.dateOfBirth) this.dateOfBirth = this.dob;
  if (this.dateOfBirth && !this.dob) this.dob = this.dateOfBirth;

  if (this.contactNumber && !this.phoneNumber) this.phoneNumber = this.contactNumber;
  if (this.phoneNumber && !this.contactNumber) this.contactNumber = this.phoneNumber;

  if (this.assignedDoctor && !this.admissionSetup?.assignedDoctor) {
    if (!this.admissionSetup) this.admissionSetup = {};
    this.admissionSetup.assignedDoctor = this.assignedDoctor;
  }
  if (this.admissionSetup?.assignedDoctor && !this.assignedDoctor) {
    this.assignedDoctor = this.admissionSetup.assignedDoctor;
  }

  if (this.assignedDoctorId && !this.admissionSetup?.assignedDoctorId) {
    if (!this.admissionSetup) this.admissionSetup = {};
    this.admissionSetup.assignedDoctorId = this.assignedDoctorId;
  }
  if (this.admissionSetup?.assignedDoctorId && !this.assignedDoctorId) {
    this.assignedDoctorId = this.admissionSetup.assignedDoctorId;
  }

  if (this.ward && !this.admissionSetup?.wardType) {
    if (!this.admissionSetup) this.admissionSetup = {};
    this.admissionSetup.wardType = this.ward;
  }
  if (this.admissionSetup?.wardType && !this.ward) {
    this.ward = this.admissionSetup.wardType;
  }

  if (this.emergencyContact) {
    if (this.emergencyContact.name && !this.emergencyContactName) this.emergencyContactName = this.emergencyContact.name;
    if (this.emergencyContact.relationship && !this.emergencyContactRelationship) this.emergencyContactRelationship = this.emergencyContact.relationship;
    if (this.emergencyContact.phone && !this.emergencyContactPhone) this.emergencyContactPhone = this.emergencyContact.phone;

    if (this.emergencyContactName && !this.emergencyContact.name) this.emergencyContact.name = this.emergencyContactName;
    if (this.emergencyContactRelationship && !this.emergencyContact.relationship) this.emergencyContact.relationship = this.emergencyContactRelationship;
    if (this.emergencyContactPhone && !this.emergencyContact.phone) this.emergencyContact.phone = this.emergencyContactPhone;
  }

  if (this.status && !this.admissionStatus) this.admissionStatus = this.status;
  if (this.admissionStatus && !this.status) this.status = this.admissionStatus;
});

export default mongoose.model('Patient', patientSchema);

