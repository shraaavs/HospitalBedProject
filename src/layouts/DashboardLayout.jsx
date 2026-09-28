import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';

export default function DashboardLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Dynamic browser tab title reflecting current active module
    const currentItem = navItems.find(item => item.path === location.pathname);
    if (currentItem) {
      document.title = `${currentItem.label} | MediFlow`;
    } else if (location.pathname.includes('/my-patients')) {
      document.title = `Patients | MediFlow`;
    } else if (location.pathname.includes('/vitals')) {
      document.title = `Patient Vitals | MediFlow`;
    } else if (location.pathname.includes('/prescriptions')) {
      document.title = `Medication & Prescriptions | MediFlow`;
    } else {
      document.title = `MediFlow | Hospital Management System`;
    }

    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        if (!token) return;
        const res = await fetch('/api/notifications/unread-count', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        // silent fail on unread badge fetch
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 8000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = localStorage.getItem('userToken');
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleLogout = () => {
    const role = localStorage.getItem('userRole');
    localStorage.removeItem('userToken');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('userDepartment');
    
    if (role === 'Admin') navigate('/admin/login');
    else if (role === 'Doctor') navigate('/doctor/login');
    else if (role === 'Nurse') navigate('/nurse/login');
    else if (role === 'Receptionist') navigate('/receptionist/login');
    else navigate('/');
  };

  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');
  const userDepartment = localStorage.getItem('userDepartment') || '';

  const doctorNavItems = [
    { path: '/doctor/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { path: '/my-patients', label: 'My Patients', icon: 'person' },
    { path: '/appointments', label: 'Appointments', icon: 'calendar_today' },
    { path: '/consultations', label: 'Consultations', icon: 'stethoscope' },
    { path: '/prescriptions', label: 'Prescriptions', icon: 'pill' },
    { path: '/vitals', label: 'Patient Vitals', icon: 'ecg_heart' },
    { path: '/bed-requests', label: 'Admissions & Bed Requests', icon: 'single_bed' },
    { path: '/resource-requests', label: 'Resource Requests', icon: 'medical_services' },
    { path: '/emergency', label: 'Emergency Patients', icon: 'notifications_active' },
    { path: '/transfer-discharge', label: 'Transfer & Discharge', icon: 'sync' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications', badge: unreadCount > 0 ? unreadCount : null },
    { path: '/doctor/profile', label: 'My Profile', icon: 'person_outline' },
  ];

  const receptionistNavItems = [
    { path: '/receptionist/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { path: '/receptionist/register-patient', label: 'Patient Registration', icon: 'person_add' },
    { path: '/receptionist/search-patients', label: 'Patient Search', icon: 'person_search' },
    { path: '/receptionist/appointments', label: 'Appointments', icon: 'calendar_today' },
    { path: '/receptionist/check-in', label: 'Patient Check-In', icon: 'how_to_reg' },
    { path: '/receptionist/admissions', label: 'Admission Processing', icon: 'domain_add' },
    { path: '/receptionist/emergency', label: 'Emergency Registration', icon: 'emergency' },
    { path: '/receptionist/beds', label: 'Bed Availability', icon: 'single_bed' },
    { path: '/receptionist/doctors', label: 'Doctor Availability', icon: 'medical_services' },
    { path: '/receptionist/queue', label: 'Queue Management', icon: 'format_list_numbered' },
    { path: '/receptionist/discharge', label: 'Discharge Assistance', icon: 'sync' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications', badge: unreadCount > 0 ? unreadCount : null },
    { path: '/receptionist/profile', label: 'My Profile', icon: 'person_outline' },
  ];

  const nurseNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { path: '/my-patients', label: 'Patients', icon: 'groups' },
    { path: '/vitals', label: 'Patient Vitals', icon: 'favorite' },
    { path: '/nursing-observations', label: 'Nursing Observations', icon: 'edit_note' },
    { path: '/prescriptions', label: 'Medication & Treatment', icon: 'medication' },
    { path: '/doctor-instructions', label: 'Doctor Instructions', icon: 'assignment' },
    { path: '/beds', label: 'Bed & Patient Monitoring', icon: 'single_bed' },
    { path: '/emergency', label: 'Emergency & Critical Care', icon: 'notifications_active' },
    { path: '/resource-requests', label: 'Resource Requests', icon: 'medical_services' },
    { path: '/transfer-discharge', label: 'Patient Transfer & Discharge', icon: 'sync_alt' },
    { path: '/notifications', label: 'Notifications', icon: 'notifications', badge: unreadCount > 0 ? unreadCount : null },
    { path: '/nurse/profile', label: 'My Profile', icon: 'person_outline' },
  ];

  const adminNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
    { path: '/my-patients', label: 'Patient Registry', icon: 'groups' },
    { path: '/beds', label: 'Bed Management', icon: 'single_bed' },
    { path: '/allocation', label: 'Resource Allocation', icon: 'medical_services' },
    { path: '/appointments', label: 'Appointments & Queue', icon: 'calendar_today' },
    { path: '/roster', label: 'Staff Management', icon: 'group' },
    { path: '/emergency', label: 'Emergency Response', icon: 'notifications_active' },
    { path: '/admin/billing', label: 'Billing & Discharge', icon: 'payments' },
    { path: '/analytics', label: 'Reports & Analytics', icon: 'analytics' },
    { path: '/notifications', label: 'Notifications & Alerts', icon: 'notifications', badge: unreadCount > 0 ? unreadCount : null },
    { path: '/admin/settings', label: 'Admin Settings', icon: 'settings' },
    { path: '/admin/profile', label: 'My Profile', icon: 'person_outline' },
  ];

  const defaultNavItems = adminNavItems;

  const navItems = userRole === 'Doctor' ? doctorNavItems : userRole === 'Nurse' ? nurseNavItems : userRole === 'Receptionist' ? receptionistNavItems : adminNavItems;

  const adminAvatar = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256&h=256";
  const doctorAvatar = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256";
  const nurseAvatar = "https://images.unsplash.com/photo-1594824813590-78a7051a84f3?auto=format&fit=crop&q=80&w=256&h=256";
  const receptionistAvatar = "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=256&h=256";
  const userAvatar = userRole === 'Admin' ? adminAvatar : userRole === 'Nurse' ? nurseAvatar : userRole === 'Receptionist' ? receptionistAvatar : doctorAvatar;

  return (
    <div className="bg-[#f5f8fc] text-[#1e293b] font-body-md min-h-screen flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 w-64 bg-[#f8fbff] shadow-sm border-r border-[#e2e8f0]">
        {/* Brand Header */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066cc] flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_box</span>
          </div>
          <div className="leading-tight">
            <h1 className="text-[1.25rem] font-bold text-[#0055b3] tracking-tight">MediFlow</h1>
            <p className="text-[11px] text-[#64748b] font-medium">Hospital Management System</p>
          </div>
        </div>

        {/* User Profile Top Card */}
        <div 
          onClick={() => {
            if (userRole === 'Doctor') navigate('/doctor/profile');
            else if (userRole === 'Nurse') navigate('/nurse/profile');
            else if (userRole === 'Receptionist') navigate('/receptionist/profile');
            else navigate('/admin/profile');
          }}
          className="px-4 py-3 mx-2 my-1 rounded-xl bg-transparent hover:bg-[#eef4ff] transition-colors cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <img
              alt={userName || userRole || 'Staff'}
              className="w-11 h-11 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
              src={userAvatar}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-[#1e293b] truncate">
                {userRole === 'Doctor' && !userName?.startsWith('Dr.') ? `Dr. ${userName || 'Doctor'}` : (userName || 'Staff')}
              </p>
              <p className="text-[11px] text-[#64748b] leading-tight">{userRole || 'Staff'}</p>
              {userDepartment && userRole !== 'Receptionist' && userRole !== 'Admin' && (
                <p className="text-[10px] text-[#94a3b8] leading-tight capitalize">{userDepartment}</p>
              )}
            </div>
          </div>
          <span className="material-symbols-outlined text-[#94a3b8] text-[18px]">keyboard_arrow_right</span>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item, idx) => (
            <NavLink
              key={`${item.path}-${idx}`}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#e0edff] text-[#0066cc] font-semibold shadow-xs border-l-4 border-[#0066cc]'
                    : 'text-[#475569] hover:bg-[#edf4fe] hover:text-[#0066cc]'
                }`
              }
            >
              <div className="flex items-center gap-3 truncate">
                <span 
                  className="material-symbols-outlined text-[20px] transition-colors"
                  style={{ fontVariationSettings: item.badge ? "'FILL' 0" : undefined }}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span className="w-5 h-5 rounded-full bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Logout */}
        <div className="p-3 border-t border-[#e2e8f0]/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#64748b] hover:text-[#ef4444] hover:bg-[#fee2e2]/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="relative flex flex-col w-64 h-full bg-[#f8fbff] shadow-xl">
            {/* Header */}
            <div className="px-5 py-5 flex items-center justify-between border-b border-[#e2e8f0]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0066cc] flex items-center justify-center text-white shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_box</span>
                </div>
                <div>
                  <h1 className="text-[1.15rem] font-bold text-[#0055b3]">MediFlow</h1>
                  <p className="text-[10px] text-[#64748b]">Hospital Management System</p>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-[#64748b] p-1 rounded-lg hover:bg-[#e2e8f0]">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* User Profile */}
            <div className="px-4 py-3 mx-2 my-2 rounded-xl bg-[#eef4ff] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  alt={userName || userRole || 'Staff'}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                  src={userAvatar}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-[#1e293b] truncate">
                    {userRole === 'Doctor' && !userName?.startsWith('Dr.') ? `Dr. ${userName || 'Doctor'}` : (userName || 'Staff')}
                  </p>
                  <p className="text-[11px] text-[#64748b] leading-tight">{userRole || 'Staff'}</p>
                  {userDepartment && userRole !== 'Receptionist' && userRole !== 'Admin' && (
                    <p className="text-[10px] text-[#94a3b8] leading-tight capitalize">{userDepartment}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Nav list */}
            <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
              {navItems.map((item, idx) => (
                <NavLink
                  key={`mobile-${item.path}-${idx}`}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                      isActive
                        ? 'bg-[#e0edff] text-[#0066cc] font-semibold border-l-4 border-[#0066cc]'
                        : 'text-[#475569] hover:bg-[#edf4fe] hover:text-[#0066cc]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="w-5 h-5 rounded-full bg-[#ef4444] text-white text-[10px] font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>

            {/* Bottom Logout */}
            <div className="p-3 border-t border-[#e2e8f0]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-[#64748b] hover:text-[#ef4444] hover:bg-[#fee2e2]/40 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen w-full">
        {/* Top Navigation */}
        <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop py-sm fixed top-0 right-0 z-30 bg-surface/80 backdrop-blur-md shadow-sm border-b border-outline-variant/30 lg:w-[calc(100%-16rem)]">
          <div className="flex items-center gap-md flex-1">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-xs text-on-surface-variant hover:text-primary mr-sm rounded-full hover:bg-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!searchQuery.trim()) return;
              const q = searchQuery.trim();
              setSearchResults(null);
              navigate(`/my-patients?search=${encodeURIComponent(q)}`);
            }} className="relative w-full max-w-[28rem] hidden sm:block">
              <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">search</span>
              <input
                className="w-full bg-surface-container-low border border-transparent rounded-full pl-xl pr-md py-xs text-body-md focus:bg-surface focus:border-primary/30 focus:ring-4 focus:ring-primary/10 outline-none transition-all"
                placeholder="Search patients, beds, or staff..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <div className="absolute top-full mt-2 w-full bg-surface rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-outline-variant/30 overflow-hidden max-h-96 overflow-y-auto z-50 flex flex-col">
                  {isSearching ? (
                    <div className="p-4 text-center text-on-surface-variant text-sm flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-primary text-sm">progress_activity</span>
                      <span>Searching database...</span>
                    </div>
                  ) : searchResults ? (
                    <>
                      {searchResults.patients?.length > 0 && (
                        <div className="p-2 border-b border-outline-variant/30">
                          <h4 className="text-xs font-bold text-primary uppercase mb-2 px-2 flex items-center justify-between">
                            <span>Patients</span>
                            <span className="text-[10px] font-normal text-on-surface-variant">Click to open dossier</span>
                          </h4>
                          {searchResults.patients.map(p => (
                            <div
                              key={p._id}
                              onClick={() => {
                                const q = p.fullName || p.patientId;
                                setSearchQuery('');
                                setSearchResults(null);
                                navigate(`/my-patients?search=${encodeURIComponent(q)}&patientId=${p._id || p.patientId}`);
                              }}
                              className="px-2.5 py-2 hover:bg-teal-50/80 rounded-lg cursor-pointer flex justify-between items-center transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-600 text-sm group-hover:scale-110 transition-transform">person</span>
                                <span className="text-sm font-semibold text-slate-800 group-hover:text-teal-700">{p.fullName}</span>
                              </div>
                              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md group-hover:bg-teal-100 group-hover:text-teal-800 transition-colors">
                                {p.patientId}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults.beds?.length > 0 && (
                        <div className="p-2 border-b border-outline-variant/30">
                          <h4 className="text-xs font-bold text-primary uppercase mb-2 px-2 flex items-center justify-between">
                            <span>Beds & Wards</span>
                            <span className="text-[10px] font-normal text-on-surface-variant">Click to view</span>
                          </h4>
                          {searchResults.beds.map(b => (
                            <div
                              key={b._id}
                              onClick={() => {
                                const bedNo = b.bedNumber;
                                setSearchQuery('');
                                setSearchResults(null);
                                if (b.patientName || b.currentPatient) {
                                  navigate(`/my-patients?search=${encodeURIComponent(bedNo)}`);
                                } else {
                                  navigate(`/beds?search=${encodeURIComponent(bedNo)}`);
                                }
                              }}
                              className="px-2.5 py-2 hover:bg-blue-50/80 rounded-lg cursor-pointer flex justify-between items-center transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-600 text-sm group-hover:scale-110 transition-transform">single_bed</span>
                                <span className="text-sm font-semibold text-slate-800 group-hover:text-blue-700">Bed {b.bedNumber}</span>
                              </div>
                              <span className="text-xs text-on-surface-variant">
                                {b.wardType || b.department} • <span className={`font-semibold ${b.status === 'Available' ? 'text-emerald-600' : 'text-rose-600'}`}>{b.status}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults.staff?.length > 0 && (
                        <div className="p-2">
                          <h4 className="text-xs font-bold text-primary uppercase mb-2 px-2">Staff</h4>
                          {searchResults.staff.map(s => (
                            <div
                              key={s._id}
                              onClick={() => {
                                const sName = s.name;
                                setSearchQuery('');
                                setSearchResults(null);
                                navigate(`/roster?search=${encodeURIComponent(sName)}`);
                              }}
                              className="px-2.5 py-2 hover:bg-indigo-50/80 rounded-lg cursor-pointer flex justify-between items-center transition-colors group"
                            >
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-indigo-600 text-sm group-hover:scale-110 transition-transform">badge</span>
                                <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700">{s.name}</span>
                              </div>
                              <span className="text-xs text-on-surface-variant">{s.role}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!searchResults.patients?.length && !searchResults.beds?.length && !searchResults.staff?.length && (
                        <div className="p-4 text-center text-on-surface-variant text-sm">
                          <p>No results found for "{searchQuery}"</p>
                          <button
                            type="submit"
                            className="mt-2 text-xs text-primary font-bold hover:underline cursor-pointer"
                          >
                            Search in Patient Registry &rarr;
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </form>
          </div>
          <div className="flex items-center gap-sm md:gap-lg">
            <div className="flex items-center gap-xs md:gap-sm">
              <Link
                to="/notifications"
                title="System Notifications & Alerts"
                className="relative p-xs text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-variant flex items-center justify-center"
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
              <Link to="/notifications" className="p-xs text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-variant">
                <span className="material-symbols-outlined">settings</span>
              </Link>
            </div>
            <div className="h-8 w-[1px] bg-outline-variant hidden md:block"></div>
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-label-md font-bold text-primary">MediFlow Central</span>
              <span className="text-[10px] text-on-surface-variant">LIVE v2.4.0</span>
            </div>
          </div>
        </header>

        {/* Content Shell */}
        <main className="pt-24 px-margin-mobile md:px-margin-desktop pb-xl min-h-screen w-full flex flex-col flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
