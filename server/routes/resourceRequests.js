import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import ResourceRequest from '../models/ResourceRequest.js';
import InventoryItem from '../models/InventoryItem.js';

const router = express.Router();

// GET all resource requests
// Accessible by Admin, Inventory Manager
router.get('/', protect, requireRole(['Inventory Manager', 'Admin']), async (req, res) => {
  try {
    const requests = await ResourceRequest.find()
      .populate('requestedBy', 'name role')
      .populate('itemRequested', 'itemName category unit')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET user's own resource requests
// Accessible by Doctor, Nurse
router.get('/my-requests', protect, requireRole(['Doctor', 'Nurse']), async (req, res) => {
  try {
    const requests = await ResourceRequest.find({ requestedBy: req.user._id })
      .populate('itemRequested', 'itemName category unit')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new resource request
// Accessible by Doctor, Nurse
router.post('/', protect, requireRole(['Doctor', 'Nurse']), async (req, res) => {
  const { itemRequested, quantity, urgency } = req.body;
  try {
    const newRequest = new ResourceRequest({
      requestedBy: req.user._id,
      itemRequested,
      quantity,
      urgency
    });
    const savedRequest = await newRequest.save();
    res.status(201).json(savedRequest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT (fulfill/update) a resource request
// Accessible by Inventory Manager, Admin
router.put('/:id', protect, requireRole(['Inventory Manager', 'Admin']), async (req, res) => {
  const { status } = req.body;
  try {
    const request = await ResourceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // If fulfilling, reduce inventory quantity
    if (status === 'Fulfilled' && request.status !== 'Fulfilled') {
      const inventoryItem = await InventoryItem.findById(request.itemRequested);
      if (!inventoryItem) {
        return res.status(404).json({ message: 'Inventory item not found' });
      }
      
      if (inventoryItem.quantity < request.quantity) {
        return res.status(400).json({ message: 'Insufficient stock to fulfill request' });
      }

      inventoryItem.quantity -= request.quantity;
      await inventoryItem.save();
      request.fulfilledBy = req.user._id;
    }

    request.status = status;
    await request.save();

    res.json(request);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;
