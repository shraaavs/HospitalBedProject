import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';
import User from '../models/User.js';

const router = express.Router();

// @route   GET /api/search
// @desc    Global search across patients, beds, and staff
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json({ patients: [], beds: [], staff: [] });
    }

    const searchRegex = new RegExp(query, 'i');

    const [patients, beds, staff] = await Promise.all([
      Patient.find({
        $or: [
          { fullName: searchRegex },
          { patientId: searchRegex }
        ]
      }).limit(5),
      Bed.find({
        $or: [
          { bedNumber: searchRegex },
          { patientName: searchRegex }
        ]
      }).limit(5),
      User.find({
        $or: [
          { name: searchRegex },
          { role: searchRegex },
          { email: searchRegex }
        ]
      }).select('-password').limit(5)
    ]);

    res.json({ patients, beds, staff });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

export default router;
