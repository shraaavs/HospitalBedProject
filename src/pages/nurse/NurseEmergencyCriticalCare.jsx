import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NurseEmergencyCriticalCare() {
  const navigate = useNavigate();

  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Emergency Nursing Action Modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({
    nursingAction: '',
    criticalFindings: '',
    emergencyNotes: '',
    conditionStatus: 'Critical',
    heartRate: '',
    bloodPressure: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    temperature: '',
    painScore: '8',
    notifyDoctor: true
  });
  const [submittingAction, setSubmittingAction] = useState(false);

  // Resource Request Modal (Nurse creates request instead of direct allocation)
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    resourceType: 'Mechanical Ventilator',
    quantity: 1,
    priority: 'Emergency',
    reason: ''
  });
  const [submittingResource, setSubmittingResource] = useState(false);

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'Nurse';
  const userName = localStorage.getItem('userName') || 'ER Staff Nurse';

  // Fetch Live Emergency Cases from MongoDB
  const fetchEmergencies = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/emergency', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setEmergencies(data);
      if (data.length > 0 && !selectedPatient) {
        setSelectedPatient(data[0]);
      }
    } catch (err) {
      console.error('Error fetching emergency patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 15000); // 15s critical refresh
    return () => clearInterval(interval);
  }, []);

  // Open Nursing Action Modal
  const handleOpenActionModal = (patient) => {
    setSelectedPatient(patient);
    setActionForm({
      nursingAction: '',
      criticalFindings: patient.criticalFindings || '',
      emergencyNotes: '',
      conditionStatus: patient.conditionStatus || 'Critical',
      heartRate: patient.currentVitals?.heartRate || 110,
      bloodPressure: patient.currentVitals?.bloodPressure || '140/90',
      respiratoryRate: patient.currentVitals?.respiratoryRate || 24,
      oxygenSaturation: patient.currentVitals?.oxygenSaturation || 91,
      temperature: patient.currentVitals?.temperature || 98.6,
      painScore: patient.currentVitals?.painScore || 8,
      notifyDoctor: true
    });
    setShowActionModal(true);
  };

  // Submit Emergency Action & Observations
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (!actionForm.nursingAction.trim() && !actionForm.criticalFindings.trim()) {
      Swal.fire('Action Required', 'Please document immediate nursing action taken or critical findings observed.', 'warning');
      return;
    }

    try {
      setSubmittingAction(true);
      const payload = {
        nursingAction: actionForm.nursingAction,
        criticalFindings: actionForm.criticalFindings,
        emergencyNotes: actionForm.emergencyNotes,
        conditionStatus: actionForm.conditionStatus,
        currentVitals: {
          heartRate: Number(actionForm.heartRate),
          bloodPressure: actionForm.bloodPressure,
          respiratoryRate: Number(actionForm.respiratoryRate),
          oxygenSaturation: Number(actionForm.oxygenSaturation),
          temperature: Number(actionForm.temperature),
          painScore: Number(actionForm.painScore)
        },
        notifyDoctor: actionForm.notifyDoctor
      };

      const res = await axios.post(`/api/emergency/${selectedPatient._id}/nurse-log`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Emergency Care Documented',
        text: 'Nursing observations saved and attending doctor alerted in MongoDB.',
        timer: 1800,
        showConfirmButton: false
      });

      setShowActionModal(false);
      fetchEmergencies();
      if (res.data?.emergencyPatient) setSelectedPatient(res.data.emergencyPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to log emergency action.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Open Resource Request Modal
  const handleOpenResourceModal = (patient) => {
    setSelectedPatient(patient);
    setResourceForm({
      resourceType: 'Mechanical Ventilator',
      quantity: 1,
      priority: 'Emergency',
      reason: `STAT equipment needed for ${patient.patientName} (${patient.emergencyId}) due to ${patient.chiefComplaint}.`
    });
    setShowResourceModal(true);
  };

  // Submit Resource Request
  const handleSubmitResourceRequest = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    try {
      setSubmittingResource(true);
      const payload = {
        resourceType: resourceForm.resourceType,
        quantity: Number(resourceForm.quantity) || 1,
        priority: resourceForm.priority,
        reason: resourceForm.reason
      };

      await axios.post(`/api/emergency/${selectedPatient._id}/request-resource`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Resource Request Forwarded',
        text: `Request for ${resourceForm.quantity}x ${resourceForm.resourceType} routed to BioMed/Admin resource allocation team.`,
        timer: 2000,
        showConfirmButton: false
      });

      setShowResourceModal(false);
      fetchEmergencies();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit resource request.', 'error');
    } finally {
      setSubmittingResource(false);
    }
  };

  // Trigger Instant Doctor Alert
  const handleTriggerDoctorAlert = async (patient) => {
    try {
      await axios.post(`/api/emergency/${patient._id}/nurse-log`, {
        nursingAction: 'Nurse triggered urgent STAT physician call button',
        criticalFindings: `Urgent bedside review requested by ${userName}. Patient condition: ${patient.conditionStatus}.`,
        notifyDoctor: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'warning',
        title: '🚨 Attending Doctor Alerted',
        text: `High-priority notification sent to Dr. ${patient.assignedDoctorName}.`,
        timer: 2000,
        showConfirmButton: false
      });
      fetchEmergencies();
    } catch (err) {
      Swal.fire('Error', 'Failed to dispatch alert.', 'error');
    }
  };

  // Filter emergencies
  const filteredEmergencies = emergencies.filter(item => {
    if (priorityFilter !== 'All' && !item.triagePriority?.toLowerCase().includes(priorityFilter.toLowerCase())) return false;
    if (statusFilter !== 'All' && item.conditionStatus !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.patientName || '').toLowerCase().includes(q);
      const matchId = (item.emergencyId || '').toLowerCase().includes(q);
      const matchCustom = (item.patientCustomId || '').toLowerCase().includes(q);
      const matchComplaint = (item.chiefComplaint || '').toLowerCase().includes(q);
      const matchDoc = (item.assignedDoctorName || '').toLowerCase().includes(q);
      const matchDiag = (item.emergencyDiagnosis || '').toLowerCase().includes(q);
      return matchName || matchId || matchCustom || matchComplaint || matchDoc || matchDiag;
    }
    return true;
  });

  const criticalCount = emergencies.filter(e => e.conditionStatus === 'Critical' || e.conditionStatus === 'Severe' || e.triagePriority?.includes('Red')).length;
  const activeCount = emergencies.filter(e => e.disposition?.status === 'Active in ER' || !e.disposition?.status?.includes('Discharged')).length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
                  <span className="material-symbols-outlined text-2xl animate-pulse">emergency</span>
                </span>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Emergency & Critical Care Nursing
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 uppercase tracking-wider">
                      Module 8
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live triage tracking, critical vital alerts, immediate nursing actions, and resource request escalation
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchEmergencies}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Live Poll
              </button>

              <div className="px-3 py-1.5 bg-rose-50 rounded-xl border border-rose-200 text-xs font-bold text-rose-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span>
                Emergency Bay Live Telemetry
              </div>
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total ER Cases</span>
                <span className="text-lg font-black text-slate-800">{emergencies.length}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">format_list_bulleted</span>
            </div>

            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-0.5">Critical Acuity (Red)</span>
                <span className="text-lg font-black text-rose-700">{criticalCount}</span>
              </div>
              <span className="material-symbols-outlined text-rose-500 animate-pulse">crisis_alert</span>
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Active In ER</span>
                <span className="text-lg font-black text-amber-700">{activeCount}</span>
              </div>
              <span className="material-symbols-outlined text-amber-500">pending</span>
            </div>

            <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Equipment Requests</span>
                <span className="text-lg font-black text-blue-700">
                  {emergencies.reduce((acc, e) => acc + (e.requestedResources?.length || 0), 0)}
                </span>
              </div>
              <span className="material-symbols-outlined text-blue-500">medical_services</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Resource Delegation Notice */}
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-xl">
              <span className="material-symbols-outlined text-amber-400">hub</span>
            </span>
            <div>
              <p className="font-bold text-sm">Critical Care Equipment Protocol</p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                When ventilators, monitors, or infusion pumps are needed, submit a <strong>Resource Request</strong> to trigger dispatch from Central BioMed & Inventory.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 font-bold text-[10px] rounded-full border border-amber-400/30 uppercase tracking-wider">
            Safe Resource Pipeline
          </span>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search emergency ID, patient, doctor, diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              <option value="All">Triage: All Levels</option>
              <option value="Red">🔴 Red (Immediate)</option>
              <option value="Orange">🟠 Orange (Very Urgent)</option>
              <option value="Yellow">🟡 Yellow (Urgent)</option>
              <option value="Green">🟢 Green (Standard)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              <option value="All">Condition: All</option>
              <option value="Critical">Critical</option>
              <option value="Severe">Severe</option>
              <option value="Unstable">Unstable</option>
              <option value="Guarded">Guarded</option>
              <option value="Stable">Stable</option>
            </select>
          </div>
        </div>

        {/* 2-Column Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Emergency Feed (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-rose-600">emergency</span>
                Emergency Triage Queue ({filteredEmergencies.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Auto-sorted by Acuity</span>
            </div>

            {loading ? (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-rose-600 border-t-transparent"></div>
                <p className="text-xs font-semibold">Loading Live Emergency Records...</p>
              </div>
            ) : filteredEmergencies.length === 0 ? (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">verified</span>
                <p className="text-xs font-bold text-slate-600">No active emergency cases in triage queue</p>
                <p className="text-[11px] text-slate-400">All emergency patients have been stabilized or transferred.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredEmergencies.map((emg) => {
                  const isSelected = selectedPatient?._id === emg._id;
                  const isRed = emg.triagePriority?.includes('Red') || emg.conditionStatus === 'Critical';

                  return (
                    <div
                      key={emg._id}
                      onClick={() => setSelectedPatient(emg)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2.5 relative ${
                        isSelected
                          ? 'bg-rose-50/50 border-rose-600 shadow-md ring-1 ring-rose-600'
                          : isRed
                          ? 'bg-white border-rose-200 hover:border-rose-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Row: Name, ID, Triage Badge */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{emg.patientName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
                            {emg.emergencyId}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isRed
                            ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {emg.conditionStatus}
                        </span>
                      </div>

                      {/* Location & Chief Complaint */}
                      <div className="space-y-1">
                        <p className="text-[11px] text-slate-500 font-semibold flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                          {emg.currentLocation || 'ER Bay 01'} • Arrived: {new Date(emg.arrivalTime || emg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({emg.arrivalMode || 'Ambulance'})
                        </p>
                        <p className="text-slate-800 font-bold bg-slate-50 p-2 rounded-xl border border-slate-100 line-clamp-1">
                          Chief Complaint: {emg.chiefComplaint}
                        </p>
                      </div>

                      {/* Vital Alerts Pills */}
                      {emg.vitalAlerts && emg.vitalAlerts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {emg.vitalAlerts.map((alert, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-black text-[9px] border border-rose-200">
                              ⚠️ {alert}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                          <span>SpO2: <strong className="text-slate-800">{emg.currentVitals?.oxygenSaturation || 98}%</strong></span>
                          <span>•</span>
                          <span>HR: <strong className="text-slate-800">{emg.currentVitals?.heartRate || 80} bpm</strong></span>
                          <span>•</span>
                          <span>BP: <strong className="text-slate-800">{emg.currentVitals?.bloodPressure || '120/80'}</strong></span>
                        </div>
                      )}

                      {/* Footer: Doctor Assignment */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span className="text-teal-700 font-semibold">Doctor: {emg.assignedDoctorName}</span>
                        <span>{emg.triagePriority}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Inpatient Resuscitation & Nursing Actions (7 Cols) */}
          <div className="lg:col-span-7">
            {selectedPatient ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden sticky top-24">
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 text-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-rose-600 text-white rounded font-bold text-xs">
                        {selectedPatient.emergencyId}
                      </span>
                      <h2 className="text-lg font-black tracking-tight">{selectedPatient.patientName}</h2>
                      <span className="text-xs text-slate-400 font-medium">({selectedPatient.age} yrs • {selectedPatient.gender})</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                      <span>{selectedPatient.currentLocation || 'Emergency Bay'}</span>
                      <span>•</span>
                      <span>Doctor: {selectedPatient.assignedDoctorName}</span>
                      <span>•</span>
                      <span>Priority: <strong className="text-rose-400">{selectedPatient.triagePriority}</strong></span>
                    </p>
                  </div>

                  <button
                    onClick={() => handleTriggerDoctorAlert(selectedPatient)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl border border-rose-400/30 flex items-center gap-1.5 transition-all animate-pulse"
                  >
                    <span className="material-symbols-outlined text-sm">notifications_active</span>
                    STAT Doctor Alert
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto text-xs">
                  {/* Critical Findings & Chief Complaint */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Chief Complaint & Intake
                      </span>
                      <p className="text-xs font-bold text-slate-800">{selectedPatient.chiefComplaint}</p>
                      {selectedPatient.arrivalNotes && (
                        <p className="text-[10px] text-slate-500 mt-1 italic">"{selectedPatient.arrivalNotes}"</p>
                      )}
                    </div>

                    <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                        Critical Findings / Acuity
                      </span>
                      <p className="text-xs font-black text-rose-950">
                        {selectedPatient.criticalFindings || selectedPatient.conditionStatus || 'Acute clinical presentation under resuscitation'}
                      </p>
                      <p className="text-[10px] text-rose-700 font-semibold mt-1">Status: {selectedPatient.conditionStatus}</p>
                    </div>
                  </div>

                  {/* Real-time Vital Sign Telemetry */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Bedside Vital Signs & Alerts
                      </span>
                      <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping"></span> Live Monitor
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className={`p-2.5 rounded-xl border ${selectedPatient.currentVitals?.oxygenSaturation < 92 ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-[9px] font-bold uppercase block">SpO2 Oxygen</span>
                        <span className="text-sm font-black">{selectedPatient.currentVitals?.oxygenSaturation ?? 90}%</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${selectedPatient.currentVitals?.heartRate > 115 ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-white border-slate-200'}`}>
                        <span className="text-[9px] font-bold uppercase block">Heart Rate</span>
                        <span className="text-sm font-black">{selectedPatient.currentVitals?.heartRate ?? 110} bpm</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Blood Pressure</span>
                        <span className="text-sm font-black text-slate-800">{selectedPatient.currentVitals?.bloodPressure || '140/90'}</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-400 uppercase block">Resp Rate</span>
                        <span className="text-sm font-black text-slate-800">{selectedPatient.currentVitals?.respiratoryRate ?? 22}/min</span>
                      </div>
                    </div>
                  </div>

                  {/* Required Resources & Equipment */}
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-blue-700">medical_services</span>
                        Required Equipment & Medical Resources
                      </h4>
                      <button
                        onClick={() => handleOpenResourceModal(selectedPatient)}
                        className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-[11px] rounded-lg shadow-xs flex items-center gap-1 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Request Resource
                      </button>
                    </div>

                    {selectedPatient.requestedResources && selectedPatient.requestedResources.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedPatient.requestedResources.map((resItem, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-xl border border-blue-100 flex items-center justify-between">
                            <span className="font-bold text-slate-800">{resItem.resourceType}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              Status: {resItem.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">
                        No active resource requests dispatched for this patient. Click "Request Resource" above if ventilator, oxygen, or monitor is required.
                      </p>
                    )}
                  </div>

                  {/* Actions Taken & Nursing Log */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Emergency Clinical & Nursing Action History
                    </span>
                    {selectedPatient.actionsTaken && selectedPatient.actionsTaken.length > 0 ? (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto">
                        {selectedPatient.actionsTaken.map((act, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-slate-100 text-[11px]">
                            <p className="font-semibold text-slate-800">{act.action}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              By {act.performedBy} at {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic text-[11px]">No actions documented yet.</p>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    <button
                      onClick={() => handleOpenActionModal(selectedPatient)}
                      className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">clinical_notes</span>
                      Record Emergency Action & Vitals
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-5xl text-slate-300">emergency</span>
                <h3 className="font-bold text-slate-700 text-sm">Select an Emergency Inpatient</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click on any patient from the triage queue on the left to inspect real-time acuity, vital alerts, and document nursing resuscitation actions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record Emergency Action Modal */}
      {showActionModal && selectedPatient && typeof document !== 'undefined' && createPortal(
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
            if (e.target === e.currentTarget) setShowActionModal(false);
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
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400">emergency</span>
                  Record Emergency Nursing Action
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Document resuscitation & vital findings for {selectedPatient.patientName} ({selectedPatient.emergencyId})
                </p>
              </div>
              <button onClick={() => setShowActionModal(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAction} className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {/* Condition Status */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Patient Acuity Condition *</label>
                <select
                  value={actionForm.conditionStatus}
                  onChange={(e) => setActionForm({ ...actionForm, conditionStatus: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  <option value="Critical">Critical (STAT High Alert)</option>
                  <option value="Severe">Severe (Unstable Vitals)</option>
                  <option value="Unstable">Unstable</option>
                  <option value="Guarded">Guarded</option>
                  <option value="Stabilizing">Stabilizing</option>
                  <option value="Stable">Stable</option>
                </select>
              </div>

              {/* Immediate Action Taken */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Immediate Nursing Action Taken *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High-flow O2 via non-rebreather at 10L/min, IV access secured with 18G cannula..."
                  value={actionForm.nursingAction}
                  onChange={(e) => setActionForm({ ...actionForm, nursingAction: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                />
              </div>

              {/* Critical Findings */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Critical Clinical Findings</label>
                <input
                  type="text"
                  placeholder="e.g. Bilateral crepitations, altered sensorium, severe epigastric guarding..."
                  value={actionForm.criticalFindings}
                  onChange={(e) => setActionForm({ ...actionForm, criticalFindings: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                />
              </div>

              {/* Vital Signs Grid */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Bedside Emergency Vitals</span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5">SpO2 (%)</label>
                    <input
                      type="number"
                      value={actionForm.oxygenSaturation}
                      onChange={(e) => setActionForm({ ...actionForm, oxygenSaturation: e.target.value })}
                      className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={actionForm.heartRate}
                      onChange={(e) => setActionForm({ ...actionForm, heartRate: e.target.value })}
                      className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Blood Pressure</label>
                    <input
                      type="text"
                      value={actionForm.bloodPressure}
                      onChange={(e) => setActionForm({ ...actionForm, bloodPressure: e.target.value })}
                      className="w-full p-1.5 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Notes */}
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Emergency Notes & Directives</label>
                <textarea
                  rows={2}
                  placeholder="Additional observations, response to resuscitation, or family communication..."
                  value={actionForm.emergencyNotes}
                  onChange={(e) => setActionForm({ ...actionForm, emergencyNotes: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                ></textarea>
              </div>

              {/* Notify Doctor Toggle */}
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-rose-900 text-xs">Notify Attending Doctor Immediately</p>
                  <p className="text-[10px] text-rose-700">Dispatches high-priority notification to Dr. {selectedPatient.assignedDoctorName}</p>
                </div>
                <input
                  type="checkbox"
                  checked={actionForm.notifyDoctor}
                  onChange={(e) => setActionForm({ ...actionForm, notifyDoctor: e.target.checked })}
                  className="w-4 h-4 accent-rose-600"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {submittingAction ? 'Saving...' : 'Save & Disclose to Care Team'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Resource Request Modal */}
      {showResourceModal && selectedPatient && typeof document !== 'undefined' && createPortal(
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
            if (e.target === e.currentTarget) setShowResourceModal(false);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '540px',
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
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">medical_services</span>
                  Request Critical Medical Equipment
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Route request to Central Resource Allocation for {selectedPatient.patientName}
                </p>
              </div>
              <button onClick={() => setShowResourceModal(false)} className="text-slate-400 hover:text-white">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitResourceRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Equipment / Resource *</label>
                <select
                  value={resourceForm.resourceType}
                  onChange={(e) => setResourceForm({ ...resourceForm, resourceType: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  <option value="Mechanical Ventilator">Mechanical Ventilator</option>
                  <option value="High-Flow Oxygen Concentrator">High-Flow Oxygen Concentrator</option>
                  <option value="Multiparameter Bedside Monitor">Multiparameter Bedside Monitor</option>
                  <option value="Defibrillator with Pacing">Defibrillator with Pacing</option>
                  <option value="Infusion Syringe Pump">Infusion Syringe Pump</option>
                  <option value="Suction Apparatus">Suction Apparatus</option>
                  <option value="Emergency Intubation Set">Emergency Intubation Set</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={resourceForm.quantity}
                    onChange={(e) => setResourceForm({ ...resourceForm, quantity: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Priority Level *</label>
                  <select
                    value={resourceForm.priority}
                    onChange={(e) => setResourceForm({ ...resourceForm, priority: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-rose-800"
                  >
                    <option value="Emergency">🚨 Emergency (Immediate)</option>
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Clinical Justification / Reason *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Provide urgent justification for equipment need..."
                  value={resourceForm.reason}
                  onChange={(e) => setResourceForm({ ...resourceForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResourceModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResource}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  {submittingResource ? 'Dispatching...' : 'Dispatch Request to BioMed'}
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
