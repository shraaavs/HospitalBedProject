import mongoose from 'mongoose';

const hospitalSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_hospital_config'
  },
  // 1. Hospital Facility Profile
  hospitalName: {
    type: String,
    default: 'MediFlow Multi-Specialty Hospital'
  },
  facilityCode: {
    type: String,
    default: 'HOSP-IN-9082'
  },
  tagline: {
    type: String,
    default: 'NABH & JCI Accredited Tertiary Care Center'
  },
  address: {
    type: String,
    default: '42 Healthcare Boulevard, Medical Enclave, New Delhi, 110029'
  },
  adminContactEmail: {
    type: String,
    default: 'admin@mediflow.health'
  },
  emergencyHelpline: {
    type: String,
    default: '+91 1800 425 9999'
  },
  ambulanceHotline: {
    type: String,
    default: '108'
  },
  currency: {
    type: String,
    default: 'INR (₹)'
  },
  taxPercentage: {
    type: Number,
    default: 5
  },

  // 2. Clinical Departments
  departments: [{
    name: { type: String, required: true },
    code: String,
    headOfDepartment: String,
    description: String,
    isActive: { type: Boolean, default: true }
  }],

  // 3. Hospital Wards & Care Units
  wards: [{
    name: { type: String, required: true },
    code: String,
    floor: String,
    wardType: { type: String, default: 'General' },
    totalCapacity: { type: Number, default: 20 },
    dailyRate: { type: Number, default: 2500 },
    isActive: { type: Boolean, default: true }
  }],

  // 4. Bed Types & Standard Daily Tariffs
  bedTypes: [{
    name: { type: String, required: true },
    code: String,
    description: String,
    dailyRate: { type: Number, default: 2500 },
    isActive: { type: Boolean, default: true }
  }],

  // 5. Medical Resource Categories
  resourceCategories: [{
    name: { type: String, required: true },
    code: String,
    dailyRentalRate: { type: Number, default: 1000 },
    description: String,
    isActive: { type: Boolean, default: true }
  }],

  // 6. Appointment & Consultation Settings
  appointmentSettings: {
    slotDurationMinutes: { type: Number, default: 15 },
    workingHoursStart: { type: String, default: '09:00' },
    workingHoursEnd: { type: String, default: '18:00' },
    allowWalkIns: { type: Boolean, default: true },
    maxDailyConsultationsPerDoctor: { type: Number, default: 40 },
    standardConsultationFee: { type: Number, default: 800 }
  },

  // 7. Notification & Operational Preferences
  notificationPreferences: {
    enableRealTimeNotifications: { type: Boolean, default: true },
    criticalVitalAlertThresholdSpO2: { type: Number, default: 90 },
    notifyOnEmergencyArrival: { type: Boolean, default: true },
    notifyOnBedShortage: { type: Boolean, default: true },
    notifyOnResourceShortage: { type: Boolean, default: true },
    requireDoctorDischargeSignoff: { type: Boolean, default: true },
    autoReleaseBedOnDischarge: { type: Boolean, default: true }
  }
}, { timestamps: true });

export default mongoose.model('HospitalSetting', hospitalSettingSchema);
