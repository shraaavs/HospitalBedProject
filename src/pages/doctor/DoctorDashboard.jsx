import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';
import getSocket from '../../utils/socket';

export default function DoctorDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [availabilityStatus, setAvailabilityStatus] = useState('Available');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [waitingPatientPopup, setWaitingPatientPopup] = useState(null);

  const fetchDoctorDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      
      const response = await axios.get('/api/dashboard/doctor', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
      if (response.data?.doctorInfo?.availability?.status) {
        setAvailabilityStatus(response.data.doctorInfo.availability.status);
      }

      // Check for any waiting checked-in patient for today
      const todayApps = response.data?.todayAppointments || [];
      const nextWaiting = todayApps.find(a => a.status === 'Checked In' || a.status === 'Waiting');
      if (nextWaiting && (!waitingPatientPopup || waitingPatientPopup._id !== nextWaiting._id)) {
        setWaitingPatientPopup(nextWaiting);
      }
    } catch (err) {
      console.error('Error loading doctor dashboard:', err);
      setError(err.response?.data?.message || 'Failed to load doctor dashboard from MongoDB.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorDashboard();

    const socket = getSocket();

    const handlePatientWaiting = (patientData) => {
      fetchDoctorDashboard();
      setWaitingPatientPopup(patientData);
    };

    const handlePatientCalled = (callData) => {
      fetchDoctorDashboard();
      setWaitingPatientPopup(null);
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Patient Sent to Your Room',
        text: `${callData.patientName} has entered consultation.`,
        timer: 4000,
        showConfirmButton: false
      });
    };

    const handleConsultationCompleted = () => {
      fetchDoctorDashboard();
      setAvailabilityStatus('Available');
    };

    socket.on('PATIENT_CHECKED_IN', handlePatientWaiting);
    socket.on('PATIENT_WAITING', handlePatientWaiting);
    socket.on('PATIENT_CALLED', handlePatientCalled);
    socket.on('CONSULTATION_STARTED', handlePatientCalled);
    socket.on('CONSULTATION_COMPLETED', handleConsultationCompleted);

    return () => {
      socket.off('PATIENT_CHECKED_IN', handlePatientWaiting);
      socket.off('PATIENT_WAITING', handlePatientWaiting);
      socket.off('PATIENT_CALLED', handlePatientCalled);
      socket.off('CONSULTATION_STARTED', handlePatientCalled);
      socket.off('CONSULTATION_COMPLETED', handleConsultationCompleted);
    };
  }, []);

  const handleUpdateAvailability = async (newStatus) => {
    try {
      setUpdatingStatus(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.put('/api/users/doctor-availability', { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setAvailabilityStatus(newStatus);
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `Availability: ${newStatus}`,
          text: `Receptionist informed in real time that you are ${newStatus}.`,
          timer: 2500,
          showConfirmButton: false
        });
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to update availability status.', 'error');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCallPatientFromPopup = async () => {
    if (!waitingPatientPopup) return;
    await handleUpdateAvailability('Available');
    setWaitingPatientPopup(null);
    navigate('/consultations', {
      state: {
        appointmentId: waitingPatientPopup.appointmentId || waitingPatientPopup._id,
        patientName: waitingPatientPopup.patientName
      }
    });
  };

  const handleDismissPopupNotAvailable = async () => {
    setWaitingPatientPopup(null);
    await handleUpdateAvailability('Unavailable');
  };

  const metrics = data?.metrics || {};
  const doctorInfo = data?.doctorInfo || {};
  const todayAppointments = data?.todayAppointments || [];
  const upcomingAppointments = data?.upcomingAppointments || [];
  const assignedPatients = data?.assignedPatients || [];
  const emergencyPatients = data?.emergencyPatients || [];
  const criticalAlerts = data?.criticalAlerts || [];
  const pendingBedRequests = data?.pendingBedRequests || [];
  const pendingResourceRequests = data?.pendingResourceRequests || [];
  const recentVitals = data?.recentVitals || [];

  return (
    <div className="w-full flex flex-col space-y-5 pb-8">
      
      {/* Real-Time "Patient Ready for Consultation" Popup Banner */}
      {waitingPatientPopup && (
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white p-5 rounded-2xl shadow-xl border-2 border-teal-400/50 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-400/20 border border-teal-300/40 text-teal-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl animate-bounce">person_check</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 bg-teal-900/80 px-2 py-0.5 rounded-full border border-teal-400/40">
                  Patient Ready for Consultation
                </span>
                <h3 className="text-base font-black text-white mt-1">
                  {waitingPatientPopup.patientName} 
                  <span className="text-teal-200 font-mono text-xs ml-2">({waitingPatientPopup.patientCustomId || 'PM-ID'})</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Appointment Time: <b>{waitingPatientPopup.appointmentTime || '10:00 AM'}</b> • Checked In at Reception Lounge
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCallPatientFromPopup}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">how_to_reg</span>
                Available – Call Patient
              </button>
              <button
                type="button"
                onClick={handleDismissPopupNotAvailable}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-colors"
              >
                Not Available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Doctor Welcome & Persona Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-teal-600 to-teal-800 text-white flex items-center justify-center font-black text-xl shadow-sm">
            {(doctorInfo.name || 'Dr').replace(/^Dr\.\s*/i, '').charAt(0) || 'D'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-extrabold text-slate-800">
                {doctorInfo.name?.startsWith('Dr.') ? doctorInfo.name : `Dr. ${doctorInfo.name || 'Physician'}`}
              </h1>
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full font-bold border border-teal-200 font-mono">
                {doctorInfo.doctorId || 'DOC-001'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Department: <b className="text-slate-700">{doctorInfo.department || 'Cardiology'}</b> • {doctorInfo.specialization || 'Consultant Specialist'} • Real-Time Doctor Portal
            </p>
          </div>
        </div>

        {/* Doctor Consultation Availability Control */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="bg-slate-50 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1 shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Availability:</span>
            {[
              { status: 'Available', label: 'Available', icon: 'check_circle', color: 'bg-emerald-600 text-white shadow-xs' },
              { status: 'Unavailable', label: 'Unavailable', icon: 'block', color: 'bg-slate-800 text-white shadow-xs' },
              { status: 'In Consultation', label: 'In Consult', icon: 'stethoscope', color: 'bg-blue-600 text-white shadow-xs' }
            ].map(item => (
              <button
                key={item.status}
                type="button"
                disabled={updatingStatus}
                onClick={() => handleUpdateAvailability(item.status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 ${
                  availabilityStatus === item.status
                    ? item.color
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDoctorDashboard}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh Live
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-base">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* 2. Top Key Metric Summary Cards (Clickable & Filtered for this Doctor) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Today's Appts", count: metrics.todayAppointmentsCount ?? 0, icon: 'calendar_today', color: 'teal', path: '/appointments' },
          { label: 'My Patients', count: metrics.myPatientsCount ?? 0, icon: 'person', color: 'blue', path: '/my-patients' },
          { label: 'Admitted', count: metrics.admittedPatientsCount ?? 0, icon: 'hotel', color: 'indigo', path: '/my-patients' },
          { label: 'Emergency', count: metrics.emergencyPatientsCount ?? 0, icon: 'notifications_active', color: 'rose', path: '/emergency' },
          { label: 'Consultations', count: metrics.pendingConsultationsCount ?? 0, icon: 'stethoscope', color: 'cyan', path: '/appointments' },
          { label: 'Critical Alerts', count: metrics.criticalAlertsCount ?? 0, icon: 'warning', color: 'amber', path: '/notifications' },
          { label: 'Bed Requests', count: metrics.pendingBedRequestsCount ?? 0, icon: 'single_bed', color: 'purple', path: '/bed-requests' },
          { label: 'Resource Reqs', count: metrics.pendingResourceRequestsCount ?? 0, icon: 'medical_services', color: 'emerald', path: '/resource-requests' }
        ].map((m, idx) => (
          <div
            key={idx}
            onClick={() => navigate(m.path)}
            className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-teal-500 cursor-pointer transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className={`material-symbols-outlined text-lg text-${m.color}-600 bg-${m.color}-50 p-1.5 rounded-xl`}>
                {m.icon}
              </span>
              <span className="material-symbols-outlined text-xs text-slate-300 group-hover:text-teal-600 transition-colors">
                arrow_outward
              </span>
            </div>
            <div>
              <span className="text-xl font-black text-slate-800 tracking-tight block">
                {loading ? '...' : m.count}
              </span>
              <span className="text-[10px] font-bold text-slate-500 truncate block mt-0.5">
                {m.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left / Center Column: Today's Appointments & Admitted Patient Roster (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Panel A: Today's Appointments & Active Consultations */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-700 text-lg">calendar_today</span>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  Today's Appointments & Consultations ({todayAppointments.length})
                </h3>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-0.5"
              >
                View All Queue <span className="material-symbols-outlined text-xs">chevron_right</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-6 text-center text-slate-400 text-xs">Loading appointments...</div>
              ) : todayAppointments.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">event_available</span>
                  <p className="text-xs font-bold text-slate-600">No appointments scheduled for today.</p>
                  <p className="text-[11px] text-slate-400">New patient bookings will appear here automatically.</p>
                </div>
              ) : (
                todayAppointments.map((appt) => (
                  <div
                    key={appt._id}
                    onClick={() => navigate('/appointments')}
                    className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold text-xs">
                        {appt.appointmentTime || '09:00'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{appt.patientName}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                            {appt.patientCustomId || 'PT-ID'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {appt.type || 'Consultation'} • {appt.reason || 'Routine clinical assessment'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        appt.status === 'In Consultation' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        appt.status === 'Waiting' ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse' :
                        appt.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {appt.status}
                      </span>
                      <span className="text-[10px] text-slate-400">Dr. Assigned</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel B: Inpatient Roster (My Admitted Patients) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-700 text-lg">hotel</span>
                <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                  My Inpatient Roster ({assignedPatients.length})
                </h3>
              </div>
              <button
                onClick={() => navigate('/my-patients')}
                className="text-[11px] font-bold text-teal-700 hover:underline flex items-center gap-0.5"
              >
                Manage Inpatients <span className="material-symbols-outlined text-xs">chevron_right</span>
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-6 text-center text-slate-400 text-xs">Loading patient roster...</div>
              ) : assignedPatients.length === 0 ? (
                <div className="p-6 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">person_off</span>
                  <p className="text-xs font-bold text-slate-600">No inpatients currently assigned.</p>
                </div>
              ) : (
                assignedPatients.map((pat) => (
                  <div
                    key={pat._id}
                    onClick={() => navigate('/my-patients')}
                    className="p-3.5 hover:bg-slate-50/80 cursor-pointer transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center font-bold text-xs">
                        {(pat.fullName || pat.name || 'P').charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{pat.fullName || pat.name}</span>
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                            {pat.patientId || 'P-ID'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Ward: <b className="text-slate-700">{pat.admissionSetup?.wardType || pat.ward || 'General'}</b> • Bed: <b className="text-slate-700">{pat.bedId?.bedNumber || pat.bedNumber || 'Assigned'}</b> • Age: {pat.age || '35'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/prescriptions'); }}
                        className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-[10px] font-bold transition-colors"
                      >
                        Prescribe
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate('/vitals'); }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors"
                      >
                        Vitals
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel C: Upcoming Appointments Preview */}
          {upcomingAppointments.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-teal-600">upcoming</span>
                  Upcoming Consultations Schedule
                </span>
                <span className="text-[10px] text-slate-400 font-bold">{upcomingAppointments.length} Booked</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {upcomingAppointments.slice(0, 4).map((up) => (
                  <div
                    key={up._id}
                    onClick={() => navigate('/appointments')}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-teal-500 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">{up.patientName}</span>
                      <span className="text-[10px] text-slate-500">{up.appointmentDate} • {up.appointmentTime || '10:00 AM'}</span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {up.type || 'Consult'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Emergency Patients, Critical Alerts, Bed & Resource Requests, Vitals (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Panel 1: Active Emergency Patients */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-rose-50/70 border-b border-rose-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-rose-900 font-extrabold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-rose-600 text-base">emergency</span>
                Emergency Department Cases ({emergencyPatients.length})
              </div>
              <button
                onClick={() => navigate('/emergency')}
                className="text-[11px] font-bold text-rose-700 hover:underline"
              >
                ER Desk →
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto custom-scrollbar">
              {emergencyPatients.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No active emergency cases currently assigned.</p>
              ) : (
                emergencyPatients.map((er) => (
                  <div
                    key={er._id}
                    onClick={() => navigate('/emergency')}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{er.patientName}</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-bold">
                          {er.triageLevel?.split('-')[0] || 'Level 1'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Bay: <b>{er.bedOrBayNumber || 'ER-Bay 01'}</b> • Status: <span className="font-bold text-rose-700">{er.conditionStatus}</span>
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 2: Recent Patient Vitals */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
                <span className="material-symbols-outlined text-teal-600 text-base">ecg_heart</span>
                Recent Patient Vitals ({recentVitals.length})
              </div>
              <button
                onClick={() => navigate('/vitals')}
                className="text-[11px] font-bold text-teal-700 hover:underline"
              >
                Vital Logs →
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-[240px] overflow-y-auto custom-scrollbar">
              {recentVitals.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 text-center">No vital records logged yet.</p>
              ) : (
                recentVitals.map((v, i) => (
                  <div
                    key={v._id || i}
                    onClick={() => navigate('/vitals')}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{v.patientName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({v.bedNumber || 'Bed'})</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-[10px] text-slate-600 mt-1">
                        <span>SpO2: <b className={v.oxygenSaturation < 94 ? 'text-rose-600' : 'text-emerald-700'}>{v.oxygenSaturation}%</b></span>
                        <span>Pulse: <b>{v.pulseRate} bpm</b></span>
                        <span>BP: <b>{v.bloodPressure}</b></span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                      v.status === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {v.status || 'Normal'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 3: Pending Admission Bed Requests & Resource Requests */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-purple-600">pending_actions</span>
                My Pending Requests
              </span>
              <span className="text-[10px] text-slate-400 font-bold">
                {(pendingBedRequests.length + pendingResourceRequests.length)} Active
              </span>
            </div>

            {/* Bed Requests */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Admission Bed Requests ({pendingBedRequests.length})</span>
                <button onClick={() => navigate('/bed-requests')} className="text-teal-600 hover:underline text-[10px]">View</button>
              </div>
              {pendingBedRequests.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No pending bed requests.</p>
              ) : (
                pendingBedRequests.map((b) => (
                  <div key={b._id} onClick={() => navigate('/bed-requests')} className="p-2 bg-purple-50/50 rounded-lg border border-purple-100 flex justify-between items-center text-xs cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-800">{b.patientName}</span>
                      <span className="text-[10px] text-slate-500 block">Requested: {b.wardType || 'Ward'} • {b.priority || 'Routine'}</span>
                    </div>
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Pending</span>
                  </div>
                ))
              )}
            </div>

            {/* Resource Requests */}
            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                <span>Medical Resource Requests ({pendingResourceRequests.length})</span>
                <button onClick={() => navigate('/resource-requests')} className="text-teal-600 hover:underline text-[10px]">View</button>
              </div>
              {pendingResourceRequests.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">No pending equipment requests.</p>
              ) : (
                pendingResourceRequests.map((r) => (
                  <div key={r._id} onClick={() => navigate('/resource-requests')} className="p-2 bg-emerald-50/50 rounded-lg border border-emerald-100 flex justify-between items-center text-xs cursor-pointer">
                    <div>
                      <span className="font-bold text-slate-800">{r.resourceType} ({r.patientName || 'Patient'})</span>
                      <span className="text-[10px] text-slate-500 block">Qty: {r.quantity} • {r.urgency || 'Urgent'}</span>
                    </div>
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">Pending</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel 4: Critical Alerts & Notifications */}
          {criticalAlerts.length > 0 && (
            <div className="bg-amber-50/60 rounded-2xl border border-amber-200 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-600 text-base">notifications_active</span>
                  Doctor Priority Alerts ({criticalAlerts.length})
                </span>
                <button onClick={() => navigate('/notifications')} className="text-[10px] font-bold text-amber-800 hover:underline">
                  All Alerts →
                </button>
              </div>
              <div className="space-y-1.5 text-xs">
                {criticalAlerts.slice(0, 3).map((al) => (
                  <div key={al._id} onClick={() => navigate('/notifications')} className="p-2 bg-white rounded-lg border border-amber-200 cursor-pointer">
                    <span className="font-bold text-slate-800 block text-[11px]">{al.title}</span>
                    <p className="text-[10px] text-slate-600 line-clamp-1">{al.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
