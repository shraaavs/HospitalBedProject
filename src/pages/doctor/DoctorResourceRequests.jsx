import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DoctorResourceRequests() {
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);

  const resourceTypesCatalog = [
    { type: 'Ventilator', icon: 'air', desc: 'Mechanical ventilator with invasive & non-invasive modes' },
    { type: 'Oxygen Cylinder', icon: 'local_fire_department', desc: 'High-pressure Medical O2 Cylinder (40L/47L) with regulator' },
    { type: 'Cardiac Monitor', icon: 'monitor_heart', desc: 'Multi-parameter bedside ECG / SpO2 / NIBP / Temp monitor' },
    { type: 'Infusion Pump', icon: 'water_drop', desc: 'High-precision smart volumetric syringe / infusion pump' },
    { type: 'Wheelchair', icon: 'accessible', desc: 'Standard or bariatric patient transport wheelchair' },
    { type: 'Defibrillator', icon: 'electric_bolt', desc: 'Automated External & Manual Biphasic Defibrillator' },
    { type: 'Dialysis Machine', icon: 'device_thermostat', desc: 'Mobile bedside continuous renal replacement therapy (CRRT)' },
    { type: 'Suction Machine', icon: 'cyclone', desc: 'High-vacuum surgical & airway secretion extractor' },
    { type: 'Nebulizer', icon: 'cloud', desc: 'Ultrasonic heavy-duty aerosol medication delivery system' },
    { type: 'ECG Machine', icon: 'ecg', desc: '12-lead diagnostic resting electrocardiograph' },
    { type: 'Syringe Pump', icon: 'vaccines', desc: 'Micro-infusion pump for precise critical drug delivery' },
    { type: 'Hospital Bed / Specialty Mattress', icon: 'bed', desc: 'Air mattress / bariatric / orthopedic specialty bed' },
    { type: 'Other Medical Equipment', icon: 'medical_services', desc: 'Specialized diagnostic, surgical or therapeutic hardware' }
  ];

  const [formData, setFormData] = useState({
    patientName: '',
    patientCustomId: '',
    ward: '',
    bedNumber: '',
    admissionCustomId: '',
    resourceType: 'Ventilator',
    quantity: 1,
    priority: 'Normal',
    clinicalReason: '',
    requiredFrom: new Date().toISOString().slice(0, 16),
    requiredUntil: '',
    additionalInstructions: ''
  });

  const fetchRequestsAndPatients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [reqRes, patRes] = await Promise.all([
        axios.get('/api/resource-requests', { headers }),
        axios.get('/api/patients', { headers })
      ]);

      const reqData = reqRes.data || [];
      setRequests(Array.isArray(reqData) ? reqData : []);

      if (Array.isArray(reqData) && reqData.length > 0 && !selectedRequest) {
        setSelectedRequest(reqData[0]);
      }

      const patData = patRes.data?.patients || patRes.data || [];
      setPatients(Array.isArray(patData) ? patData : []);

      // If redirected from patient details or emergency
      if (location.state?.patientId) {
        const targetId = location.state.patientId;
        const found = (Array.isArray(patData) ? patData : []).find(p => p._id === targetId || p.patientId === targetId);
        if (found) {
          handleSelectPatient(found._id, patData);
          setIsModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching resource requests/patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequestsAndPatients();
  }, []);

  const handleSelectPatient = (patientId, patientList = patients) => {
    setSelectedPatientId(patientId);
    const p = patientList.find(pat => pat._id === patientId || pat.patientId === patientId);
    setSelectedPatientObj(p || null);

    if (p) {
      setFormData(prev => ({
        ...prev,
        patientName: p.fullName || p.name,
        patientCustomId: p.patientId,
        ward: p.admissionSetup?.wardType || p.ward || 'General Ward',
        bedNumber: p.bedNumber || 'Unassigned',
        admissionCustomId: p.admissionStatus === 'Admitted' ? (p.admissionId || `ADM-${p.patientId}`) : '',
        clinicalReason: p.clinicalInfo?.chiefComplaint ? `Resource required for treatment of: ${p.clinicalInfo.chiefComplaint}` : prev.clinicalReason
      }));
    }
  };

  const handleCreateResourceRequest = async (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.clinicalReason) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Required Fields',
        text: 'Please select a registered patient and provide the clinical reason for this resource request.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post('/api/resource-requests', {
        patientId: selectedPatientId || undefined,
        patientName: formData.patientName,
        patientCustomId: formData.patientCustomId,
        ward: formData.ward,
        bedNumber: formData.bedNumber,
        admissionCustomId: formData.admissionCustomId,
        resourceType: formData.resourceType,
        quantity: formData.quantity,
        priority: formData.priority,
        clinicalReason: formData.clinicalReason,
        requiredFrom: formData.requiredFrom,
        requiredUntil: formData.requiredUntil || undefined,
        additionalInstructions: formData.additionalInstructions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Resource Request Submitted',
        text: `Request for ${formData.quantity}x ${formData.resourceType} has been dispatched to Resource & BioMed Administration.`,
        timer: 2200,
        showConfirmButton: false
      });

      setIsModalOpen(false);
      setFormData({
        patientName: '',
        patientCustomId: '',
        ward: '',
        bedNumber: '',
        admissionCustomId: '',
        resourceType: 'Ventilator',
        quantity: 1,
        priority: 'Normal',
        clinicalReason: '',
        requiredFrom: new Date().toISOString().slice(0, 16),
        requiredUntil: '',
        additionalInstructions: ''
      });
      setSelectedPatientId('');
      setSelectedPatientObj(null);

      const created = res.data;
      setRequests(prev => [created, ...prev]);
      setSelectedRequest(created);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Request Failed',
        text: err.response?.data?.message || 'Server error submitting resource request.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for workflow pipeline
  const getWorkflowStep = (status) => {
    switch (status) {
      case 'Pending':
      case 'Requested':
        return 1; // Doctor Submitted -> Availability Check
      case 'Approved':
        return 2; // Approved by Resource Staff
      case 'Allocated':
        return 3; // Physical Asset Allocated & Dispatched
      case 'In Use':
        return 4; // Active at Patient Bedside
      case 'Released':
        return 5; // Released & Returned to Central Inventory
      default:
        return 1;
    }
  };

  const filteredRequests = requests.filter(req => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (req.patientName || '').toLowerCase().includes(term) ||
                          (req.patientCustomId || '').toLowerCase().includes(term) ||
                          (req.requestId || '').toLowerCase().includes(term) ||
                          (req.resourceType || '').toLowerCase().includes(term) ||
                          (req.clinicalReason || req.reason || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || req.priority === priorityFilter || req.urgency === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shadow-2xs">
            <span className="material-symbols-outlined text-2xl">medical_services</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Medical Resource Requests</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctor Equipment Referral Suite • Ventilators, Monitors, Pumps, Wheelchairs & Specialized Apparatus
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <button
            onClick={() => {
              setIsModalOpen(true);
              if (patients.length > 0 && !selectedPatientId) {
                handleSelectPatient(patients[0]._id);
              }
            }}
            className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">add_box</span>
            Request Medical Equipment
          </button>
        </div>
      </div>

      {/* Workflow Pipeline Diagram */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-teal-700 text-base">alt_route</span>
            Medical Equipment Allocation Workflow Pipeline
          </span>
          <span className="text-[11px] text-slate-500 italic">
            Doctor Request $\rightarrow$ Resource Staff Verification $\rightarrow$ Allocation $\rightarrow$ Patient Bedside
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-center text-xs">
          <div className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-4 h-4 rounded-full bg-teal-700 text-white text-[9px] flex items-center justify-center">1</span>
              <span>Doctor Request</span>
            </div>
            <p className="text-[9px] text-teal-700 font-normal">Clinical necessity logged</p>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white text-[9px] flex items-center justify-center">2</span>
              <span>Resource Staff</span>
            </div>
            <p className="text-[9px] text-slate-500 font-normal">Central pool review</p>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white text-[9px] flex items-center justify-center">3</span>
              <span>Availability Check</span>
            </div>
            <p className="text-[9px] text-slate-500 font-normal">Stock & calibration confirmed</p>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white text-[9px] flex items-center justify-center">4</span>
              <span>Approval</span>
            </div>
            <p className="text-[9px] text-slate-500 font-normal">BioMed authorization</p>
          </div>

          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-semibold">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-4 h-4 rounded-full bg-slate-400 text-white text-[9px] flex items-center justify-center">5</span>
              <span>Allocation</span>
            </div>
            <p className="text-[9px] text-slate-500 font-normal">Physical asset tagged</p>
          </div>

          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] flex items-center justify-center">6</span>
              <span>Patient In-Use</span>
            </div>
            <p className="text-[9px] text-emerald-700 font-normal">Deployed at bedside</p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">view_list</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Requests</p>
            <p className="text-lg font-black text-slate-900">{requests.length}</p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">hourglass_empty</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Review</p>
            <p className="text-lg font-black text-amber-700">
              {requests.filter(r => r.status === 'Pending' || r.status === 'Requested').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">verified</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Approved / Allocated</p>
            <p className="text-lg font-black text-blue-700">
              {requests.filter(r => r.status === 'Approved' || r.status === 'Allocated').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">sensors</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active In-Use</p>
            <p className="text-lg font-black text-emerald-700">
              {requests.filter(r => r.status === 'In Use').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">archive</span>
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Released / Returned</p>
            <p className="text-lg font-black text-slate-700">
              {requests.filter(r => r.status === 'Released').length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Requests Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search patient, ID, request # or resource..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs pb-1">
              <div className="flex items-center gap-1">
                {['All', 'Pending', 'Approved', 'Allocated', 'In Use', 'Released'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap ${
                      statusFilter === st
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="p-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white"
              >
                <option value="All">All Priorities</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[580px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-teal-600 mb-1">progress_activity</span>
                <p>Loading resource requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">inventory_2</span>
                <p>No resource requests match the filter.</p>
              </div>
            ) : (
              filteredRequests.map(req => {
                const isSelected = selectedRequest?._id === req._id;
                const isEmergency = req.priority === 'Emergency' || req.priority === 'Critical / Emergency' || req.urgency === 'Critical / Emergency';

                return (
                  <div
                    key={req._id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/80 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900">{req.resourceType}</h4>
                          <span className="text-[10px] px-1.5 py-0.2 bg-teal-50 text-teal-800 rounded font-bold border border-teal-100 font-mono">
                            {req.quantity}x
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-bold">
                            {req.requestId || 'RR-REQ'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
                          Patient: <strong>{req.patientName}</strong> ({req.patientCustomId})
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEmergency ? 'bg-rose-100 text-rose-800 font-black animate-pulse' :
                        req.priority === 'Urgent' || req.urgency === 'Urgent' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {req.priority || req.urgency || 'Normal'}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 truncate">
                      Reason: <span className="text-slate-700">{req.clinicalReason || req.reason}</span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        req.status === 'In Use' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'Allocated' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'Approved' ? 'bg-indigo-100 text-indigo-800' :
                        req.status === 'Released' ? 'bg-slate-100 text-slate-700' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                      <span>Required: {new Date(req.requiredFrom || req.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Request Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {!selectedRequest ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">medical_services</span>
              <p className="text-xs font-semibold">Select a resource request from the queue to view equipment allocation details.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedRequest.resourceType}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-teal-100 text-teal-800 font-bold rounded-md">
                      Qty: {selectedRequest.quantity}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md">
                      {selectedRequest.requestId || 'RR-REC'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Requested for <strong>{selectedRequest.patientName}</strong> ({selectedRequest.patientCustomId}) in <strong>{selectedRequest.ward || 'Ward'} • Bed {selectedRequest.bedNumber || 'N/A'}</strong>
                  </p>
                </div>

                <span className={`self-start sm:self-center px-3 py-1 text-xs font-bold rounded-full ${
                  selectedRequest.status === 'In Use' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  selectedRequest.status === 'Allocated' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  selectedRequest.status === 'Approved' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                  selectedRequest.status === 'Released' ? 'bg-slate-100 text-slate-700 border border-slate-200' :
                  'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  Status: {selectedRequest.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[580px]">
                {/* Clinical Justification Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Required From</span>
                    <p className="text-xs font-bold text-slate-900">
                      {new Date(selectedRequest.requiredFrom || selectedRequest.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Required Until / Return Date</span>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedRequest.requiredUntil
                        ? new Date(selectedRequest.requiredUntil).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : 'Continuous / Open Regimen'}
                    </p>
                  </div>
                </div>

                {/* Clinical Rationale */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Clinical Reason & Medical Indication
                  </span>
                  <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-slate-200/80 leading-relaxed">
                    {selectedRequest.clinicalReason || selectedRequest.reason}
                  </p>
                </div>

                {/* Additional Doctor Instructions */}
                {(selectedRequest.additionalInstructions || selectedRequest.doctorNotes) && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Doctor's Operational & Configuration Instructions
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                      {selectedRequest.additionalInstructions || selectedRequest.doctorNotes}
                    </p>
                  </div>
                )}

                {/* Resource Staff Allocation Details */}
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-teal-700 text-base">verified</span>
                    Resource Administration & Asset Tagging Audit
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 pt-1">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Approved By:</span>
                      <strong>{selectedRequest.approvedBy ? `${selectedRequest.approvedBy} (${new Date(selectedRequest.approvedAt || selectedRequest.updatedAt).toLocaleDateString('en-GB')})` : 'Pending BioMed Approval'}</strong>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Allocated Device Tag / Serial:</span>
                      <strong>{selectedRequest.allocatedResourceDetails?.serialNumber || selectedRequest.allocatedResourceDetails?.deviceTag || 'Pending Physical Allocation'}</strong>
                    </div>

                    {selectedRequest.allocatedResourceDetails?.locationWard && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold">Delivery Location:</span>
                        <strong>{selectedRequest.allocatedResourceDetails.locationWard}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Note */}
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-700 text-base">info</span>
                  <span>
                    <strong>Resource Allocation Governance:</strong> Doctor creates and tracks clinical equipment requests. Actual inventory decrement, device asset tagging, and physical release are managed by Resource / BioMed Staff.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE RESOURCE REQUEST MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">medical_services</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Request Specialized Medical Equipment</h3>
                  <p className="text-[11px] text-slate-500">Submit clinical equipment referral to Resource & BioMed Administration</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateResourceRequest} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Patient Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Patient *</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => handleSelectPatient(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white font-semibold"
                  >
                    <option value="">-- Choose Registered Patient --</option>
                    {patients.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.fullName || p.name} ({p.patientId}) {p.admissionStatus === 'Admitted' ? `• [${p.admissionSetup?.wardType || 'Inpatient'}]` : '• [Outpatient / ER]'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Priority Level *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white font-bold text-slate-800"
                  >
                    <option value="Normal">Normal / Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency / Critical</option>
                  </select>
                </div>
              </div>

              {/* Resource Type & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-9">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Resource / Equipment Type *</label>
                  <select
                    value={formData.resourceType}
                    onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white font-bold text-slate-900"
                  >
                    {resourceTypesCatalog.map(item => (
                      <option key={item.type} value={item.type}>
                        {item.type} — {item.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 font-bold"
                  />
                </div>
              </div>

              {/* Dates Required From / Until */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Required From (Date & Time) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.requiredFrom}
                    onChange={(e) => setFormData({ ...formData, requiredFrom: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Required Until (Optional Return Date)</label>
                  <input
                    type="datetime-local"
                    value={formData.requiredUntil}
                    onChange={(e) => setFormData({ ...formData, requiredUntil: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              {/* Clinical Reason */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Reason / Medical Rationale *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Acute respiratory distress syndrome secondary to pneumonia; SpO2 dropping below 88% on room air."
                  value={formData.clinicalReason}
                  onChange={(e) => setFormData({ ...formData, clinicalReason: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Additional Instructions */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Additional Doctor Instructions (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. High-flow nasal cannula circuit requested; set initial FiO2 to 50% and PEEP 5."
                  value={formData.additionalInstructions}
                  onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-700 text-base">info</span>
                <span>
                  <strong>Clinical Workflow Rule:</strong> Submitting this request notifies the Resource and BioMed administration. Inventory availability, asset barcode registration, and delivery are performed by Resource Staff.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">send</span>
                  {submitting ? 'Submitting Request...' : 'Submit Resource Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
