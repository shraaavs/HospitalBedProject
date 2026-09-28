import mongoose from 'mongoose';

const vitalLogSchema = new mongoose.Schema({
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
  wardType: {
    type: String,
    default: 'General Ward'
  },
  bedNumber: {
    type: String,
    default: 'Unassigned'
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recordedByModel',
    required: false
  },
  recordedByModel: {
    type: String,
    enum: ['Nurse', 'Doctor', 'User'],
    default: 'Nurse'
  },
  nurseName: {
    type: String,
    default: 'Staff Nurse'
  },
  temperature: {
    type: Number, // in Fahrenheit, e.g., 98.6
    required: true
  },
  bloodPressureSys: {
    type: Number, // Systolic e.g., 120
    required: true
  },
  bloodPressureDia: {
    type: Number, // Diastolic e.g., 80
    required: true
  },
  bloodPressure: {
    type: String, // e.g. "120/80"
    default: '120/80'
  },
  pulseRate: {
    type: Number, // Heart rate in bpm, e.g., 72
    required: true
  },
  oxygenSaturation: {
    type: Number, // SpO2 percentage, e.g., 98
    required: true
  },
  respiratoryRate: {
    type: Number, // Breaths per min, e.g., 16
    default: 16
  },
  bloodSugar: {
    type: Number, // mg/dL, e.g., 110
    default: null
  },
  weight: {
    type: Number, // in kg, e.g., 70
    default: null
  },
  painScore: {
    type: Number, // 0 - 10 scale (0 = No Pain, 10 = Worst Pain)
    min: 0,
    max: 10,
    default: 0
  },
  isCritical: {
    type: Boolean,
    default: false
  },
  criticalFlags: [{
    type: String // e.g. "Critical SpO2 (88%)", "High Fever (102.5°F)"
  }],
  warningFlags: [{
    type: String
  }],
  notes: {
    type: String,
    default: ''
  },
  recordedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Pre-save evaluate critical and warning values based on hospital clinical thresholds
vitalLogSchema.pre('save', function () {
  const critical = [];
  const warnings = [];

  // 1. Oxygen Saturation (SpO2)
  if (this.oxygenSaturation < 90) {
    critical.push(`Critical SpO₂ (${this.oxygenSaturation}%) < 90%`);
  } else if (this.oxygenSaturation < 95) {
    warnings.push(`Low SpO₂ (${this.oxygenSaturation}%)`);
  }

  // 2. Heart Rate / Pulse (bpm)
  if (this.pulseRate > 120) {
    critical.push(`Severe Tachycardia (${this.pulseRate} bpm) > 120`);
  } else if (this.pulseRate < 50) {
    critical.push(`Severe Bradycardia (${this.pulseRate} bpm) < 50`);
  } else if (this.pulseRate > 100) {
    warnings.push(`Elevated Heart Rate (${this.pulseRate} bpm)`);
  } else if (this.pulseRate < 60) {
    warnings.push(`Mild Bradycardia (${this.pulseRate} bpm)`);
  }

  // 3. Blood Pressure (Systolic / Diastolic)
  if (this.bloodPressureSys >= 160 || this.bloodPressureSys < 90) {
    critical.push(`Critical Systolic BP (${this.bloodPressureSys} mmHg)`);
  } else if (this.bloodPressureSys >= 140) {
    warnings.push(`Stage 2 High Systolic BP (${this.bloodPressureSys} mmHg)`);
  }

  if (this.bloodPressureDia >= 100 || this.bloodPressureDia < 60) {
    critical.push(`Critical Diastolic BP (${this.bloodPressureDia} mmHg)`);
  } else if (this.bloodPressureDia >= 90) {
    warnings.push(`Elevated Diastolic BP (${this.bloodPressureDia} mmHg)`);
  }

  // 4. Temperature (°F)
  if (this.temperature >= 102.0) {
    critical.push(`High Fever (${this.temperature}°F)`);
  } else if (this.temperature <= 95.0) {
    critical.push(`Hypothermia (${this.temperature}°F)`);
  } else if (this.temperature > 100.4) {
    warnings.push(`Low-grade Fever (${this.temperature}°F)`);
  }

  // 5. Respiratory Rate (breaths/min)
  if (this.respiratoryRate > 28 || this.respiratoryRate < 10) {
    critical.push(`Critical Resp Rate (${this.respiratoryRate}/min)`);
  } else if (this.respiratoryRate > 22) {
    warnings.push(`Tachypnea (${this.respiratoryRate}/min)`);
  }

  // 6. Blood Sugar (mg/dL) if recorded
  if (this.bloodSugar !== null && this.bloodSugar !== undefined) {
    if (this.bloodSugar > 250 || this.bloodSugar < 60) {
      critical.push(`Critical Blood Sugar (${this.bloodSugar} mg/dL)`);
    } else if (this.bloodSugar > 180 || this.bloodSugar < 70) {
      warnings.push(`Abnormal Blood Sugar (${this.bloodSugar} mg/dL)`);
    }
  }

  // 7. Pain Score (0-10)
  if (this.painScore >= 8) {
    critical.push(`Severe Pain Score (${this.painScore}/10)`);
  } else if (this.painScore >= 5) {
    warnings.push(`Moderate Pain Score (${this.painScore}/10)`);
  }

  this.criticalFlags = critical;
  this.warningFlags = warnings;
  this.isCritical = critical.length > 0;

  if (!this.bloodPressure) {
    this.bloodPressure = `${this.bloodPressureSys}/${this.bloodPressureDia}`;
  }
});

export default mongoose.model('VitalLog', vitalLogSchema);
