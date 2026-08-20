import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import InventoryItem from '../models/InventoryItem.js';

const router = express.Router();

// GET all inventory items
// Accessible by Admin, Inventory Manager, Doctor, Nurse
router.get('/', protect, async (req, res) => {
  try {
    const items = await InventoryItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new inventory item
// Accessible only by Inventory Manager and Admin
router.post('/', protect, requireRole(['Inventory Manager', 'Admin']), async (req, res) => {
  const { itemName, category, quantity, unit, lowStockThreshold } = req.body;
  try {
    const newItem = new InventoryItem({
      itemName,
      category,
      quantity,
      unit,
      lowStockThreshold
    });
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT (update) an inventory item quantity or details
// Accessible only by Inventory Manager and Admin
router.put('/:id', protect, requireRole(['Inventory Manager', 'Admin']), async (req, res) => {
  try {
    const updatedItem = await InventoryItem.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastRestocked: Date.now() },
      { new: true, runValidators: true }
    );
    if (!updatedItem) {
      return res.status(404).json({ message: 'Item not found' });
    }
    // trigger save hook for status update
    updatedItem.quantity = req.body.quantity !== undefined ? req.body.quantity : updatedItem.quantity;
    await updatedItem.save();
    
    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
