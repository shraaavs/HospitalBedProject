import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NursingObservations() {
  const navigate = useNavigate();
  const location = useLocation();

  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedObs, setSelectedObs] = useState(null);
  const [patientFilter, setPatientFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Assigned patients list for recording modal
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'Nurse';
  const userName = localStorage.getItem('userName') || 'Staff Nurse';
  const userDepartment = localStorage.getItem('userDepartment') || 'General Ward';
  const isNurse = userRole === 'Nurse';

  // Form State covering all 12 requested clinical dimensions
  const initialFormState = {
    patientId: '',
    generalCondition: 'Stable',
    patientComplaints: '',
    painLevel: 0,
    comfortStatus: 'Comfortable / Resting',
    painLocation: 'None',
    consciousness: 'Alert & Oriented x3',
    mobility: 'Independent Ambulatory',
    dietType: 'Normal Balanced Diet',
    foodIntakeAmount: '100% Complete Meal',
    appetite: 'Normal',
    oralFluidMl: '1200',
    ivFluidMl: '500',
    urineOutputMl: '1400',
    drainOutputMl: '0',
    catheterStatus: 'None / Spontaneous Voiding',
    hasWounds: false,
    woundSite: 'None',
    dressingStatus: 'No Surgical Wounds / Intact Skin',
    woundDrainage: 'None',
    breathingPattern: 'Eupneic / Normal Unlabored',
    oxygenSupport: 'Room Air',
    chestAuscultation: 'Clear vesicular breath sounds bilaterally',
    nursingAssessment: '',
    additionalObservations: '',
    shift: 'Morning Shift (07:00 AM - 03:00 PM)',
    observationDate: new Date().toISOString().split('T')[0],
    observationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  const [formData, setFormData] = useState(initialFormState);

  // Fetch observations
  const fetchObservations = async (targetPatId = null) => {
    try {
      setLoading(true);
      const res = await axios.get('/api/nursing-observations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setObservations(data);

      const params = new URLSearchParams(location.search);
      const urlPatId = targetPatId || params.get('patientId');

      if (urlPatId && data.length > 0) {
        const matched = data.find(o => o.patientId?._id === urlPatId || o.patientId === urlPatId || o.patientCustomId === urlPatId);
        if (matched) {
          setSelectedObs(matched);
        } else {
          setSelectedObs(data[0]);
        }
      } else if (data.length > 0) {
        setSelectedObs(prev => prev || data[0]);
      }
    } catch (err) {
      console.error('Error fetching nursing observations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch assigned patients
  const fetchAssignedPatients = async () => {
    try {
      const res = await axios.get('/api/patients/assigned', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.patients || []);
      setAssignedPatients(list);

      const params = new URLSearchParams(location.search);
      const urlPatId = params.get('patientId');

      if (urlPatId) {
        const found = list.find(p => p._id === urlPatId || p.patientId === urlPatId);
        if (found) {
          setFormData(prev => ({ ...prev, patientId: found._id || found.patientId }));
          setPatientFilter(found.patientId || found._id);
        } else {
          setPatientFilter(urlPatId);
          setFormData(prev => ({ ...prev, patientId: urlPatId }));
        }
        if (params.get('openModal') === 'true') {
          handleOpenCreateModal(found ? (found._id || found.patientId) : urlPatId);
        }
      } else {
        setPatientFilter('all');
        if (list.length > 0 && !formData.patientId) {
          setFormData(prev => ({ ...prev, patientId: list[0]._id || list[0].patientId }));
        }
      }
    } catch (err) {
      console.error('Error loading assigned patients:', err);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlPatId = params.get('patientId');
    if (urlPatId) {
      setPatientFilter(urlPatId);
    } else {
      setPatientFilter('all');
    }
    fetchObservations(urlPatId);
    fetchAssignedPatients();
  }, [location.search]);

  // Open modal for new observation
  const handleOpenCreateModal = (preselectedPatientId = null) => {
    const params = new URLSearchParams(location.search);
    const urlPatId = preselectedPatientId || params.get('patientId');
    const targetPatId = urlPatId || (assignedPatients.length > 0 ? (assignedPatients[0]._id || assignedPatients[0].patientId) : '');
    setFormData({
      ...initialFormState,
      patientId: targetPatId,
      observationDate: new Date().toISOString().split('T')[0],
      observationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    setIsEditing(false);
    setEditId(null);
    setShowModal(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (obs) => {
    setFormData({
      patientId: obs.patientId?._id || obs.patientId || obs.patientCustomId,
      generalCondition: obs.generalCondition || 'Stable',
      patientComplaints: obs.patientComplaints || '',
      painLevel: obs.painComfort?.level ?? 0,
      comfortStatus: obs.painComfort?.comfortStatus || 'Comfortable / Resting',
      painLocation: obs.painComfort?.painLocation || 'None',
      consciousness: obs.consciousness || 'Alert & Oriented x3',
      mobility: obs.mobility || 'Independent Ambulatory',
      dietType: obs.foodIntake?.dietType || 'Normal Balanced Diet',
      foodIntakeAmount: obs.foodIntake?.intakeAmount || '100% Complete Meal',
      appetite: obs.foodIntake?.appetite || 'Normal',
      oralFluidMl: obs.fluidBalance?.oralFluidMl ?? '0',
      ivFluidMl: obs.fluidBalance?.ivFluidMl ?? '0',
      urineOutputMl: obs.fluidBalance?.urineOutputMl ?? '0',
      drainOutputMl: obs.fluidBalance?.drainOutputMl ?? '0',
      catheterStatus: obs.fluidBalance?.catheterStatus || 'None / Spontaneous Voiding',
      hasWounds: obs.woundCondition?.hasWounds || false,
      woundSite: obs.woundCondition?.site || 'None',
      dressingStatus: obs.woundCondition?.dressingStatus || 'Intact / Clean & Dry',
      woundDrainage: obs.woundCondition?.drainageDescription || 'None',
      breathingPattern: obs.breathingCondition?.pattern || 'Eupneic / Normal Unlabored',
      oxygenSupport: obs.breathingCondition?.oxygenSupport || 'Room Air',
      chestAuscultation: obs.breathingCondition?.chestAuscultation || 'Clear vesicular breath sounds bilaterally',
      nursingAssessment: obs.nursingAssessment || '',
      additionalObservations: obs.additionalObservations || '',
      shift: obs.shift || 'Morning Shift (07:00 AM - 03:00 PM)',
      observationDate: obs.observationDate || new Date().toISOString().split('T')[0],
      observationTime: obs.observationTime || '08:00 AM'
    });
    setIsEditing(true);
    setEditId(obs._id);
    setShowModal(true);
  };

  // Handle submit (POST or PUT)
  const handleSubmitObservation = async (e) => {
    e.preventDefault();
    if (!formData.patientId) {
      Swal.fire('Patient Required', 'Please select an assigned patient to record observations.', 'warning');
      return;
    }
    if (!formData.nursingAssessment.trim()) {
      Swal.fire('Assessment Required', 'Please provide a clinical summary in the nursing assessment field.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const selectedPatientObj = assignedPatients.find(p => p._id === formData.patientId || p.patientId === formData.patientId);

      const payload = {
        patientId: formData.patientId,
        patientCustomId: selectedPatientObj?.patientId,
        patientName: selectedPatientObj?.fullName || selectedPatientObj?.name,
        ward: selectedPatientObj?.admissionSetup?.wardType || selectedPatientObj?.ward || userDepartment,
        bedNumber: selectedPatientObj?.bedId?.bedNumber || selectedPatientObj?.bedNumber || 'Assigned Bed',
        shift: formData.shift,
        generalCondition: formData.generalCondition,
        patientComplaints: formData.patientComplaints || 'No acute complaints voiced.',
        painComfort: {
          level: Number(formData.painLevel),
          comfortStatus: formData.comfortStatus,
          painLocation: formData.painLocation || 'None'
        },
        consciousness: formData.consciousness,
        mobility: formData.mobility,
        foodIntake: {
          dietType: formData.dietType,
          intakeAmount: formData.foodIntakeAmount,
          appetite: formData.appetite
        },
        fluidBalance: {
          oralFluidMl: Number(formData.oralFluidMl) || 0,
          ivFluidMl: Number(formData.ivFluidMl) || 0,
          urineOutputMl: Number(formData.urineOutputMl) || 0,
          drainOutputMl: Number(formData.drainOutputMl) || 0,
          catheterStatus: formData.catheterStatus
        },
        woundCondition: {
          hasWounds: formData.hasWounds,
          site: formData.woundSite,
          dressingStatus: formData.dressingStatus,
          drainageDescription: formData.woundDrainage
        },
        breathingCondition: {
          pattern: formData.breathingPattern,
          oxygenSupport: formData.oxygenSupport,
          chestAuscultation: formData.chestAuscultation
        },
        nursingAssessment: formData.nursingAssessment.trim(),
        additionalObservations: formData.additionalObservations.trim(),
        observationDate: formData.observationDate,
        observationTime: formData.observationTime
      };

      if (isEditing && editId) {
        const res = await axios.put(`/api/nursing-observations/${editId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({
          icon: 'success',
          title: 'Observation Updated',
          text: 'Clinical nursing record updated successfully.',
          timer: 1800,
          showConfirmButton: false
        });
        setSelectedObs(res.data);
      } else {
        const res = await axios.post('/api/nursing-observations', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({
          icon: 'success',
          title: 'Observation Saved',
          text: 'Observation logged into MongoDB patient chart in chronological sequence.',
          timer: 1800,
          showConfirmButton: false
        });
        setSelectedObs(res.data);
      }

      setShowModal(false);
      fetchObservations();
    } catch (err) {
      console.error('Error saving observation:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to save nursing observation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter observations
  const filteredObservations = observations.filter(obs => {
    if (patientFilter !== 'all' && obs.patientCustomId !== patientFilter && obs.patientId?._id !== patientFilter && obs.patientId !== patientFilter) {
      return false;
    }
    if (wardFilter !== 'All' && !obs.ward?.toLowerCase().includes(wardFilter.toLowerCase())) {
      return false;
    }
    if (conditionFilter !== 'All' && obs.generalCondition !== conditionFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (obs.patientName || '').toLowerCase().includes(q);
      const matchId = (obs.patientCustomId || '').toLowerCase().includes(q);
      const matchNotes = (obs.nursingAssessment || '').toLowerCase().includes(q);
      const matchNurse = (obs.nurseName || '').toLowerCase().includes(q);
      const matchWard = (obs.ward || '').toLowerCase().includes(q);
      return matchName || matchId || matchNotes || matchNurse || matchWard;
    }
    return true;
  });

  // Unique wards for filter dropdown
  const uniqueWards = ['All', ...new Set(observations.map(o => o.ward).filter(Boolean))];

  // Calculated totals for selected observation
  const totalIntake = selectedObs?.fluidBalance?.totalIntakeMl || ((selectedObs?.fluidBalance?.oralFluidMl || 0) + (selectedObs?.fluidBalance?.ivFluidMl || 0));
  const totalOutput = selectedObs?.fluidBalance?.totalOutputMl || ((selectedObs?.fluidBalance?.urineOutputMl || 0) + (selectedObs?.fluidBalance?.drainOutputMl || 0));
  const netFluidBalance = totalIntake - totalOutput;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
                  <span className="material-symbols-outlined text-2xl">clinical_notes</span>
                </span>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Nursing Observations & Daily Condition Chart
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                      Module 4
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Continuous inpatient monitoring, multidimensional assessments, fluid balance, and clinical notes
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchObservations()}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                title="Refresh Live MongoDB Records"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Refresh
              </button>

              {isNurse && (
                <button
                  onClick={() => handleOpenCreateModal()}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 shadow-xs transition-all transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  Record Nursing Observation
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Observations</span>
                <span className="text-lg font-black text-slate-800">{observations.length}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">history_edu</span>
            </div>

            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Stable Patients</span>
                <span className="text-lg font-black text-emerald-700">
                  {observations.filter(o => o.generalCondition === 'Stable' || o.generalCondition?.includes('Improving')).length}
                </span>
              </div>
              <span className="material-symbols-outlined text-emerald-500">sentiment_satisfied</span>
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Guarded Condition</span>
                <span className="text-lg font-black text-amber-700">
                  {observations.filter(o => o.generalCondition === 'Guarded' || (o.painComfort?.level >= 4 && o.painComfort?.level < 7)).length}
                </span>
              </div>
              <span className="material-symbols-outlined text-amber-500">warning</span>
            </div>

            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-0.5">Critical Alerts</span>
                <span className="text-lg font-black text-rose-700">
                  {observations.filter(o => o.isCriticalAlert || o.generalCondition === 'Critical' || o.generalCondition === 'Deteriorating' || o.painComfort?.level >= 7).length}
                </span>
              </div>
              <span className="material-symbols-outlined text-rose-500">crisis_alert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search patient, ID, nurse, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Patient Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Patient:</span>
              <select
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                className="p-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700 max-w-[180px] truncate"
              >
                <option value="all">All Patients</option>
                {assignedPatients.map(p => (
                  <option key={p._id || p.patientId} value={p.patientId || p._id}>
                    {p.fullName || p.name} ({p.patientId})
                  </option>
                ))}
              </select>
            </div>

            {/* Ward Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Ward:</span>
              <select
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="p-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
              >
                {uniqueWards.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
            </div>

            {/* Condition Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Condition:</span>
              <select
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="p-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
              >
                <option value="All">All Conditions</option>
                <option value="Stable">Stable</option>
                <option value="Improving / Ambulatory">Improving</option>
                <option value="Guarded">Guarded</option>
                <option value="Deteriorating">Deteriorating</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>
        </div>

        {/* 2-Column Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Chronological Observations Timeline / List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-teal-700">schedule</span>
                Chronological Observations ({filteredObservations.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Newest First</span>
            </div>

            {loading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent"></div>
                <p className="text-xs font-semibold">Loading MongoDB Nursing Records...</p>
              </div>
            ) : filteredObservations.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">note_alt</span>
                <p className="text-xs font-bold text-slate-600">No matching nursing observations found</p>
                <p className="text-[11px] text-slate-400">Click the button above to record the first clinical note.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredObservations.map((obs) => {
                  const isSelected = selectedObs?._id === obs._id;
                  const isCritical = obs.isCriticalAlert || obs.generalCondition === 'Critical' || obs.generalCondition === 'Deteriorating' || obs.painComfort?.level >= 7;

                  return (
                    <div
                      key={obs._id}
                      onClick={() => setSelectedObs(obs)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs relative ${
                        isSelected
                          ? 'bg-teal-50/50 border-teal-600 shadow-sm ring-1 ring-teal-600'
                          : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Row: Patient ID, Bed & Shift */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{obs.patientName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
                            {obs.patientCustomId}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isCritical
                            ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                            : obs.generalCondition === 'Guarded'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {obs.generalCondition}
                        </span>
                      </div>

                      {/* Ward & Bed Info */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-2 font-medium">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-slate-400">domain</span>
                          {obs.ward}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-slate-400">bed</span>
                          {obs.bedNumber}
                        </span>
                      </div>

                      {/* Clinical Snippet */}
                      <p className="text-slate-700 line-clamp-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 font-medium">
                        "{obs.nursingAssessment}"
                      </p>

                      {/* Vital Highlights Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                          Pain: {obs.painComfort?.level ?? 0}/10
                        </span>
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                          {obs.consciousness}
                        </span>
                        <span className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-600">
                          O2: {obs.breathingCondition?.oxygenSupport || 'Room Air'}
                        </span>
                      </div>

                      {/* Footer: Nurse Signature & Timestamp */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span className="font-semibold text-teal-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">edit_note</span>
                          {obs.nurseName}
                        </span>
                        <span>{obs.observationDate} • {obs.observationTime}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Full Clinical Assessment Dossier (7 Cols) */}
          <div className="lg:col-span-7">
            {selectedObs ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden sticky top-24">
                {/* Dossier Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black tracking-tight">{selectedObs.patientName}</h2>
                      <span className="px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-bold">
                        {selectedObs.patientCustomId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                      <span>{selectedObs.ward}</span>
                      <span>•</span>
                      <span>{selectedObs.bedNumber}</span>
                      <span>•</span>
                      <span>{selectedObs.shift}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Guarded Edit button if Nurse and is the author or admin */}
                    {isNurse && (
                      <button
                        onClick={() => handleOpenEditModal(selectedObs)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl border border-white/20 flex items-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Edit Entry
                      </button>
                    )}
                  </div>
                </div>

                {/* Dossier Body */}
                <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {/* Critical Alert Warning if Flagged */}
                  {selectedObs.isCriticalAlert && (
                    <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 flex items-start gap-3">
                      <span className="material-symbols-outlined text-rose-600 text-xl">report</span>
                      <div>
                        <p className="font-black uppercase tracking-wider text-[11px] text-rose-700">
                          Critical Clinical Alert Flagged to Attending Doctor
                        </p>
                        <p className="mt-0.5 font-medium">{selectedObs.criticalRemarks}</p>
                      </div>
                    </div>
                  )}

                  {/* 1. General Condition & Patient Complaints */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        General Condition
                      </span>
                      <p className="text-sm font-black text-slate-800">{selectedObs.generalCondition}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Patient Complaints & Symptoms
                      </span>
                      <p className="text-xs font-semibold text-slate-800">
                        {selectedObs.patientComplaints || 'No acute complaints voiced.'}
                      </p>
                    </div>
                  </div>

                  {/* 2. Neurological & Pain Assessment */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Consciousness Level
                      </span>
                      <p className="text-xs font-bold text-slate-800">{selectedObs.consciousness}</p>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Pain & Comfort Scale
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`text-base font-black ${selectedObs.painComfort?.level >= 7 ? 'text-rose-600' : selectedObs.painComfort?.level >= 4 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {selectedObs.painComfort?.level ?? 0} / 10
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">({selectedObs.painComfort?.comfortStatus})</span>
                      </div>
                      {selectedObs.painComfort?.painLocation && selectedObs.painComfort?.painLocation !== 'None' && (
                        <p className="text-[10px] text-slate-400 mt-1">Site: {selectedObs.painComfort?.painLocation}</p>
                      )}
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Mobility & Ambulation
                      </span>
                      <p className="text-xs font-bold text-slate-800">{selectedObs.mobility}</p>
                    </div>
                  </div>

                  {/* 3. Respiration & Oxygenation */}
                  <div className="bg-teal-50/40 p-4 rounded-2xl border border-teal-100">
                    <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <span className="material-symbols-outlined text-base text-teal-700">air</span>
                      Breathing & Pulmonary Condition
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Respiratory Pattern</span>
                        <span className="font-bold text-slate-800">{selectedObs.breathingCondition?.pattern}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Oxygen Support</span>
                        <span className="font-bold text-slate-800">{selectedObs.breathingCondition?.oxygenSupport}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Chest Auscultation</span>
                        <span className="font-semibold text-slate-700">{selectedObs.breathingCondition?.chestAuscultation}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Fluid Balance (Intake vs. Output) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base text-blue-600">water_drop</span>
                        Fluid Intake & Output (I/O Balance)
                      </h4>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg ${netFluidBalance >= 0 ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                        Net Balance: {netFluidBalance > 0 ? `+${netFluidBalance}` : netFluidBalance} mL
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs text-center">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Oral Fluid</span>
                        <span className="font-black text-slate-800">{selectedObs.fluidBalance?.oralFluidMl ?? 0} mL</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">IV Infusion</span>
                        <span className="font-black text-slate-800">{selectedObs.fluidBalance?.ivFluidMl ?? 0} mL</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Urine Output</span>
                        <span className="font-black text-slate-800">{selectedObs.fluidBalance?.urineOutputMl ?? 0} mL</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Drain Output</span>
                        <span className="font-black text-slate-800">{selectedObs.fluidBalance?.drainOutputMl ?? 0} mL</span>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Catheter / Urinary Status: <span className="font-bold text-slate-800">{selectedObs.fluidBalance?.catheterStatus}</span>
                    </div>
                  </div>

                  {/* 5. Food Intake & Nutrition */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <span className="material-symbols-outlined text-base text-amber-600">restaurant</span>
                      Food Intake & Nutritional Tolerability
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diet Regimen</span>
                        <span className="font-bold text-slate-800">{selectedObs.foodIntake?.dietType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Intake Proportion</span>
                        <span className="font-bold text-slate-800">{selectedObs.foodIntake?.intakeAmount}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Appetite State</span>
                        <span className="font-semibold text-slate-700">{selectedObs.foodIntake?.appetite}</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. Wound & Skin Condition */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                      <span className="material-symbols-outlined text-base text-purple-600">healing</span>
                      Wound & Surgical Dressing Condition
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Wound Present</span>
                        <span className="font-bold text-slate-800">{selectedObs.woundCondition?.hasWounds ? 'Yes - Under Active Care' : 'No Active Wounds'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Dressing Status</span>
                        <span className="font-bold text-slate-800">{selectedObs.woundCondition?.dressingStatus}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Drainage / Remarks</span>
                        <span className="font-semibold text-slate-700">{selectedObs.woundCondition?.drainageDescription || 'None'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 7. Comprehensive Nursing Assessment */}
                  <div className="bg-white p-4 rounded-2xl border border-teal-200 shadow-xs space-y-2">
                    <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-teal-700">assignment</span>
                      Clinical Nursing Assessment
                    </h4>
                    <p className="text-xs font-semibold text-slate-800 leading-relaxed bg-teal-50/30 p-3 rounded-xl border border-teal-100">
                      {selectedObs.nursingAssessment}
                    </p>
                  </div>

                  {/* 8. Additional Observations & Nurse Sign-off */}
                  {selectedObs.additionalObservations && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Additional Care Notes & Instructions
                      </span>
                      <p className="text-xs text-slate-700 font-medium">{selectedObs.additionalObservations}</p>
                    </div>
                  )}

                  {/* Signature Box */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-100/70 rounded-2xl text-xs text-slate-500">
                    <div>
                      <p className="font-bold text-slate-800">Recorded by: {selectedObs.nurseName}</p>
                      <p className="text-[10px] text-slate-400">Shift: {selectedObs.shift}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-800">{selectedObs.observationDate} at {selectedObs.observationTime}</p>
                      <p className="text-[10px] text-teal-700 font-semibold">MongoDB Verified Entry</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-5xl text-slate-300">clinical_notes</span>
                <h3 className="font-bold text-slate-700 text-sm">Select an Observation Record</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click on any patient entry from the chronological list on the left to inspect the complete multidimensional clinical record.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Record / Edit Observation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">clinical_notes</span>
                  {isEditing ? 'Update Nursing Observation' : 'Record Clinical Nursing Observation'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Enter continuous monitoring parameters for the patient's MongoDB nursing record
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitObservation} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Patient Selection & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Select Assigned Inpatient *
                  </label>
                  <select
                    disabled={isEditing}
                    value={formData.patientId}
                    onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                  >
                    {assignedPatients.map(p => (
                      <option key={p._id || p.patientId} value={p._id || p.patientId}>
                        {p.fullName || p.name} ({p.patientId}) - {p.admissionSetup?.wardType || p.ward || 'General'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Duty Shift *</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                  >
                    <option value="Morning Shift (07:00 AM - 03:00 PM)">Morning Shift (07:00 AM - 03:00 PM)</option>
                    <option value="Evening Shift (03:00 PM - 11:00 PM)">Evening Shift (03:00 PM - 11:00 PM)</option>
                    <option value="Night Shift (11:00 PM - 07:00 AM)">Night Shift (11:00 PM - 07:00 AM)</option>
                  </select>
                </div>
              </div>

              {/* General Condition & Complaints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">General Condition *</label>
                  <select
                    value={formData.generalCondition}
                    onChange={(e) => setFormData({ ...formData, generalCondition: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                  >
                    <option value="Stable">Stable</option>
                    <option value="Improving / Ambulatory">Improving / Ambulatory</option>
                    <option value="Guarded">Guarded</option>
                    <option value="Deteriorating">Deteriorating (Auto-Alert)</option>
                    <option value="Critical">Critical (High Priority Alert)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Patient Complaints</label>
                  <input
                    type="text"
                    placeholder="e.g. Mild headache, soreness around IV site..."
                    value={formData.patientComplaints}
                    onChange={(e) => setFormData({ ...formData, patientComplaints: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                  />
                </div>
              </div>

              {/* Consciousness & Mobility & Pain Level */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Consciousness Level *</label>
                  <select
                    value={formData.consciousness}
                    onChange={(e) => setFormData({ ...formData, consciousness: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                  >
                    <option value="Alert & Oriented x3">Alert & Oriented x3</option>
                    <option value="Lethargic / Drowsy">Lethargic / Drowsy</option>
                    <option value="Confused / Disoriented">Confused / Disoriented</option>
                    <option value="Stuporous">Stuporous</option>
                    <option value="Comatose">Comatose</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Mobility Status *</label>
                  <select
                    value={formData.mobility}
                    onChange={(e) => setFormData({ ...formData, mobility: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                  >
                    <option value="Independent Ambulatory">Independent Ambulatory</option>
                    <option value="Ambulatory with Assistance">Ambulatory with Assistance</option>
                    <option value="Assisted Ambulation">Assisted Ambulation</option>
                    <option value="Wheelchair Bound">Wheelchair Bound</option>
                    <option value="Bedridden / Turned q2h">Bedridden / Turned q2h</option>
                    <option value="Strict Bed Rest">Strict Bed Rest</option>
                    <option value="Complete Bed Rest">Complete Bed Rest</option>
                    <option value="Physiotherapy Active">Physiotherapy Active</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Pain Level: <span className="font-black text-teal-700">{formData.painLevel} / 10</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={formData.painLevel}
                    onChange={(e) => setFormData({ ...formData, painLevel: e.target.value })}
                    className="w-full accent-teal-700 mt-2"
                  />
                </div>
              </div>

              {/* Breathing & Oxygen Support */}
              <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-3">
                <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">air</span> Respiration & Oxygen
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Breathing Pattern</label>
                    <input
                      type="text"
                      value={formData.breathingPattern}
                      onChange={(e) => setFormData({ ...formData, breathingPattern: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Oxygen Support</label>
                    <select
                      value={formData.oxygenSupport}
                      onChange={(e) => setFormData({ ...formData, oxygenSupport: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-semibold"
                    >
                      <option value="Room Air">Room Air</option>
                      <option value="Nasal Cannula (2L/min)">Nasal Cannula (2L/min)</option>
                      <option value="Venturi Mask (40%)">Venturi Mask (40%)</option>
                      <option value="Non-Rebreather (10L/min)">Non-Rebreather (10L/min)</option>
                      <option value="BiPAP / CPAP">BiPAP / CPAP</option>
                      <option value="Mechanical Ventilator">Mechanical Ventilator</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Chest Auscultation</label>
                    <input
                      type="text"
                      value={formData.chestAuscultation}
                      onChange={(e) => setFormData({ ...formData, chestAuscultation: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Fluid Balance (I/O) */}
              <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-3">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">water_drop</span> Fluid Balance (Intake / Output mL)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Oral Fluids (mL)</label>
                    <input
                      type="number"
                      value={formData.oralFluidMl}
                      onChange={(e) => setFormData({ ...formData, oralFluidMl: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">IV Fluids (mL)</label>
                    <input
                      type="number"
                      value={formData.ivFluidMl}
                      onChange={(e) => setFormData({ ...formData, ivFluidMl: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Urine Output (mL)</label>
                    <input
                      type="number"
                      value={formData.urineOutputMl}
                      onChange={(e) => setFormData({ ...formData, urineOutputMl: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Drain Output (mL)</label>
                    <input
                      type="number"
                      value={formData.drainOutputMl}
                      onChange={(e) => setFormData({ ...formData, drainOutputMl: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Food & Nutrition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Diet Regimen</label>
                  <input
                    type="text"
                    value={formData.dietType}
                    onChange={(e) => setFormData({ ...formData, dietType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Meal Intake %</label>
                  <select
                    value={formData.foodIntakeAmount}
                    onChange={(e) => setFormData({ ...formData, foodIntakeAmount: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="100% Complete Meal">100% Complete Meal</option>
                    <option value="75% Good Intake">75% Good Intake</option>
                    <option value="50% Fair Intake">50% Fair Intake</option>
                    <option value="25% Poor Intake">25% Poor Intake</option>
                    <option value="0% Refused / NPO">0% Refused / NPO</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Appetite</label>
                  <select
                    value={formData.appetite}
                    onChange={(e) => setFormData({ ...formData, appetite: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="Good">Good</option>
                    <option value="Normal">Normal</option>
                    <option value="Poor">Poor</option>
                    <option value="Anorexic">Anorexic</option>
                  </select>
                </div>
              </div>

              {/* Wound Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Wound Status</label>
                  <select
                    value={formData.hasWounds ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, hasWounds: e.target.value === 'true' })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="false">No Surgical Wounds</option>
                    <option value="true">Active Wound / Incision</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Dressing & Drainage Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Dry and intact, no erythema, minimal serous ooze..."
                    value={formData.dressingStatus}
                    onChange={(e) => setFormData({ ...formData, dressingStatus: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>
              </div>

              {/* Nursing Assessment & Additional Observations */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Nursing Assessment Summary *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide full clinical assessment of patient condition, response to therapy, and nursing actions..."
                    value={formData.nursingAssessment}
                    onChange={(e) => setFormData({ ...formData, nursingAssessment: e.target.value })}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                  ></textarea>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                    Additional Observations / Handoff Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Patient instructed on fall prevention; family briefed on visiting hours..."
                    value={formData.additionalObservations}
                    onChange={(e) => setFormData({ ...formData, additionalObservations: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.observationDate}
                    onChange={(e) => setFormData({ ...formData, observationDate: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Time</label>
                  <input
                    type="text"
                    value={formData.observationTime}
                    onChange={(e) => setFormData({ ...formData, observationTime: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">save</span>
                  {submitting ? 'Saving...' : isEditing ? 'Update Observation' : 'Save Nursing Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
