import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NurseNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [activePriority, setActivePriority] = useState('All');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const navigate = useNavigate();

  // Quick Bed Allocation Modal State
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [allHospitalBeds, setAllHospitalBeds] = useState([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [selectedBedId, setSelectedBedId] = useState('');
  const [selectedInventoryWard, setSelectedInventoryWard] = useState('ICU');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [submittingAllocation, setSubmittingAllocation] = useState(false);

  const userName = localStorage.getItem('userName') || 'Staff Nurse';

  const categories = [
    { name: 'All', icon: 'all_inbox' },
    { name: 'Emergency Bed Request', icon: 'emergency', color: 'text-rose-700' },
    { name: 'Bed Request', icon: 'single_bed', color: 'text-amber-600' },
    { name: 'Bed Allocation', icon: 'hotel', color: 'text-indigo-700' },
    { name: 'New Patient Assignment', icon: 'group_add', color: 'text-blue-600' },
    { name: 'Critical Vitals', icon: 'ecg_heart', color: 'text-rose-600' },
    { name: 'Emergency Patient', icon: 'crisis_alert', color: 'text-rose-700' },
    { name: 'Doctor Instruction', icon: 'assignment', color: 'text-indigo-600' },
    { name: 'Medication Reminder', icon: 'medication', color: 'text-teal-600' },
    { name: 'Resource Request Update', icon: 'medical_services', color: 'text-cyan-600' },
    { name: 'Transfer Request', icon: 'swap_horiz', color: 'text-purple-600' },
    { name: 'Discharge Instruction', icon: 'sensor_door', color: 'text-emerald-700' },
    { name: 'Patient Update', icon: 'person', color: 'text-amber-600' },
    { name: 'General', icon: 'notifications', color: 'text-slate-600' }
  ];

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
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
      console.error('Error fetching nurse notifications:', err);
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
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
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
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
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

  const handleDeleteNotification = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const remaining = notifications.filter(n => n._id !== id);
        setNotifications(remaining);
        if (selectedNotification?._id === id) {
          setSelectedNotification(remaining.length > 0 ? remaining[0] : null);
        }
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    setSelectedNotification(notif);
    if (!notif.isRead) {
      await handleMarkAsRead(notif._id);
    }
  };

  const handleOpenAllocateModal = async (notif) => {
    setSelectedNotification(notif);
    setShowAllocateModal(true);
    setLoadingBeds(true);
    setAllocationNotes(`Emergency bed allocation for ${notif.patientName} (${notif.patientCustomId || notif.requestId}) authorized by ${notif.doctorName || 'Doctor'}.`);
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/beds', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setAllHospitalBeds(data);
      const avail = data.filter(b => b.status === 'Available');

      // Target doctor requested ward and bed number
      const targetWard = (notif.requestedWard || '').trim().toLowerCase();
      const targetBedNumber = (notif.requestedBedNumber || '').trim().toLowerCase();
      const isIcu = targetWard.includes('icu') || (notif.title || '').toLowerCase().includes('icu') || (notif.message || '').toLowerCase().includes('icu');
      const isCcu = targetWard.includes('ccu') || (notif.title || '').toLowerCase().includes('ccu') || (notif.message || '').toLowerCase().includes('ccu');
      const isEmg = targetWard.includes('emergency') || targetWard.includes('emg') || (notif.title || '').toLowerCase().includes('emergency');

      setSelectedInventoryWard(isCcu ? 'CCU' : isEmg ? 'Emergency' : 'ICU');

      // Sort available beds so matching doctor requested ward appears on top
      const sortedAvail = [...avail].sort((a, b) => {
        const aWard = (a.wardType || '').toLowerCase();
        const bWard = (b.wardType || '').toLowerCase();
        const aNum = (a.bedNumber || '').toLowerCase();
        const bNum = (b.bedNumber || '').toLowerCase();

        // Exact bed number match gets first priority
        if (targetBedNumber) {
          if (aNum === targetBedNumber) return -1;
          if (bNum === targetBedNumber) return 1;
        }

        // Ward type match gets second priority
        const aMatchesWard = targetWard ? aWard.includes(targetWard) : (isIcu ? aWard.includes('icu') : isCcu ? aWard.includes('ccu') : isEmg ? (aWard.includes('emergency') || aWard.includes('emg')) : false);
        const bMatchesWard = targetWard ? bWard.includes(targetWard) : (isIcu ? bWard.includes('icu') : isCcu ? bWard.includes('ccu') : isEmg ? (bWard.includes('emergency') || bWard.includes('emg')) : false);

        if (aMatchesWard && !bMatchesWard) return -1;
        if (!aMatchesWard && bMatchesWard) return 1;

        return (a.bedNumber || '').localeCompare(b.bedNumber || '', undefined, { numeric: true, sensitivity: 'base' });
      });

      setAvailableBeds(sortedAvail);

      if (sortedAvail.length > 0) {
        // 1. Check exact bed number match first
        let matchedBed = targetBedNumber ? sortedAvail.find(b => (b.bedNumber || '').toLowerCase() === targetBedNumber) : null;
        
        // 2. Check ward match next
        if (!matchedBed) {
          matchedBed = sortedAvail.find(b => {
            const w = (b.wardType || '').toLowerCase();
            if (targetWard) return w.includes(targetWard);
            if (isIcu) return w.includes('icu');
            if (isCcu) return w.includes('ccu');
            if (isEmg) return w.includes('emergency') || w.includes('emg');
            return false;
          });
        }

        setSelectedBedId(matchedBed ? matchedBed._id : sortedAvail[0]._id);
      }
    } catch (err) {
      console.error('Error fetching beds:', err);
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleSubmitBedAllocation = async (e) => {
    e.preventDefault();
    if (!selectedNotification || !selectedBedId) {
      Swal.fire('Bed Selection Required', 'Please select an available bed from the list.', 'warning');
      return;
    }

    try {
      setSubmittingAllocation(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const chosenBed = availableBeds.find(b => b._id === selectedBedId);

      const res = await axios.put(`/api/beds/${selectedBedId}/allocate`, {
        patientId: selectedNotification.patientId?._id || selectedNotification.patientId || selectedNotification.patientCustomId,
        patientName: selectedNotification.patientName,
        admissionRequestId: selectedNotification.requestId,
        notes: allocationNotes || `Emergency bed allocation executed by ${userName}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success || res.status === 200) {
        Swal.fire({
          icon: 'success',
          title: 'Bed Allocated Successfully!',
          html: `<b>${chosenBed ? `${chosenBed.wardType} - Bed ${chosenBed.bedNumber}` : 'Designated Bed'}</b> has been assigned to <b>${selectedNotification.patientName}</b>.<br/><span class="text-xs text-slate-500">Live telemetry and electronic health record updated across MediFlow Central.</span>`,
          confirmButtonColor: '#0066cc'
        });

        setShowAllocateModal(false);
        // Mark notification as read
        if (!selectedNotification.isRead) {
          handleMarkAsRead(selectedNotification._id);
        }
        fetchNotifications();
      }
    } catch (err) {
      console.error('Error allocating bed:', err);
      Swal.fire('Allocation Error', err.response?.data?.message || 'Failed to allocate bed.', 'error');
    } finally {
      setSubmittingAllocation(false);
    }
  };

  const handleActionNavigate = (notif) => {
    // Resolve destination link based on category, targetLink, or module
    let target = notif.targetLink || '/my-patients';
    const cat = notif.category || notif.notificationType;

    if (cat === 'Critical Vitals' || cat === 'Vitals') {
      target = '/vitals';
    } else if (cat === 'Emergency Patient' || cat === 'Emergency') {
      target = '/emergency';
    } else if (cat === 'Doctor Instruction' || cat === 'Instruction') {
      target = '/doctor-instructions';
    } else if (cat === 'Medication Reminder' || cat === 'Medication') {
      target = '/prescriptions';
    } else if (cat === 'Resource Request Update' || cat === 'Resource Request' || cat === 'Resource Allocation') {
      target = '/resource-requests';
    } else if (cat === 'Transfer Request' || cat === 'Discharge Instruction' || cat === 'Transfer Status Change' || cat === 'Discharge Processing Update') {
      target = '/transfer-discharge';
    } else if (cat === 'Bed Allocation' || cat === 'Bed Request Approval' || cat === 'Emergency Bed Request' || cat === 'Bed Request') {
      target = '/beds';
    } else if (cat === 'New Patient Assignment') {
      target = '/my-patients';
    }

    navigate(target, {
      state: {
        patientId: notif.patientId?._id || notif.patientId,
        patientCustomId: notif.patientCustomId,
        requestId: notif.requestId
      }
    });
  };

  // Filter Notifications
  const filteredNotifications = notifications.filter(n => {
    if (activeCategory !== 'All' && n.category !== activeCategory && n.notificationType !== activeCategory) {
      return false;
    }
    if (activePriority !== 'All' && n.priority !== activePriority) {
      return false;
    }
    if (unreadOnly && n.isRead) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchTitle = n.title?.toLowerCase().includes(q);
      const matchMsg = n.message?.toLowerCase().includes(q);
      const matchPat = n.patientName?.toLowerCase().includes(q);
      const matchPid = n.patientCustomId?.toLowerCase().includes(q);
      const matchCat = n.category?.toLowerCase().includes(q);
      if (!matchTitle && !matchMsg && !matchPat && !matchPid && !matchCat) {
        return false;
      }
    }
    return true;
  });

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'Critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
            🚨 Critical
          </span>
        );
      case 'High':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
            ⚠️ High
          </span>
        );
      case 'Info':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            ℹ️ Info
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Normal
          </span>
        );
    }
  };

  const getCategoryIcon = (category) => {
    const found = categories.find(c => c.name === category);
    return found ? found.icon : 'notifications';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0066cc] to-[#004d99] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <span className="material-symbols-outlined text-[28px]">notifications_active</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nurse Alerts & Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white shadow-sm animate-pulse">
                  {unreadCount} Unread
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Live clinical alerts, vital breaches, medication schedules, doctor orders, and patient updates for {userName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchNotifications}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
          </button>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-4 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold transition-all border border-blue-200 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">done_all</span> Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Category Pills Slider */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.name;
          const count = cat.name === 'All'
            ? notifications.length
            : notifications.filter(n => n.category === cat.name || n.notificationType === cat.name).length;

          return (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${isActive
                ? 'bg-[#0066cc] text-white shadow-md shadow-blue-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 shadow-2xs'
                }`}
            >
              <span className="material-symbols-outlined text-[16px]">{cat.icon}</span>
              <span>{cat.name}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search alerts, clinical message, patient..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Priority:</span>
            <select
              value={activePriority}
              onChange={(e) => setActivePriority(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
              <option value="Info">Info</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span>Unread Only</span>
          </label>
        </div>
      </div>

      {/* 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Alerts Feed List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Alerts Stream ({filteredNotifications.length})
            </h3>
            <span className="text-xs text-slate-400">Click alert to inspect</span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500 mt-3">Loading real-time nurse alerts from MongoDB...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <span className="material-symbols-outlined text-[48px] text-slate-300">notifications_off</span>
              <h4 className="text-base font-bold text-slate-700 mt-2">No Notifications Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                You have no active alerts matching your filters. System events will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredNotifications.map((notif) => {
                const isSelected = selectedNotification?._id === notif._id;
                const isCritical = notif.priority === 'Critical';

                return (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white relative ${isSelected
                      ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                      : isCritical && !notif.isRead
                        ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                      }`}
                  >
                    {!notif.isRead && (
                      <span className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100"></span>
                    )}

                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${isCritical
                          ? 'bg-rose-100 text-rose-700'
                          : notif.priority === 'High'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-50 text-blue-600'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {getCategoryIcon(notif.category || notif.notificationType)}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                            {notif.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}</span>
                          {getPriorityBadge(notif.priority)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Notification Dossier */}
        <div className="lg:col-span-7">
          {selectedNotification ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6"
              style={{ width: "calc(100% - 50vh)" }}>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                        {selectedNotification.category || selectedNotification.notificationType || 'General'}
                      </span>
                      {getPriorityBadge(selectedNotification.priority)}
                      {selectedNotification.isRead ? (
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">done_all</span> Read
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                          Unread
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-2">
                      {selectedNotification.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Received on {new Date(selectedNotification.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {!selectedNotification.isRead && (
                      <button
                        onClick={(e) => handleMarkAsRead(selectedNotification._id, e)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors shadow-2xs"
                      >
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDeleteNotification(selectedNotification._id, e)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Alert"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Dossier */}
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Clinical Event Message
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-800 leading-relaxed">
                    {selectedNotification.message}
                  </div>
                </div>

                {/* Related Metadata Card */}
                <div className="bg-blue-50/40 p-4 rounded-2xl border border-blue-100 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">link</span>
                    Related Clinical Metadata & Links
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    {selectedNotification.patientName && (
                      <div>
                        <p className="text-slate-400">Patient</p>
                        <p className="font-bold text-slate-800">{selectedNotification.patientName}</p>
                      </div>
                    )}
                    {selectedNotification.patientCustomId && (
                      <div>
                        <p className="text-slate-400">Patient ID</p>
                        <p className="font-bold text-slate-800">{selectedNotification.patientCustomId}</p>
                      </div>
                    )}
                    {selectedNotification.requestId && (
                      <div>
                        <p className="text-slate-400">Request / ID</p>
                        <p className="font-bold text-blue-700">{selectedNotification.requestId}</p>
                      </div>
                    )}
                    {selectedNotification.doctorName && (
                      <div>
                        <p className="text-slate-400">Attending Doctor</p>
                        <p className="font-bold text-slate-800">{selectedNotification.doctorName}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-400">Target Action</p>
                      <p className="font-bold text-indigo-700">{selectedNotification.category || 'Clinical Module'}</p>
                    </div>
                  </div>
                </div>

                {/* Direct Emergency Bed Allocation Card if bed request alert */}
                {(selectedNotification.category === 'Emergency Bed Request' ||
                  selectedNotification.category === 'Bed Request' ||
                  selectedNotification.category === 'Bed Allocation' ||
                  (selectedNotification.title || '').toUpperCase().includes('BED REQUEST') ||
                  (selectedNotification.title || '').toUpperCase().includes('BED ESCALATION')) && (
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-rose-600 text-base">emergency</span>
                          Direct Bed Management Action
                        </span>
                        <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-black uppercase tracking-wider animate-pulse">
                          Urgent Action Required
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        Doctor has authorized urgent bed allocation for <strong>{selectedNotification.patientName}</strong>. Select and assign an available bed directly from the Nurse Station.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleOpenAllocateModal(selectedNotification)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                      >
                        <span className="material-symbols-outlined text-base">single_bed</span>
                        Allocate Inpatient Bed Directly
                      </button>
                    </div>
                  )}

                {/* Direct Action Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleActionNavigate(selectedNotification)}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#0066cc] hover:bg-[#0052a3] text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-98"
                  >
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                    Navigate to Related Module & Patient Record
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-[48px] text-slate-300">touch_app</span>
              <h3 className="text-base font-bold text-slate-700 mt-2">No Alert Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Click on any notification in the feed to view clinical event details and jump directly into the relevant patient module.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QUICK BED ALLOCATION MODAL (Mounted via Portal) */}
      {showAllocateModal && selectedNotification && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAllocateModal(false);
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              minWidth: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-rose-600 to-rose-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white/20 text-white rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">single_bed</span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white">Direct Inpatient Bed Allocation</h3>
                  <p className="text-[11px] text-rose-100 mt-0.5">
                    Assign vacant hospital bed to emergency referral
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAllocateModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitBedAllocation} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Patient Banner */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{selectedNotification.patientName}</span>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                    {selectedNotification.patientCustomId || selectedNotification.requestId || 'Emergency Ref'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Doctor: <strong>{selectedNotification.doctorName || 'Attending Physician'}</strong> • Ref: <strong>{selectedNotification.requestId || 'N/A'}</strong>
                </p>
              </div>

              {/* Doctor Recommendation Badge */}
              {(selectedNotification.requestedWard || selectedNotification.requestedBedNumber || (selectedNotification.title || '').toLowerCase().includes('icu')) && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-600 text-base">recommend</span>
                    <div>
                      <span className="text-[11px] font-bold text-rose-900 block">
                        Doctor Requested Ward: {selectedNotification.requestedWard || 'ICU'} {selectedNotification.requestedBedType ? `(${selectedNotification.requestedBedType})` : ''}
                      </span>
                      {selectedNotification.requestedBedNumber && (
                        <span className="text-[10px] text-rose-700 font-semibold">
                          Target Bed Number: Bed {selectedNotification.requestedBedNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[9px] font-bold uppercase tracking-wider">
                    Priority Pre-selected
                  </span>
                </div>
              )}

              {/* Live Ward Bed Availability & Allocation Matrix for Nurses with Ward Tabs */}
              {(() => {
                const targetWardLabel = selectedInventoryWard || 'ICU';

                // Filter beds matching active selected ward tab
                const wardBeds = allHospitalBeds.filter(b => {
                  const bw = (b.wardType || b.ward || b.type || '').toLowerCase();
                  if (targetWardLabel === 'ICU') return bw.includes('icu') || (b.bedNumber && b.bedNumber.toUpperCase().startsWith('ICU'));
                  if (targetWardLabel === 'CCU') return bw.includes('ccu') || (b.bedNumber && b.bedNumber.toUpperCase().startsWith('CCU'));
                  if (targetWardLabel === 'Emergency') return bw.includes('emergency') || bw.includes('emg') || bw.includes('er') || (b.bedNumber && (b.bedNumber.toUpperCase().startsWith('EMG') || b.bedNumber.toUpperCase().startsWith('ER')));
                  if (targetWardLabel === 'General') return bw.includes('general') || (b.bedNumber && b.bedNumber.toUpperCase().startsWith('G-'));
                  return true;
                });

                const availWardBeds = wardBeds.filter(b => (b.status || '').toLowerCase() === 'available');
                const occupiedWardBeds = wardBeds.filter(b => (b.status || '').toLowerCase() !== 'available');

                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                        <span className="material-symbols-outlined text-sm text-teal-600">bed</span>
                        <span>Ward Bed Availability & Status</span>
                      </div>
                      
                      {/* Ward Selection Buttons: ICU, CCU, Emergency, General */}
                      <div className="flex items-center gap-1 p-0.5 bg-slate-200/80 rounded-lg">
                        {['ICU', 'CCU', 'Emergency', 'General'].map((wKey) => {
                          const isTabActive = selectedInventoryWard === wKey;
                          return (
                            <button
                              key={wKey}
                              type="button"
                              onClick={() => setSelectedInventoryWard(wKey)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                                isTabActive
                                  ? 'bg-white text-rose-600 shadow-2xs font-extrabold'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                              }`}
                            >
                              {wKey} Bed
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold pt-0.5">
                      <span className="text-slate-600">
                        Showing {targetWardLabel} Ward Inventory ({wardBeds.length} total)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          {availWardBeds.length} Available
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                          {occupiedWardBeds.length} Occupied
                        </span>
                      </div>
                    </div>

                    {wardBeds.length === 0 ? (
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-center text-[11px] text-slate-400">
                        No configured beds found in {targetWardLabel} Ward.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                        {wardBeds.map(b => {
                          const isAvail = (b.status || '').toLowerCase() === 'available';
                          const bedNum = b.bedNumber || `BED-${b._id?.slice(-4)}`;
                          const bType = b.bedType || b.type || 'Standard Bed';
                          const isSelected = selectedBedId === b._id;

                          return (
                            <div
                              key={b._id}
                              onClick={() => {
                                if (isAvail) {
                                  setSelectedBedId(b._id);
                                }
                              }}
                              className={`p-2 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                                isSelected
                                  ? 'bg-emerald-100/90 border-emerald-500 ring-2 ring-emerald-400 text-emerald-950 font-bold shadow-xs cursor-pointer'
                                  : isAvail
                                  ? 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-300 text-emerald-950 cursor-pointer hover:scale-[1.01]'
                                  : 'bg-rose-50/70 border-rose-200 text-rose-950 opacity-80 cursor-not-allowed'
                              }`}
                              title={isAvail ? `Click to select and allocate ${bedNum}` : `${bedNum} is currently occupied`}
                            >
                              <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                                <span className="flex items-center gap-1">
                                  {isSelected && <span className="material-symbols-outlined text-xs text-emerald-700">check_circle</span>}
                                  {bedNum}
                                </span>
                                <span className={`w-2 h-2 rounded-full ${isAvail ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                              </div>
                              <div className="mt-1.5 flex items-center justify-between text-[9px]">
                                <span className="text-slate-600 truncate max-w-[70px]">{bType}</span>
                                <span className={`font-black uppercase tracking-wider ${isAvail ? 'text-emerald-700 font-bold' : 'text-rose-700'}`}>
                                  {isAvail ? '( AVAILABLE )' : '( OCCUPIED )'}
                                </span>
                              </div>
                              {isAvail && (
                                <div className="mt-1 pt-1 border-t border-emerald-200 text-[8px] font-bold text-emerald-800 text-center">
                                  {isSelected ? '✓ Selected for Allocation' : 'Click to Allocate'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Bed Selector */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Select Available Destination Bed *
                </label>
                {loadingBeds ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-center text-slate-400">
                    Loading live bed matrix from hospital database...
                  </div>
                ) : availableBeds.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                    <strong>No Vacant Beds Found:</strong> All beds are currently occupied or in cleaning. Please discharge or transfer an existing patient.
                  </div>
                ) : (
                  <select
                    required
                    value={selectedBedId}
                    onChange={(e) => setSelectedBedId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  >
                    {availableBeds.map(bed => {
                      const reqWard = (selectedNotification.requestedWard || '').toLowerCase();
                      const bedWard = (bed.wardType || '').toLowerCase();
                      const isTargetWard = reqWard ? bedWard.includes(reqWard) : (selectedNotification.title || '').toLowerCase().includes('icu') ? bedWard.includes('icu') : false;
                      const isTargetBedNum = (selectedNotification.requestedBedNumber || '').toLowerCase() === (bed.bedNumber || '').toLowerCase();

                      return (
                        <option key={bed._id} value={bed._id}>
                          {bed.bedNumber} — {bed.wardType} Ward ({bed.bedType || 'Standard Bed'}) {isTargetBedNum ? '★ [Doctor Selected Bed]' : isTargetWard ? '✓ [Doctor Requested Ward]' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              {/* Clinical Handover Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nurse Clinical Handover / Allocation Notes
                </label>
                <textarea
                  rows={2}
                  value={allocationNotes}
                  onChange={(e) => setAllocationNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-800 font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  placeholder="e.g. Admitted to ICU Bed 101, continuous cardiac telemetry initiated..."
                />
              </div>

              {/* Protocol Notice */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900">
                <strong>Real-time Synchronization:</strong> Submitting will mark this bed as <strong>Occupied</strong>, assign the patient record, update the live ICU telemetry feeds, and notify the attending doctor.
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAllocation || availableBeds.length === 0}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">verified</span>
                  {submittingAllocation ? 'Allocating Bed...' : 'Confirm Bed Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
