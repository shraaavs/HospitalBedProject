import mongoose from 'mongoose';

const nursingObservationSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
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
  ward: {
    type: String,
    default: 'General Ward',
    trim: true
  },
  bedNumber: {
    type: String,
    default: 'Unassigned',
    trim: true
  },
  nurseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Nurse',
    required: true
  },
  nurseName: {
    type: String,
    default: 'Staff Nurse'
  },
  shift: {
    type: String,
    enum: ['Morning Shift (07:00 AM - 03:00 PM)', 'Evening Shift (03:00 PM - 11:00 PM)', 'Night Shift (11:00 PM - 07:00 AM)'],
    default: 'Morning Shift (07:00 AM - 03:00 PM)'
  },
  // 1. General Clinical Condition
  generalCondition: {
    type: String,
    enum: ['Stable', 'Guarded', 'Critical', 'Deteriorating', 'Improving / Ambulatory', 'Fair', 'Satisfactory'],
    default: 'Stable',
    required: true
  },
  // 2. Patient Complaints / Subjective Symptoms
  patientComplaints: {
    type: String,
    default: 'No acute discomfort or complaints reported.',
    trim: true
  },
  // 3. Pain & Comfort Level
  painComfort: {
    level: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    comfortStatus: {
      type: String,
      enum: ['Comfortable / Resting', 'Comfortable', 'Mild Discomfort', 'Moderate Pain', 'Severe Acute Pain', 'Distressed'],
      default: 'Comfortable / Resting'
    },
    painLocation: {
      type: String,
      default: 'None'
    }
  },
  // 4. Consciousness / Neurological State
  consciousness: {
    type: String,
    default: 'Alert & Oriented x3'
  },
  // 5. Mobility & Activity
  mobility: {
    type: String,
    default: 'Independent Ambulatory'
  },
  // 6. Food Intake & Nutritional Status
  foodIntake: {
    dietType: {
      type: String,
      default: 'Normal Balanced Diet'
    },
    intakeAmount: {
      type: String,
      default: '100% Complete Meal'
    },
    appetite: {
      type: String,
      default: 'Normal'
    }
  },
  // 7. Fluid Intake & Output (I/O Balance)
  fluidBalance: {
    oralFluidMl: {
      type: Number,
      default: 0
    },
    ivFluidMl: {
      type: Number,
      default: 0
    },
    totalIntakeMl: {
      type: Number,
      default: 0
    },
    urineOutputMl: {
      type: Number,
      default: 0
    },
    drainOutputMl: {
      type: Number,
      default: 0
    },
    totalOutputMl: {
      type: Number,
      default: 0
    },
    catheterStatus: {
      type: String,
      default: 'None / Spontaneous Voiding'
    }
  },
  // 8. Wound & Dressing Condition
  woundCondition: {
    hasWounds: {
      type: Boolean,
      default: false
    },
    site: {
      type: String,
      default: 'N/A'
    },
    dressingStatus: {
      type: String,
      default: 'Intact / Clean & Dry'
    },
    drainageDescription: {
      type: String,
      default: 'Clean surgical margins, no signs of inflammation or infection.'
    }
  },
  // 9. Breathing & Respiratory Condition
  breathingCondition: {
    pattern: {
      type: String,
      default: 'Eupneic / Normal Unlabored'
    },
    oxygenSupport: {
      type: String,
      default: 'Room Air'
    },
    chestAuscultation: {
      type: String,
      default: 'Bilateral vesicular breath sounds, clear lung fields, no wheezes or crackles.'
    }
  },
  // 10. Nursing Assessment & Intervention Summary
  nursingAssessment: {
    type: String,
    required: true,
    trim: true
  },
  // 11. Additional Clinical Observations / Directives
  additionalObservations: {
    type: String,
    default: '',
    trim: true
  },
  // 12. Date & Time of Observation
  observationDate: {
    type: String,
    default: () => new Date().toISOString().split('T')[0]
  },
  observationTime: {
    type: String,
    default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  },
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  isCriticalAlert: {
    type: Boolean,
    default: false
  },
  criticalRemarks: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Auto-calculate total intake & output and evaluate critical alerts before save
nursingObservationSchema.pre('save', function () {
  if (this.fluidBalance) {
    this.fluidBalance.totalIntakeMl = (Number(this.fluidBalance.oralFluidMl) || 0) + (Number(this.fluidBalance.ivFluidMl) || 0);
    this.fluidBalance.totalOutputMl = (Number(this.fluidBalance.urineOutputMl) || 0) + (Number(this.fluidBalance.drainOutputMl) || 0);
  }

  const criticalIssues = [];
  if (this.generalCondition === 'Critical' || this.generalCondition === 'Deteriorating') {
    criticalIssues.push(`Patient condition flagged as ${this.generalCondition}`);
  }
  if (this.consciousness === 'Comatose / Unresponsive' || this.consciousness === 'Stuporous') {
    criticalIssues.push(`Altered neurological state: ${this.consciousness}`);
  }
  if (this.painComfort?.level >= 8) {
    criticalIssues.push(`Severe intractable pain (${this.painComfort.level}/10)`);
  }
  if (this.breathingCondition?.pattern === 'Dyspneic at Rest / Orthopnea' || this.breathingCondition?.oxygenSupport?.includes('Ventilation')) {
    criticalIssues.push(`Severe respiratory distress (${this.breathingCondition.pattern})`);
  }

  if (criticalIssues.length > 0) {
    this.isCriticalAlert = true;
    this.criticalRemarks = criticalIssues.join(' • ');
  } else {
    this.isCriticalAlert = false;
    this.criticalRemarks = '';
  }
});

export default mongoose.model('NursingObservation', nursingObservationSchema);
