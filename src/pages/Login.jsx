import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function Login() {
  const navigate = useNavigate();
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [focusStaff, setFocusStaff] = useState(false);
  const [focusPassword, setFocusPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  useEffect(() => {
    const main = document.querySelector('main');
    if (main) {
      console.log('MAIN_OUTER_HTML:', main.outerHTML);
    }
  }, []);

  const handleLoginSuccess = (data) => {
    const role = data.role || data.user?.role || 'Admin';
    const token = data.token;
    const name = data.name || data.user?.name;
    const email = data.email || data.user?.email;

    localStorage.setItem('userToken', token);
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', role);
    if (email) localStorage.setItem('userEmail', email);
    if (name) localStorage.setItem('userName', name);

    Swal.fire({
      icon: 'success',
      title: 'Login Successful',
      text: `Welcome back, ${name || role}!`,
      timer: 1500,
      showConfirmButton: false,
    }).then(() => {
      if (role === 'Admin') {
        navigate('/dashboard');
      } else if (role === 'Nurse') {
        navigate('/dashboard');
      } else if (role === 'Doctor') {
        navigate('/dashboard');
      } else if (role === 'Receptionist') {
        navigate('/receptionist/dashboard');
      } else {
        navigate('/dashboard');
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: staffId,
          password: password,
          role: selectedRole || undefined
        })
      });
      
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error("Server returned non-JSON response. The backend might be down.");
      }
      
      if (response.ok) {
        handleLoginSuccess(data);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: data.message || 'Invalid credentials'
        });
      }
    } catch (err) {
      console.error('Login error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Network Error',
        text: 'Failed to connect to the backend server. Please check if the server is running.'
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 overflow-hidden relative">
      {/* Full-screen Hospital Bed Background Image with Gradient Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="bg-cover bg-center w-full h-full transform scale-105 transition-transform duration-1000"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2000&q=80')" 
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-primary/65 to-slate-900/85 backdrop-blur-[4px]"></div>
      </div>
      
      {/* Header: MediFlow Branding */}
      <header className="absolute top-0 left-0 w-full p-6 lg:p-8 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white drop-shadow-md">MediFlow</h1>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="text-xs font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Home
        </button>
      </header>
      
      <main className="relative z-10 w-full max-w-[480px] animate-slide-up mt-12 lg:mt-6">
        {/* Glassmorphism Login Form */}
        <section className="w-full bg-white/95 dark:bg-surface-container-lowest/95 backdrop-blur-2xl p-6 md:p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] rounded-3xl border border-white/40 dark:border-white/10">
          <div className="w-full">
            <header className="mb-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center mb-3 shadow-lg shadow-primary/30 ring-4 ring-primary/10">
                <span className="material-symbols-outlined text-[28px]">lock_person</span>
              </div>
              <h2 className="text-2xl font-bold text-on-surface tracking-tight">Staff Portal Login</h2>
              <p className="text-xs font-medium text-on-surface-variant mt-1">Select your department role or enter staff credentials</p>
            </header>

            {/* Role Quick Select Options */}
            <div className="mb-4">
              <div className="flex flex-wrap justify-center gap-3">
                {['Doctor', 'Nurse', 'Receptionist', 'Admin', 'Inventory'].map((role) => {
                  const icons = {
                    Doctor: 'medical_services',
                    Nurse: 'clinical_notes',
                    Receptionist: 'desk',
                    Admin: 'admin_panel_settings',
                    Inventory: 'inventory_2'
                  };
                  return (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleRoleSelect(role)}
                      className={`flex-1 min-w-[85px] flex flex-col items-center justify-center py-3 px-2 rounded-2xl border transition-all duration-300 cursor-pointer active:scale-95 ${
                        selectedRole === role
                          ? 'border-primary bg-primary text-on-primary shadow-lg shadow-primary/30'
                          : 'border-outline-variant/50 bg-surface-container-low/50 hover:border-primary/50 hover:bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[24px] mb-1">{icons[role]}</span>
                      <span className="text-xs font-semibold">{role}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Staff ID/Email Field */}
              <div className="space-y-1.5">
                <label 
                  className={`text-sm font-semibold flex items-center gap-2 transition-colors ${focusStaff ? 'text-primary' : 'text-on-surface-variant'}`}
                  htmlFor="staff-id"
                >
                  <span className="material-symbols-outlined text-[18px]">person</span>
                  Email Address
                </label>
                <input 
                  className="w-full h-12 px-4 bg-surface-container-low border border-outline-variant/50 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                  id="staff-id" 
                  name="staff-id" 
                  placeholder="e.g. nurse@mediflow.com" 
                  type="text"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  onFocus={() => setFocusStaff(true)}
                  onBlur={() => setFocusStaff(false)}
                  required
                />
              </div>
              
              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label 
                    className={`text-sm font-semibold flex items-center gap-2 transition-colors ${focusPassword ? 'text-primary' : 'text-on-surface-variant'}`}
                    htmlFor="password"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    Password
                  </label>
                  <a className="text-sm font-medium text-primary hover:underline transition-all" href="#">Forgot password?</a>
                </div>
                <div className="relative">
                  <input 
                    className="w-full h-12 px-4 pr-12 bg-surface-container-low border border-outline-variant/50 rounded-xl text-on-surface focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusPassword(true)}
                    onBlur={() => setFocusPassword(false)}
                    required
                  />
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors p-1" 
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
              
              {/* Remember Workstation */}
              <div className="flex items-center pt-2">
                <input 
                  className="w-5 h-5 text-primary border-outline-variant/50 rounded-md focus:ring-primary bg-surface-container-low cursor-pointer transition-all" 
                  id="remember" 
                  name="remember" 
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label className="ml-3 text-sm font-medium text-on-surface-variant cursor-pointer select-none" htmlFor="remember">Remember this workstation</label>
              </div>
              
              {/* Secure Login Button */}
              <button 
                className="w-full h-14 mt-4 bg-primary text-on-primary rounded-xl font-bold text-lg shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer" 
                type="submit"
              >
                <span className="material-symbols-outlined">verified_user</span>
                Secure Login
              </button>
            </form>
            
            <footer className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
              <p className="text-sm font-medium text-on-surface-variant mb-2">
                Not yet registered in the portal? {' '}
                <button className="text-primary font-bold hover:underline cursor-pointer transition-all" onClick={() => navigate('/register')}>Register new staff</button>
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
