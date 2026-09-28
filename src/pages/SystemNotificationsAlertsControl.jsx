import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SystemNotificationsAlertsControl() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('All');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Create Announcement Modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    category: 'General',
    priority: 'Normal',
    recipientRole: 'All'
  });

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterCategory !== 'All') params.append('category', filterCategory);
      if (filterPriority !== 'All') params.append('priority', filterPriority);
      if (filterUnreadOnly) params.append('unreadOnly', 'true');
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // 15s auto polling
    return () => clearInterval(interval);
  }, [filterPriority, filterCategory, filterUnreadOnly, searchQuery]);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        setActionSuccess('All notifications marked as read');
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n._id !== id));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      await handleMarkAsRead(notif._id);
    }

    // Smart navigation based on notification target link & type
    if (notif.targetLink) {
      navigate(notif.targetLink);
    } else if (notif.category === 'Emergency Patient' || notif.emergencyId) {
      navigate('/emergency');
    } else if (notif.category === 'Critical Vitals' || notif.category === 'Critical Nursing Observation') {
      navigate('/vitals');
    } else if (notif.category === 'Bed Request Approval' || notif.category === 'Admission Request Status' || notif.requestId?.startsWith('ADM')) {
      navigate('/beds');
    } else if (notif.category === 'Resource Request Update' || notif.category === 'Resource Request Approval' || notif.category === 'Resource Allocation' || notif.requestId?.startsWith('RR')) {
      navigate('/allocation');
    } else if (notif.category === 'Transfer Request' || notif.category === 'Transfer Status Change' || notif.category === 'Discharge Instruction' || notif.category === 'Discharge Processing Update') {
      navigate('/admin/billing');
    } else if (notif.category === 'New Appointment' || notif.category === 'Patient Check-In') {
      navigate('/appointments');
    } else {
      navigate('/my-patients');
    }
  };

  const handleCreateBroadcast = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(broadcastForm)
      });
      if (res.ok) {
        setShowBroadcastModal(false);
        setBroadcastForm({
          title: '',
          message: '',
          category: 'General',
          priority: 'Normal',
          recipientRole: 'All'
        });
        setActionSuccess('Broadcast announcement dispatched successfully!');
        fetchNotifications();
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Failed to broadcast:', err);
    }
  };

  // Helper for priority badges & styling
  const getPriorityStyle = (p) => {
    switch (p) {
      case 'Critical':
        return {
          badge: 'bg-red-100 text-red-700 border-red-300',
          iconBg: 'bg-red-500 text-white',
          icon: 'e911_emergency',
          border: 'border-l-4 border-l-red-500'
        };
      case 'High':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          iconBg: 'bg-amber-500 text-white',
          icon: 'warning',
          border: 'border-l-4 border-l-amber-500'
        };
      case 'Info':
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          iconBg: 'bg-blue-500 text-white',
          icon: 'info',
          border: 'border-l-4 border-l-blue-500'
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-800 border-slate-300',
          iconBg: 'bg-primary text-white',
          icon: 'notifications',
          border: 'border-l-4 border-l-primary'
        };
    }
  };

  return (
    <div className="w-full pb-16">
      {/* Action Bar Header */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[26px]">notifications_active</span>
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">Live Hospital Notifications & Alert Center</h1>
              <p className="text-sm text-on-surface-variant">Real-time critical events, emergencies, bed shortages, resource alerts, and clinical requests.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionSuccess && (
            <span className="px-3 py-1.5 rounded-lg bg-green-100 text-green-800 text-xs font-bold animate-fade-in flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              {actionSuccess}
            </span>
          )}

          <button
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-xs font-bold text-on-surface hover:bg-surface-container transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            <span>Mark All as Read</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold shadow hover:bg-primary/95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">campaign</span>
            <span>New Announcement</span>
          </button>
        </div>
      </section>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase">Unread Notifications</p>
            <p className="text-2xl font-black text-primary mt-1">{unreadCount}</p>
          </div>
          <span className="p-3 bg-primary/10 text-primary rounded-xl">
            <span className="material-symbols-outlined text-[24px]">mark_email_unread</span>
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase">Critical Code Alerts</p>
            <p className="text-2xl font-black text-error mt-1">
              {notifications.filter(n => n.priority === 'Critical' && !n.isRead).length}
            </p>
          </div>
          <span className="p-3 bg-red-100 text-error rounded-xl animate-pulse">
            <span className="material-symbols-outlined text-[24px]">crisis_alert</span>
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase">Bed & Resource Requisitions</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {notifications.filter(n => n.category.includes('Bed') || n.category.includes('Resource')).length}
            </p>
          </div>
          <span className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <span className="material-symbols-outlined text-[24px]">medical_services</span>
          </span>
        </div>

        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-on-surface-variant uppercase">Total System Events</p>
            <p className="text-2xl font-black text-on-surface mt-1">{notifications.length}</p>
          </div>
          <span className="p-3 bg-surface-container text-on-surface-variant rounded-xl">
            <span className="material-symbols-outlined text-[24px]">feed</span>
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <section className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search box */}
          <div className="md:col-span-4 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input
              type="text"
              placeholder="Search alert message, Patient ID, Request ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Critical Vitals">Critical Vitals / Hypoxia</option>
              <option value="Emergency Patient">Emergency / Trauma Triage</option>
              <option value="Admission Request Status">Admission & Bed Requests</option>
              <option value="Bed Request Approval">Bed Allocation & Approvals</option>
              <option value="Resource Request Approval">Medical Equipment Requests</option>
              <option value="Transfer Status Change">Patient Transfers</option>
              <option value="Discharge Processing Update">Discharges & Billing</option>
              <option value="New Appointment">Appointments & Queue</option>
              <option value="Critical Nursing Observation">Nursing Observations</option>
              <option value="General">General / Administrative</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="md:col-span-3">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="All">All Priority Levels</option>
              <option value="Critical">Critical (Immediate Attention)</option>
              <option value="High">High Priority</option>
              <option value="Normal">Normal</option>
              <option value="Info">Informational</option>
            </select>
          </div>

          {/* Unread Toggle */}
          <div className="md:col-span-2 flex items-center justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-on-surface">
              <input
                type="checkbox"
                checked={filterUnreadOnly}
                onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-primary/30"
              />
              <span>Unread Only</span>
            </label>
          </div>
        </div>
      </section>

      {/* Notifications Feed */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-on-surface">Live Event Stream</h3>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              {notifications.length} Events
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[16px] text-green-600 animate-pulse">sensors</span>
            <span>Live MongoDB Polling (15s)</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold text-on-surface-variant">Fetching system notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">notifications_off</span>
            <p className="text-sm font-bold text-on-surface">No notifications matching criteria</p>
            <p className="text-xs text-on-surface-variant mt-1">All clear across hospital departments.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/40">
            {notifications.map((n) => {
              const style = getPriorityStyle(n.priority);
              return (
                <div
                  key={n._id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-4 transition-all cursor-pointer hover:bg-surface-container-low/70 flex items-start gap-4 ${style.border} ${
                    !n.isRead ? 'bg-primary/5' : 'bg-surface-container-lowest'
                  }`}
                >
                  {/* Priority Icon */}
                  <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center ${style.iconBg} shadow-sm`}>
                    <span className="material-symbols-outlined text-[20px]">{style.icon}</span>
                  </div>

                  {/* Content Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${style.badge}`}>
                          {n.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-container text-on-surface-variant">
                          {n.category}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary inline-block animate-ping"></span>
                        )}
                      </div>

                      <span className="text-[11px] text-on-surface-variant flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {n.createdAt ? new Date(n.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-on-surface mb-1 flex items-center gap-1">
                      {n.title}
                    </h4>

                    <p className="text-xs text-on-surface-variant leading-relaxed mb-2">
                      {n.message}
                    </p>

                    {/* Metadata Tags & Target Action */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/30 text-[11px]">
                      <div className="flex items-center gap-3 text-on-surface-variant font-mono">
                        {n.patientCustomId && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">person</span>
                            <b>{n.patientCustomId}</b> {n.patientName ? `(${n.patientName})` : ''}
                          </span>
                        )}
                        {n.emergencyId && (
                          <span className="flex items-center gap-1 text-error">
                            <span className="material-symbols-outlined text-[14px]">e911_emergency</span>
                            <b>{n.emergencyId}</b>
                          </span>
                        )}
                        {n.requestId && (
                          <span className="flex items-center gap-1 text-primary">
                            <span className="material-symbols-outlined text-[14px]">assignment</span>
                            <b>{n.requestId}</b>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold hover:underline flex items-center gap-0.5 text-xs">
                          Open Module
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </span>

                        {!n.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(n._id, e)}
                            className="p-1 text-on-surface-variant hover:text-primary rounded"
                            title="Mark as read"
                          >
                            <span className="material-symbols-outlined text-[18px]">done</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => handleDeleteNotification(n._id, e)}
                          className="p-1 text-on-surface-variant hover:text-error rounded"
                          title="Delete notification"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Broadcast Announcement Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto"
            style={{ width: '100%', maxWidth: '540px' }}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 font-bold">
                  <span className="material-symbols-outlined text-[20px]">campaign</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Broadcast System Announcement</h3>
                  <p className="text-[10px] text-slate-300">Dispatch live alert to hospital staff & departments</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBroadcast} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Critical ICU Bed Maintenance or Hospital Fire Drill"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                  Event Message & Instructions *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide detailed information, affected wards, or instructions for clinical staff..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Priority Level
                  </label>
                  <select
                    value={broadcastForm.priority}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, priority: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High Priority</option>
                    <option value="Critical">Critical Code</option>
                    <option value="Info">Informational</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Target Audience
                  </label>
                  <select
                    value={broadcastForm.recipientRole}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, recipientRole: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="All">All Staff & Doctors</option>
                    <option value="Doctor">Doctors Only</option>
                    <option value="Nurse">Nursing Staff Only</option>
                    <option value="Receptionist">Front Desk Receptionists</option>
                    <option value="Admin">Administrators Only</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <span className="material-symbols-outlined text-[16px]">send</span>
                  Dispatch Broadcast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
