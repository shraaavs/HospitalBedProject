import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import Supplier from '../models/Supplier.js';
import InventoryItem from '../models/InventoryItem.js';

const router = express.Router();

// GET all suppliers
router.get('/', protect, async (req, res) => {
  try {
    let suppliers = await Supplier.find().sort({ createdAt: -1 });
    if (suppliers.length === 0) {
      const defaultSuppliers = [
        {
          supplierName: 'RespiraCare Biomedicals',
          contactPerson: 'Alex Turner (Key Account Mgr)',
          contactEmail: 'orders@respiracare.com',
          contactPhone: '+91 98112 33441',
          address: 'Plot 42, Biotech Corridor, Sector 62, Noida, UP',
          supplyCategories: ['Ventilator', 'Respiratory Support', 'ICU Equipment'],
          status: 'Active'
        },
        {
          supplierName: 'National Oxygen & Gases Ltd',
          contactPerson: 'Manoj Verma (Supply Logistics)',
          contactEmail: 'dispatch@nationaloxygen.in',
          contactPhone: '+91 98223 44552',
          address: 'Industrial Area Phase 2, Mayapuri, New Delhi',
          supplyCategories: ['Oxygen Cylinder', 'Medical Gases', 'Cryogenic Tanks'],
          status: 'Active'
        },
        {
          supplierName: 'CardioTech Medical Systems',
          contactPerson: 'Dr. Sanjay Sen (Clinical Specialist)',
          contactEmail: 'support@cardiotechmed.com',
          contactPhone: '+91 98334 55663',
          address: 'Electronic City Phase 1, Bangalore, Karnataka',
          supplyCategories: ['Cardiac Monitor', 'Defibrillator', 'ECG Systems'],
          status: 'Active'
        },
        {
          supplierName: 'MedEquip Instruments',
          contactPerson: 'Neha Sharma (Biomed Sales)',
          contactEmail: 'contact@medequip.org',
          contactPhone: '+91 98445 66774',
          address: 'MIDC Andheri East, Mumbai, Maharashtra',
          supplyCategories: ['Infusion Pump', 'Suction Machine', 'Syringe Pumps'],
          status: 'Active'
        },
        {
          supplierName: 'Apex Healthcare Mobility',
          contactPerson: 'Vikram Rajput (Logistics)',
          contactEmail: 'sales@apexmobility.in',
          contactPhone: '+91 98556 77885',
          address: 'Okhla Industrial Area Phase 3, New Delhi',
          supplyCategories: ['Wheelchair', 'Hospital Beds', 'Patient Transport'],
          status: 'Active'
        },
        {
          supplierName: 'RenalCare Solutions',
          contactPerson: 'Pooja Hegde (Dialysis Coordinator)',
          contactEmail: 'info@renalcaresolutions.com',
          contactPhone: '+91 98667 88996',
          address: 'HITEC City, Hyderabad, Telangana',
          supplyCategories: ['Dialysis Machine', 'Hemodialysis Consumables'],
          status: 'Active'
        }
      ];
      await Supplier.insertMany(defaultSuppliers);
      suppliers = await Supplier.find().sort({ createdAt: -1 });
    }
    res.json(suppliers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST new supplier (Admin only)
router.post('/', protect, requireRole(['Admin', 'Inventory Manager']), async (req, res) => {
  try {
    const { supplierName, contactPerson, contactEmail, contactPhone, address, supplyCategories, notes } = req.body;
    if (!supplierName || !supplierName.trim()) {
      return res.status(400).json({ message: 'Supplier name is required.' });
    }

    const supplier = new Supplier({
      supplierName: supplierName.trim(),
      contactPerson: (contactPerson || '').trim(),
      contactEmail: (contactEmail || '').trim(),
      contactPhone: (contactPhone || '').trim(),
      address: (address || '').trim(),
      supplyCategories: supplyCategories || ['Medical Equipment'],
      notes: (notes || '').trim()
    });

    const saved = await supplier.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update supplier
router.put('/:id', protect, requireRole(['Admin', 'Inventory Manager']), async (req, res) => {
  try {
    const updated = await Supplier.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE supplier
router.delete('/:id', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const hasItems = await InventoryItem.exists({ supplierId: req.params.id });
    if (hasItems) {
      return res.status(400).json({ message: 'Cannot delete supplier associated with existing inventory equipment.' });
    }
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Supplier removed.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
