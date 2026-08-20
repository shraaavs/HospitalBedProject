import mongoose from 'mongoose';

const patientSchema = new mongoose.Schema({
  patientId: {
    type: String,
    required: true,
    unique: true
  },
  fullName: {
    type: String,
    required: true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  contactNumber: {
    type: String,
    required: true
  },
  email: {
    type: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  clinicalInfo: {
    chiefComplaint: String,
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
    },
    allergies: [String]
  },
  admissionSetup: {
    wardType: {
      type: String,
      enum: ['General', 'ICU']
    },
    assignedDoctor: String
  },
  status: {
    type: String,
    enum: ['Registered', 'Admitted', 'Discharged'],
    default: 'Registered'
  },
  hospitalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  bedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed'
  }
}, { timestamps: true });

export default mongoose.model('Patient', patientSchema);
