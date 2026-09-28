import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import InventoryItem from '../models/InventoryItem.js';
import Supplier from '../models/Supplier.js';

const router = express.Router();

// Helper to generate sequential unique Resource ID (e.g. EQ-1001)
async function generateNextResourceId() {
  const items = await InventoryItem.find({ resourceId: /^EQ-\d+$/ }, { resourceId: 1 }).lean();
  let maxNum = 1000;
  for (const item of items) {
    if (item.resourceId) {
      const num = parseInt(item.resourceId.replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  let nextId = `EQ-${maxNum + 1}`;
  while (await InventoryItem.exists({ resourceId: nextId })) {
    maxNum++;
    nextId = `EQ-${maxNum + 1}`;
  }
  return nextId;
}

// GET all inventory items (Live Stock Matrix from MongoDB)
// Accessible by Admin, Doctor, Nurse, Receptionist
router.get('/', protect, async (req, res) => {
  try {
    let items = await InventoryItem.find().populate('supplierId').sort({ createdAt: -1 });
    
    // Seed standard clinical assets if database collection is empty
    if (items.length === 0) {
      const defaultMedicalEquipment = [
        {
          resourceId: 'EQ-1001',
          itemName: 'Mechanical Ventilator (ICU Grade)',
          resourceType: 'Ventilator',
          category: 'Equipment',
          quantity: 40,
          availableQuantity: 18,
          allocatedQuantity: 14,
          inUseQuantity: 6,
          maintenanceQuantity: 2,
          unit: 'units',
          condition: 'Good',
          locationWard: 'ICU / Critical Care Store',
          supplierName: 'RespiraCare Biomedicals',
          supplierContact: '+91 98112 33441',
          lowStockThreshold: 5
        },
        {
          resourceId: 'EQ-1002',
          itemName: 'Medical Oxygen Cylinder (Type H 50L)',
          resourceType: 'Oxygen Cylinder',
          category: 'Equipment',
          quantity: 120,
          availableQuantity: 76,
          allocatedQuantity: 30,
          inUseQuantity: 14,
          maintenanceQuantity: 0,
          unit: 'cylinders',
          condition: 'New',
          locationWard: 'Central Gas Plant & Storage',
          supplierName: 'National Oxygen & Gases Ltd',
          supplierContact: '+91 98223 44552',
          lowStockThreshold: 15
        },
        {
          resourceId: 'EQ-1003',
          itemName: 'Multiparameter Bedside Cardiac Monitor',
          resourceType: 'Cardiac Monitor',
          category: 'Equipment',
          quantity: 60,
          availableQuantity: 28,
          allocatedQuantity: 22,
          inUseQuantity: 8,
          maintenanceQuantity: 2,
          unit: 'units',
          condition: 'Good',
          locationWard: 'Step Down & HDU Bay',
          supplierName: 'CardioTech Medical Systems',
          supplierContact: '+91 98334 55663',
          lowStockThreshold: 8
        },
        {
          resourceId: 'EQ-1004',
          itemName: 'Precision Infusion Syringe Pump',
          resourceType: 'Infusion Pump',
          category: 'Equipment',
          quantity: 80,
          availableQuantity: 44,
          allocatedQuantity: 26,
          inUseQuantity: 8,
          maintenanceQuantity: 2,
          unit: 'units',
          condition: 'Good',
          locationWard: 'Central Equipment Store',
          supplierName: 'MedEquip Instruments',
          supplierContact: '+91 98445 66774',
          lowStockThreshold: 10
        },
        {
          resourceId: 'EQ-1005',
          itemName: 'Heavy Duty Transport Wheelchair',
          resourceType: 'Wheelchair',
          category: 'Equipment',
          quantity: 35,
          availableQuantity: 19,
          allocatedQuantity: 12,
          inUseQuantity: 4,
          maintenanceQuantity: 0,
          unit: 'units',
          condition: 'Good',
          locationWard: 'Emergency & OPD Lobby',
          supplierName: 'Apex Healthcare Mobility',
          supplierContact: '+91 98556 77885',
          lowStockThreshold: 5
        },
        {
          resourceId: 'EQ-1006',
          itemName: 'Defibrillator & Cardiac Pacing Unit',
          resourceType: 'Defibrillator',
          category: 'Equipment',
          quantity: 25,
          availableQuantity: 16,
          allocatedQuantity: 6,
          inUseQuantity: 2,
          maintenanceQuantity: 1,
          unit: 'units',
          condition: 'Good',
          locationWard: 'Emergency Crash Cart Store',
          supplierName: 'CardioTech Medical Systems',
          supplierContact: '+91 98334 55663',
          lowStockThreshold: 3
        },
        {
          resourceId: 'EQ-1007',
          itemName: 'Hemodialysis Unit Machine',
          resourceType: 'Dialysis Machine',
          category: 'Equipment',
          quantity: 15,
          availableQuantity: 6,
          allocatedQuantity: 7,
          inUseQuantity: 2,
          maintenanceQuantity: 0,
          unit: 'units',
          condition: 'Good',
          locationWard: 'Nephrology Dialysis Wing',
          supplierName: 'RenalCare Solutions',
          supplierContact: '+91 98667 88996',
          lowStockThreshold: 2
        },
        {
          resourceId: 'EQ-1008',
          itemName: 'Portable Clinical Suction Machine',
          resourceType: 'Suction Machine',
          category: 'Equipment',
          quantity: 30,
          availableQuantity: 18,
          allocatedQuantity: 8,
          inUseQuantity: 3,
          maintenanceQuantity: 1,
          unit: 'units',
          condition: 'Good',
          locationWard: 'General Medical Ward Store',
          supplierName: 'MedEquip Instruments',
          supplierContact: '+91 98445 66774',
          lowStockThreshold: 4
        }
      ];
      await InventoryItem.insertMany(defaultMedicalEquipment);
      items = await InventoryItem.find().sort({ createdAt: -1 });
    }
    res.json(items);
  } catch (err) {
    console.error('Error fetching inventory items:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST a new equipment / resource item
// Accessible only by Hospital Admin and Inventory Manager
router.post('/', protect, requireRole(['Admin', 'Inventory Manager']), async (req, res) => {
  const {
    itemName,
    resourceType = 'Medical Equipment',
    category = 'Equipment',
    quantity = 1,
    unit = 'units',
    condition = 'New',
    purchaseDate,
    locationWard = 'Central Equipment Store',
    supplierName = '',
    supplierContact = '',
    supplierId,
    lowStockThreshold = 5
  } = req.body;

  try {
    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ message: 'Resource Name is required.' });
    }

    const qty = Math.max(1, Number(quantity) || 1);
    const lowStock = Math.max(1, Number(lowStockThreshold) || 5);
    const resourceId = await generateNextResourceId();

    const newItem = new InventoryItem({
      resourceId,
      itemName: itemName.trim(),
      resourceType,
      category,
      quantity: qty,
      availableQuantity: qty,
      allocatedQuantity: 0,
      inUseQuantity: 0,
      maintenanceQuantity: 0,
      unit: unit.trim() || 'units',
      condition,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      locationWard: locationWard.trim() || 'Central Equipment Store',
      supplierName: supplierName.trim(),
      supplierContact: supplierContact.trim(),
      supplierId: supplierId || undefined,
      lowStockThreshold: lowStock,
      status: 'In Stock'
    });

    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    console.error('Error adding equipment item:', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT update an inventory item
// Accessible only by Hospital Admin and Inventory Manager
router.put('/:id', protect, requireRole(['Admin', 'Inventory Manager']), async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Equipment item not found' });
    }

    // Update mutable fields
    if (req.body.itemName) item.itemName = req.body.itemName.trim();
    if (req.body.resourceType) item.resourceType = req.body.resourceType;
    if (req.body.category) item.category = req.body.category;
    if (req.body.unit) item.unit = req.body.unit;
    if (req.body.condition) item.condition = req.body.condition;
    if (req.body.locationWard) item.locationWard = req.body.locationWard;
    if (req.body.supplierName !== undefined) item.supplierName = req.body.supplierName;
    if (req.body.supplierContact !== undefined) item.supplierContact = req.body.supplierContact;
    if (req.body.lowStockThreshold !== undefined) item.lowStockThreshold = Number(req.body.lowStockThreshold);

    if (req.body.quantity !== undefined) {
      const newTotal = Math.max(0, Number(req.body.quantity));
      const activeUsed = (item.allocatedQuantity || 0) + (item.inUseQuantity || 0) + (item.maintenanceQuantity || 0);
      if (newTotal < activeUsed) {
        return res.status(400).json({
          message: `Total quantity cannot be less than currently committed/allocated units (${activeUsed}).`
        });
      }
      item.quantity = newTotal;
      item.availableQuantity = Math.max(0, newTotal - activeUsed);
    }

    if (req.body.maintenanceQuantity !== undefined) {
      const maint = Math.max(0, Number(req.body.maintenanceQuantity));
      const maxMaintPossible = item.quantity - (item.allocatedQuantity || 0) - (item.inUseQuantity || 0);
      if (maint > maxMaintPossible) {
        return res.status(400).json({
          message: `Maintenance quantity exceeds unallocated units (${maxMaintPossible}).`
        });
      }
      item.maintenanceQuantity = maint;
      item.availableQuantity = Math.max(0, item.quantity - (item.allocatedQuantity || 0) - (item.inUseQuantity || 0) - maint);
    }

    item.lastRestocked = Date.now();
    await item.save();

    res.json(item);
  } catch (err) {
    console.error('Error updating inventory item:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE an inventory item
// Accessible only by Hospital Admin
router.delete('/:id', protect, requireRole(['Admin']), async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ message: 'Equipment item not found' });
    }

    if ((item.allocatedQuantity || 0) > 0 || (item.inUseQuantity || 0) > 0) {
      return res.status(400).json({
        message: 'Cannot delete equipment currently allocated or in active clinical use. Release all units first.'
      });
    }

    await InventoryItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Equipment item removed from inventory' });
  } catch (err) {
    console.error('Error deleting inventory item:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
