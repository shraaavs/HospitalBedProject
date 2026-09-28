import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DoctorNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePriority, setActivePriority] = useState('All');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const navigate = useNavigate();

  const userRole = localStorage.getItem('userRole') || 'Doctor';
  const userName = localStorage.getItem('userName') || 'Dr. Priya Sharma';

  const categories = [
    { name: 'All', icon: 'all_inbox' },
    { name: 'Critical Vitals', icon: 'ecg_heart', color: 'text-rose-600' },
    { name: 'Emergency Patient', icon: 'emergency', color: 'text-rose-700' },
    { name: 'New Appointment', icon: 'calendar_today', color: 'text-blue-600' },
    { name: 'Patient Check-In', icon: 'how_to_reg', color: 'text-emerald-600' },
    { name: 'Admission Request Status', icon: 'domain_add', color: 'text-indigo-600' },
    { name: 'Bed Request Approval', icon: 'single_bed', color: 'text-indigo-700' },
    { name: 'Resource Request Approval', icon: 'medical_services', color: 'text-teal-600' },
    { name: 'Resource Allocation', icon: 'inventory_2', color: 'text-teal-700' },
    { name: 'Critical Nursing Observation', icon: 'edit_note', color: 'text-amber-600' },
    { name: 'Transfer Status Change', icon: 'swap_horiz', color: 'text-purple-600' },
    { name: 'Discharge Processing Update', icon: 'home_health', color: 'text-emerald-700' },
    { name: 'General', icon: 'campaign', color: 'text-teal-600' }
  ];

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const notifs = data.notifications || [];
        setNotifications(notifs);
        setUnreadCount(data.unreadCount || 0);
        if (notifs.length > 0) {
          setSelectedNotification(prev => {
            if (!prev) return notifs[0];
            const updated = notifs.find(n => n._id === prev._id);
            return updated || notifs[0];
          });
        }
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true, readAt: new Date() } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (selectedNotification?._id === id) {
          setSelectedNotification(prev => ({ ...prev, isRead: true, readAt: new Date() }));
        }
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date() })));
        setUnreadCount(0);
        if (selectedNotification) {
          setSelectedNotification(prev => ({ ...prev, isRead: true, readAt: new Date() }));
        }
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const handleNavigateToSource = (notif) => {
    if (!notif) return;
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    
    // Explicit route mappings matching all 11 system events
    if (notif.targetLink) {
      navigate(notif.targetLink);
      return;
    }

    switch (notif.category) {
      case 'Critical Vitals':
      case 'Critical Nursing Observation':
        navigate('/vitals');
        break;
      case 'Emergency Patient':
        navigate('/emergency');
        break;
      case 'New Appointment':
      case 'Patient Check-In':
        navigate('/appointments');
        break;
      case 'Admission Request Status':
      case 'Bed Request Approval':
      case 'Bed Allocation':
        navigate('/bed-requests');
        break;
      case 'Resource Request Approval':
      case 'Resource Allocation':
        navigate('/resource-requests');
        break;
      case 'Transfer Status Change':
      case 'Discharge Processing Update':
        navigate('/transfer-discharge');
        break;
      default:
        navigate('/dashboard');
        break;
    }
  };

  const getCategoryTheme = (category) => {
    switch (category) {
      case 'Critical Vitals':
        return { icon: 'ecg_heart', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', badgeBg: 'bg-rose-50 text-rose-700' };
      case 'Emergency Patient':
        return { icon: 'emergency', bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-400', badgeBg: 'bg-rose-100 text-rose-800' };
      case 'New Appointment':
        return { icon: 'calendar_today', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300', badgeBg: 'bg-blue-50 text-blue-700' };
      case 'Patient Check-In':
        return { icon: 'how_to_reg', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', badgeBg: 'bg-emerald-50 text-emerald-700' };
      case 'Admission Request Status':
        return { icon: 'domain_add', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300', badgeBg: 'bg-indigo-50 text-indigo-700' };
      case 'Bed Request Approval':
      case 'Bed Allocation':
        return { icon: 'single_bed', bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-400', badgeBg: 'bg-indigo-100 text-indigo-800' };
      case 'Resource Request Approval':
      case 'Resource Allocation':
        return { icon: 'medical_services', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300', badgeBg: 'bg-teal-50 text-teal-700' };
      case 'Critical Nursing Observation':
        return { icon: 'edit_note', bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', badgeBg: 'bg-amber-50 text-amber-800' };
      case 'Transfer Status Change':
        return { icon: 'swap_horiz', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', badgeBg: 'bg-purple-50 text-purple-700' };
      case 'Discharge Processing Update':
        return { icon: 'home_health', bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-400', badgeBg: 'bg-emerald-100 text-emerald-800' };
      default:
        return { icon: 'notifications', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', badgeBg: 'bg-slate-100 text-slate-700' };
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesCategory = activeCategory === 'All' || n.category === activeCategory;
    const matchesPriority = activePriority === 'All' || n.priority === activePriority;
    const matchesUnread = !unreadOnly || !n.isRead;
    const matchesSearch =
      (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.patientCustomId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.requestId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.category || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesPriority && matchesUnread && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">notifications_active</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">
                  Doctor Clinical Event Notifications
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white animate-pulse">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Real-time MongoDB notification stream for critical patient vitals, emergency patients, appointments, bed & resource requests, nursing observations, and discharge updates.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNotifications()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm transition-colors"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-lg">done_all</span>
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-rose-200 bg-rose-50/30 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">ecg_heart</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider truncate">Critical Vitals & Alerts</p>
            <h3 className="text-2xl font-black text-slate-900">
              {notifications.filter(n => n.category === 'Critical Vitals' || n.priority === 'Critical').length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">single_bed</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider truncate">Admissions & Beds</p>
            <h3 className="text-2xl font-black text-slate-900">
              {notifications.filter(n => n.category.includes('Admission') || n.category.includes('Bed')).length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-teal-200 bg-teal-50/20 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">medical_services</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-teal-700 uppercase tracking-wider truncate">Resource Allocations</p>
            <h3 className="text-2xl font-black text-slate-900">
              {notifications.filter(n => n.category.includes('Resource')).length}
            </h3>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-purple-200 bg-purple-50/20 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">swap_horiz</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider truncate">Transfer & Discharge</p>
            <h3 className="text-2xl font-black text-slate-900">
              {notifications.filter(n => n.category.includes('Transfer') || n.category.includes('Discharge')).length}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeCategory === cat.name
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>

        {/* Priority Filter + Unread Switch + Search input */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={activePriority}
              onChange={(e) => setActivePriority(e.target.value)}
              className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical Priority</option>
              <option value="High">High Priority</option>
              <option value="Normal">Normal Priority</option>
            </select>

            <button
              onClick={() => setUnreadOnly(!unreadOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors ${
                unreadOnly
                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {unreadOnly ? 'check_box' : 'check_box_outline_blank'}
              </span>
              Unread Only
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search notifications, patients, IDs..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Notification Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Notification Stream */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Live Notification Stream ({filteredNotifications.length})
              </h2>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                  {unreadCount} new
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Logged-in: {userName}</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[640px] overflow-y-auto">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined animate-spin text-3xl mb-2 text-rose-600">sync</span>
                <p className="text-sm font-medium">Loading notifications from MongoDB...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">notifications_off</span>
                <p className="text-sm font-semibold text-slate-600">No notifications found</p>
                <p className="text-xs text-slate-400 mt-1">No event alerts matching your current filter criteria.</p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isSelected = selectedNotification?._id === notif._id;
                const theme = getCategoryTheme(notif.category);
                return (
                  <div
                    key={notif._id}
                    onClick={() => {
                      setSelectedNotification(notif);
                      if (!notif.isRead) handleMarkAsRead(notif._id);
                    }}
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 border-l-4 ${
                      isSelected
                        ? 'bg-rose-50/50 border-rose-600 shadow-inner'
                        : notif.isRead
                        ? 'border-transparent bg-white'
                        : 'border-rose-500 bg-amber-50/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl ${theme.bg} ${theme.text} flex items-center justify-center shrink-0`}>
                        <span className="material-symbols-outlined text-xl">{theme.icon}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm leading-snug truncate ${notif.isRead ? 'text-slate-800 font-bold' : 'text-slate-900 font-extrabold'}`}>
                            {notif.title}
                          </h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {notif.priority === 'Critical' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 uppercase">
                                Alert
                              </span>
                            )}
                            {!notif.isRead && (
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse"></span>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 text-[11px] text-slate-400">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded font-semibold text-[10px] ${theme.badgeBg}`}>
                              {notif.category}
                            </span>
                            {notif.patientCustomId && (
                              <span className="font-mono text-slate-600 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded">
                                {notif.patientCustomId}
                              </span>
                            )}
                          </div>
                          <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Selected Notification Dossier & Direct Navigation Action */}
        <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {selectedNotification ? (
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="flex items-start gap-3.5">
                  <div className={`w-12 h-12 rounded-xl ${getCategoryTheme(selectedNotification.category).bg} ${getCategoryTheme(selectedNotification.category).text} flex items-center justify-center shrink-0 shadow-xs`}>
                    <span className="material-symbols-outlined text-2xl">
                      {getCategoryTheme(selectedNotification.category).icon}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                      {selectedNotification.category}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 leading-snug mt-0.5">
                      {selectedNotification.title}
                    </h3>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  {selectedNotification.priority === 'Critical' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                      CRITICAL
                    </span>
                  ) : selectedNotification.priority === 'High' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      HIGH
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                      NORMAL
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 mt-1">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Message Payload */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Clinical Event Details & Dispatch Summary:
                </span>
                <p className="text-sm text-slate-800 leading-relaxed font-medium">
                  {selectedNotification.message}
                </p>
              </div>

              {/* Associated Clinical IDs & References */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {selectedNotification.patientName && (
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase block">Patient Name</span>
                    <span className="text-sm font-bold text-indigo-950 mt-0.5 block truncate">
                      {selectedNotification.patientName}
                    </span>
                  </div>
                )}

                {selectedNotification.patientCustomId && (
                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold text-indigo-800 uppercase block">Patient ID</span>
                    <span className="text-sm font-mono font-bold text-indigo-950 mt-0.5 block">
                      {selectedNotification.patientCustomId}
                    </span>
                  </div>
                )}

                {selectedNotification.requestId && (
                  <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100">
                    <span className="text-[10px] font-bold text-teal-800 uppercase block">Request Reference</span>
                    <span className="text-sm font-mono font-bold text-teal-950 mt-0.5 block">
                      {selectedNotification.requestId}
                    </span>
                  </div>
                )}

                {selectedNotification.appointmentId && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block">Appointment Ref</span>
                    <span className="text-sm font-mono font-bold text-blue-950 mt-0.5 block">
                      {selectedNotification.appointmentId}
                    </span>
                  </div>
                )}

                {selectedNotification.emergencyId && (
                  <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Emergency Case #</span>
                    <span className="text-sm font-mono font-bold text-rose-950 mt-0.5 block">
                      {selectedNotification.emergencyId}
                    </span>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Read Status</span>
                  <span className={`text-xs font-bold mt-0.5 block ${selectedNotification.isRead ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedNotification.isRead ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>

              {/* Direct Jump Navigation CTA */}
              <div className="p-5 bg-gradient-to-r from-teal-50 to-indigo-50 rounded-xl border border-teal-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-teal-950">Direct Module Navigation</h4>
                  <p className="text-xs text-teal-800 mt-0.5">
                    Click below to open the corresponding clinical record and take immediate action.
                  </p>
                </div>

                <button
                  onClick={() => handleNavigateToSource(selectedNotification)}
                  className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm flex items-center justify-center gap-2 whitespace-nowrap transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                  Open Record & Respond
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-2 text-slate-300">notifications</span>
              <p className="text-sm font-semibold">Select an alert to inspect details and navigate to record</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
