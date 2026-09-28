import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ReceptionistNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const navigate = useNavigate();

  const categories = [
    { name: 'All', icon: 'all_inbox' },
    { name: 'New Appointment', icon: 'calendar_today', color: 'text-blue-600' },
    { name: 'Appointment Cancellation', icon: 'event_busy', color: 'text-rose-600' },
    { name: 'Patient Check-In', icon: 'how_to_reg', color: 'text-teal-600' },
    { name: 'Admission Approved', icon: 'domain_add', color: 'text-indigo-600' },
    { name: 'Emergency Registration', icon: 'emergency', color: 'text-amber-600' },
    { name: 'Bed Allocation', icon: 'single_bed', color: 'text-cyan-600' },
    { name: 'Discharge Update', icon: 'logout', color: 'text-emerald-600' },
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
        // Filter out critical clinical doctor alerts, keep reception/administrative & patient lifecycle events
        const allNotifs = data.notifications || [];
        const receptionRelevant = allNotifs.filter(n => n.category !== 'Critical Vitals');
        setNotifications(receptionRelevant);
        setUnreadCount(receptionRelevant.filter(n => !n.isRead).length);
        if (receptionRelevant.length > 0 && !selectedNotification) {
          setSelectedNotification(receptionRelevant[0]);
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
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
        if (selectedNotification?._id === id) {
          setSelectedNotification(prev => ({ ...prev, isRead: true }));
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
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const resolveReceptionistRoute = (notif) => {
    const cat = notif.category || '';
    if (cat.includes('Appointment') || cat.includes('Cancellation')) {
      return '/receptionist/appointments';
    }
    if (cat.includes('Check-In') || cat.includes('Queue')) {
      return '/receptionist/check-in';
    }
    if (cat.includes('Admission')) {
      return '/receptionist/admissions';
    }
    if (cat.includes('Emergency')) {
      return '/receptionist/emergency';
    }
    if (cat.includes('Bed')) {
      return '/receptionist/beds';
    }
    if (cat.includes('Discharge') || cat.includes('Transfer')) {
      return '/receptionist/discharge';
    }
    return notif.targetLink || '/receptionist/dashboard';
  };

  const handleNavigateToSource = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    const target = resolveReceptionistRoute(notif);
    navigate(target);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Emergency Registration':
      case 'Emergency Patient':
        return { icon: 'emergency', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
      case 'Bed Allocation':
        return { icon: 'single_bed', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' };
      case 'Admission Approved':
      case 'Admission Processing':
        return { icon: 'domain_add', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
      case 'New Appointment':
        return { icon: 'calendar_today', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'Appointment Cancellation':
        return { icon: 'event_busy', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' };
      case 'Patient Check-In':
        return { icon: 'how_to_reg', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' };
      case 'Discharge Update':
        return { icon: 'logout', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
      default:
        return { icon: 'notifications', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const matchesCategory = activeCategory === 'All' || n.category === activeCategory;
    const matchesSearch =
      (n.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.message || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.patientCustomId || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600 text-3xl">notifications_active</span>
            <h1 className="text-2xl font-bold text-slate-800">12. Receptionist Notifications & Desk Updates</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Real-time updates for appointments, patient arrivals, queue check-ins, admission bed approvals, and discharge clearances.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">done_all</span> Mark All Read
            </button>
          )}
          <button
            onClick={fetchNotifications}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* Role Notice */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-600 text-xl mt-0.5">info</span>
        <div className="text-xs text-blue-900">
          <p className="font-bold">Administrative Front-Desk Notification Channel</p>
          <p className="text-blue-700 mt-0.5">
            This feed filters front-desk operations (appointments, admission approvals, check-ins, bed clearances). Critical clinical vitals/ICU hypoxia alarms are routed to attending Doctors & Nurses.
          </p>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {categories.map(cat => {
            const count = cat.name === 'All'
              ? notifications.length
              : notifications.filter(n => n.category === cat.name).length;
            const isSelected = activeCategory === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
          <input
            type="text"
            placeholder="Search notifications..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 shadow-sm"
          />
        </div>
      </div>

      {/* Main Grid: Alert list on left, detail preview on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Notifications List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="font-bold text-xs text-slate-700">
              Notification Stream ({filteredNotifications.length})
            </span>
            <span className="text-[11px] text-slate-400">
              {unreadCount} unread
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto max-h-[620px] custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading notifications...</div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">notifications_off</span>
                <p className="text-xs font-semibold">No notifications found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">All front-desk updates are up to date.</p>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const badge = getCategoryIcon(notif.category);
                const isSelected = selectedNotification?._id === notif._id;

                return (
                  <div
                    key={notif._id}
                    onClick={() => setSelectedNotification(notif)}
                    className={`p-4 cursor-pointer transition-all flex items-start gap-3.5 relative ${
                      isSelected ? 'bg-teal-50/60 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                    } ${!notif.isRead ? 'bg-amber-50/30' : ''}`}
                  >
                    {!notif.isRead && (
                      <span className="absolute left-1.5 top-5 w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
                    )}

                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${badge.bg} ${badge.text} border ${badge.border}`}>
                      <span className="material-symbols-outlined text-lg">{badge.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className={`text-xs font-bold truncate ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {notif.message}
                      </p>

                      {notif.patientName && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {notif.patientName} {notif.patientCustomId ? `(${notif.patientCustomId})` : ''}
                          </span>
                          <span className="text-[10px] text-teal-600 font-bold hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); handleNavigateToSource(notif); }}>
                            Jump to Record →
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {!notif.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(notif._id, e)}
                          title="Mark as read"
                          className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">check</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Notification Dossier & Direct Jump */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          {!selectedNotification ? (
            <div className="text-center py-20 text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">mark_chat_unread</span>
              <p className="text-sm font-semibold">Select a notification to view full details</p>
              <p className="text-xs text-slate-400 mt-1">Directly jump to the relevant patient, appointment, queue, or admission record.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${getCategoryIcon(selectedNotification.category).bg} ${getCategoryIcon(selectedNotification.category).text}`}>
                    <span className="material-symbols-outlined text-xl">{getCategoryIcon(selectedNotification.category).icon}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {selectedNotification.category}
                    </span>
                    <h3 className="text-sm font-bold text-slate-800 mt-1 leading-snug">{selectedNotification.title}</h3>
                  </div>
                </div>

                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  selectedNotification.priority === 'Critical' ? 'bg-rose-100 text-rose-700' :
                  selectedNotification.priority === 'High' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {selectedNotification.priority} Priority
                </span>
              </div>

              {/* Message Details */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-slate-500 block mb-1">Notification Content:</span>
                {selectedNotification.message}
              </div>

              {/* Patient / Record Metadata */}
              <div className="space-y-2.5 text-xs">
                {selectedNotification.patientName && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-semibold">Patient:</span>
                    <span className="font-bold text-slate-800">{selectedNotification.patientName}</span>
                  </div>
                )}
                {selectedNotification.patientCustomId && (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-500 font-semibold">Patient ID:</span>
                    <span className="font-mono font-bold text-teal-700">{selectedNotification.patientCustomId}</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-slate-500 font-semibold">Timestamp:</span>
                  <span className="text-slate-700 font-medium">
                    {new Date(selectedNotification.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Jump to record or mark read */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => handleNavigateToSource(selectedNotification)}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                  Open Relevant Record / Action View
                </button>

                {!selectedNotification.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(selectedNotification._id)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">done</span> Mark Notification as Read
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
