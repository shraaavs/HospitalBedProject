import express from 'express';
import NursingTask from '../models/NursingTask.js';
import Patient from '../models/Patient.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/nursing-tasks
// @desc    Get nursing tasks for the dashboard
// @access  Protected (Nurse, Doctor, Admin)
router.get('/', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    const tasks = await NursingTask.find()
      .populate('patient', 'fullName patientId status bedId')
      .populate('assignedTo', 'name role')
      .sort({ createdAt: -1 })
      .limit(20); // Limit to recent tasks for dashboard
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching nursing tasks:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// @route   PUT /api/nursing-tasks/:id/complete
// @desc    Mark a nursing task as completed
// @access  Protected (Nurse, Doctor, Admin)
router.put('/:id/complete', protect, requireRole(['Nurse', 'Doctor', 'Admin']), async (req, res) => {
  try {
    const task = await NursingTask.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    if (task.status === 'Completed') {
      return res.status(400).json({ message: 'Task is already completed' });
    }

    task.status = 'Completed';
    // optionally could add completedAt or completedBy fields if the schema supported it
    await task.save();

    res.json({ message: 'Task marked as completed', task });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Server error while completing task' });
  }
});

// @route   POST /api/nursing-tasks
// @desc    Create a new nursing task (for testing/seeding)
// @access  Protected (Doctor, Admin, Nurse)
router.post('/', protect, requireRole(['Doctor', 'Admin', 'Nurse']), async (req, res) => {
  try {
    const { patient, taskType, description } = req.body;
    const newTask = new NursingTask({
      patient,
      taskType,
      description,
      status: 'Pending',
      assignedTo: req.user._id
    });
    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

export default router;
