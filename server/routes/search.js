import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import Patient from '../models/Patient.js';
import Bed from '../models/Bed.js';

import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import Receptionist from '../models/Receptionist.js';
import Admin from '../models/Admin.js';

const router = express.Router();

// @route   GET /api/search
// @desc    Global search across patients, beds, and staff
// @access  Protected
router.get('/', protect, async (req, res) => {
  try {
    const query = req.query.q;
    if (!query || !query.trim()) {
      return res.json({ patients: [], beds: [], staff: [] });
    }

    const searchRegex = new RegExp(query.trim(), 'i');

    const [patients, beds, doctors, nurses, receptionists, admins] = await Promise.all([
      Patient.find({
        $or: [
          { fullName: searchRegex },
          { patientId: searchRegex },
          { contactNumber: searchRegex },
          { phoneNumber: searchRegex },
          { bedNumber: searchRegex },
          { 'admissionSetup.wardType': searchRegex },
          { ward: searchRegex },
          { latestDiagnosis: searchRegex },
          { 'clinicalInfo.chiefComplaint': searchRegex }
        ]
      })
        .populate('bedId')
        .limit(8)
        .lean(),
      Bed.find({
        $or: [
          { bedNumber: searchRegex },
          { patientName: searchRegex },
          { wardType: searchRegex },
          { type: searchRegex },
          { department: searchRegex }
        ]
      })
        .populate('currentPatient')
        .limit(8)
        .lean(),
      Doctor.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { department: searchRegex },
          { doctorId: searchRegex }
        ]
      }).select('name email department role doctorId').limit(4).lean(),
      Nurse.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { assignedWard: searchRegex },
          { nurseId: searchRegex }
        ]
      }).select('name email assignedWard role nurseId').limit(4).lean(),
      Receptionist.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { receptionistId: searchRegex }
        ]
      }).select('name email role receptionistId').limit(4).lean(),
      Admin.find({
        $or: [
          { name: searchRegex },
          { email: searchRegex },
          { username: searchRegex }
        ]
      }).select('name email role').limit(4).lean()
    ]);

    const staff = [
      ...doctors.map(d => ({ _id: d._id, name: d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`, role: `Doctor (${d.department || 'Medicine'})`, email: d.email })),
      ...nurses.map(n => ({ _id: n._id, name: n.name, role: `Nurse (${n.assignedWard || 'Ward'})`, email: n.email })),
      ...receptionists.map(r => ({ _id: r._id, name: r.name, role: 'Receptionist', email: r.email })),
      ...admins.map(a => ({ _id: a._id, name: a.name, role: 'Hospital Admin', email: a.email }))
    ].slice(0, 6);

    res.json({ patients, beds, staff });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

export default router;
