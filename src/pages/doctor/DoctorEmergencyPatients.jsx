import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DoctorEmergencyPatients() {
  const [emergencies, setEmergencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [savingAssessment, setSavingAssessment] = useState(false);

  // Filters & Search
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Assessment Form State
  const [assessmentData, setAssessmentData] = useState({
    emergencyDiagnosis: '',
    immediateTreatment: '',
    criticalFindings: '',
    requiredBedType: 'ICU Bed',
    requiredMedicalResources: [],
    emergencyMedicalNotes: '',
    treatmentInstructions: '',
    conditionStatus: 'Critical'
  });

  // Bed Escalation Modal
  const [isBedModalOpen, setIsBedModalOpen] = useState(false);
  const [hospitalBeds, setHospitalBeds] = useState([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [bedEscalationData, setBedEscalationData] = useState({
    requestedWard: 'ICU',
    bedType: 'ICU Bed',
    requestedBedNumber: '',
    reason: '',
    priority: 'Emergency'
  });

  // Resource Escalation Modal
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [resourceEscalationData, setResourceEscalationData] = useState({
    resourceType: 'Ventilator',
    quantity: 1,
    reason: '',
    priority: 'Emergency'
  });

  const availableResourceOptions = [
    'Ventilator',
    'Cardiac Monitor',
    'Oxygen Cylinder',
    'Infusion Pump',
    'Defibrillator',
    'Suction Machine',
    'Dialysis Machine',
    'Syringe Pump',
    'Wheelchair'
  ];

  const fetchHospitalBeds = async () => {
    try {
      setLoadingBeds(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/beds', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHospitalBeds(res.data || []);
    } catch (err) {
      console.error('Error fetching beds:', err);
    } finally {
      setLoadingBeds(false);
    }
  };

  const fetchEmergencies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/emergency', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data || [];
      setEmergencies(data);

      if (data.length > 0) {
        if (!selectedEmergency) {
          handleSelectEmergency(data[0]);
        } else {
          const updatedSelected = data.find(d => d._id === selectedEmergency._id);
          if (updatedSelected) handleSelectEmergency(updatedSelected);
        }
      }
    } catch (err) {
      console.error('Error fetching emergency patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmergencies();
    fetchHospitalBeds();
  }, []);

  const handleSelectEmergency = (emg) => {
    setSelectedEmergency(emg);
    setAssessmentData({
      emergencyDiagnosis: emg.emergencyDiagnosis || '',
      immediateTreatment: emg.immediateTreatment || '',
      criticalFindings: emg.criticalFindings || '',
      requiredBedType: emg.requiredBedType || 'ICU Bed',
      requiredMedicalResources: emg.requiredMedicalResources || [],
      emergencyMedicalNotes: emg.emergencyMedicalNotes || '',
      treatmentInstructions: emg.treatmentInstructions || '',
      conditionStatus: emg.conditionStatus || 'Critical'
    });
  };

  const handleToggleResourceCheck = (resName) => {
    setAssessmentData(prev => {
      const exists = prev.requiredMedicalResources.includes(resName);
      return {
        ...prev,
        requiredMedicalResources: exists
          ? prev.requiredMedicalResources.filter(r => r !== resName)
          : [...prev.requiredMedicalResources, resName]
      };
    });
  };

  const handleSaveAssessment = async (e) => {
    e.preventDefault();
    if (!selectedEmergency) return;

    if (!assessmentData.emergencyDiagnosis.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Diagnosis',
        text: 'Please enter the Emergency Clinical Diagnosis.'
      });
      return;
    }

    try {
      setSavingAssessment(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post(`/api/emergency/${selectedEmergency._id}/assessment`, assessmentData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Emergency Assessment Saved',
        text: `Clinical assessment for ${selectedEmergency.patientName} recorded and linked to Patient Dossier in MongoDB.`,
        timer: 2000,
        showConfirmButton: false
      });

      const updated = res.data?.emergency;
      if (updated) {
        setEmergencies(prev => prev.map(p => p._id === updated._id ? updated : p));
        setSelectedEmergency(updated);
      } else {
        fetchEmergencies();
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Save Assessment',
        text: err.response?.data?.message || 'Error recording assessment'
      });
    } finally {
      setSavingAssessment(false);
    }
  };

  // Escalate ICU Bed Request
  const handleEscalateBed = async (e) => {
    e.preventDefault();
    if (!selectedEmergency) return;

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post(`/api/emergency/${selectedEmergency._id}/escalate-bed`, {
        requestedWard: bedEscalationData.requestedWard,
        bedType: bedEscalationData.bedType,
        requestedBedNumber: bedEscalationData.requestedBedNumber || '',
        reason: bedEscalationData.reason || `Emergency ICU bed required for ${selectedEmergency.patientName} (${selectedEmergency.emergencyDiagnosis || selectedEmergency.chiefComplaint})`,
        priority: 'Emergency'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Emergency Bed Requisition Dispatched',
        text: res.data?.message || 'Bed request forwarded to Bed Management Administration.',
        timer: 2500,
        showConfirmButton: false
      });

      setIsBedModalOpen(false);
      fetchEmergencies();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit bed request', 'error');
    }
  };

  // Direct Bed Allocation for Emergency Patient (One-click allocate on available bed)
  const handleDirectAllocateBed = async (bed) => {
    if (!selectedEmergency || !bed) return;

    const result = await Swal.fire({
      title: `Allocate Bed ${bed.bedNumber}?`,
      html: `
        <div style="text-align: left; font-size: 13px; color: #334155; line-height: 1.6;">
          <p>You are allocating <strong>${bed.wardType || bedEscalationData.requestedWard} Bed ${bed.bedNumber}</strong> directly to:</p>
          <div style="background: #f1f5f9; padding: 10px; border-radius: 8px; margin: 8px 0; border: 1px solid #cbd5e1;">
            <p><strong>Patient:</strong> ${selectedEmergency.patientName} (${selectedEmergency.patientCustomId || selectedEmergency.emergencyId})</p>
            <p><strong>Diagnosis:</strong> ${assessmentData.emergencyDiagnosis || selectedEmergency.chiefComplaint}</p>
          </div>
          <p style="color: #0d9488; font-weight: bold;">✓ Will immediately update Nursing Station and Doctor portals.</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0d9488',
      cancelButtonColor: '#64748b',
      confirmButtonText: `Yes, Allocate Bed ${bed.bedNumber}`,
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post(`/api/emergency/${selectedEmergency._id}/allocate-bed`, {
        bedId: bed._id,
        bedNumber: bed.bedNumber,
        requestedWard: bed.wardType || bedEscalationData.requestedWard,
        notes: `Direct allocation to ${bed.wardType} Bed ${bed.bedNumber} by ${selectedEmergency.assignedDoctorName || 'Attending Doctor'}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Bed Allocated Successfully!',
        html: `
          <div style="text-align: left; font-size: 13px; color: #1e293b;">
            <p><strong>Bed ${bed.bedNumber}</strong> is now assigned to <strong>${selectedEmergency.patientName}</strong>.</p>
            <p style="margin-top: 6px; color: #0284c7;">Synchronized in real-time across Nurse & Doctor dashboards.</p>
          </div>
        `,
        timer: 3000,
        showConfirmButton: true,
        confirmButtonColor: '#0d9488'
      });

      setIsBedModalOpen(false);
      fetchEmergencies();
      fetchHospitalBeds();
    } catch (err) {
      Swal.fire('Allocation Failed', err.response?.data?.message || 'Failed to allocate bed.', 'error');
    }
  };

  // Escalate Resource Request
  const handleEscalateResource = async (e) => {
    e.preventDefault();
    if (!selectedEmergency) return;

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post(`/api/emergency/${selectedEmergency._id}/request-resource`, {
        resourceType: resourceEscalationData.resourceType,
        quantity: resourceEscalationData.quantity,
        reason: resourceEscalationData.reason || `Emergency equipment requirement for ${selectedEmergency.patientName} in ${selectedEmergency.currentLocation}`,
        priority: 'Emergency'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Equipment Requisition Dispatched',
        text: res.data?.message || 'Emergency resource request sent to BioMed / Resource Coordinator.',
        timer: 2500,
        showConfirmButton: false
      });

      setIsResourceModalOpen(false);
      fetchEmergencies();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit resource request', 'error');
    }
  };

  const filteredEmergencies = emergencies.filter(emg => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (emg.patientName || '').toLowerCase().includes(term) ||
                          (emg.patientCustomId || '').toLowerCase().includes(term) ||
                          (emg.emergencyId || '').toLowerCase().includes(term) ||
                          (emg.chiefComplaint || '').toLowerCase().includes(term) ||
                          (emg.currentLocation || '').toLowerCase().includes(term) ||
                          (emg.emergencyDiagnosis || '').toLowerCase().includes(term);

    const matchesPriority = priorityFilter === 'All' || (emg.triagePriority || '').toLowerCase().includes(priorityFilter.toLowerCase());
    const matchesCondition = conditionFilter === 'All' || emg.conditionStatus === conditionFilter;

    return matchesSearch && matchesPriority && matchesCondition;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-2xl animate-pulse">crisis_alert</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Emergency Care & Acute Triage</h1>
              <span className="px-2.5 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded-full uppercase tracking-wider animate-pulse">
                Live Trauma Feed
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Doctor Emergency Command • Rapid Clinical Assessment, Resuscitation Notes, Bed & Equipment Escalation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <button
            onClick={() => fetchEmergencies()}
            className="px-3.5 py-2 bg-white border border-rose-200 hover:bg-rose-50 text-rose-800 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <span className="material-symbols-outlined text-base">refresh</span>
            Refresh ER Queue
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">emergency</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Active ER Patients</p>
            <p className="text-xl font-black text-rose-700">{emergencies.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">vital_signs</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Red / Resuscitation</p>
            <p className="text-xl font-black text-slate-900">
              {emergencies.filter(e => (e.triagePriority || '').includes('Red')).length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">warning</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Critical / Unstable</p>
            <p className="text-xl font-black text-amber-700">
              {emergencies.filter(e => e.conditionStatus === 'Critical' || e.conditionStatus === 'Unstable').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">medical_services</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Assigned Staff</p>
            <p className="text-xl font-black text-teal-700">Trauma Team Active</p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Emergency Patients Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search by Patient, ID, Emergency # or Location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs pb-1">
              <div className="flex items-center gap-1">
                {['All', 'Red', 'Orange', 'Yellow'].map(pr => (
                  <button
                    key={pr}
                    onClick={() => setPriorityFilter(pr)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap ${
                      priorityFilter === pr
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {pr === 'All' ? 'All Priorities' : pr}
                  </button>
                ))}
              </div>

              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="p-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white"
              >
                <option value="All">All Conditions</option>
                <option value="Critical">Critical</option>
                <option value="Unstable">Unstable</option>
                <option value="Stabilizing">Stabilizing</option>
                <option value="Stable">Stable</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-rose-600 mb-1">progress_activity</span>
                <p>Loading trauma bay records...</p>
              </div>
            ) : filteredEmergencies.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">health_and_safety</span>
                <p>No emergency patients match the filter.</p>
              </div>
            ) : (
              filteredEmergencies.map(emg => {
                const isSelected = selectedEmergency?._id === emg._id;
                const isRed = (emg.triagePriority || '').includes('Red');
                const isOrange = (emg.triagePriority || '').includes('Orange');

                return (
                  <div
                    key={emg._id}
                    onClick={() => handleSelectEmergency(emg)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-rose-50/80 border-l-4 border-rose-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900">{emg.patientName}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-rose-50 text-rose-800 rounded font-bold border border-rose-100">
                            {emg.emergencyId}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {emg.age}y / {emg.gender}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-semibold mt-0.5 line-clamp-1">
                          {emg.chiefComplaint}
                        </p>
                      </div>

                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        isRed ? 'bg-rose-600 text-white animate-pulse' :
                        isOrange ? 'bg-amber-500 text-white' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {emg.triagePriority?.split(' - ')[0] || 'Triage'}
                      </span>
                    </div>

                    {/* Location, Nurse & Vitals summary */}
                    {/* Assigned Doctor & Department */}
                    <div className="mt-2 p-1.5 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-between gap-1 text-[11px]">
                      <span className="flex items-center gap-1 font-bold text-teal-900 truncate">
                        <span className="material-symbols-outlined text-sm text-teal-700">stethoscope</span>
                        <span>{emg.assignedDoctorName || 'Dr. On Duty'}</span>
                      </span>
                      <span className="text-[10px] font-bold text-teal-800 bg-white px-1.5 py-0.2 rounded border border-teal-200 shrink-0">
                        {emg.department || 'Emergency'}
                      </span>
                    </div>

                    {/* Location & Nurse summary */}
                    <div className="mt-1.5 grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                      <div className="truncate">
                        <span className="text-slate-500">Loc: </span>
                        <strong className="text-slate-900">{emg.currentLocation || 'ER Bay'}</strong>
                      </div>
                      <div className="truncate text-right">
                        <span className="text-slate-500">Nurse: </span>
                        <strong className="text-slate-900">{emg.assignedNurseName || 'ER Nurse'}</strong>
                      </div>
                    </div>

                    {/* Vitals & Alerts Strip */}
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        (emg.currentVitals?.oxygenSaturation || 100) < 90 ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        SpO₂: {emg.currentVitals?.oxygenSaturation || '--'}%
                      </span>
                      <span className={`px-2 py-0.5 rounded-md font-bold ${
                        (emg.currentVitals?.heartRate || 80) > 120 ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-700'
                      }`}>
                        HR: {emg.currentVitals?.heartRate || '--'} bpm
                      </span>
                      <span className="px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-700">
                        BP: {emg.currentVitals?.bloodPressure || '--'}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span>Condition: <strong className="text-rose-700">{emg.conditionStatus || 'Critical'}</strong></span>
                      <span>Arrived: {new Date(emg.arrivalTime || emg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Emergency Assessment & Rapid Requisition Suite (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {!selectedEmergency ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">crisis_alert</span>
              <p className="text-xs font-semibold">Select an emergency patient from the queue to start trauma clinical assessment.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header Info */}
              <div className="p-4 border-b border-slate-200 bg-rose-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedEmergency.patientName}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md">
                      {selectedEmergency.emergencyId}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md border border-indigo-100">
                      {selectedEmergency.currentLocation || 'ER Bay'}
                    </span>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-teal-100 text-teal-950 font-bold border border-teal-300 flex items-center gap-1 shadow-2xs">
                      <span className="material-symbols-outlined text-sm text-teal-700">stethoscope</span>
                      <span>Assigned Doctor: <strong>{selectedEmergency.assignedDoctorName || 'Dr. On Duty'}</strong></span>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      Nurse: <strong>{selectedEmergency.assignedNurseName || 'ER Nurse'}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium border border-slate-200">
                      Arrival: <strong>{new Date(selectedEmergency.arrivalTime || selectedEmergency.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> ({selectedEmergency.arrivalMode})
                    </span>
                  </div>
                </div>

                {/* Direct Escalation Action Buttons */}
                <div className="flex items-center gap-2">
                  {(() => {
                    const isBedAlreadyRequested = Boolean(
                      selectedEmergency.bedRequested ||
                      selectedEmergency.allocatedBedNumber ||
                      selectedEmergency.allocatedBedId ||
                      (selectedEmergency.actionsTaken && selectedEmergency.actionsTaken.some(a => a.action && a.action.includes('Escalated to Bed Management')))
                    );

                    return (
                      <button
                        type="button"
                        disabled={isBedAlreadyRequested}
                        onClick={() => {
                          if (isBedAlreadyRequested) return;
                          fetchHospitalBeds();
                          setBedEscalationData(prev => ({
                            ...prev,
                            requestedWard: 'ICU',
                            bedType: 'ICU Bed',
                            reason: `Emergency ICU escalation required for ${selectedEmergency.patientName}: ${assessmentData.emergencyDiagnosis || selectedEmergency.chiefComplaint}`
                          }));
                          setIsBedModalOpen(true);
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs ${
                          isBedAlreadyRequested
                            ? 'bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed opacity-80'
                            : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer active:scale-95'
                        }`}
                        title={isBedAlreadyRequested ? 'ICU bed request has already been submitted for this patient' : 'Request ICU Bed'}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isBedAlreadyRequested ? 'task_alt' : 'single_bed'}
                        </span>
                        <span>{isBedAlreadyRequested ? 'ICU Bed Requested' : 'Request ICU Bed'}</span>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => {
                      setResourceEscalationData(prev => ({
                        ...prev,
                        reason: `Emergency equipment requirement for ${selectedEmergency.patientName} in ${selectedEmergency.currentLocation}`
                      }));
                      setIsResourceModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                    title="Request emergency equipment and medical resources"
                  >
                    <span className="material-symbols-outlined text-base">medical_services</span>
                    <span>Request Equipment</span>
                  </button>
                </div>
              </div>

              {/* Patient Vitals Alert Banner */}
              <div className="p-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-teal-400 text-sm">air</span>
                    <span>SpO₂: <strong className={selectedEmergency.currentVitals?.oxygenSaturation < 90 ? 'text-rose-400 font-black' : 'text-teal-300'}>{selectedEmergency.currentVitals?.oxygenSaturation || '--'}%</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-rose-400 text-sm">favorite</span>
                    <span>HR: <strong className={selectedEmergency.currentVitals?.heartRate > 120 ? 'text-rose-400 font-black' : 'text-white'}>{selectedEmergency.currentVitals?.heartRate || '--'} bpm</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-indigo-300 text-sm">speed</span>
                    <span>BP: <strong>{selectedEmergency.currentVitals?.bloodPressure || '--'}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-300 text-sm">thermostat</span>
                    <span>Temp: <strong>{selectedEmergency.currentVitals?.temperature || '--'}°F</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Condition:</span>
                  <select
                    value={assessmentData.conditionStatus}
                    onChange={(e) => setAssessmentData({ ...assessmentData, conditionStatus: e.target.value })}
                    className="p-1 text-xs font-bold bg-slate-800 text-white rounded-lg border border-slate-700 focus:outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="Severe">Severe</option>
                    <option value="Unstable">Unstable</option>
                    <option value="Guarded">Guarded</option>
                    <option value="Stabilizing">Stabilizing</option>
                    <option value="Stable">Stable</option>
                  </select>
                </div>
              </div>

              {/* Form Body: Clinical Emergency Assessment */}
              <form onSubmit={handleSaveAssessment} className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[520px]">
                {/* Chief Complaint Display */}
                <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-200 space-y-1">
                  <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider block">
                    Chief Presenting Complaint on Triage
                  </span>
                  <p className="text-xs text-rose-950 font-semibold">{selectedEmergency.chiefComplaint}</p>
                </div>

                {/* Line 1: Emergency Diagnosis & Required Bed Type */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Emergency Clinical Diagnosis *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acute STEMI - Anterolateral Wall / Status Asthmaticus"
                      value={assessmentData.emergencyDiagnosis}
                      onChange={(e) => setAssessmentData({ ...assessmentData, emergencyDiagnosis: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600 font-bold"
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <label className="text-xs font-bold text-slate-700 block mb-1">Required Bed / ICU Type</label>
                    <select
                      value={assessmentData.requiredBedType}
                      onChange={(e) => setAssessmentData({ ...assessmentData, requiredBedType: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600 bg-white font-semibold"
                    >
                      <option value="ICU Bed">ICU Bed (Critical Care)</option>
                      <option value="Cardiac Monitor Bed">Cardiac Monitor Bed (CCU)</option>
                      <option value="Ventilator Bed">Ventilator Bed</option>
                      <option value="Emergency Bay">Emergency Trauma Bay</option>
                      <option value="Special Ward">Special Ward</option>
                      <option value="General Ward">General Ward</option>
                    </select>
                  </div>
                </div>

                {/* Line 2: Immediate Treatment & Critical Findings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Immediate Resuscitation Treatment Administered
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Aspirin 325mg PO, IV Heparin bolus, O2 4L via nasal cannula, sublingual NTG..."
                      value={assessmentData.immediateTreatment}
                      onChange={(e) => setAssessmentData({ ...assessmentData, immediateTreatment: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Critical Physical / Lab Findings</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. ST elevations in leads V1-V4, bilateral crackles, GCS 14, high troponin I..."
                      value={assessmentData.criticalFindings}
                      onChange={(e) => setAssessmentData({ ...assessmentData, criticalFindings: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600"
                    />
                  </div>
                </div>

                {/* Line 3: Required Medical Resources Checklist */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                    Required Emergency Medical Equipment & Resources:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableResourceOptions.map((resName, idx) => {
                      const isChecked = assessmentData.requiredMedicalResources.includes(resName);
                      return (
                        <label
                          key={idx}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                            isChecked
                              ? 'bg-rose-50 border-rose-400 text-rose-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleResourceCheck(resName)}
                            className="rounded text-rose-600 focus:ring-rose-500"
                          />
                          <span>{resName}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Line 4: Treatment Instructions & Emergency Medical Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Doctor's Emergency Medical Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Confidential medical notes, differential diagnoses, procedural complications..."
                      value={assessmentData.emergencyMedicalNotes}
                      onChange={(e) => setAssessmentData({ ...assessmentData, emergencyMedicalNotes: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Immediate Nursing & Treatment Instructions</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Check neuro vitals q15min; keep Cath lab standby; strict NPO..."
                      value={assessmentData.treatmentInstructions}
                      onChange={(e) => setAssessmentData({ ...assessmentData, treatmentInstructions: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-rose-600"
                    />
                  </div>
                </div>

                {/* Submit Assessment Button */}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500 italic">
                    Records link to MongoDB: Patient ID + Doctor ID + Emergency ID
                  </span>
                  <button
                    type="submit"
                    disabled={savingAssessment}
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">verified</span>
                    {savingAssessment ? 'Saving Assessment...' : 'Save Emergency Clinical Assessment'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: ESCALATE ICU / BED REQUEST */}
      {isBedModalOpen && selectedEmergency && typeof document !== 'undefined' && createPortal(
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
            if (e.target === e.currentTarget) setIsBedModalOpen(false);
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
            <div className="p-4 bg-rose-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">single_bed</span>
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">Escalate Emergency ICU Bed Requisition</h3>
                  <p className="text-xs text-rose-100 mt-0.5">Authorize urgent bed allocation for trauma patient</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsBedModalOpen(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEscalateBed} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <p><strong>Patient:</strong> {selectedEmergency.patientName} ({selectedEmergency.emergencyId})</p>
                <p><strong>Diagnosis:</strong> {assessmentData.emergencyDiagnosis || selectedEmergency.chiefComplaint}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Ward *</label>
                  <select
                    value={bedEscalationData.requestedWard}
                    onChange={(e) => {
                      const ward = e.target.value;
                      let defaultBedType = 'ICU Bed';
                      if (ward === 'CCU') defaultBedType = 'Cardiac Monitor Bed';
                      if (ward === 'Emergency') defaultBedType = 'Emergency Bay';
                      setBedEscalationData({ 
                        ...bedEscalationData, 
                        requestedWard: ward,
                        bedType: defaultBedType 
                      });
                    }}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  >
                    <option value="ICU">ICU (Intensive Care)</option>
                    <option value="CCU">CCU (Cardiac Care)</option>
                    <option value="Emergency">Emergency Ward</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Bed Type *</label>
                  <select
                    value={bedEscalationData.bedType}
                    onChange={(e) => setBedEscalationData({ ...bedEscalationData, bedType: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold text-slate-800 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none"
                  >
                    {bedEscalationData.requestedWard === 'ICU' && (
                      <>
                        <option value="ICU Bed">ICU Bed</option>
                        <option value="Ventilator Bed">Ventilator Bed</option>
                        <option value="Cardiac Monitor Bed">Cardiac Monitor Bed</option>
                        <option value="Isolation Bed">Isolation Bed</option>
                      </>
                    )}
                    {bedEscalationData.requestedWard === 'CCU' && (
                      <>
                        <option value="Cardiac Monitor Bed">Cardiac Monitor Bed</option>
                        <option value="ICU Bed">ICU Bed</option>
                        <option value="Ventilator Bed">Ventilator Bed</option>
                      </>
                    )}
                    {bedEscalationData.requestedWard === 'Emergency' && (
                      <>
                        <option value="Emergency Bay">Emergency Bay</option>
                        <option value="ICU Bed">ICU Bed</option>
                        <option value="Standard Bed">Standard Bed</option>
                        <option value="Isolation Bed">Isolation Bed</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Urgent Clinical Justification</label>
                <textarea
                  rows={2}
                  value={bedEscalationData.reason}
                  onChange={(e) => setBedEscalationData({ ...bedEscalationData, reason: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-medium text-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900 border border-amber-200">
                <strong>Governance Notice:</strong> Doctor creates the authorized ICU referral. Physical bed assignment and occupancy confirmation are performed through Bed Management.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsBedModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Forward to Bed Management
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL 2: ESCALATE EMERGENCY RESOURCE REQUEST */}
      {isResourceModalOpen && selectedEmergency && typeof document !== 'undefined' && createPortal(
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
            if (e.target === e.currentTarget) setIsResourceModalOpen(false);
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
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">medical_services</span>
                </span>
                <div>
                  <h3 className="font-bold text-white text-sm">Escalate Emergency Medical Equipment</h3>
                  <p className="text-xs text-indigo-100 mt-0.5">Route critical gear requisition to BioMed Staff</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsResourceModalOpen(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleEscalateResource} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-1">
                <p><strong>Patient:</strong> {selectedEmergency.patientName} ({selectedEmergency.emergencyId})</p>
                <p><strong>Delivery Location:</strong> {selectedEmergency.currentLocation}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Equipment Type *</label>
                  <select
                    value={resourceEscalationData.resourceType}
                    onChange={(e) => setResourceEscalationData({ ...resourceEscalationData, resourceType: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white font-bold text-slate-800"
                  >
                    {availableResourceOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={resourceEscalationData.quantity}
                    onChange={(e) => setResourceEscalationData({ ...resourceEscalationData, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Medical Indication</label>
                <textarea
                  rows={2}
                  value={resourceEscalationData.reason}
                  onChange={(e) => setResourceEscalationData({ ...resourceEscalationData, reason: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 font-medium text-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-[11px] text-amber-900 border border-amber-200">
                <strong>BioMed Governance:</strong> Submitting dispatches an emergency priority request to BioMed Staff for immediate bedside equipment delivery and calibration.
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsResourceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Dispatch to BioMed Staff
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
