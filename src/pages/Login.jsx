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
      const style = window.getComputedStyle(main);
      console.log('MAIN_COMPUTED_STYLE:', JSON.stringify({
        width: style.width,
        height: style.height,
        margin: style.margin,
        display: style.display
      }));
    } else {
      console.log('MAIN_NOT_FOUND');
    }
  }, []);


  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: staffId,
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
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userEmail', data.user.email);
        localStorage.setItem('userName', data.user.name);
        
        Swal.fire({
          icon: 'success',
          title: 'Login Successful',
          text: 'Welcome to MediFlow Central!',
          timer: 1500,
          showConfirmButton: false,
        }).then(() => {
          if (data.user.role === 'Admin') {
            navigate('/admin');
          } else if (data.user.role === 'Nurse') {
            navigate('/beds');
          } else if (data.user.role === 'Doctor') {
            navigate('/appointments');
          } else if (data.user.role === 'Receptionist') {
            navigate('/registration');
          } else {
            navigate('/dashboard');
          }
        });
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
      {/* Full-screen Background Image with Simple Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="bg-cover bg-center w-full h-full transform scale-105"
          style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBBv8s25q_jkkjsQnwruX8Em8pZUR9vMPQyijYoawmQKnl4tEV1YRgTNhMz4L3jqu65QdGEO1ObbpHWiOmKfBAWM810oWIHZEGIPn1zH1cbcn-enaQXm207aBC3eTp60D-VlDdsNryUMEE2WeVzZa7YRAWh-AvX8mH6NyYhEaoQXrRBq-sMo987jU3lFSmiR_CG9ongLl2qHUmOav_vrQV2pCnRF4aNmAhgGSfd_1F3WO40xzrqpuQfGNHiQvrZ_MS8933_aZhueojD')" }}
        ></div>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
      </div>
      
      {/* Header: MediFlow Branding */}
      <header className="absolute top-0 left-0 w-full p-6 lg:p-8 z-20 flex items-center justify-center lg:justify-start gap-3">
        <span className="material-symbols-outlined text-[40px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
        <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">MediFlow</h1>
      </header>
      
      <main className="relative z-10 w-full max-w-[480px] animate-slide-up mt-8 lg:mt-0">
        {/* Glassmorphism Login Form */}
        <section className="w-full bg-surface-container-lowest/95 backdrop-blur-2xl p-6 md:p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] rounded-3xl border border-white/20">
          <div className="w-full">
            <header className="mb-4 text-center">
              <h2 className="text-3xl font-bold text-on-surface mb-2">Welcome back</h2>
              <p className="text-on-surface-variant">Please enter your credentials or select a role.</p>
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
