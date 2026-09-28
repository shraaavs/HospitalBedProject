import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import getSocket from '../../utils/socket';

export default function ReceptionistQueueManagement() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDoctor, setFilterDoctor] = useState('All');
  const [filterStatus, setFilterStatus] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorsAvailability, setDoctorsAvailability] = useState({});
  const [sendingId, setSendingId] = useState(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchQueueAndDoctors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [queueRes, usersRes] = await Promise.all([
        fetch('/api/appointments/queue/consultation-queue', { headers }),
        fetch('/api/users/staff/doctors', { headers })
      ]);

      if (queueRes.ok) {
        const data = await queueRes.json();
        setQueue(data);
      }

      if (usersRes.ok) {
        const docList = await usersRes.json();
        const map = {};
        docList.forEach(d => {
          const clean = d.name.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
          map[clean] = d.availability?.status || 'Available';
          map[d.name.toLowerCase()] = d.availability?.status || 'Available';
        });
        setDoctorsAvailability(map);
      }
    } catch (err) {
      console.error('Error fetching consultation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueAndDoctors();

    const socket = getSocket();

    const handlePatientCheckedIn = (data) => {
      fetchQueueAndDoctors();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: `Patient Checked In`,
        text: `${data.patientName} is now in waiting queue for ${data.doctorName}`,
        showConfirmButton: false,
        timer: 3500
      });
    };

    const handleDoctorAvailable = (data) => {
      fetchQueueAndDoctors();
      const docName = data.doctorName || 'Doctor';
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: data.availabilityStatus === 'Available' ? 'success' : 'info',
        title: `Doctor Status: ${data.availabilityStatus}`,
        text: `${docName} is now "${data.availabilityStatus}".`,
        showConfirmButton: false,
        timer: 3500
      });
    };

    const handlePatientCalled = (data) => {
      fetchQueueAndDoctors();
    };

    const handleConsultationCompleted = (data) => {
      fetchQueueAndDoctors();
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Consultation Finished`,
        text: `${data.doctorName} completed consultation for ${data.patientName}. Ready for next patient.`,
        showConfirmButton: false,
        timer: 4000
      });
    };

    socket.on('PATIENT_CHECKED_IN', handlePatientCheckedIn);
    socket.on('PATIENT_WAITING', handlePatientCheckedIn);
    socket.on('DOCTOR_AVAILABLE', handleDoctorAvailable);
    socket.on('PATIENT_CALLED', handlePatientCalled);
    socket.on('CONSULTATION_STARTED', handlePatientCalled);
    socket.on('CONSULTATION_COMPLETED', handleConsultationCompleted);

    const interval = setInterval(fetchQueueAndDoctors, 10000);

    return () => {
      socket.off('PATIENT_CHECKED_IN', handlePatientCheckedIn);
      socket.off('PATIENT_WAITING', handlePatientCheckedIn);
      socket.off('DOCTOR_AVAILABLE', handleDoctorAvailable);
      socket.off('PATIENT_CALLED', handlePatientCalled);
      socket.off('CONSULTATION_STARTED', handlePatientCalled);
      socket.off('CONSULTATION_COMPLETED', handleConsultationCompleted);
      clearInterval(interval);
    };
  }, []);

  // Check-In Action
  const handleCheckInPatient = async (app) => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch(`/api/appointments/${app._id}/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Patient Checked In',
          text: `${app.patientName} is now marked as Checked In & Waiting. Doctor has been notified.`,
          timer: 1800,
          showConfirmButton: false
        });
        fetchQueueAndDoctors();
      } else {
        const errData = await res.json();
        Swal.fire('Check-In Error', errData.message || 'Failed to check in patient.', 'error');
      }
    } catch (err) {
      Swal.fire('Network Error', 'Could not connect to server.', 'error');
    }
  };

  // Send Patient to Doctor
  const handleSendPatient = async (app) => {
    try {
      setSendingId(app._id);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch(`/api/appointments/${app._id}/send-patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Patient Sent to Doctor',
          html: `<b>${app.patientName}</b> has entered consultation with <b>${app.doctorName}</b>.`,
          timer: 2000,
          showConfirmButton: false
        });
        fetchQueueAndDoctors();
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'Cannot Send Patient',
          text: data.message || 'Doctor must be available and no patient in consultation.',
          confirmButtonColor: '#0f766e'
        });
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error.', 'error');
    } finally {
      setSendingId(null);
    }
  };

  // No-Show Handler
  const handleMarkNoShow = async (app) => {
    const confirm = await Swal.fire({
      title: 'Mark as No Show?',
      html: `Confirm that <b>${app.patientName}</b> did not arrive for the <b>${app.appointmentTime}</b> appointment.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ea580c',
      confirmButtonText: 'Yes, Mark No Show'
    });

    if (confirm.isConfirmed) {
      try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        await fetch(`/api/appointments/${app._id}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'No Show' })
        });
        fetchQueueAndDoctors();
      } catch (err) {
        Swal.fire('Error', 'Failed to update status', 'error');
      }
    }
  };

  // Cancel Handler
  const handleCancelQueueAppointment = async (app) => {
    const { value: cancelReason } = await Swal.fire({
      title: 'Cancel Appointment?',
      html: `Cancel consultation booking for <b>${app.patientName}</b>?`,
      input: 'text',
      inputPlaceholder: 'Reason for cancellation...',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Confirm Cancel'
    });

    if (cancelReason !== undefined) {
      try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        await fetch(`/api/appointments/${app._id}/cancel`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ cancelReason })
        });
        fetchQueueAndDoctors();
      } catch (err) {
        Swal.fire('Error', 'Failed to cancel appointment', 'error');
      }
    }
  };

  const getDoctorLiveStatus = (docName) => {
    const clean = (docName || '').replace(/^Dr\.\s*/i, '').trim().toLowerCase();
    return doctorsAvailability[clean] || doctorsAvailability[docName?.toLowerCase()] || 'Available';
  };

  // Check if a doctor already has another patient IN_CONSULTATION
  const isDoctorBusyWithAnother = (docName, currentAppId) => {
    const clean = (docName || '').replace(/^Dr\.\s*/i, '').trim().toLowerCase();
    return queue.some(a => {
      const aClean = (a.doctorName || '').replace(/^Dr\.\s*/i, '').trim().toLowerCase();
      return aClean === clean && a._id !== currentAppId && a.status === 'In Consultation';
    });
  };

  const doctorsInQueue = Array.from(new Set(queue.map(a => a.doctorName).filter(Boolean)));

  const filtered = queue.filter(a => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      a.patientName?.toLowerCase().includes(q) ||
      a.patientCustomId?.toLowerCase().includes(q) ||
      a.doctorName?.toLowerCase().includes(q) ||
      a.department?.toLowerCase().includes(q);

    const matchesDoc = filterDoctor === 'All' || a.doctorName === filterDoctor;

    let matchesStatus = true;
    if (filterStatus === 'Active') {
      matchesStatus = a.status === 'Waiting' || a.status === 'Checked In' || a.status === 'Called' || a.status === 'In Consultation';
    } else if (filterStatus !== 'All') {
      matchesStatus = a.status === filterStatus;
    }

    return matchesSearch && matchesDoc && matchesStatus;
  });

  const waitingCount = queue.filter(a => a.status === 'Waiting' || a.status === 'Checked In' || a.status === 'Called').length;
  const inConsultCount = queue.filter(a => a.status === 'In Consultation').length;
  const completedCount = queue.filter(a => a.status === 'Completed').length;
  const scheduledCount = queue.filter(a => a.status === 'Scheduled').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Checked In':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Waiting':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Called':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200 animate-pulse';
      case 'In Consultation':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-bold';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
      case 'No Show':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Cancelled':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getDocAvailabilityBadge = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'In Consultation':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Unavailable':
      case 'Off Duty':
      case 'On Leave':
        return 'bg-slate-200 text-slate-700 border-slate-300';
      case 'In Emergency / OT':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      default:
        return 'bg-teal-100 text-teal-800 border-teal-300';
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-900 text-white flex items-center justify-center font-bold shadow-xs">
            <span className="material-symbols-outlined text-2xl">format_list_numbered</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">Consultation Queue & Doctor Availability</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Real-time patient check-in, doctor readiness confirmation, and consultation dispatching
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 rounded-xl bg-teal-50 text-teal-800 font-bold text-xs border border-teal-200 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse"></span>
            Live Real-Time Socket
          </span>
          <button
            onClick={fetchQueueAndDoctors}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 rounded-xl border border-slate-200 transition-colors"
            title="Refresh queue"
          >
            <span className={`material-symbols-outlined text-lg ${loading ? 'animate-spin' : ''}`}>sync</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">login</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Waiting / Checked In</p>
            <p className="text-xl font-black text-purple-800">{waitingCount}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">stethoscope</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">In Consultation</p>
            <p className="text-xl font-black text-blue-800">{inConsultCount}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed Today</p>
            <p className="text-xl font-black text-emerald-700">{completedCount}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">event</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Scheduled (Upcoming)</p>
            <p className="text-xl font-black text-slate-700">{scheduledCount}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { key: 'Active', label: 'Active Queue (Live)' },
            { key: 'Waiting', label: 'Waiting Lounge' },
            { key: 'In Consultation', label: 'In Consultation' },
            { key: 'Scheduled', label: 'Scheduled (Not Checked In)' },
            { key: 'All', label: 'All Entries' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterStatus === tab.key
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Doctor Filter */}
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none"
          >
            <option value="All">All Attending Doctors</option>
            {doctorsInQueue.map(doc => (
              <option key={doc} value={doc}>{doc}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, ID, doctor..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-700"
          />
        </div>
      </div>

      {/* Consultation Queue Section Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-xs text-slate-800 uppercase tracking-wider">
            <span className="material-symbols-outlined text-base text-teal-700">queue</span>
            <span>Consultation Queue ({filtered.length})</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Strict Rule: Send Patient is enabled ONLY when Patient is Checked In & Doctor is Available
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Queue Pos</th>
                <th className="p-3.5">Patient Name & ID</th>
                <th className="p-3.5">Doctor</th>
                <th className="p-3.5">Appt Time</th>
                <th className="p-3.5">Check-In Time</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Doctor Availability</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400">Loading consultation queue...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">No patients found in this queue view.</td>
                </tr>
              ) : (
                filtered.map((app, idx) => {
                  const isScheduled = app.status === 'Scheduled';
                  const isCheckedInOrWaiting = app.status === 'Checked In' || app.status === 'Waiting' || app.status === 'Called';
                  const isInConsult = app.status === 'In Consultation';
                  const isCompleted = app.status === 'Completed';
                  const isFinished = isCompleted || app.status === 'Cancelled' || app.status === 'No Show';

                  const currentDocStatus = getDoctorLiveStatus(app.doctorName);
                  const isDocAvailable = currentDocStatus === 'Available';
                  const isDocBusy = isDoctorBusyWithAnother(app.doctorName, app._id);

                  // Send Patient is enabled ONLY when:
                  // 1. Patient is checked in / waiting
                  // 2. Doctor is AVAILABLE
                  // 3. No other patient is IN_CONSULTATION with this doctor
                  const canSendPatient = isCheckedInOrWaiting && isDocAvailable && !isDocBusy;

                  return (
                    <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Queue Position */}
                      <td className="p-3.5">
                        {app.queuePosition ? (
                          <span className="w-7 h-7 rounded-xl bg-teal-50 text-teal-800 font-mono font-black text-xs border border-teal-200 flex items-center justify-center">
                            #{app.queuePosition}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">—</span>
                        )}
                      </td>

                      {/* Patient Details */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">{app.patientName}</div>
                        <div className="text-[11px] font-mono text-teal-800 font-bold">{app.patientCustomId || 'PM-PENDING'}</div>
                      </td>

                      {/* Doctor */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{app.doctorName || 'Dr. Priya Sharma'}</div>
                        <div className="text-[10px] text-slate-500">{app.department || 'Cardiology'}</div>
                      </td>

                      {/* Appointment Time */}
                      <td className="p-3.5 font-bold text-slate-800">
                        {app.appointmentTime}
                      </td>

                      {/* Check-In Time */}
                      <td className="p-3.5">
                        {app.checkInTime ? (
                          <span className="font-mono text-slate-700 text-[11px]">
                            {new Date(app.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px] italic">Not Checked In</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${getStatusBadge(app.status)}`}>
                          {app.status}
                        </span>
                      </td>

                      {/* Doctor Availability */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border flex items-center gap-1.5 w-max ${getDocAvailabilityBadge(currentDocStatus)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isDocAvailable ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}></span>
                          {currentDocStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Check In Action */}
                          {isScheduled && (
                            <button
                              type="button"
                              onClick={() => handleCheckInPatient(app)}
                              className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">how_to_reg</span>
                              Check In
                            </button>
                          )}

                          {/* Send Patient Button (Strictly Enabled Only when Doctor is Available & Patient Checked In) */}
                          {isCheckedInOrWaiting && (
                            <button
                              type="button"
                              onClick={() => handleSendPatient(app)}
                              disabled={!canSendPatient || sendingId === app._id}
                              title={
                                !isDocAvailable 
                                  ? `${app.doctorName} must be "Available" before sending patient`
                                  : isDocBusy 
                                  ? `${app.doctorName} is already consulting another patient` 
                                  : 'Send patient to doctor consultation room'
                              }
                              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                                canSendPatient
                                  ? 'bg-teal-700 hover:bg-teal-800 text-white shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95'
                                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">send</span>
                              Send Patient
                            </button>
                          )}

                          {/* In Consultation Notice */}
                          {isInConsult && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-[11px] font-extrabold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                              In Consultation
                            </span>
                          )}

                          {/* Completed Notice */}
                          {isCompleted && (
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-[10px] font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">verified</span>
                              Completed
                            </span>
                          )}

                          {/* No Show / Cancel Actions */}
                          {(isScheduled || isCheckedInOrWaiting) && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleMarkNoShow(app)}
                                className="px-2 py-1 bg-slate-50 hover:bg-orange-50 text-slate-500 hover:text-orange-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                                title="Mark No Show"
                              >
                                No Show
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCancelQueueAppointment(app)}
                                className="px-2 py-1 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                                title="Cancel appointment"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
