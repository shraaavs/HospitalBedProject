import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

export default function ReceptionistLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data } = await axios.post('/api/auth/receptionist/login', { username, password });
      handleLoginSuccess(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials or server error.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (data) => {
    localStorage.setItem('userToken', data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('userRole', data.role);
    localStorage.setItem('userName', data.name);
    if (data.email) localStorage.setItem('userEmail', data.email);
    
    // Receptionist goes to Receptionist Dashboard
    navigate('/receptionist/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
      {/* Hospital Bed Background with Atmospheric Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="bg-cover bg-center w-full h-full transform scale-105 transition-transform duration-1000"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=80')" 
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-cyan-900/60 to-slate-900/80 backdrop-blur-[4px]"></div>
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

      {/* Main Glassmorphic Login Card */}
      <div className="relative z-10 w-full max-w-[440px] bg-white/95 dark:bg-surface-container-lowest/95 backdrop-blur-2xl p-8 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] border border-white/40 dark:border-white/10 animate-slide-up">
        
        {/* Card Header */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-500 text-white flex items-center justify-center mb-3 shadow-lg shadow-cyan-600/30 ring-4 ring-cyan-500/10">
            <span className="material-symbols-outlined text-[32px]">support_agent</span>
          </div>
          <h1 className="text-2xl font-bold text-on-surface tracking-tight">Receptionist Login</h1>
          <p className="text-sm font-medium text-on-surface-variant mt-1">
            Front desk, patient intake & appointment bookings
          </p>
        </div>

        {/* Quick Role Switcher */}
        <div className="mb-5 p-1 bg-surface-container-low rounded-xl border border-outline-variant/40 flex items-center justify-between text-xs font-bold">
          <button
            type="button"
            onClick={() => navigate('/admin/login')}
            className="flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant hover:text-indigo-700 hover:bg-surface-container text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
            Admin
          </button>
          <button
            type="button"
            onClick={() => navigate('/doctor/login')}
            className="flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">stethoscope</span>
            Doctor
          </button>
          <button
            type="button"
            onClick={() => navigate('/nurse/login')}
            className="flex-1 py-1.5 px-2 rounded-lg text-on-surface-variant hover:text-secondary hover:bg-surface-container text-center transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">medical_services</span>
            Nurse
          </button>
          <span className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-600 text-white text-center shadow-xs flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-sm">support_agent</span>
            Reception
          </span>
        </div>

        {error && (
          <div className="bg-error-container/90 text-on-error-container p-3.5 rounded-xl mb-5 flex items-center gap-2.5 border border-error/20 text-sm animate-fade-in">
            <span className="material-symbols-outlined text-error shrink-0 text-[20px]">error</span>
            <span className="font-semibold text-xs leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">
              Receptionist ID / Email
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]">
                badge
              </span>
              <input 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full h-12 bg-surface-container-low border border-outline-variant/60 rounded-xl pl-11 pr-4 text-sm font-medium text-on-surface focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/15 transition-all outline-none"
                placeholder="e.g. reception.frontdesk@mediflow.com"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Password
              </label>
              <Link 
                to="/forgot-password?role=Receptionist" 
                className="text-xs text-cyan-600 font-bold hover:underline transition-all"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/70 text-[20px]">
                lock
              </span>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-12 bg-surface-container-low border border-outline-variant/60 rounded-xl pl-11 pr-4 text-sm font-medium text-on-surface focus:border-cyan-600 focus:ring-4 focus:ring-cyan-500/15 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 mt-2 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-600/25 hover:shadow-xl hover:shadow-cyan-600/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all flex justify-center items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">login</span>
                <span>Login to Portal</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-outline-variant/30 text-center">
          <p className="text-xs text-on-surface-variant">
            Don't have a receptionist account?{' '}
            <Link to="/register?role=Receptionist" className="text-cyan-600 font-bold hover:underline transition-all">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
