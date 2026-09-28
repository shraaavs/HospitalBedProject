import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import {
  authAdminLogin,
  authAdminRegister,
  authDoctorLogin,
  authNurseLogin,
  authReceptionistLogin,
  authResetPassword,
  authRegister,
  authVerifyLoginOtp,
  authResendLoginOtp
} from '../controllers/authController.js';

const router = express.Router();

// 2FA OTP Authentication Routes
router.post('/verify-otp', authVerifyLoginOtp);
router.post('/resend-otp', authResendLoginOtp);

// Admin Authentication (Admin Registration is restricted to logged-in Admins only)
router.post('/admin/login', authAdminLogin);
router.post('/admin/register', protect, requireRole(['Admin']), authAdminRegister);

// Doctor Authentication
router.post('/doctor/login', authDoctorLogin);
router.post('/doctor/register', authRegister);

// Nurse Authentication
router.post('/nurse/login', authNurseLogin);
router.post('/nurse/register', authRegister);

// Receptionist Authentication
router.post('/receptionist/login', authReceptionistLogin);
router.post('/receptionist/register', authRegister);

// Universal Auth Routes
router.post('/login', authAdminLogin); // fallback or universal
router.post('/register', authRegister);
router.post('/reset-password', authResetPassword);
router.post('/forgot-password', authResetPassword);

export default router;
