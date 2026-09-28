import express from 'express';
import HospitalSetting from '../models/HospitalSetting.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper to get or initialize default hospital configuration
const getOrCreateSettings = async () => {
  let settings = await HospitalSetting.findOne({ key: 'global_hospital_config' });
  if (!settings) {
    settings = new HospitalSetting({
      key: 'global_hospital_config',
      hospitalName: 'MediFlow Multi-Specialty Hospital',
      facilityCode: 'HOSP-IN-9082',
      tagline: 'NABH & JCI Accredited Tertiary Care Center',
      departments: [
        { name: 'Cardiology', code: 'CARD', headOfDepartment: 'Dr. Priya Sharma', description: 'Comprehensive cardiovascular care & cath lab', isActive: true },
        { name: 'Neurology', code: 'NEUR', headOfDepartment: 'Dr. Sanjay Gupta', description: 'Neuro-critical care, stroke unit & neurosurgery', isActive: true },
        { name: 'Orthopedics', code: 'ORTH', headOfDepartment: 'Dr. Vikram Sethi', description: 'Joint replacement, trauma & arthroscopy', isActive: true },
        { name: 'Pediatrics', code: 'PED', headOfDepartment: 'Dr. Ananya Roy', description: 'Neonatal & pediatric inpatient care', isActive: true },
        { name: 'General Medicine', code: 'GEN', headOfDepartment: 'Dr. Ramesh Kumar', description: 'Internal medicine and chronic disease management', isActive: true },
        { name: 'Emergency & Trauma', code: 'EMG', headOfDepartment: 'Dr. Priya Sharma', description: '24/7 Level 1 Resuscitation & Acute Care', isActive: true },
        { name: 'Pulmonology', code: 'PULM', headOfDepartment: 'Dr. Meera Nair', description: 'Respiratory medicine & chest care', isActive: true },
        { name: 'Oncology', code: 'ONC', headOfDepartment: 'Dr. Rajesh Khanna', description: 'Medical & surgical oncology', isActive: true }
      ],
      wards: [
        { name: 'General Ward - East', code: 'GEN-E', floor: '1st Floor', wardType: 'General Ward', totalCapacity: 50, dailyRate: 2000, isActive: true },
        { name: 'Intensive Care Unit (ICU)', code: 'ICU-L4', floor: '4th Floor', wardType: 'ICU', totalCapacity: 25, dailyRate: 7500, isActive: true },
        { name: 'Neonatal ICU (NICU)', code: 'NICU-L3', floor: '3rd Floor', wardType: 'NICU', totalCapacity: 15, dailyRate: 6500, isActive: true },
        { name: 'Pediatric Care Unit', code: 'PED-W', floor: '2nd Floor', wardType: 'Pediatric Ward', totalCapacity: 30, dailyRate: 2500, isActive: true },
        { name: 'Emergency Observation', code: 'EMG-OBS', floor: 'Ground Floor', wardType: 'Emergency Ward', totalCapacity: 20, dailyRate: 3000, isActive: true },
        { name: 'Private Deluxe Suite', code: 'PVT-S', floor: '5th Floor', wardType: 'Private Ward', totalCapacity: 20, dailyRate: 5000, isActive: true },
        { name: 'Semi-Private Care', code: 'SPVT', floor: '3rd Floor', wardType: 'Semi-Private', totalCapacity: 35, dailyRate: 3500, isActive: true }
      ],
      bedTypes: [
        { name: 'Standard General Bed', code: 'BED-STD', description: 'Manual Fowler bed with side rails', dailyRate: 2000, isActive: true },
        { name: 'Semi-Fowler Bed', code: 'BED-SEMI', description: 'Semi-electric positioning bed', dailyRate: 2800, isActive: true },
        { name: 'ICU Motorized Bed', code: 'BED-ICU', description: 'Fully motorized critical care bed with scale', dailyRate: 7500, isActive: true },
        { name: 'Pediatric Crib', code: 'BED-PED', description: 'Child safety transparent cot', dailyRate: 2500, isActive: true },
        { name: 'Emergency Trauma Stretcher', code: 'BED-TRM', description: 'Hydraulic emergency trauma trolley', dailyRate: 3000, isActive: true },
        { name: 'Deluxe Suite Electric Bed', code: 'BED-DLX', description: 'Luxury attendant comfort motorized bed', dailyRate: 5000, isActive: true }
      ],
      resourceCategories: [
        { name: 'Ventilator', code: 'RES-VENT', dailyRentalRate: 4000, description: 'Invasive and Non-Invasive mechanical ventilation', isActive: true },
        { name: 'Oxygen Cylinder', code: 'RES-O2', dailyRentalRate: 800, description: 'Medical grade oxygen cylinder with regulator', isActive: true },
        { name: 'Cardiac Monitor', code: 'RES-MON', dailyRentalRate: 1500, description: 'Multi-parameter bedside vital monitor (ECG, SpO2, NIBP)', isActive: true },
        { name: 'Infusion Pump', code: 'RES-PUMP', dailyRentalRate: 600, description: 'Volumetric syringe and IV infusion driver', isActive: true },
        { name: 'Wheelchair', code: 'RES-WCH', dailyRentalRate: 200, description: 'Ergonomic patient transport chair', isActive: true },
        { name: 'Defibrillator', code: 'RES-DEFIB', dailyRentalRate: 2500, description: 'Biphasic AED and manual shock unit', isActive: true }
      ]
    });
    await settings.save();
  }
  return settings;
};

// GET /api/settings/hospital
// Public / Authenticated read endpoint to populate dropdowns across the application
router.get('/hospital', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ message: 'Error retrieving hospital settings', error: err.message });
  }
});

// PUT /api/settings/hospital
// Protected Admin-only update endpoint
router.put('/hospital', protect, requireRole(['Admin']), async (req, res) => {
  try {
    let settings = await HospitalSetting.findOne({ key: 'global_hospital_config' });
    if (!settings) {
      settings = new HospitalSetting({ key: 'global_hospital_config', ...req.body });
    } else {
      Object.assign(settings, req.body);
    }
    const saved = await settings.save();
    res.json({ message: 'Hospital configuration saved successfully', settings: saved });
  } catch (err) {
    console.error('Error updating hospital settings:', err);
    res.status(500).json({ message: 'Failed to update settings', error: err.message });
  }
});

// POST /api/settings/departments (Add new department)
router.post('/departments', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { name, code, headOfDepartment, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Department name is required' });

    settings.departments.push({
      name,
      code: code || name.slice(0, 4).toUpperCase(),
      headOfDepartment: headOfDepartment || '',
      description: description || '',
      isActive: true
    });

    await settings.save();
    res.status(201).json({ message: 'Department added successfully', departments: settings.departments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/settings/wards (Add new ward)
router.post('/wards', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { name, code, floor, wardType, totalCapacity, dailyRate } = req.body;
    if (!name) return res.status(400).json({ message: 'Ward name is required' });

    settings.wards.push({
      name,
      code: code || name.slice(0, 4).toUpperCase(),
      floor: floor || '1st Floor',
      wardType: wardType || 'General Ward',
      totalCapacity: Number(totalCapacity) || 20,
      dailyRate: Number(dailyRate) || 2500,
      isActive: true
    });

    await settings.save();
    res.status(201).json({ message: 'Ward created successfully', wards: settings.wards });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/settings/bed-types (Add new bed type)
router.post('/bed-types', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { name, code, description, dailyRate } = req.body;
    if (!name) return res.status(400).json({ message: 'Bed type name is required' });

    settings.bedTypes.push({
      name,
      code: code || name.slice(0, 4).toUpperCase(),
      description: description || '',
      dailyRate: Number(dailyRate) || 2500,
      isActive: true
    });

    await settings.save();
    res.status(201).json({ message: 'Bed type configured successfully', bedTypes: settings.bedTypes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/settings/resource-categories (Add new resource category)
router.post('/resource-categories', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const { name, code, dailyRentalRate, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Resource category name is required' });

    settings.resourceCategories.push({
      name,
      code: code || name.slice(0, 4).toUpperCase(),
      dailyRentalRate: Number(dailyRentalRate) || 1000,
      description: description || '',
      isActive: true
    });

    await settings.save();
    res.status(201).json({ message: 'Resource category configured successfully', resourceCategories: settings.resourceCategories });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
