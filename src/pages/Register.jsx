import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'Nurse',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [focusField, setFocusField] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role
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
        alert('Registration successful!');
        navigate('/login');
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert('Network error. Please try again later.');
    }
  };

  return (
    <div className="auth-bg min-h-screen w-full flex items-center justify-center p-margin-mobile md:p-0 overflow-hidden relative">
      {/* Background Atmospheric Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary-fixed blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-secondary-fixed blur-[100px]"></div>
      </div>
      
      <main className="relative z-10 w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 shadow-2xl rounded-xl overflow-hidden bg-surface-container-lowest border border-outline-variant/30 m-4 animate-slide-up">
        {/* Left Section: Visual Branding & Context (Desktop Only) */}
        <section className="hidden lg:flex relative flex-col justify-end p-xl overflow-hidden min-h-[600px]">
          {/* Background Image with Overlay */}
          <div className="absolute inset-0 z-0">
            <div 
              className="bg-cover bg-center w-full h-full transform scale-105 hover:scale-100 transition-transform duration-10000"
              style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBBv8s25q_jkkjsQnwruX8Em8pZUR9vMPQyijYoawmQKnl4tEV1YRgTNhMz4L3jqu65QdGEO1ObbpHWiOmKfBAWM810oWIHZEGIPn1zH1cbcn-enaQXm207aBC3eTp60D-VlDdsNryUMEE2WeVzZa7YRAWh-AvX8mH6NyYhEaoQXrRBq-sMo987jU3lFSmiR_CG9ongLl2qHUmOav_vrQV2pCnRF4aNmAhgGSfd_1F3WO40xzrqpuQfGNHiQvrZ_MS8933_aZhueojD')" }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent"></div>
          </div>
          {/* Content Overlay */}
          <div className="relative z-10 text-on-primary">
            <div className="flex items-center gap-xs mb-md">
              <span className="material-symbols-outlined text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
              <h1 className="text-headline-lg font-headline-lg font-extrabold tracking-tight">MediFlow</h1>
            </div>
            <h2 className="text-display-lg font-display-lg mb-sm">Join the Network.</h2>
            <p className="text-body-lg font-body-lg opacity-90 max-w-[28rem]">
              Create an account to access centralized bed management, duty rosters, and hospital analytics.
            </p>
          </div>
        </section>
        
        {/* Right Section: Register Form */}
        <section className="w-full bg-surface-container-lowest p-lg md:p-xl flex flex-col justify-center h-full overflow-y-auto">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-between mb-lg">
             <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
              <span className="text-headline-md font-headline-md font-bold text-primary">MediFlow</span>
             </div>
             <button onClick={() => navigate('/')} className="text-on-surface-variant p-2 rounded-full hover:bg-surface-container transition-colors">
               <span className="material-symbols-outlined">close</span>
             </button>
          </div>

          <div className="hidden lg:flex justify-end mb-4">
             <button onClick={() => navigate('/')} className="text-on-surface-variant p-2 rounded-full hover:bg-surface-container transition-colors flex items-center gap-1 text-label-md font-label-md">
               <span className="material-symbols-outlined text-[18px]">close</span>
               Cancel
             </button>
          </div>

          <div className="max-w-[28rem] mx-auto w-full">
            <header className="mb-lg">
              <h2 className="text-headline-lg font-headline-lg text-on-surface mb-xs">Register New Staff</h2>
              <p className="text-body-md font-body-md text-on-surface-variant">Please fill in your details to create an account.</p>
            </header>
            
            <form className="space-y-md" onSubmit={handleSubmit}>
              {/* Full Name Field */}
              <div className="space-y-xs">
                <label 
                  className={`text-label-md font-label-md flex items-center gap-base transition-colors ${focusField === 'fullName' ? 'text-primary' : 'text-on-surface-variant'}`}
                  htmlFor="fullName"
                >
                  <span className="material-symbols-outlined text-[16px]">badge</span>
                  Full Name
                </label>
                <input 
                  className="w-full h-12 px-md bg-surface-container-low border border-outline-variant rounded-lg text-body-md font-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                  id="fullName" 
                  name="fullName" 
                  placeholder="e.g. Dr. Sarah Jenkins" 
                  type="text"
                  value={formData.fullName}
                  onChange={handleChange}
                  onFocus={() => setFocusField('fullName')}
                  onBlur={() => setFocusField('')}
                  required
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-xs">
                <label 
                  className={`text-label-md font-label-md flex items-center gap-base transition-colors ${focusField === 'role' ? 'text-primary' : 'text-on-surface-variant'}`}
                  htmlFor="role"
                >
                  <span className="material-symbols-outlined text-[16px]">work</span>
                  Role
                </label>
                <select 
                  className="w-full h-12 px-md bg-surface-container-low border border-outline-variant rounded-lg text-body-md font-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none appearance-none" 
                  id="role" 
                  name="role" 
                  value={formData.role}
                  onChange={handleChange}
                  onFocus={() => setFocusField('role')}
                  onBlur={() => setFocusField('')}
                  required
                >
                  <option value="Doctor">Doctor</option>
                  <option value="Nurse">Nurse</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>

              {/* Email Field */}
              <div className="space-y-xs">
                <label 
                  className={`text-label-md font-label-md flex items-center gap-base transition-colors ${focusField === 'email' ? 'text-primary' : 'text-on-surface-variant'}`}
                  htmlFor="email"
                >
                  <span className="material-symbols-outlined text-[16px]">email</span>
                  Email Address
                </label>
                <input 
                  className="w-full h-12 px-md bg-surface-container-low border border-outline-variant rounded-lg text-body-md font-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                  id="email" 
                  name="email" 
                  placeholder="name@mediflow.com" 
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  onFocus={() => setFocusField('email')}
                  onBlur={() => setFocusField('')}
                  required
                />
              </div>
              
              {/* Password Field */}
              <div className="space-y-xs">
                <label 
                  className={`text-label-md font-label-md flex items-center gap-base transition-colors ${focusField === 'password' ? 'text-primary' : 'text-on-surface-variant'}`}
                  htmlFor="password"
                >
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Password
                </label>
                <div className="relative">
                  <input 
                    className="w-full h-12 px-md pr-12 bg-surface-container-low border border-outline-variant rounded-lg text-body-md font-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setFocusField('password')}
                    onBlur={() => setFocusField('')}
                    required
                  />
                  <button 
                    className="absolute right-md top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary" 
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-xs">
                <label 
                  className={`text-label-md font-label-md flex items-center gap-base transition-colors ${focusField === 'confirmPassword' ? 'text-primary' : 'text-on-surface-variant'}`}
                  htmlFor="confirmPassword"
                >
                  <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                  Confirm Password
                </label>
                <input 
                  className="w-full h-12 px-md bg-surface-container-low border border-outline-variant rounded-lg text-body-md font-body-md focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none" 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  placeholder="••••••••" 
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  onFocus={() => setFocusField('confirmPassword')}
                  onBlur={() => setFocusField('')}
                  required
                />
              </div>
              
              {/* Register Button */}
              <button 
                className="w-full h-14 mt-lg bg-primary text-on-primary rounded-xl font-headline-md text-headline-md shadow-sm hover:bg-primary-container hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-sm cursor-pointer" 
                type="submit"
              >
                <span className="material-symbols-outlined">person_add</span>
                Create Account
              </button>
            </form>
            
            <footer className="mt-xl pt-lg border-t border-outline-variant/30 text-center">
              <p className="text-body-md font-body-md text-on-surface-variant">
                Already have an account? {' '}
                <button className="text-primary font-bold hover:underline cursor-pointer" onClick={() => navigate('/login')}>Sign in here</button>
              </p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
