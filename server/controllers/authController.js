import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import Receptionist from '../models/Receptionist.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'supersecret_hospitalbed_key';

const generateToken = (id, role, username) => {
  return jwt.sign({ id, role, username }, getJwtSecret(), {
    expiresIn: '30d',
  });
};

import { sendOtpEmail } from '../services/emailService.js';

// In-memory OTP storage: key = `${role}_${userId}`, value = { otp, expiresAt, attempts, userObj }
const otpStore = new Map();

// Helper to mask email for UI feedback (e.g., sh***ka@gmail.com)
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}*@${domain}`;
  const first = user.slice(0, 2);
  const last = user.slice(-2);
  return `${first}****${last}@${domain}`;
};

const loginHelper = async (Model, req, res, roleName) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Please provide both username/email and password' });
  }

  const cleanUser = username.trim();

  try {
    // Case-insensitive search by username, email, or role-specific ID
    let user = await Model.findOne({
      $or: [
        { username: cleanUser },
        { username: new RegExp(`^${cleanUser}$`, 'i') },
        { email: cleanUser.toLowerCase() },
        { email: new RegExp(`^${cleanUser}$`, 'i') },
        { adminId: cleanUser },
        { doctorId: cleanUser },
        { nurseId: cleanUser },
        { receptionistId: cleanUser }
      ]
    });

    // Cross-model fallback search so users can log in even if they entered their email on any portal tab
    if (!user) {
      const allModels = [Admin, Doctor, Nurse, Receptionist].filter(m => m !== Model);
      for (const FallbackModel of allModels) {
        user = await FallbackModel.findOne({
          $or: [
            { username: cleanUser },
            { username: new RegExp(`^${cleanUser}$`, 'i') },
            { email: cleanUser.toLowerCase() },
            { email: new RegExp(`^${cleanUser}$`, 'i') },
            { adminId: cleanUser },
            { doctorId: cleanUser },
            { nurseId: cleanUser },
            { receptionistId: cleanUser }
          ]
        });
        if (user) break;
      }
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials. Account not found.' });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({ message: 'Account is inactive. Contact Administrator.' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
    }

    const userRole = user.role || roleName;
    const token = generateToken(user._id, userRole, user.username);

    return res.json({
      success: true,
      message: 'Login successful!',
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: userRole,
      department: user.department || '',
      token
    });

  } catch (error) {
    console.error(`Error in ${roleName} login:`, error);
    res.status(500).json({ message: error.message || 'Server error during login' });
  }
};

/**
 * Real-time OTP Verification Endpoint
 */
export const authVerifyLoginOtp = async (req, res) => {
  const { userId, role, otp } = req.body;

  if (!userId || !role || !otp) {
    return res.status(400).json({ message: 'User ID, Role, and OTP code are required' });
  }

  const otpKey = `${role}_${userId}`;
  const record = otpStore.get(otpKey);

  if (!record) {
    return res.status(400).json({ message: 'No active OTP verification session found. Please log in again.' });
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(otpKey);
    return res.status(400).json({ message: 'Verification code has expired. Please request a new OTP.' });
  }

  if (record.attempts >= 5) {
    otpStore.delete(otpKey);
    return res.status(429).json({ message: 'Too many failed verification attempts. Please log in again.' });
  }

  if (record.otp.trim() !== otp.trim()) {
    record.attempts += 1;
    return res.status(400).json({ 
      message: `Invalid OTP code. Please enter the correct 6-digit code sent to your email. (${5 - record.attempts} attempts remaining)` 
    });
  }

  // Clear OTP upon success
  otpStore.delete(otpKey);

  // Fetch full user record from the appropriate collection
  let Model = Receptionist;
  if (role === 'Admin') Model = Admin;
  else if (role === 'Doctor') Model = Doctor;
  else if (role === 'Nurse') Model = Nurse;

  try {
    const user = await Model.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const token = generateToken(user._id, user.role, user.username);

    return res.json({
      success: true,
      message: 'Login verified successfully!',
      _id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      department: user.department || '',
      token
    });
  } catch (err) {
    console.error('Error completing OTP verification:', err);
    return res.status(500).json({ message: 'Server error completing verification' });
  }
};

/**
 * Resend Real-Time OTP Endpoint
 */
export const authResendLoginOtp = async (req, res) => {
  const { userId, role } = req.body;

  if (!userId || !role) {
    return res.status(400).json({ message: 'User ID and Role are required' });
  }

  let Model = Receptionist;
  if (role === 'Admin') Model = Admin;
  else if (role === 'Doctor') Model = Doctor;
  else if (role === 'Nurse') Model = Nurse;

  try {
    const user = await Model.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpKey = `${user.role}_${user._id.toString()}`;
    const expiresAt = Date.now() + 10 * 60 * 1000;

    otpStore.set(otpKey, {
      otp: otpCode,
      expiresAt,
      attempts: 0,
      userId: user._id.toString(),
      role: user.role
    });

    const emailResult = await sendOtpEmail(user.email, otpCode, user.name || user.username);
    console.log(`[AUTH-OTP] Resent OTP for ${user.email}: ${otpCode}`);

    return res.json({
      success: true,
      message: `A fresh 6-digit OTP code has been sent to ${maskEmail(user.email)}.`,
      maskedEmail: maskEmail(user.email),
      liveOtpCode: otpCode,
      previewUrl: emailResult.previewUrl
    });
  } catch (err) {
    console.error('Error resending OTP:', err);
    return res.status(500).json({ message: 'Failed to resend OTP' });
  }
};

export const authAdminLogin = (req, res) => loginHelper(Admin, req, res, 'Admin');

export const authAdminRegister = async (req, res) => {
  const { adminId, name, email, username, password } = req.body;

  if (!adminId || !name || !email || !username || !password) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanAdminId = adminId.trim().toUpperCase();

    const adminExists = await Admin.findOne({
      $or: [
        { adminId: cleanAdminId },
        { email: cleanEmail },
        { username: cleanUsername }
      ]
    });

    if (adminExists) {
      return res.status(400).json({ message: 'Admin with this ID, email, or username already exists' });
    }

    const admin = await Admin.create({
      adminId: cleanAdminId,
      name: name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      password,
    });

    if (admin) {
      res.status(201).json({
        _id: admin._id,
        name: admin.name,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        token: generateToken(admin._id, admin.role, admin.username),
      });
    } else {
      res.status(400).json({ message: 'Invalid admin data' });
    }
  } catch (error) {
    console.error('Error in Admin register:', error);
    res.status(500).json({ message: error.message || 'Server error during admin registration' });
  }
};

export const authDoctorLogin = (req, res) => loginHelper(Doctor, req, res, 'Doctor');
export const authNurseLogin = (req, res) => loginHelper(Nurse, req, res, 'Nurse');
export const authReceptionistLogin = (req, res) => loginHelper(Receptionist, req, res, 'Receptionist');

export const authResetPassword = async (req, res) => {
  const { role, identifier, newPassword } = req.body;

  if (!identifier || !newPassword) {
    return res.status(400).json({ message: 'Please provide your Staff ID / Email / Username and a new password' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  const cleanIdent = identifier.trim();

  const queryCriteria = [
    { email: cleanIdent.toLowerCase() },
    { username: cleanIdent },
    { username: new RegExp(`^${cleanIdent}$`, 'i') },
    { adminId: cleanIdent },
    { doctorId: cleanIdent },
    { nurseId: cleanIdent },
    { receptionistId: cleanIdent }
  ];

  try {
    let user = null;

    if (role === 'Admin') {
      user = await Admin.findOne({ $or: queryCriteria });
    } else if (role === 'Doctor') {
      user = await Doctor.findOne({ $or: queryCriteria });
    } else if (role === 'Nurse') {
      user = await Nurse.findOne({ $or: queryCriteria });
    } else if (role === 'Receptionist') {
      user = await Receptionist.findOne({ $or: queryCriteria });
    } else {
      user = await Receptionist.findOne({ $or: queryCriteria });
      if (!user) user = await Doctor.findOne({ $or: queryCriteria });
      if (!user) user = await Nurse.findOne({ $or: queryCriteria });
      if (!user) user = await Admin.findOne({ $or: queryCriteria });
    }

    if (!user) {
      return res.status(404).json({ message: 'No account found with the provided credentials' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      role: user.role,
      message: `Password reset successfully for ${user.name || user.role}. You can now log in with your new password.`
    });
  } catch (error) {
    console.error('Error in Reset Password:', error);
    res.status(500).json({ message: error.message || 'Server error resetting password' });
  }
};

export const authRegister = async (req, res) => {
  try {
    const { role = 'Receptionist', name, email, password, username, customId, department, assignedWard } = req.body;

    if (role === 'Admin') {
      return res.status(403).json({ message: 'Admin accounts cannot be registered publicly. They must be provisioned by an existing Admin within the Admin Portal.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email address is required' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username && username.trim().toLowerCase()) || cleanEmail.split('@')[0].toLowerCase();
    const randomSuffix = Math.floor(100 + Math.random() * 900);

    // Cross-collection uniqueness check for email
    const [existingEmailInAdmin, existingEmailInDoc, existingEmailInNurse, existingEmailInRecep] = await Promise.all([
      Admin.findOne({ email: cleanEmail }),
      Doctor.findOne({ email: cleanEmail }),
      Nurse.findOne({ email: cleanEmail }),
      Receptionist.findOne({ email: cleanEmail })
    ]);

    if (existingEmailInAdmin || existingEmailInDoc || existingEmailInNurse || existingEmailInRecep) {
      return res.status(400).json({ message: `An account with email "${cleanEmail}" is already registered. Please log in instead.` });
    }

    // Uniqueness check for username
    const [existingUserInAdmin, existingUserInDoc, existingUserInNurse, existingUserInRecep] = await Promise.all([
      Admin.findOne({ username: cleanUsername }),
      Doctor.findOne({ username: cleanUsername }),
      Nurse.findOne({ username: cleanUsername }),
      Receptionist.findOne({ username: cleanUsername })
    ]);

    if (existingUserInAdmin || existingUserInDoc || existingUserInNurse || existingUserInRecep) {
      return res.status(400).json({ message: `The username "${cleanUsername}" is already taken. Please choose another username.` });
    }

    let createdUser = null;

    if (role === 'Doctor') {
      let doctorId = (customId && customId.trim().toUpperCase()) || `DOC-${randomSuffix}`;
      // Verify doctorId uniqueness
      while (await Doctor.findOne({ doctorId })) {
        doctorId = `DOC-${Math.floor(100 + Math.random() * 900)}`;
      }

      createdUser = await Doctor.create({
        doctorId,
        name: cleanName.startsWith('Dr.') ? cleanName : `Dr. ${cleanName}`,
        email: cleanEmail,
        username: cleanUsername,
        password,
        department: department || 'General Medicine',
        status: 'Active'
      });
    } else if (role === 'Nurse') {
      let nurseId = (customId && customId.trim().toUpperCase()) || `NUR-${randomSuffix}`;
      while (await Nurse.findOne({ nurseId })) {
        nurseId = `NUR-${Math.floor(100 + Math.random() * 900)}`;
      }

      createdUser = await Nurse.create({
        nurseId,
        name: cleanName,
        email: cleanEmail,
        username: cleanUsername,
        password,
        department: department || 'General Medicine',
        assignedWard: assignedWard || 'General',
        status: 'Active'
      });
    } else if (role === 'Admin') {
      let adminId = (customId && customId.trim().toUpperCase()) || `ADM-${randomSuffix}`;
      while (await Admin.findOne({ adminId })) {
        adminId = `ADM-${Math.floor(100 + Math.random() * 900)}`;
      }

      createdUser = await Admin.create({
        adminId,
        name: cleanName,
        email: cleanEmail,
        username: cleanUsername,
        password,
        status: 'Active'
      });
    } else {
      // Default: Receptionist
      let receptionistId = (customId && customId.trim().toUpperCase()) || `REC-${randomSuffix}`;
      while (await Receptionist.findOne({ receptionistId })) {
        receptionistId = `REC-${Math.floor(100 + Math.random() * 900)}`;
      }

      createdUser = await Receptionist.create({
        receptionistId,
        name: cleanName,
        email: cleanEmail,
        username: cleanUsername,
        password,
        phone: '+91 98765 11223',
        department: department || 'Central Reception & OPD',
        deskLocation: 'Ground Floor, Front Desk A',
        shiftHours: '08:00 AM - 04:00 PM',
        status: 'Active'
      });
    }

    const token = generateToken(createdUser._id, createdUser.role, createdUser.username);

    res.status(201).json({
      success: true,
      _id: createdUser._id,
      name: createdUser.name,
      username: createdUser.username,
      email: createdUser.email,
      role: createdUser.role,
      token,
      message: `Account created successfully for ${createdUser.name} (${createdUser.role})!`
    });
  } catch (error) {
    console.error('Registration server error:', error);
    
    // Catch MongoDB duplicate key error (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'credential';
      const val = error.keyValue ? error.keyValue[field] : '';
      return res.status(400).json({
        message: `An account with this ${field} ("${val}") already exists. Please use a unique ${field} or log in.`
      });
    }

    res.status(500).json({ message: error.message || 'Server error during registration' });
  }
};
