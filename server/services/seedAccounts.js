import 'dotenv/config';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import Receptionist from '../models/Receptionist.js';

export const seedDefaultAccounts = async () => {
  try {
    // 1. Ensure primary Admin accounts exist with valid hashed passwords
    const adminSeeds = [
      {
        adminId: 'ADM-001',
        name: 'System Admin',
        email: 'admin@mediflow.com',
        username: 'admin',
        password: 'password123',
        role: 'Admin',
        status: 'Active'
      },
      {
        adminId: 'ADM-000',
        name: 'Hospital Admin',
        email: 'admin@hospitalbed.com',
        username: 'admin_hospital',
        password: 'admin123',
        role: 'Admin',
        status: 'Active'
      },
      {
        adminId: 'ADM-101',
        name: 'Pooja',
        email: 'pooja@hospital.com',
        username: 'pooja',
        password: 'password123',
        role: 'Admin',
        status: 'Active'
      }
    ];

    for (const seed of adminSeeds) {
      let existing = await Admin.findOne({
        $or: [
          { email: seed.email.toLowerCase() },
          { username: seed.username.toLowerCase() },
          { adminId: seed.adminId }
        ]
      });

      if (!existing) {
        await Admin.create(seed);
        console.log(`[SEED] Created Admin account: ${seed.email} (${seed.username})`);
      } else {
        // Ensure password matches the documented credentials
        const matchesCurrent = await existing.matchPassword(seed.password);
        if (!matchesCurrent) {
          existing.password = seed.password;
          existing.status = 'Active';
          await existing.save();
          console.log(`[SEED] Synchronized password for Admin: ${existing.email}`);
        }
      }
    }

    // 2. Ensure primary Doctor accounts
    const docSeeds = [
      {
        doctorId: 'DOC-001',
        name: 'Dr. Sarah Chen',
        email: 'schen@mediflow.com',
        username: 'doctor',
        password: 'password123',
        department: 'Cardiology',
        specialization: 'Interventional Cardiology & Electrophysiology',
        status: 'Active'
      },
      {
        doctorId: 'DOC-002',
        name: 'Dr. Smith',
        email: 'doctor@mediflow.com',
        username: 'drsmith',
        password: 'doctor123',
        department: 'General Medicine',
        specialization: 'Internal Medicine, Diabetes & Chronic Disease Care',
        status: 'Active'
      },
      {
        doctorId: 'DOC-003',
        name: 'Dr. Priya Sharma',
        email: 'psharma@mediflow.com',
        username: 'drpriya',
        password: 'doctor123',
        department: 'Emergency Care',
        specialization: 'Trauma Resuscitation & Acute Critical Care',
        status: 'Active'
      },
      {
        doctorId: 'DOC-004',
        name: 'Dr. Vikram Rao',
        email: 'vrao@mediflow.com',
        username: 'drvikram',
        password: 'doctor123',
        department: 'Orthopedics',
        specialization: 'Joint Replacement & Arthroscopic Trauma Surgery',
        status: 'Active'
      },
      {
        doctorId: 'DOC-005',
        name: 'Dr. Ananya Reddy',
        email: 'areddy@mediflow.com',
        username: 'drananya',
        password: 'doctor123',
        department: 'Pediatrics',
        specialization: 'Pediatric Critical Care & Child Development',
        status: 'Active'
      },
      {
        doctorId: 'DOC-006',
        name: 'Dr. Rajesh Patel',
        email: 'rpatel@mediflow.com',
        username: 'drrajesh',
        password: 'doctor123',
        department: 'Surgery',
        specialization: 'Minimally Invasive & Laparoscopic Surgery',
        status: 'Active'
      }
    ];

    for (const seed of docSeeds) {
      let existing = await Doctor.findOne({
        $or: [
          { email: seed.email.toLowerCase() },
          { username: seed.username.toLowerCase() }
        ]
      });
      if (!existing) {
        await Doctor.create(seed);
        console.log(`[SEED] Created Doctor account: ${seed.email}`);
      }
    }

    // 3. Ensure primary Nurse accounts
    const nurseSeeds = [
      {
        nurseId: 'NUR-001',
        name: 'Nurse Joy',
        email: 'joy@mediflow.com',
        username: 'nurse',
        password: 'password123',
        department: 'Cardiology',
        assignedWard: 'ICU Ward A',
        status: 'Active'
      },
      {
        nurseId: 'NUR-002',
        name: 'Nurse Joy',
        email: 'nurse@mediflow.com',
        username: 'nursejoy',
        password: 'nurse123',
        department: 'General Medicine',
        assignedWard: 'General Ward',
        status: 'Active'
      }
    ];

    for (const seed of nurseSeeds) {
      let existing = await Nurse.findOne({
        $or: [
          { email: seed.email.toLowerCase() },
          { username: seed.username.toLowerCase() }
        ]
      });
      if (!existing) {
        await Nurse.create(seed);
        console.log(`[SEED] Created Nurse account: ${seed.email}`);
      }
    }

    // 4. Ensure primary Receptionist accounts
    const recSeeds = [
      {
        receptionistId: 'REC-001',
        name: 'Emma Desk',
        email: 'emma@mediflow.com',
        username: 'receptionist',
        password: 'password123',
        department: 'Central Reception & OPD',
        status: 'Active'
      },
      {
        receptionistId: 'REC-002',
        name: 'Receptionist Pam',
        email: 'receptionist@mediflow.com',
        username: 'pam',
        password: 'receptionist123',
        department: 'Central Reception & OPD',
        status: 'Active'
      }
    ];

    for (const seed of recSeeds) {
      let existing = await Receptionist.findOne({
        $or: [
          { email: seed.email.toLowerCase() },
          { username: seed.username.toLowerCase() }
        ]
      });
      if (!existing) {
        await Receptionist.create(seed);
        console.log(`[SEED] Created Receptionist account: ${seed.email}`);
      }
    }

    console.log('[SEED] Default account provisioning check complete.');
  } catch (err) {
    console.error('[SEED] Error seeding default accounts:', err.message);
  }
};
