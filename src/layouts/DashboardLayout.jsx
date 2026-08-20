import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';

export default function DashboardLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

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
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    navigate('/');
  };

  const userRole = localStorage.getItem('userRole');
  const userName = localStorage.getItem('userName');

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: 'dashboard', roles: ['Doctor', 'Nurse', 'Admin'] },
    { path: '/beds', label: 'Bed Management', icon: 'bed', roles: ['Admin', 'Doctor', 'Nurse', 'Receptionist'] },
    { path: '/allocation', label: 'Resource Allocation', icon: 'inventory_2', roles: ['Inventory Manager', 'Admin', 'Doctor', 'Nurse'] },
    { path: '/registration', label: 'Patient Registry', icon: 'person_search', roles: ['Receptionist', 'Admin'] },
    { path: '/appointments', label: 'Appointments & Queue', icon: 'event', roles: ['Receptionist', 'Admin', 'Doctor'] },
    { path: '/admin', label: 'Admin Settings', icon: 'admin_panel_settings', roles: ['Admin'] },
    { path: '/roster', label: 'Staff Management', icon: 'group', roles: ['Admin'] },
    { path: '/analytics', label: 'Reports & Analytics', icon: 'analytics', roles: ['Admin'] },
    { path: '/emergency', label: 'Emergency Response', icon: 'emergency', roles: ['Admin', 'Doctor', 'Nurse'] },
    { path: '/notifications', label: 'Alerts Control', icon: 'notifications_active', roles: ['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Inventory Manager'] },
    { path: '/frs-summary', label: 'FRS Summary', icon: 'description', roles: ['Admin'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col h-screen fixed left-0 top-0 z-40 w-64 bg-surface-container shadow-sm border-r border-outline-variant/30">
        <div className="px-lg py-xl flex items-center gap-sm">
          <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_hospital</span>
          <div>
            <h1 className="text-headline-md font-headline-md font-bold text-primary">MediFlow</h1>
            <p className="text-label-md font-label-md text-on-surface-variant">Staff Portal</p>
          </div>
        </div>
        
        <nav className="flex-1 px-md space-y-base overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-md px-md py-sm rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-primary font-bold border-r-4 border-primary bg-primary-container/10'
                    : 'text-on-surface-variant hover:bg-primary-container/10 hover:text-primary'
                }`
              }
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-body-md font-body-md">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-lg border-t border-outline-variant">
          <div className="flex items-center gap-sm">
            <img
              alt="Dr. Sarah Chen"
              className="w-10 h-10 rounded-full border-2 border-primary-fixed"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6xHKfUTyQJbu4D3DFd3N-HRrX_In8j8IBqP0ZbIrf7RDKDfJatxnI-h2uoRtBr7zDHxpnGhhLhLi7tq4p-fr4pGDogUJXd9XxMSY3QUkm-uDaLqSp_pvtLQ8uLWn58FsKLoaox_3b_QvtCc6hsIjQeZYoj39oWc2uT7kRW_Q2YcvpyxZxGEmEg7O6fBljfKXHiUBMyOIHQ9OAKpXkc22desDA8ucE4Orn6DvEEio6eOPNBvB1urzrs5aBHB0Zwp-q9zf2Isy1wsWH"
            />
            <div className="overflow-hidden flex-1">
              <p className="text-body-sm font-bold truncate">{userName || 'Staff Portal'}</p>
              <p className="text-label-md text-on-surface-variant">{userRole || 'User'}</p>
            </div>
            <button onClick={handleLogout} className="text-error hover:bg-error/10 p-2 rounded-full transition-colors" title="Logout">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)}></div>
          <aside className="relative flex flex-col w-64 h-full bg-surface-container shadow-xl">
            <div className="px-lg py-xl flex items-center justify-between border-b border-outline-variant/30">
              <div className="flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_hospital</span>
                <div>
                  <h1 className="text-headline-md font-headline-md font-bold text-primary">MediFlow</h1>
                </div>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-on-surface-variant">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <nav className="flex-1 px-md py-sm space-y-base overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-md px-md py-sm rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'text-primary font-bold border-r-4 border-primary bg-primary-container/10'
                        : 'text-on-surface-variant hover:bg-primary-container/10 hover:text-primary'
                    }`
                  }
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="text-body-md font-body-md">{item.label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="p-lg border-t border-outline-variant">
              <div className="flex items-center gap-sm">
                <img
                  alt="Dr. Sarah Chen"
                  className="w-10 h-10 rounded-full border-2 border-primary-fixed"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6xHKfUTyQJbu4D3DFd3N-HRrX_In8j8IBqP0ZbIrf7RDKDfJatxnI-h2uoRtBr7zDHxpnGhhLhLi7tq4p-fr4pGDogUJXd9XxMSY3QUkm-uDaLqSp_pvtLQ8uLWn58FsKLoaox_3b_QvtCc6hsIjQeZYoj39oWc2uT7kRW_Q2YcvpyxZxGEmEg7O6fBljfKXHiUBMyOIHQ9OAKpXkc22desDA8ucE4Orn6DvEEio6eOPNBvB1urzrs5aBHB0Zwp-q9zf2Isy1wsWH"
                />
                <div className="flex-1">
                  <p className="text-body-sm font-bold truncate">{userName || 'Staff Portal'}</p>
                  <p className="text-label-md text-on-surface-variant">{userRole || 'User'}</p>
                </div>
                <button onClick={handleLogout} className="text-error hover:bg-error/10 p-2 rounded-full transition-colors" title="Logout">
                  <span className="material-symbols-outlined">logout</span>
                </button>
              </div>
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
            <div className="relative w-full max-w-[28rem] hidden sm:block">
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
                    <div className="p-4 text-center text-on-surface-variant text-sm">Searching...</div>
                  ) : searchResults ? (
                    <>
                      {searchResults.patients?.length > 0 && (
                        <div className="p-2 border-b border-outline-variant/30">
                          <h4 className="text-xs font-bold text-primary uppercase mb-2 px-2">Patients</h4>
                          {searchResults.patients.map(p => (
                            <div key={p._id} className="px-2 py-1.5 hover:bg-surface-container rounded-lg cursor-pointer flex justify-between">
                              <span className="text-sm font-medium">{p.fullName}</span>
                              <span className="text-xs text-on-surface-variant">{p.patientId}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults.beds?.length > 0 && (
                        <div className="p-2 border-b border-outline-variant/30">
                          <h4 className="text-xs font-bold text-primary uppercase mb-2 px-2">Beds</h4>
                          {searchResults.beds.map(b => (
                            <div key={b._id} className="px-2 py-1.5 hover:bg-surface-container rounded-lg cursor-pointer flex justify-between">
                              <span className="text-sm font-medium">Bed {b.bedNumber}</span>
                              <span className="text-xs text-on-surface-variant">{b.wardType} • {b.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {searchResults.staff?.length > 0 && (
                        <div className="p-2">
                          <h4 className="text-xs font-bold text-primary uppercase mb-2 px-2">Staff</h4>
                          {searchResults.staff.map(s => (
                            <div key={s._id} className="px-2 py-1.5 hover:bg-surface-container rounded-lg cursor-pointer flex justify-between">
                              <span className="text-sm font-medium">{s.name}</span>
                              <span className="text-xs text-on-surface-variant">{s.role}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!searchResults.patients?.length && !searchResults.beds?.length && !searchResults.staff?.length && (
                        <div className="p-4 text-center text-on-surface-variant text-sm">No results found</div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-sm md:gap-lg">
            <div className="flex items-center gap-xs md:gap-sm">
              <button className="relative p-xs text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-variant">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse"></span>
              </button>
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
        <main className="pt-24 px-margin-mobile md:px-margin-desktop pb-xl min-h-screen w-full flex flex-col flex-1 overflow-x-hidden animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
