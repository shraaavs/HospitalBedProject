import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roleParam = searchParams.get('role');
  const validRoles = ['Receptionist', 'Doctor', 'Nurse', 'Admin'];
  const initialRole = validRoles.find(r => r.toLowerCase() === roleParam?.toLowerCase()) || 'Receptionist';

  const [role, setRole] = useState(initialRole);
  const [identifier, setIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roleParam && validRoles.some(r => r.toLowerCase() === roleParam.toLowerCase())) {
      const matched = validRoles.find(r => r.toLowerCase() === roleParam.toLowerCase());
      if (matched) setRole(matched);
    }
  }, [roleParam]);

  const getLoginRoute = (targetRole) => {
    switch (targetRole) {
      case 'Admin': return '/admin/login';
      case 'Doctor': return '/doctor/login';
      case 'Nurse': return '/nurse/login';
      case 'Receptionist': return '/receptionist/login';
      default: return '/';
    }
  };

  const getRoleIcon = (targetRole) => {
    switch (targetRole) {
      case 'Admin': return 'admin_panel_settings';
      case 'Doctor': return 'stethoscope';
      case 'Nurse': return 'medical_services';
      case 'Receptionist': return 'support_agent';
      default: return 'lock_reset';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/reset-password', {
        role,
        identifier,
        newPassword
      });

      setSuccess(data.message || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate(getLoginRoute(role));
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
      {/* Hospital Bed Background with Atmospheric Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="bg-cover bg-center w-full h-full transform scale-105"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=80')" 
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-primary/65 to-slate-900/85 backdrop-blur-[4px]"></div>
      </div>

      {/* Top Branding Navigation */}
      <header className="absolute top-0 left-0 w-full p-6 lg:p-8 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-white drop-shadow-md">MediFlow</span>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Home
        </button>
      </header>

      <div className="relative z-10 w-full max-w-[460px] bg-white/95 dark:bg-surface-container-lowest/95 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/10 my-16 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center mb-3 text-white shadow-lg shadow-primary/30 ring-4 ring-primary/10">
            <span className="material-symbols-outlined text-[32px]">{getRoleIcon(role)}</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Reset Password</h1>
          <p className="text-xs font-medium text-on-surface-variant mt-1">
            Set a new password for your {role} account
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-surface-container-low rounded-xl mb-lg border border-outline-variant/40">
          {validRoles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRole(r);
                setError('');
                setSuccess('');
              }}
              className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                role === r
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-error-container text-on-error-container p-sm rounded-lg mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined shrink-0 text-[20px]">error</span>
            <span className="text-body-sm font-semibold">{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-sm rounded-lg mb-md flex items-center gap-xs">
            <span className="material-symbols-outlined shrink-0 text-[20px] text-emerald-600">check_circle</span>
            <span className="text-body-sm font-semibold">{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-md">
          <div>
            <label className="block text-label-md font-bold mb-xs">
              {role} ID / Email / Username
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm pl-10 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder={`Enter your ${role} ID or email`}
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                account_circle
              </span>
            </div>
          </div>

          <div>
            <label className="block text-label-md font-bold mb-xs">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm pl-10 pr-10 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Minimum 6 characters"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                lock
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-label-md font-bold mb-xs">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm pl-10 pr-10 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Re-enter new password"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                lock_reset
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary py-sm rounded-full font-bold hover:brightness-110 transition-all flex justify-center items-center gap-sm disabled:opacity-50 mt-lg cursor-pointer"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">check</span>
                <span>Reset Password</span>
              </>
            )}
          </button>
        </form>

        {/* Back to Login & Register Links */}
        <div className="mt-lg pt-md border-t border-outline-variant/30 text-center text-body-md space-y-sm">
          <div>
            <span className="text-on-surface-variant">Remembered your password? </span>
            <Link
              to={getLoginRoute(role)}
              className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
            >
              Back to {role} Login
            </Link>
          </div>
          <div>
            <span className="text-on-surface-variant">Need a new account? </span>
            <Link
              to={`/register?role=${role}`}
              className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
            >
              Register new {role}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
