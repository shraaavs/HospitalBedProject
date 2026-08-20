import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full flex flex-col auth-bg relative overflow-hidden">
      {/* Background Atmospheric Elements */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-primary-fixed blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30vw] h-[30vw] rounded-full bg-secondary-fixed blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full py-md px-margin-mobile md:px-lg lg:px-xl flex items-center justify-between glass-effect border-b border-outline-variant/30 animate-fade-in">
        <div className="flex items-center gap-xs">
          <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>health_metrics</span>
          <span className="text-headline-md font-headline-md font-bold text-primary tracking-tight">MediFlow</span>
        </div>
        <nav className="hidden md:flex gap-lg">
          <a href="#features" className="text-body-md font-body-md text-on-surface-variant hover:text-primary transition-colors font-medium">Features</a>
          <a href="#about" className="text-body-md font-body-md text-on-surface-variant hover:text-primary transition-colors font-medium">About</a>
          <a href="#contact" className="text-body-md font-body-md text-on-surface-variant hover:text-primary transition-colors font-medium">Contact</a>
        </nav>
        <div className="flex gap-sm">
          <button 
            onClick={() => navigate('/login')}
            className="px-lg py-sm text-primary font-label-md text-label-md border border-primary rounded-lg hover:bg-primary/5 transition-colors cursor-pointer"
          >
            Login
          </button>
          <button 
            onClick={() => navigate('/register')}
            className="px-lg py-sm bg-primary text-on-primary font-label-md text-label-md rounded-lg shadow-sm hover:bg-primary-container hover:shadow-md transition-all cursor-pointer"
          >
            Register
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-margin-mobile md:p-xl text-center overflow-y-auto scrollbar-hide">
        <div className="max-w-[800px] mx-auto flex flex-col items-center animate-slide-up">
          <div className="inline-flex items-center gap-2 px-md py-xs rounded-full bg-primary/10 text-primary border border-primary/20 mb-lg shadow-sm">
            <span className="material-symbols-outlined text-[16px]">new_releases</span>
            <span className="text-label-md font-label-md">MediFlow Central v2.0 is now live</span>
          </div>
          
          <h1 className="text-display-lg font-display-lg font-extrabold text-on-surface tracking-tight mb-md leading-tight">
            Next-Generation <span className="text-primary">Hospital Management</span>
          </h1>
          
          <p className="text-headline-md font-headline-md text-on-surface-variant mb-xl max-w-[600px] opacity-90">
            Optimize patient care, track real-time bed availability, and streamline resource allocation with precision.
          </p>

          <div className="flex flex-col sm:flex-row gap-md w-full max-w-[400px] sm:max-w-none justify-center">
            <button 
              onClick={() => navigate('/login')}
              className="px-xl py-md bg-primary text-on-primary rounded-xl font-headline-md text-headline-md shadow-md hover:bg-primary-container hover:-translate-y-1 transition-all flex items-center justify-center gap-sm cursor-pointer"
            >
              Get Started
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="px-xl py-md bg-surface-container-lowest text-on-surface border border-outline-variant rounded-xl font-headline-md text-headline-md shadow-sm hover:bg-surface-container hover:-translate-y-1 transition-all flex items-center justify-center gap-sm cursor-pointer"
            >
              <span className="material-symbols-outlined">login</span>
              Staff Login
            </button>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div id="features" className="w-full max-w-[1100px] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-lg mt-24 mb-xl animate-fade-in animation-delay-200">
          <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-sm border border-outline-variant/30 text-left hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-md">
              <span className="material-symbols-outlined text-[24px]">bed</span>
            </div>
            <h3 className="text-headline-md font-headline-md font-bold mb-xs">Bed Management</h3>
            <p className="text-body-md font-body-md text-on-surface-variant">Real-time tracking of hospital beds and resource availability across all wards and departments.</p>
          </div>
          
          <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-sm border border-outline-variant/30 text-left hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-md">
              <span className="material-symbols-outlined text-[24px]">calendar_month</span>
            </div>
            <h3 className="text-headline-md font-headline-md font-bold mb-xs">Duty Rosters</h3>
            <p className="text-body-md font-body-md text-on-surface-variant">Automated staff scheduling and duty roster management for doctors, nurses, and support staff.</p>
          </div>

          <div className="bg-surface-container-lowest p-lg rounded-2xl shadow-sm border border-outline-variant/30 text-left hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-tertiary/10 flex items-center justify-center text-tertiary mb-md">
              <span className="material-symbols-outlined text-[24px]">analytics</span>
            </div>
            <h3 className="text-headline-md font-headline-md font-bold mb-xs">System Analytics</h3>
            <p className="text-body-md font-body-md text-on-surface-variant">Comprehensive reports and data visualizations for hospital operations and patient flow.</p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 w-full py-lg border-t border-outline-variant/30 text-center glass-effect">
        <p className="text-label-md font-label-md text-on-surface-variant">
          &copy; {new Date().getFullYear()} MediFlow Systems. HIPAA Compliant & Secure.
        </p>
      </footer>
    </div>
  );
}
