import mongoose from 'mongoose';

const emergencyPatientSchema = new mongoose.Schema({
  emergencyId: {
    type: String,
    required: true,
    unique: true,
    index: true
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
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other'],
    required: true
  },
  attendantName: {
    type: String,
    trim: true,
    default: ''
  },
  attendantContact: {
    type: String,
    trim: true,
    default: ''
  },
  arrivalMode: {
    type: String,
    enum: ['Ambulance (108/EMS)', 'Walk-in / Private Vehicle', 'Inter-Hospital Transfer', 'Police Escort', 'Other'],
    default: 'Ambulance (108/EMS)'
  },
  arrivalTime: {
    type: Date,
    default: Date.now
  },
  arrivalNotes: {
    type: String,
    trim: true,
    default: ''
  },
  triagePriority: {
    type: String,
    enum: [
      'Red - Immediate / Resuscitation',
      'Orange - Very Urgent',
      'Yellow - Urgent',
      'Green - Standard',
      'Level 1 - Resuscitation',
      'Level 2 - Emergent',
      'Level 3 - Urgent',
      'Level 4 - Less Urgent'
    ],
    default: 'Red - Immediate / Resuscitation',
    required: true
  },
  emergencyCode: {
    type: String,
    enum: [
      'None',
      'Code Red (Fire / Disaster)',
      'Code Blue (Cardiac / Respiratory Arrest)',
      'Code Trauma (Major Multiple Trauma / MVA)',
      'Code Stroke (Acute Neuro / Stroke Protocol)',
      'Code STEMI (Acute Myocardial Infarction)',
      'Code Sepsis (Severe Sepsis / Septic Shock)',
      'Code Yellow (Hospital Evacuation / Disaster)',
      'Code Pink (Infant / Pediatric Emergency)',
      'Code Black (Severe Threat / Mass Casualty)',
      'Other'
    ],
    default: 'Code Trauma (Major Multiple Trauma / MVA)',
    trim: true
  },
  customEmergencyCode: {
    type: String,
    trim: true,
    default: ''
  },
  assignedDoctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  assignedDoctorName: {
    type: String,
    default: 'Dr. Priya Sharma',
    trim: true
  },
  department: {
    type: String,
    default: 'Emergency / Trauma'
  },
  assignedNurseName: {
    type: String,
    default: 'ER Staff Nurse Clara Vance'
  },
  currentLocation: {
    type: String,
    default: 'Emergency Trauma Bay 01'
  },
  allocatedBedId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bed'
  },
  allocatedBedNumber: {
    type: String,
    default: ''
  },
  allocatedWard: {
    type: String,
    default: 'Emergency'
  },
  chiefComplaint: {
    type: String,
    required: true,
    trim: true
  },
  conditionStatus: {
    type: String,
    enum: ['Critical', 'Severe', 'Unstable', 'Guarded', 'Stabilizing', 'Stable'],
    default: 'Critical'
  },
  medicalHistory: {
    allergies: { type: [String], default: [] },
    chronicConditions: { type: [String], default: [] },
    pastSurgeries: { type: [String], default: [] }
  },
  currentVitals: {
    heartRate: { type: Number, default: 110 },
    bloodPressure: { type: String, default: '140/90' },
    respiratoryRate: { type: Number, default: 22 },
    oxygenSaturation: { type: Number, default: 90 },
    temperature: { type: Number, default: 98.6 },
    bloodSugar: { type: Number, default: null },
    painScore: { type: Number, default: 7 },
    gcsScore: { type: Number, default: 14 }
  },
  vitalAlerts: {
    type: [String],
    default: []
  },
  // Doctor Emergency Clinical Assessment
  emergencyDiagnosis: {
    type: String,
    trim: true,
    default: ''
  },
  immediateTreatment: {
    type: String,
    trim: true,
    default: ''
  },
  criticalFindings: {
    type: String,
    trim: true,
    default: ''
  },
  requiredBedType: {
    type: String,
    default: 'ICU Bed'
  },
  bedRequested: {
    type: Boolean,
    default: false
  },
  bedRequestRef: {
    type: String,
    default: ''
  },
  bedRequestedAt: {
    type: Date
  },
  requiredMedicalResources: {
    type: [String],
    default: []
  },
  emergencyMedicalNotes: {
    type: String,
    trim: true,
    default: ''
  },
  treatmentInstructions: {
    type: String,
    trim: true,
    default: ''
  },
  actionsTaken: [{
    action: String,
    performedBy: String,
    timestamp: { type: Date, default: Date.now }
  }],
  requestedResources: [{
    resourceType: String,
    status: {
      type: String,
      enum: ['Requested', 'Pending', 'Approved', 'Allocated', 'Fulfilled'],
      default: 'Requested'
    },
    requestedAt: { type: Date, default: Date.now }
  }],
  disposition: {
    status: {
      type: String,
      enum: [
        'Active in ER',
        'Transferred to ICU',
        'Admitted to Ward',
        'Emergency OT',
        'Discharged Home',
        'Transferred'
      ],
      default: 'Active in ER'
    },
    recommendedAction: { type: String, default: '' },
    dischargeNotes: { type: String, default: '' },
    transferredToBed: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  }
}, { timestamps: true });

// Auto evaluate vital alerts pre-save
emergencyPatientSchema.pre('save', function () {
  const alerts = [];
  if (this.currentVitals) {
    if (this.currentVitals.oxygenSaturation < 90) alerts.push(`Critical SpO₂ (${this.currentVitals.oxygenSaturation}%) < 90%`);
    else if (this.currentVitals.oxygenSaturation < 95) alerts.push(`Low SpO₂ (${this.currentVitals.oxygenSaturation}%)`);

    if (this.currentVitals.heartRate > 120 || this.currentVitals.heartRate < 50) alerts.push(`Critical Heart Rate (${this.currentVitals.heartRate} bpm)`);
    if (this.currentVitals.respiratoryRate > 28 || this.currentVitals.respiratoryRate < 10) alerts.push(`Critical Resp Rate (${this.currentVitals.respiratoryRate}/min)`);
    if (this.currentVitals.temperature >= 102.0) alerts.push(`High Fever (${this.currentVitals.temperature}°F)`);
    if (this.currentVitals.gcsScore && this.currentVitals.gcsScore <= 8) alerts.push(`Severe Altered Sensorium (GCS ${this.currentVitals.gcsScore})`);
    if (this.currentVitals.painScore && this.currentVitals.painScore >= 8) alerts.push(`Severe Acute Pain (${this.currentVitals.painScore}/10)`);
  }
  this.vitalAlerts = alerts;
});

export default mongoose.model('EmergencyPatient', emergencyPatientSchema);
