import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function EmergencyManagementRapidResponseCenter() {
  const [emergencies, setEmergencies] = useState([]);
  const [beds, setBeds] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmergency, setSelectedEmergency] = useState(null);

  // Filter States
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Coordination Modal State
  const [isCoordinateModalOpen, setIsCoordinateModalOpen] = useState(false);
  const [coordinationData, setCoordinationData] = useState({
    allocatedBedNumber: '',
    allocatedWard: 'Emergency',
    allocatedBedId: '',
    assignedDoctorName: '',
    assignedNurseName: '',
    currentLocation: '',
    conditionStatus: 'Critical',
    requiredMedicalResources: [],
    dispositionStatus: 'Active in ER',
    coordinationNotes: ''
  });

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [emgRes, bedRes, invRes, userRes] = await Promise.all([
        axios.get('/api/emergency', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get('/api/beds', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get('/api/inventory', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] })),
        axios.get('/api/users', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      const emgList = Array.isArray(emgRes.data) ? emgRes.data : [];
      setEmergencies(emgList);
      setBeds(Array.isArray(bedRes.data) ? bedRes.data : []);
      setInventory(Array.isArray(invRes.data) ? invRes.data : []);
      setStaffList(Array.isArray(userRes.data) ? userRes.data : []);

      if (emgList.length > 0) {
        if (!selectedEmergency) {
          setSelectedEmergency(emgList[0]);
        } else {
          const refreshed = emgList.find(e => e._id === selectedEmergency._id);
          if (refreshed) setSelectedEmergency(refreshed);
        }
      }
    } catch (err) {
      console.error('Error fetching emergency data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // 15s live polling
    return () => clearInterval(interval);
  }, []);

  const handleOpenCoordinateModal = (emg) => {
    setSelectedEmergency(emg);
    setCoordinationData({
      allocatedBedNumber: emg.allocatedBedNumber || '',
      allocatedWard: emg.allocatedWard || 'Emergency',
      allocatedBedId: emg.allocatedBedId?._id || emg.allocatedBedId || '',
      assignedDoctorName: emg.assignedDoctorName || 'Dr. Priya Sharma',
      assignedNurseName: emg.assignedNurseName || 'ER Staff Nurse Clara Vance',
      currentLocation: emg.currentLocation || 'Emergency Trauma Bay 01',
      conditionStatus: emg.conditionStatus || 'Critical',
      requiredMedicalResources: emg.requiredMedicalResources || [],
      dispositionStatus: emg.disposition?.status || 'Active in ER',
      coordinationNotes: ''
    });
    setIsCoordinateModalOpen(true);
  };

  const handleSaveCoordination = async (e) => {
    e.preventDefault();
    if (!selectedEmergency?._id) return;

    try {
      await axios.put(`/api/emergency/${selectedEmergency._id}/coordinate`, coordinationData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Coordination Saved',
        text: `Operational resources, bed, and staff coordination updated for ${selectedEmergency.patientName}.`,
        timer: 1600,
        showConfirmButton: false
      });

      setIsCoordinateModalOpen(false);
      fetchData();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save coordination', 'error');
    }
  };

  const toggleResource = (resource) => {
    setCoordinationData(prev => {
      const list = prev.requiredMedicalResources || [];
      if (list.includes(resource)) {
        return { ...prev, requiredMedicalResources: list.filter(r => r !== resource) };
      } else {
        return { ...prev, requiredMedicalResources: [...list, resource] };
      }
    });
  };

  // Doctors & Nurses list for assignments
  const doctors = staffList.filter(s => s.role === 'Doctor' || s.doctorId);
  const nurses = staffList.filter(s => s.role === 'Nurse' || s.nurseId);
  const availableBeds = beds.filter(b => b.status === 'Available');
  const icuBedsAvailable = beds.filter(b => (b.wardType === 'ICU' || b.type === 'ICU Bed') && b.status === 'Available').length;

  const resourceOptions = [
    'Ventilator',
    'High-Flow Oxygen Cylinder',
    'Cardiac ICU Monitor',
    'Infusion Pump',
    'Defibrillator',
    'Suction Unit',
    'Emergency Wheelchair',
    'Dialysis Unit'
  ];

  // Filters
  const filteredEmergencies = emergencies.filter(emg => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (emg.patientName || '').toLowerCase().includes(q) ||
      (emg.patientCustomId || '').toLowerCase().includes(q) ||
      (emg.emergencyId || '').toLowerCase().includes(q) ||
      (emg.chiefComplaint || '').toLowerCase().includes(q) ||
      (emg.assignedDoctorName || '').toLowerCase().includes(q) ||
      (emg.currentLocation || '').toLowerCase().includes(q);

    const matchesPriority = priorityFilter === 'All' || (emg.triagePriority || '').toLowerCase().includes(priorityFilter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || emg.conditionStatus === statusFilter || emg.disposition?.status === statusFilter;

    return matchesSearch && matchesPriority && matchesStatus;
  });

  const getPriorityBadge = (p) => {
    const pri = (p || '').toLowerCase();
    if (pri.includes('red') || pri.includes('resuscitation') || pri.includes('level 1')) {
      return 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse';
    } else if (pri.includes('orange') || pri.includes('level 2')) {
      return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
    } else if (pri.includes('yellow') || pri.includes('level 3')) {
      return 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    }
    return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-medium';
  };

  const getConditionBadge = (c) => {
    switch (c) {
      case 'Critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-extrabold';
      case 'Severe':
      case 'Unstable':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-bold';
      case 'Stabilizing':
      case 'Guarded':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
      case 'Stable':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // KPIs
  const totalActiveER = emergencies.filter(e => e.disposition?.status === 'Active in ER').length;
  const criticalCount = emergencies.filter(e => e.conditionStatus === 'Critical' || e.triagePriority?.includes('Red')).length;
  const inTransCount = emergencies.filter(e => e.disposition?.status === 'Transferred to ICU' || e.disposition?.status === 'Admitted to Ward').length;

  return (
    <div className="w-full flex flex-col space-y-5 pb-12">
      
      {/* 1. Header Banner & Fast Stats */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-bold text-2xl shadow-xs">
            🚨
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Emergency Response & Clinical Coordination</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 font-mono animate-pulse">
                {criticalCount} Critical Cases
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Admin Operational Oversight: Coordinate Emergency Beds, ICU Availability, Medical Resources, Doctor & Nurse Deployments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors flex items-center gap-1 text-xs font-bold px-3"
          >
            <span className="material-symbols-outlined text-base">refresh</span> Live Refresh
          </button>
        </div>
      </div>

      {/* 2. Emergency Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center font-bold text-xl">
            🚨
          </div>
          <div>
            <span className="text-xl font-black text-rose-700 block">{totalActiveER}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active ER Patients</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xl">
            🛏️
          </div>
          <div>
            <span className="text-xl font-black text-amber-800 block">{icuBedsAvailable}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ICU Beds Available</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xl">
            🧰
          </div>
          <div>
            <span className="text-xl font-black text-teal-700 block">{availableBeds.length}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Available Beds</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xl">
            🔄
          </div>
          <div>
            <span className="text-xl font-black text-indigo-700 block">{inTransCount}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Transferred / Admitted</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Patient Name, ID, Emergency ID, Chief Complaint..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-rose-600 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-rose-600"
          >
            <option value="All">All Triage Priorities</option>
            <option value="Red">🔴 Red - Immediate</option>
            <option value="Orange">🟠 Orange - Very Urgent</option>
            <option value="Yellow">🟡 Yellow - Urgent</option>
            <option value="Green">🟢 Green - Standard</option>
          </select>

          {/* Condition Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-rose-600"
          >
            <option value="All">All Condition Statuses</option>
            <option value="Critical">Critical</option>
            <option value="Severe">Severe</option>
            <option value="Unstable">Unstable</option>
            <option value="Stabilizing">Stabilizing</option>
            <option value="Stable">Stable</option>
          </select>
        </div>
      </div>

      {/* 4. Dual-Pane Emergency Management Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Emergency Patients List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[820px]">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600 text-sm">notifications_active</span>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Emergency Queue ({filteredEmergencies.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Select to coordinate</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl animate-spin text-rose-600 mb-2">sync</span>
                <p className="text-xs font-bold">Loading emergency registry...</p>
              </div>
            ) : filteredEmergencies.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">check_circle</span>
                <p className="text-xs font-bold text-slate-700">No active emergency cases found</p>
                <p className="text-[11px] text-slate-400 mt-1">All emergency cases are triaged and managed.</p>
              </div>
            ) : (
              filteredEmergencies.map((emg) => {
                const isSelected = selectedEmergency?._id === emg._id;
                const vitals = emg.currentVitals || {};

                return (
                  <div
                    key={emg._id}
                    onClick={() => setSelectedEmergency(emg)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-rose-50/70 border-rose-500 ring-1 ring-rose-500 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Top Row: Name, ID, Priority */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-rose-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {emg.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">{emg.patientName}</h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            {emg.patientCustomId || emg.emergencyId} • {emg.age}y/{emg.gender}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] border shrink-0 ${getPriorityBadge(emg.triagePriority)}`}>
                        {emg.triagePriority?.split('-')[0] || emg.triagePriority}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-700 font-semibold line-clamp-1 mt-1">
                      {emg.chiefComplaint}
                    </p>

                    {/* Vitals & Alert Chips */}
                    <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                        ❤️ {vitals.heartRate || '--'} bpm
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                        🫁 SpO₂: {vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : '--'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-bold">
                        🩸 {vitals.bloodPressure || '--'}
                      </span>
                      <span className={`px-2 py-0.2 rounded-full border font-bold ml-auto ${getConditionBadge(emg.conditionStatus)}`}>
                        {emg.conditionStatus}
                      </span>
                    </div>

                    {/* Footer: Location, Doctor & Arrival */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700 flex items-center gap-1 truncate">
                        <span className="material-symbols-outlined text-xs text-rose-600">location_on</span>
                        {emg.currentLocation || 'ER Bay'}
                      </span>
                      <span className="font-medium text-slate-500 shrink-0">
                        👨‍⚕️ {emg.assignedDoctorName}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Emergency Operational Coordination Dossier (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[600px] max-h-[820px] overflow-hidden">
          {!selectedEmergency ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">emergency</span>
              <h3 className="text-sm font-extrabold text-slate-700">Select an Emergency Patient</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose an emergency case from the queue on the left to coordinate emergency beds, ICU escalation, equipment allocations, and medical personnel.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              
              {/* Patient Banner */}
              <div className="p-4 bg-rose-50/70 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-700 to-rose-900 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                    {selectedEmergency.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{selectedEmergency.patientName}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-rose-900 border border-rose-200 font-mono">
                        {selectedEmergency.patientCustomId || selectedEmergency.emergencyId}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getPriorityBadge(selectedEmergency.triagePriority)}`}>
                        {selectedEmergency.triagePriority}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="px-2 py-0.5 rounded-lg bg-teal-50 text-teal-900 font-bold border border-teal-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-teal-700">stethoscope</span>
                        <span>Assigned Doctor: <strong>{selectedEmergency.assignedDoctorName || 'Dr. On Duty'}</strong></span>
                      </span>
                      <span>Arrival: <strong>{new Date(selectedEmergency.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> via {selectedEmergency.arrivalMode}</span>
                      <span>• Attendant: {selectedEmergency.attendantName || 'Self / EMS'} ({selectedEmergency.attendantContact || 'N/A'})</span>
                    </div>
                  </div>
                </div>

                {/* Coordination Action Button */}
                <button
                  type="button"
                  onClick={() => handleOpenCoordinateModal(selectedEmergency)}
                  className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">tune</span> Coordinate Resources & Bed
                </button>
              </div>

              {/* Vital Alerts Banner (if present) */}
              {selectedEmergency.vitalAlerts?.length > 0 && (
                <div className="p-3.5 bg-rose-100/70 border-b border-rose-200 flex items-center gap-2 text-xs text-rose-900 font-bold">
                  <span className="material-symbols-outlined text-rose-700 text-lg">crisis_alert</span>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="uppercase tracking-wide text-[10px] font-black text-rose-800">Critical Vital Alerts:</span>
                    {selectedEmergency.vitalAlerts.map((alert, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white rounded-md text-rose-800 border border-rose-300 text-[11px]">
                        ⚠️ {alert}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Comprehensive Details Section */}
              <div className="p-5 space-y-4">
                
                {/* 1. Clinical State & Vitals */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-rose-600">monitor_heart</span>
                    Emergency Vitals & Clinical Presentation
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Heart Rate</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {selectedEmergency.currentVitals?.heartRate || '--'} bpm
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Pressure</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {selectedEmergency.currentVitals?.bloodPressure || '--'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">SpO₂ Oxygen</span>
                      <span className={`font-black text-sm ${selectedEmergency.currentVitals?.oxygenSaturation < 92 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {selectedEmergency.currentVitals?.oxygenSaturation ? `${selectedEmergency.currentVitals.oxygenSaturation}%` : '--'}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Condition Status</span>
                      <span className={`font-bold text-xs ${getConditionBadge(selectedEmergency.conditionStatus)} px-2 py-0.5 rounded w-fit block mt-0.5`}>
                        {selectedEmergency.conditionStatus}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Chief Complaint / Triage Assessment</span>
                    <p className="font-bold text-slate-800">{selectedEmergency.chiefComplaint}</p>
                  </div>
                </div>

                {/* 2. Operational Deployments: Bed, Resources, Personnel */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-700 text-base">domain</span>
                      Operational Bed & Staff Allocations
                    </span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Location</span>
                      <span className="font-bold text-slate-800">{selectedEmergency.currentLocation || 'ER Bay'}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Allocated Bed / Ward</span>
                      <span className="font-bold text-teal-800">
                        {selectedEmergency.allocatedBedNumber ? `${selectedEmergency.allocatedBedNumber} (${selectedEmergency.allocatedWard})` : 'Triage Bay Bed'}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Doctor</span>
                      <span className="font-bold text-slate-800">{selectedEmergency.assignedDoctorName}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Nurse</span>
                      <span className="font-bold text-slate-800">{selectedEmergency.assignedNurseName}</span>
                    </div>
                  </div>

                  {/* Required Medical Resources */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">Required Medical Equipment & Resources</span>
                    {selectedEmergency.requiredMedicalResources?.length === 0 ? (
                      <span className="text-xs text-slate-400 italic">No specialized medical equipment currently requisitioned.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedEmergency.requiredMedicalResources.map((res, i) => (
                          <span key={i} className="px-2.5 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">medical_services</span> {res}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Clinical Assessment Note from Doctor */}
                {selectedEmergency.emergencyDiagnosis && (
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 space-y-2 text-xs">
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">verified</span> Doctor Emergency Diagnosis & Orders
                    </h4>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diagnosis</span>
                        <span className="font-bold text-slate-800">{selectedEmergency.emergencyDiagnosis}</span>
                      </div>
                      {selectedEmergency.immediateTreatment && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Immediate Treatment / Orders</span>
                          <span className="font-medium text-slate-700">{selectedEmergency.immediateTreatment}</span>
                        </div>
                      )}
                      {selectedEmergency.criticalFindings && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Critical Findings</span>
                          <p className="text-slate-600 text-[11px]">{selectedEmergency.criticalFindings}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. Action Log Timeline */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-slate-600">history</span>
                    Emergency Coordination Log ({selectedEmergency.actionsTaken?.length || 0})
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {selectedEmergency.actionsTaken?.length === 0 ? (
                      <p className="text-slate-400 italic">No coordination actions logged yet.</p>
                    ) : (
                      selectedEmergency.actionsTaken.slice().reverse().map((act, i) => (
                        <div key={i} className="bg-white p-2 rounded-lg border border-slate-100 text-[11px] flex justify-between items-center">
                          <span className="text-slate-800 font-medium">{act.action}</span>
                          <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {act.performedBy}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

      {/* OPERATIONAL COORDINATION MODAL */}
      {isCoordinateModalOpen && selectedEmergency && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600">emergency</span>
                <h3 className="text-base font-black text-slate-900">
                  Coordinate Emergency Operations: {selectedEmergency.patientName}
                </h3>
              </div>
              <button onClick={() => setIsCoordinateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCoordination} className="space-y-4 text-xs mt-3">
              
              {/* Ward & Bed Allocation */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Emergency Bed & Ward Assignment</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Available Bed</label>
                    <select
                      value={coordinationData.allocatedBedId}
                      onChange={(e) => {
                        const bedId = e.target.value;
                        const b = beds.find(x => x._id === bedId);
                        setCoordinationData({
                          ...coordinationData,
                          allocatedBedId: bedId,
                          allocatedBedNumber: b ? b.bedNumber : '',
                          allocatedWard: b ? b.wardType : coordinationData.allocatedWard
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
                    >
                      <option value="">Keep in ER Bay Bed ({selectedEmergency.currentLocation})</option>
                      {availableBeds.map(b => (
                        <option key={b._id} value={b._id}>
                          {b.bedNumber} - {b.wardType} ({b.type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Ward / Department</label>
                    <select
                      value={coordinationData.allocatedWard}
                      onChange={(e) => setCoordinationData({ ...coordinationData, allocatedWard: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
                    >
                      <option value="Emergency">Emergency</option>
                      <option value="ICU">ICU / Intensive Care</option>
                      <option value="HDU">HDU (High Dependency Unit)</option>
                      <option value="General Ward">General Ward</option>
                      <option value="Pediatric">Pediatric</option>
                      <option value="Isolation">Isolation</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Staff Assignments: Doctor & Nurse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assign Attending Doctor</label>
                  <select
                    value={coordinationData.assignedDoctorName}
                    onChange={(e) => setCoordinationData({ ...coordinationData, assignedDoctorName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    {doctors.map(d => (
                      <option key={d._id} value={d.name}>{d.name} ({d.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assign Emergency Nurse</label>
                  <select
                    value={coordinationData.assignedNurseName}
                    onChange={(e) => setCoordinationData({ ...coordinationData, assignedNurseName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    {nurses.map(n => (
                      <option key={n._id} value={n.name}>{n.name} ({n.assignedWard || n.department})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Condition Status & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Condition Status</label>
                  <select
                    value={coordinationData.conditionStatus}
                    onChange={(e) => setCoordinationData({ ...coordinationData, conditionStatus: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-bold"
                  >
                    <option value="Critical">Critical</option>
                    <option value="Severe">Severe</option>
                    <option value="Unstable">Unstable</option>
                    <option value="Stabilizing">Stabilizing</option>
                    <option value="Stable">Stable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ER Bay / Location Tag</label>
                  <input
                    type="text"
                    value={coordinationData.currentLocation}
                    onChange={(e) => setCoordinationData({ ...coordinationData, currentLocation: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-medium"
                    placeholder="e.g. Trauma Bay 02"
                  />
                </div>
              </div>

              {/* Resource Requisition Toggles */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Medical Equipment Requisition</h4>
                <div className="flex flex-wrap gap-2">
                  {resourceOptions.map((res) => {
                    const isSelected = (coordinationData.requiredMedicalResources || []).includes(res);
                    return (
                      <button
                        key={res}
                        type="button"
                        onClick={() => toggleResource(res)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                          isSelected
                            ? 'bg-rose-700 text-white border-rose-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '} {res}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Coordination Notes */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Admin Coordination Instructions</label>
                <textarea
                  rows={2}
                  value={coordinationData.coordinationNotes}
                  onChange={(e) => setCoordinationData({ ...coordinationData, coordinationNotes: e.target.value })}
                  placeholder="e.g. Priority ICU escalation prepped. Respiratory therapist and ventilator placed on standby."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCoordinateModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl font-bold shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span> Save Emergency Coordination
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
