import jwt from 'jsonwebtoken';
import Admin from '../models/Admin.js';
import Doctor from '../models/Doctor.js';
import Nurse from '../models/Nurse.js';
import Receptionist from '../models/Receptionist.js';

const getJwtSecret = () => process.env.JWT_SECRET || 'supersecret_hospitalbed_key';

const getModelByRole = (role) => {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();
  switch (normalized) {
    case 'admin': return Admin;
    case 'doctor': return Doctor;
    case 'nurse': return Nurse;
    case 'receptionist': return Receptionist;
    default: return null;
  }
};

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      if (!token || token === 'null' || token === 'undefined') {
        return res.status(401).json({ message: 'Not authorized, token is missing or empty' });
      }

      // Verify token
      const decoded = jwt.verify(token, getJwtSecret());

      let Model = getModelByRole(decoded.role);
      if (Model) {
        req.user = await Model.findById(decoded.id).select('-password');
      }

      // Fallback search across models if not found by primary role
      if (!req.user) {
        req.user = await Receptionist.findById(decoded.id).select('-password');
      }
      if (!req.user) {
        req.user = await Admin.findById(decoded.id).select('-password');
      }
      if (!req.user) {
        req.user = await Doctor.findById(decoded.id).select('-password');
      }
      if (!req.user) {
        req.user = await Nurse.findById(decoded.id).select('-password');
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user account not found or session expired' });
      }

      return next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return res.status(401).json({ 
        message: error.name === 'TokenExpiredError' 
          ? 'Your session has expired. Please log in again.' 
          : 'Not authorized, token failed: ' + error.message 
      });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token provided' });
};

// Role specific verification (case-insensitive)
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const userRole = (req.user.role || '').toLowerCase();
    const allowedRoles = roles.map(r => r.toLowerCase());

    if (allowedRoles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({ message: 'Access denied: insufficient permissions for role ' + req.user.role });
    }
  };
};

