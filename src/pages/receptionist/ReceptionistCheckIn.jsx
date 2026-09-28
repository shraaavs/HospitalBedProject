import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function ReceptionistCheckIn() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Pending'); // 'Pending' | 'CheckedIn' | 'All' | 'History'
  const [selectedVerificationApp, setSelectedVerificationApp] = useState(null);
  const [selectedHistoryPatient, setSelectedHistoryPatient] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchAppointments();

    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 5000);

    const handleFocus = () => {
      fetchAppointments(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const fetchAppointments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const token = localStorage.getItem('userToken');
      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch (err) {
      console.error('Error fetching appointments for check-in:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handlePerformCheckIn = async (appointmentId, patientName) => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Checked In' })
      });

      if (res.ok) {
        const updated = await res.json();
        setAppointments(prev => prev.map(a => a._id === appointmentId ? updated : a));
        setSelectedVerificationApp(null);
        Swal.fire({
          icon: 'success',
          title: 'Patient Checked In Successfully',
          html: `<b>${patientName}</b> is confirmed present.<br/>Status updated from <b>Scheduled</b> to <b>Checked In</b> and routed to the waiting queue for consultation.`,
          timer: 2400,
          showConfirmButton: true,
          confirmButtonColor: '#0066cc'
        });
      } else {
        Swal.fire('Error', 'Check-in failed', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    }
  };

  const handleSendToWaiting = async (appointmentId, patientName) => {
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`/api/appointments/${appointmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Waiting' })
      });

      if (res.ok) {
        const updated = await res.json();
        setAppointments(prev => prev.map(a => a._id === appointmentId ? updated : a));
        Swal.fire({
          icon: 'success',
          title: 'Patient Queued in Waiting Lounge',
          text: `${patientName} is now in doctor active consultation queue.`,
          timer: 1600,
          showConfirmButton: false
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to get past booking history for a specific patient
  const getPatientBookingHistory = (patientName, patientCustomId) => {
    if (!patientName && !patientCustomId) return [];
    return appointments.filter(a => {
      const matchName = patientName && a.patientName?.trim().toLowerCase() === patientName.trim().toLowerCase();
      const matchId = patientCustomId && a.patientCustomId && a.patientCustomId === patientCustomId;
      return (matchName || matchId);
    }).sort((a, b) => new Date(b.appointmentDate || b.createdAt) - new Date(a.appointmentDate || a.createdAt));
  };

  const filtered = appointments.filter(app => {
    const isToday = app.appointmentDate === todayStr;
    const isPast = app.appointmentDate < todayStr || (app.status === 'Completed' || app.status === 'Discharged');
    const matchesSearch =
      app.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.patientCustomId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.department?.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeTab === 'Pending') {
      return matchesSearch && isToday && app.status === 'Scheduled';
    } else if (activeTab === 'CheckedIn') {
      return matchesSearch && isToday && (app.status === 'Checked In' || app.status === 'Waiting');
    } else if (activeTab === 'History') {
      return matchesSearch && (isPast || app.status === 'Completed' || app.status === 'Cancelled' || app.appointmentDate !== todayStr);
    }
    return matchesSearch && isToday;
  });

  const scheduledCount = appointments.filter(a => a.appointmentDate === todayStr && a.status === 'Scheduled').length;
  const checkedInCount = appointments.filter(a => a.appointmentDate === todayStr && (a.status === 'Checked In' || a.status === 'Waiting')).length;
  const totalTodayCount = appointments.filter(a => a.appointmentDate === todayStr).length;
  const historyCount = appointments.filter(a => a.appointmentDate < todayStr || a.status === 'Completed' || a.status === 'Cancelled' || a.appointmentDate !== todayStr).length;

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e0edff] text-[#0066cc] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">how_to_reg</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Front-Desk Patient Check-In & Booking History</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Verify arriving patient identity, view patient past booking history, and transition status to Checked In & Waiting Queue
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#0066cc] font-bold text-xs border border-blue-200 flex items-center gap-1.5 shadow-2xs">
            <span className="material-symbols-outlined text-sm">event</span> Today's Date: {todayStr}
          </span>
          <button
            onClick={fetchAppointments}
            className="p-2 text-slate-500 hover:text-[#0066cc] bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
            title="Refresh list"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'Pending', label: 'Awaiting Arrival', count: scheduledCount, color: 'bg-amber-500 text-white' },
            { key: 'CheckedIn', label: 'Checked In / Waiting Queue', count: checkedInCount, color: 'bg-green-600 text-white' },
            { key: 'All', label: 'All Today\'s Bookings', count: totalTodayCount, color: 'bg-[#0066cc] text-white' },
            { key: 'History', label: 'Past Booking History', count: historyCount, color: 'bg-purple-700 text-white', icon: 'history' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === tab.key ? tab.color + ' shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.icon && <span className="material-symbols-outlined text-sm">{tab.icon}</span>}
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Patient ID, Name, Doctor..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10"
          />
        </div>
      </div>

      {/* Check-In Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#0066cc] mb-2">sync</span>
            <p className="text-xs">Loading appointments for check-in verification...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">fact_check</span>
            <p className="text-sm font-semibold text-slate-600">No appointments found matching this filter.</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search query or selecting a different tab above.</p>
          </div>
        ) : (
          filtered.map(app => (
            <div 
              key={app._id} 
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4 hover:shadow-md transition-all hover:border-[#0066cc]/40"
            >
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-[#0066cc] bg-blue-50 px-2.5 py-1 rounded-lg flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    {app.appointmentTime}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    app.status === 'Scheduled' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    app.status === 'Checked In' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    app.status === 'Waiting' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-green-50 text-green-700 border-green-200'
                  }`}>
                    {app.status}
                  </span>
                </div>

                <div className="mt-3.5 flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#0066cc]/10 text-[#0066cc] flex items-center justify-center font-bold text-base flex-shrink-0">
                    {app.patientName?.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-800 truncate">{app.patientName}</h3>
                    <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">{app.patientCustomId || 'Patient'}</p>
                  </div>
                </div>

                <div className="mt-3.5 bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs border border-slate-100">
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400 font-medium">Doctor:</span>
                    <strong className="text-slate-800 font-semibold">{app.doctorName || 'Dr. Priya Sharma'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400 font-medium">Department:</span>
                    <span className="font-medium text-slate-700">{app.department || 'Cardiology'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span className="text-slate-400 font-medium">Type / Priority:</span>
                    <span className="font-semibold text-slate-700">{app.type || 'Consultation'} • {app.priority || 'Routine'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/50">
                    <span className="text-slate-400 font-medium">Reason:</span>
                    <span className="truncate max-w-[150px] text-slate-700 font-medium">{app.reason || 'Routine Visit'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons & Past History Button */}
              <div className="pt-2 flex flex-col gap-2">
                {/* Past History Quick Trigger */}
                <button
                  onClick={() => setSelectedHistoryPatient({
                    name: app.patientName,
                    customId: app.patientCustomId,
                    currentApp: app
                  })}
                  className="w-full py-1.5 px-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-[11px] font-bold transition-all flex items-center justify-between"
                  title="View complete previous bookings and check-in timeline"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-purple-600">history</span>
                    <span>Past Booking History</span>
                  </span>
                  <span className="text-[10px] bg-purple-200/80 text-purple-900 px-1.5 py-0.2 rounded-full font-extrabold">
                    {getPatientBookingHistory(app.patientName, app.patientCustomId).length} Records
                  </span>
                </button>

                {app.status === 'Scheduled' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedVerificationApp(app)}
                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span> Verify
                    </button>
                    <button
                      onClick={() => handlePerformCheckIn(app._id, app.patientName)}
                      className="flex-1 py-2 bg-[#0066cc] hover:bg-[#0055b3] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span> Check In
                    </button>
                  </div>
                ) : app.status === 'Checked In' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSendToWaiting(app._id, app.patientName)}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">hourglass_empty</span> Queue into Waiting Lounge
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 text-xs font-bold text-green-700 bg-green-50 rounded-xl border border-green-200 flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-base">verified</span> Checked In & Ready in Queue
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Patient Verification Modal with embedded Past Booking History preview */}
      {selectedVerificationApp && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedVerificationApp(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto animate-scale-up overflow-hidden"
            style={{ width: '100%', maxWidth: '38rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#0066cc] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-2xl">verified_user</span>
                <h3 className="font-bold text-white text-base">Patient Arrival Verification</h3>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedVerificationApp(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 flex items-center justify-between gap-3.5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-[#0066cc] text-white flex items-center justify-center text-xl font-bold">
                    {selectedVerificationApp.patientName?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-800">{selectedVerificationApp.patientName}</h4>
                    <p className="text-xs text-slate-500 font-mono">{selectedVerificationApp.patientCustomId}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const current = selectedVerificationApp;
                    setSelectedVerificationApp(null);
                    setSelectedHistoryPatient({
                      name: current.patientName,
                      customId: current.patientCustomId,
                      currentApp: current
                    });
                  }}
                  className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">history</span>
                  <span>Full History</span>
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Scheduled Date & Time:</span>
                  <strong className="text-slate-800">{selectedVerificationApp.appointmentDate} at {selectedVerificationApp.appointmentTime}</strong>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Department:</span>
                  <strong className="text-slate-800">{selectedVerificationApp.department}</strong>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Attending Doctor:</span>
                  <strong className="text-[#0066cc]">{selectedVerificationApp.doctorName}</strong>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Visit Reason:</span>
                  <span className="text-slate-800 font-medium">{selectedVerificationApp.reason}</span>
                </div>
                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-500">Priority:</span>
                  <span className={`font-bold ${
                    selectedVerificationApp.priority === 'Urgent' ? 'text-red-600' : 'text-slate-700'
                  }`}>{selectedVerificationApp.priority}</span>
                </div>
              </div>

              {/* Quick History Snippet in Verification */}
              {(() => {
                const hist = getPatientBookingHistory(selectedVerificationApp.patientName, selectedVerificationApp.patientCustomId)
                  .filter(h => h._id !== selectedVerificationApp._id);
                if (hist.length === 0) return null;
                return (
                  <div className="mt-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">history</span>
                        Past Bookings ({hist.length})
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {hist.slice(0, 3).map((h) => (
                        <div key={h._id} className="p-2 bg-white rounded-lg border border-purple-100 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-bold text-slate-800">{h.appointmentDate}</span> • {h.doctorName} ({h.department})
                            <span className="block text-[10px] text-slate-500 truncate max-w-xs">{h.reason}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800">
                            {h.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedVerificationApp(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handlePerformCheckIn(selectedVerificationApp._id, selectedVerificationApp.patientName)}
                  className="px-5 py-2 bg-[#0066cc] text-white text-xs font-bold rounded-lg hover:bg-[#0055b3] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">check_circle</span> Confirm Check-In & Queue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Past Booking History Modal */}
      {selectedHistoryPatient && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedHistoryPatient(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto animate-scale-up overflow-hidden"
            style={{ width: '100%', maxWidth: '44rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-white text-2xl">history</span>
                <div>
                  <h3 className="font-bold text-white text-base">Patient Booking & Visit History</h3>
                  <p className="text-purple-200 text-xs font-medium">Chronological record of all scheduled & completed visits</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedHistoryPatient(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Patient Header Strip */}
              <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center text-xl font-bold">
                    {selectedHistoryPatient.name?.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">{selectedHistoryPatient.name}</h4>
                    <p className="text-xs text-purple-700 font-mono font-bold">{selectedHistoryPatient.customId || 'Patient'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-purple-900 bg-purple-200 px-3 py-1 rounded-full">
                    {getPatientBookingHistory(selectedHistoryPatient.name, selectedHistoryPatient.customId).length} Total Bookings
                  </span>
                </div>
              </div>

              {/* Booking History Timeline */}
              <div className="space-y-3">
                <h5 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">event_note</span> All Appointments & Consultations
                </h5>

                {(() => {
                  const historyList = getPatientBookingHistory(selectedHistoryPatient.name, selectedHistoryPatient.customId);
                  if (historyList.length === 0) {
                    return (
                      <div className="py-8 text-center text-slate-400">
                        <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">event_busy</span>
                        <p className="text-xs">No previous appointment records found for this patient.</p>
                      </div>
                    );
                  }

                  return historyList.map((item, idx) => {
                    const isItemToday = item.appointmentDate === todayStr;
                    return (
                      <div 
                        key={item._id || idx}
                        className={`p-4 rounded-xl border transition-all ${
                          isItemToday 
                            ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-300' 
                            : 'bg-slate-50/70 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 font-bold text-xs flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              {item.appointmentDate}
                            </span>
                            <span className="text-xs text-slate-500 font-semibold">
                              {item.appointmentTime || 'Time N/A'}
                            </span>
                            {isItemToday && (
                              <span className="text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-0.5 rounded-md">
                                Today
                              </span>
                            )}
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            item.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            item.status === 'Checked In' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            item.status === 'Waiting' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            item.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {item.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 mt-2 pt-2 border-t border-slate-200/60">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Doctor & Dept</span>
                            <strong className="text-slate-900">{item.doctorName || 'Dr. Attending'}</strong>
                            <span className="text-slate-500 block text-[11px]">{item.department || 'General'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Type & Priority</span>
                            <span className="font-semibold text-slate-800">{item.type || 'Consultation'}</span>
                            <span className="text-slate-500 block text-[11px]">Priority: {item.priority || 'Routine'}</span>
                          </div>
                          {item.reason && (
                            <div className="col-span-full mt-1 bg-white p-2.5 rounded-lg border border-slate-100 text-slate-600">
                              <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Visit Chief Reason</span>
                              {item.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedHistoryPatient(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

