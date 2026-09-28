import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

export default function Register({ defaultRole }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roleParam = defaultRole || searchParams.get('role');
  const validRoles = ['Receptionist', 'Doctor', 'Nurse'];
  const initialRole = validRoles.find(r => r.toLowerCase() === roleParam?.toLowerCase()) || 'Receptionist';

  const [formData, setFormData] = useState({
    role: initialRole,
    name: '',
    email: '',
    username: '',
    customId: '',
    department: 'General Medicine',
    assignedWard: 'General',
    password: '',
    confirmPassword: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (roleParam && validRoles.some(r => r.toLowerCase() === roleParam.toLowerCase())) {
      const matched = validRoles.find(r => r.toLowerCase() === roleParam.toLowerCase());
      if (matched) {
        setFormData(prev => ({ ...prev, role: matched }));
      }
    }
  }, [roleParam]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getLoginRoute = (targetRole) => {
    switch (targetRole) {
      case 'Doctor': return '/doctor/login';
      case 'Nurse': return '/nurse/login';
      case 'Receptionist': return '/receptionist/login';
      default: return '/';
    }
  };

  const getRoleIcon = (targetRole) => {
    switch (targetRole) {
      case 'Doctor': return 'stethoscope';
      case 'Nurse': return 'medical_services';
      case 'Receptionist': return 'support_agent';
      default: return 'badge';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/register', formData);

      // Save token & user details
      if (data.token) {
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('userName', data.name);
        if (data.department || formData.department) {
          localStorage.setItem('userDepartment', data.department || formData.department);
        }
      }

      setSuccess(data.message || 'Registration successful! Redirecting...');
      setTimeout(() => {
        navigate(getLoginRoute(formData.role));
      }, 1800);
    } catch (err) {
      const msg = err.response?.data?.message || (err.message === 'Network Error' ? 'Cannot connect to backend server. Please ensure backend is running.' : err.message) || 'Registration failed. Please try again.';
      setError(msg);
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

      <div className="relative z-10 w-full max-w-[480px] bg-white/95 dark:bg-surface-container-lowest/95 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/10 my-16 animate-slide-up">
        {/* Header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center mb-3 text-white shadow-lg shadow-primary/30 ring-4 ring-primary/10">
            <span className="material-symbols-outlined text-[32px]">{getRoleIcon(formData.role)}</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Staff Registration</h1>
          <p className="text-xs font-medium text-on-surface-variant mt-1">
            Create a new {formData.role} account in MediFlow
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-container-low rounded-xl mb-lg border border-outline-variant/40">
          {validRoles.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setFormData(prev => ({ ...prev, role: r }));
                setError('');
                setSuccess('');
              }}
              className={`py-2 px-1 text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                formData.role === r
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
          {/* Full Name */}
          <div>
            <label className="block text-label-md font-bold mb-xs">Full Name</label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm pl-10 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="e.g. Smitha Acharya"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                badge
              </span>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-label-md font-bold mb-xs">Email Address</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm pl-10 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="e.g. smitha@gmail.com"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                email
              </span>
            </div>
          </div>

          {/* Optional Username & Custom ID */}
          <div className="grid grid-cols-2 gap-sm">
            <div>
              <label className="block text-label-md font-bold mb-xs">
                Username <span className="text-xs font-normal text-on-surface-variant">(Optional)</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="e.g. smitha"
              />
            </div>
            <div>
              <label className="block text-label-md font-bold mb-xs">
                {formData.role} ID <span className="text-xs font-normal text-on-surface-variant">(Auto if empty)</span>
              </label>
              <input
                type="text"
                name="customId"
                value={formData.customId}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder={formData.role === 'Receptionist' ? 'REC-002' : formData.role === 'Doctor' ? 'DOC-002' : formData.role === 'Nurse' ? 'NUR-002' : 'ADM-002'}
              />
            </div>
          </div>

          {/* Role specific: Doctor Department */}
          {formData.role === 'Doctor' && (
            <div>
              <label className="block text-label-md font-bold mb-xs">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="Cardiology">Cardiology</option>
                <option value="Neurology">Neurology</option>
                <option value="Orthopedics">Orthopedics</option>
                <option value="Emergency">Emergency</option>
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
              </select>
            </div>
          )}

          {/* Role specific: Nurse Ward */}
          {formData.role === 'Nurse' && (
            <div>
              <label className="block text-label-md font-bold mb-xs">Assigned Ward</label>
              <select
                name="assignedWard"
                value={formData.assignedWard}
                onChange={handleChange}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="General">General Ward</option>
                <option value="ICU">ICU</option>
                <option value="Surgery">Surgery</option>
                <option value="Pediatrics">Pediatrics</option>
              </select>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-label-md font-bold mb-xs">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
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

          {/* Confirm Password */}
          <div>
            <label className="block text-label-md font-bold mb-xs">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-sm pl-10 pr-10 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Re-enter password"
              />
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                lock_reset
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-on-primary py-sm rounded-full font-bold hover:brightness-110 transition-all flex justify-center items-center gap-sm disabled:opacity-50 mt-lg cursor-pointer shadow-md"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">person_add</span>
                <span>Register {formData.role}</span>
              </>
            )}
          </button>
        </form>

        {/* Links */}
        <div className="mt-lg pt-md border-t border-outline-variant/30 text-center text-body-md">
          <span className="text-on-surface-variant">Already registered? </span>
          <Link
            to={getLoginRoute(formData.role)}
            className="text-primary font-bold hover:underline"
          >
            Log in to {formData.role} Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
