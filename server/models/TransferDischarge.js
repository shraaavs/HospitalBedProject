import mongoose from 'mongoose';

const transferDischargeSchema = new mongoose.Schema({
  requestType: {
    type: String,
    enum: ['Transfer', 'Discharge'],
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  patientName: {
    type: String,
    required: true,
    trim: true
  },
  patientCustomId: {
    type: String,
    trim: true,
    default: ''
  },
  currentWard: {
    type: String,
    default: 'General Ward'
  },
  currentBedNumber: {
    type: String,
    default: 'Bed #01'
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  doctorName: {
    type: String,
    default: 'Dr. Priya Sharma',
    trim: true
  },
  doctorDepartment: {
    type: String,
    default: 'General Medicine',
    trim: true
  },
  // Transfer Specific Fields
  transferDetails: {
    recommendedWard: {
      type: String,
      default: 'General Ward'
    },
    targetWard: {
      type: String,
      default: 'General Ward'
    },
    requiredBedType: {
      type: String,
      default: 'Standard Bed'
    },
    reasonForTransfer: {
      type: String,
      default: ''
    },
    medicalReason: {
      type: String,
      default: ''
    },
    clinicalCondition: {
      type: String,
      default: 'Stable'
    },
    priority: {
      type: String,
      enum: ['Normal', 'Routine', 'Urgent', 'Emergency', 'Standard', 'Elective'],
      default: 'Normal'
    },
    doctorNotes: {
      type: String,
      default: ''
    },
    specialPrecautions: {
      type: String,
      default: ''
    },
    allocatedBedNumber: {
      type: String,
      default: ''
    },
    allocatedWard: {
      type: String,
      default: ''
    }
  },
  // Discharge Specific Fields
  dischargeDetails: {
    dischargeDiagnosis: {
      type: String,
      default: ''
    },
    conditionAtDischarge: {
      type: String,
      default: 'Improved / Stable'
    },
    patientConditionAtDischarge: {
      type: String,
      default: 'Improved / Stable'
    },
    treatmentSummary: {
      type: String,
      default: ''
    },
    prescribedMedicines: [{
      medicineName: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    followUpInstructions: {
      type: String,
      default: ''
    },
    followUpDate: {
      type: Date
    },
    nextFollowUpDate: {
      type: Date
    },
    dietInstructions: {
      type: String,
      default: ''
    },
    dietAndActivityAdvice: {
      type: String,
      default: ''
    },
    warningSigns: {
      type: String,
      default: ''
    },
    doctorsFinalNotes: {
      type: String,
      default: ''
    },
    instructionsForReceptionist: {
      type: String,
      default: ''
    },
    doctorSignature: {
      type: String,
      default: ''
    },
    doctorRegistrationNumber: {
      type: String,
      default: 'MCI-884920'
    },
    doctorSignedAt: {
      type: Date
    },
    recommendedDischargeDate: {
      type: Date,
      default: Date.now
    }
  },
  // Nursing Assistance & Preparation Records (Post-Doctor Decision)
  nursingAssistance: {
    transferAcknowledged: {
      type: Boolean,
      default: false
    },
    transferAcknowledgedBy: String,
    transferAcknowledgedAt: Date,
    patientPreparedForTransfer: {
      type: Boolean,
      default: false
    },
    transferNursingNotes: String,
    vitalsAtTransfer: {
      temperature: String,
      bloodPressure: String,
      heartRate: String,
      respiratoryRate: String,
      spo2: String
    },
    handoverStaffName: String,
    transferConfirmed: {
      type: Boolean,
      default: false
    },
    transferConfirmedBy: String,
    transferConfirmedAt: Date,

    // Discharge Nursing Assistance
    dischargeAssistanceAcknowledged: {
      type: Boolean,
      default: false
    },
    dischargeAssistanceAcknowledgedBy: String,
    dischargeAssistanceAcknowledgedAt: Date,
    finalNursingObservations: String,
    vitalsAtDischarge: {
      temperature: String,
      bloodPressure: String,
      heartRate: String,
      respiratoryRate: String,
      spo2: String
    },
    patientPreparedForDischarge: {
      type: Boolean,
      default: false
    },
    medicationHandoverCompleted: {
      type: Boolean,
      default: false
    },
    instructionsExplainedToPatientOrFamily: {
      type: Boolean,
      default: false
    },
    dischargeAssistanceCompleted: {
      type: Boolean,
      default: false
    },
    dischargeAssistanceCompletedBy: String,
    dischargeAssistanceCompletedAt: Date,
    nurseRemarks: String
  },
  status: {
    type: String,
    enum: [
      'Pending Approval',
      'Pending Doctor Confirmation',
      'Doctor Approved',
      'Pending Discharge Verification',
      'Destination Availability Checked',
      'Transfer Approved',
      'Bed Assigned by Nurse',
      'New Bed Allocated',
      'Transfer In Transit',
      'Transfer Completed',
      'Transferred',
      'Discharge Authorized',
      'Nursing Preparation Completed',
      'Billing In Progress',
      'Payment Completed',
      'Final Discharge Completed',
      'Bed Allocated',
      'Completed',
      'Rejected',
      'Cancelled'
    ],
    default: 'Pending Approval'
  },
  authorizedBy: {
    type: String,
    default: ''
  },
  authorizedAt: Date,
  releasedResources: [String],
  previousBedReleased: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Sync aliases pre-save
transferDischargeSchema.pre('save', function () {
  if (this.requestType === 'Transfer' && this.transferDetails) {
    if (this.transferDetails.recommendedWard && !this.transferDetails.targetWard) this.transferDetails.targetWard = this.transferDetails.recommendedWard;
    if (this.transferDetails.targetWard && !this.transferDetails.recommendedWard) this.transferDetails.recommendedWard = this.transferDetails.targetWard;

    if (this.transferDetails.reasonForTransfer && !this.transferDetails.medicalReason) this.transferDetails.medicalReason = this.transferDetails.reasonForTransfer;
    if (this.transferDetails.medicalReason && !this.transferDetails.reasonForTransfer) this.transferDetails.reasonForTransfer = this.transferDetails.medicalReason;

    if (this.transferDetails.doctorNotes && !this.transferDetails.specialPrecautions) this.transferDetails.specialPrecautions = this.transferDetails.doctorNotes;
    if (this.transferDetails.specialPrecautions && !this.transferDetails.doctorNotes) this.transferDetails.doctorNotes = this.transferDetails.specialPrecautions;
  }

  if (this.requestType === 'Discharge' && this.dischargeDetails) {
    if (this.dischargeDetails.conditionAtDischarge && !this.dischargeDetails.patientConditionAtDischarge) this.dischargeDetails.patientConditionAtDischarge = this.dischargeDetails.conditionAtDischarge;
    if (this.dischargeDetails.patientConditionAtDischarge && !this.dischargeDetails.conditionAtDischarge) this.dischargeDetails.conditionAtDischarge = this.dischargeDetails.patientConditionAtDischarge;

    if (this.dischargeDetails.followUpDate && !this.dischargeDetails.nextFollowUpDate) this.dischargeDetails.nextFollowUpDate = this.dischargeDetails.followUpDate;
    if (this.dischargeDetails.nextFollowUpDate && !this.dischargeDetails.followUpDate) this.dischargeDetails.followUpDate = this.dischargeDetails.nextFollowUpDate;

    if (this.dischargeDetails.dietInstructions && !this.dischargeDetails.dietAndActivityAdvice) this.dischargeDetails.dietAndActivityAdvice = this.dischargeDetails.dietInstructions;
    if (this.dischargeDetails.dietAndActivityAdvice && !this.dischargeDetails.dietInstructions) this.dischargeDetails.dietInstructions = this.dischargeDetails.dietAndActivityAdvice;
  }
});

export default mongoose.model('TransferDischarge', transferDischargeSchema);
