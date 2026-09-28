import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DoctorAdmissionBedRequests() {
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [wardFilter, setWardFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Request Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);

  const availableSpecialRequirements = [
    'Oxygen Support (High Flow / Nasal Cannula)',
    'Continuous Cardiac / ECG Monitoring',
    'Isolation Precautions (Airborne / Droplet)',
    'Mechanical Ventilator Support',
    'Dialysis Access Support',
    'Post-Op Surgical Monitoring',
    'Fall Risk & Strict Bedrest',
    'Pediatric / Geriatric Supervision'
  ];

  const [formData, setFormData] = useState({
    patientName: '',
    patientCustomId: '',
    admissionReason: '',
    clinicalReason: '',
    diagnosis: '',
    wardType: 'General Ward',
    bedType: 'Standard Bed',
    priority: 'Normal',
    specialRequirements: [],
    expectedDuration: '3-5 days',
    doctorNotes: ''
  });

  const fetchAdmissionData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [reqRes, patientsRes] = await Promise.all([
        axios.get('/api/admission-requests?myRequests=false', { headers }),
        axios.get('/api/patients', { headers })
      ]);

      const reqData = reqRes.data?.requests || reqRes.data?.admissions || reqRes.data || [];
      setRequests(Array.isArray(reqData) ? reqData : []);

      if (Array.isArray(reqData) && reqData.length > 0 && !selectedRequest) {
        setSelectedRequest(reqData[0]);
      }

      const pData = patientsRes.data?.patients || patientsRes.data || [];
      setPatients(Array.isArray(pData) ? pData : []);

      // If redirected from consultation or emergency with a patient
      if (location.state?.patientId) {
        const targetId = location.state.patientId;
        const found = (Array.isArray(pData) ? pData : []).find(p => p._id === targetId || p.patientId === targetId);
        if (found) {
          handleSelectPatient(found._id, pData);
          setIsModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching admission data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmissionData();
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
        diagnosis: p.clinicalInfo?.chiefComplaint || prev.diagnosis || 'Provisional Assessment',
        admissionReason: p.clinicalInfo?.chiefComplaint ? `Inpatient management for: ${p.clinicalInfo.chiefComplaint}` : prev.admissionReason
      }));
    }
  };

  const handleToggleSpecialRequirement = (req) => {
    setFormData(prev => {
      const exists = prev.specialRequirements.includes(req);
      return {
        ...prev,
        specialRequirements: exists
          ? prev.specialRequirements.filter(r => r !== req)
          : [...prev.specialRequirements, req]
      };
    });
  };

  const handleCreateAdmissionRequest = async (e) => {
    e.preventDefault();
    if (!formData.patientName || !formData.admissionReason) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Required Fields',
        text: 'Please select a registered patient and provide the primary admission reason.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post('/api/admission-requests', {
        patientId: selectedPatientId || undefined,
        patientName: formData.patientName,
        patientCustomId: formData.patientCustomId,
        admissionReason: formData.admissionReason,
        clinicalReason: formData.clinicalReason,
        diagnosis: formData.diagnosis,
        wardType: formData.wardType,
        requestedWard: formData.wardType,
        bedType: formData.bedType,
        priority: formData.priority,
        specialRequirements: formData.specialRequirements,
        expectedDuration: formData.expectedDuration,
        doctorNotes: formData.doctorNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Admission & Bed Request Submitted',
        text: `Inpatient request for ${formData.patientName} has been routed to Receptionist Verification & Bed Management.`,
        timer: 2200,
        showConfirmButton: false
      });

      setIsModalOpen(false);
      setFormData({
        patientName: '',
        patientCustomId: '',
        admissionReason: '',
        clinicalReason: '',
        diagnosis: '',
        wardType: 'General Ward',
        bedType: 'Standard Bed',
        priority: 'Normal',
        specialRequirements: [],
        expectedDuration: '3-5 days',
        doctorNotes: ''
      });
      setSelectedPatientId('');
      setSelectedPatientObj(null);

      const created = res.data?.admission || res.data?.request || res.data;
      setRequests(prev => [created, ...prev]);
      setSelectedRequest(created);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Failed to Submit Request',
        text: err.response?.data?.message || 'Server error submitting admission request.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Workflow Pipeline step calculator
  const getWorkflowStep = (status) => {
    switch (status) {
      case 'Doctor Approved':
      case 'Awaiting Bed Allocation':
      case 'Pending Verification':
      case 'Pending Approval':
      case 'Pending':
        return 1; // Doctor Authorized -> Awaiting Nurse Bed Allocation
      case 'Forwarded to Bed Management':
        return 2; // Verified -> Bed Allocation Review
      case 'Bed Allocated':
      case 'Allocated':
        return 3; // Bed Allocated -> Admission Formalization
      case 'Admission Confirmed':
      case 'Approved':
        return 3; // Admission Confirmed & Active Inpatient
      default:
        return 1;
    }
  };

  const filteredRequests = requests.filter(req => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (req.patientName || '').toLowerCase().includes(term) ||
                          (req.patientCustomId || '').toLowerCase().includes(term) ||
                          (req.admissionId || '').toLowerCase().includes(term) ||
                          (req.diagnosis || '').toLowerCase().includes(term) ||
                          (req.admissionReason || req.reason || '').toLowerCase().includes(term);

    const matchesStatus = statusFilter === 'All' ||
      (statusFilter === 'Pending' && (req.status === 'Doctor Approved' || req.status === 'Awaiting Bed Allocation' || req.status === 'Pending Verification' || req.status === 'Pending Approval' || req.status === 'Pending')) ||
      (statusFilter === 'Forwarded' && (req.status === 'Forwarded to Bed Management' || req.status === 'Doctor Approved')) ||
      (statusFilter === 'Allocated' && (req.status === 'Bed Allocated' || req.status === 'Allocated' || req.status === 'Admission Confirmed'));

    const matchesWard = wardFilter === 'All' || (req.wardType === wardFilter || req.requestedWard === wardFilter);

    return matchesSearch && matchesStatus && matchesWard;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shadow-2xs">
            <span className="material-symbols-outlined text-2xl">single_bed</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Inpatient Admissions & Bed Requests</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctor Inpatient Referral Suite • Clinical Justification, Ward/Bed Specifications & Administrative Workflow
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
            <span className="material-symbols-outlined text-base">domain_add</span>
            Request Patient Admission
          </button>
        </div>
      </div>

      {/* Workflow Pipeline Diagram Visualizer */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-teal-700 text-base">linear_scale</span>
            Direct Inpatient Admission & Bed Allocation Workflow
          </span>
          <span className="text-[11px] text-slate-500 italic">
            Doctor Authorizes Admission → Nurse Receives Direct Alert → Nurse Assigns & Confirms Bed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-center text-xs">
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 font-bold">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] flex items-center justify-center font-bold">1</span>
              <span>1. Doctor Admission Order</span>
            </div>
            <p className="text-[10px] text-teal-700 font-normal">Directly authorized (Bypasses verification)</p>
          </div>

          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
              <span>2. Nurse Notification & Bed Allocation</span>
            </div>
            <p className="text-[10px] text-indigo-700 font-normal">Nurse selects available ward bed</p>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center font-bold">3</span>
              <span>3. Bed Assigned & Inpatient Active</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-normal">Patient admitted & bed occupied</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">folder_shared</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Requests</p>
            <p className="text-xl font-black text-slate-900">{requests.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">pending_actions</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Doctor Approved</p>
            <p className="text-xl font-black text-indigo-700">
              {requests.filter(r => r.status === 'Doctor Approved' || r.status === 'Awaiting Bed Allocation' || r.status === 'Pending Verification' || r.status === 'Pending Approval' || r.status === 'Pending').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">sync_alt</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Awaiting Bed</p>
            <p className="text-xl font-black text-blue-700">
              {requests.filter(r => r.status === 'Doctor Approved' || r.status === 'Forwarded to Bed Management' || r.status === 'Awaiting Bed Allocation').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">how_to_reg</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Allocated & Admitted</p>
            <p className="text-xl font-black text-emerald-700">
              {requests.filter(r => r.status === 'Bed Allocated' || r.status === 'Allocated' || r.status === 'Admission Confirmed' || r.status === 'Approved').length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Requests Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search by Patient, ID, Admission ID or Diagnosis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs pb-1">
              <div className="flex items-center gap-1">
                {['All', 'Pending', 'Forwarded', 'Allocated'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors ${
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
                value={wardFilter}
                onChange={(e) => setWardFilter(e.target.value)}
                className="p-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white"
              >
                <option value="All">All Wards</option>
                <option value="General Ward">General Ward</option>
                <option value="Special Ward">Special Ward</option>
                <option value="ICU">ICU</option>
                <option value="Emergency">Emergency</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[580px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-teal-600 mb-1">progress_activity</span>
                <p>Loading admission requests...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">bed</span>
                <p>No admission requests match the filter.</p>
              </div>
            ) : (
              filteredRequests.map(req => {
                const isSelected = selectedRequest?._id === req._id;
                const isEmergency = req.priority === 'Emergency' || req.priority === 'Emergency / High';

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
                          <h4 className="text-xs font-bold text-slate-900">{req.patientName}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-50 text-teal-800 rounded font-bold border border-teal-100">
                            {req.admissionId || 'ADM'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                          {req.diagnosis || req.admissionReason || req.reason}
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isEmergency ? 'bg-rose-100 text-rose-800 font-black animate-pulse' :
                        req.priority === 'Urgent' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {req.priority}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Target: <strong>{req.wardType || req.requestedWard}</strong> ({req.bedType || 'Standard Bed'})</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        req.status === 'Doctor Approved' || req.status === 'Awaiting Bed Allocation' ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                        req.status === 'Forwarded to Bed Management' ? 'bg-blue-100 text-blue-800' :
                        req.status === 'Bed Allocated' || req.status === 'Admission Confirmed' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'Pending Verification' ? 'Doctor Approved' : req.status}
                      </span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span>Ref by: <strong>{req.doctorName}</strong></span>
                      <span>{new Date(req.createdAt).toLocaleDateString('en-GB')}</span>
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
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">single_bed</span>
              <p className="text-xs font-semibold">Select an admission request from the queue to view full clinical details.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedRequest.patientName}</h3>
                    <span className="text-xs font-mono px-2 py-0.5 bg-teal-100 text-teal-800 font-bold rounded-md">
                      {selectedRequest.admissionId}
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-md">
                      {selectedRequest.patientCustomId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Requested on <strong>{new Date(selectedRequest.createdAt).toLocaleDateString('en-GB')}</strong> by <strong>{selectedRequest.doctorName}</strong> ({selectedRequest.doctorDepartment})
                  </p>
                </div>

                <span className={`self-start sm:self-center px-3 py-1 text-xs font-bold rounded-full ${
                  selectedRequest.status === 'Doctor Approved' || selectedRequest.status === 'Awaiting Bed Allocation' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' :
                  selectedRequest.status === 'Forwarded to Bed Management' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  selectedRequest.status === 'Bed Allocated' || selectedRequest.status === 'Admission Confirmed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {selectedRequest.status === 'Pending Verification' ? 'Doctor Approved' : selectedRequest.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[580px]">
                {/* Clinical Justification Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Provisional Diagnosis</span>
                    <p className="text-xs font-bold text-teal-800">{selectedRequest.diagnosis || 'Clinical Assessment'}</p>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Priority Level & Duration</span>
                    <p className="text-xs font-bold text-slate-800">
                      {selectedRequest.priority} • Expected Stay: {selectedRequest.expectedDuration || '3-5 days'}
                    </p>
                  </div>
                </div>

                {/* Admission & Clinical Reason */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Primary Admission Reason</span>
                    <p className="text-xs text-slate-800 font-semibold bg-white p-2.5 rounded-lg border border-slate-200/80">
                      {selectedRequest.admissionReason || selectedRequest.reason}
                    </p>
                  </div>

                  {selectedRequest.clinicalReason && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Clinical Justification & Indications</span>
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200/80">
                        {selectedRequest.clinicalReason}
                      </p>
                    </div>
                  )}
                </div>

                {/* Required Ward & Bed Specifications */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-700 text-base">domain</span>
                      Ward & Bed Placement Requirements
                    </span>
                  </div>

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Requested Ward Option</span>
                      <strong className="text-slate-900 text-sm">{selectedRequest.wardType || selectedRequest.requestedWard}</strong>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Requested Bed Type</span>
                      <strong className="text-slate-900 text-sm">{selectedRequest.bedType || 'Standard Bed'}</strong>
                    </div>
                  </div>
                </div>

                {/* Special Clinical Requirements */}
                {selectedRequest.specialRequirements?.length > 0 && (
                  <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-200 space-y-1.5">
                    <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider block">
                      Special Clinical Requirements & Equipment:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRequest.specialRequirements.map((req, idx) => (
                        <span key={idx} className="px-2.5 py-1 bg-white border border-teal-300 text-teal-900 font-bold rounded-lg text-xs shadow-2xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-teal-700">check_circle</span>
                          {req}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Doctor's Notes */}
                {(selectedRequest.doctorNotes || selectedRequest.clinicalNotes) && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                      Doctor's Clinical Notes & Instructions
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-white p-2.5 rounded-lg border border-slate-200">
                      {selectedRequest.doctorNotes || selectedRequest.clinicalNotes}
                    </p>
                  </div>
                )}

                {/* Administrative Tracking & Allocation Status */}
                <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200 text-xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                    Nursing Bed Allocation Audit:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span>Doctor Authorization: </span>
                      <strong className="text-indigo-800">
                        {selectedRequest.doctorName ? `${selectedRequest.doctorName} (Authorized)` : 'Doctor Approved'}
                      </strong>
                    </div>
                    <div>
                      <span>Allocated Bed: </span>
                      <strong className="text-emerald-800">
                        {selectedRequest.allocatedBedNumber ? `Bed ${selectedRequest.allocatedBedNumber} (${selectedRequest.allocatedWard || selectedRequest.wardType})` : 'Awaiting Nurse Bed Allocation'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE ADMISSION REQUEST MODAL */}
      {isModalOpen && typeof document !== 'undefined' && createPortal(
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
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '680px',
              minWidth: '320px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '92vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">domain_add</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Direct Inpatient Admission Order</h3>
                  <p className="text-[11px] text-slate-500">Authorize patient admission and dispatch immediate bed assignment alert to nursing staff</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateAdmissionRequest} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Patient Selector & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Outpatient / Emergency Patient *</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => handleSelectPatient(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white font-semibold"
                  >
                    <option value="">-- Select Registered Patient --</option>
                    {patients.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.fullName || p.name} ({p.patientId}) {p.admissionStatus === 'Admitted' ? `• [Already Inpatient]` : '• [Outpatient / ER]'}
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

              {/* Provisional Diagnosis & Expected Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Provisional Diagnosis *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute Coronary Syndrome / Severe Pneumonia"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Expected Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 3-5 days / 1 week"
                    value={formData.expectedDuration}
                    onChange={(e) => setFormData({ ...formData, expectedDuration: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Admission Reason & Clinical Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Primary Admission Reason *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Continuous cardiac monitoring, IV antibiotic regimen, and surgical evaluation."
                    value={formData.admissionReason}
                    onChange={(e) => setFormData({ ...formData, admissionReason: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Clinical Justification & Indications</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Troponin elevated, SpO2 unstable on room air, requires specialized nursing care."
                    value={formData.clinicalReason}
                    onChange={(e) => setFormData({ ...formData, clinicalReason: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Ward & Bed Specifications */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Required Ward Type *</label>
                    <select
                      value={formData.wardType}
                      onChange={(e) => setFormData({ ...formData, wardType: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white font-bold text-slate-800"
                    >
                      <option value="General Ward">General Ward</option>
                      <option value="Special Ward">Special Ward</option>
                      <option value="ICU">ICU (Intensive Care Unit)</option>
                      <option value="Emergency">Emergency Ward</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Required Bed Type *</label>
                    <select
                      value={formData.bedType}
                      onChange={(e) => setFormData({ ...formData, bedType: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white font-bold text-slate-800"
                    >
                      <option value="Standard Bed">Standard Bed</option>
                      <option value="ICU Bed">ICU Bed</option>
                      <option value="Cardiac Monitor Bed">Cardiac Monitor Bed</option>
                      <option value="Ventilator Bed">Ventilator Bed</option>
                      <option value="Isolation Bed">Isolation Bed</option>
                      <option value="Deluxe Room">Deluxe Room</option>
                      <option value="Semi-Private Bed">Semi-Private Bed</option>
                      <option value="Emergency Bay">Emergency Bay</option>
                    </select>
                  </div>
                </div>

                {/* Special Requirements Multi-Select */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Special Clinical Requirements & Equipment (Optional):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableSpecialRequirements.map((req, idx) => {
                      const isChecked = formData.specialRequirements.includes(req);
                      return (
                        <label
                          key={idx}
                          className={`p-2 rounded-lg border text-xs cursor-pointer flex items-center gap-2 transition-colors ${
                            isChecked
                              ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSpecialRequirement(req)}
                            className="rounded text-teal-700 focus:ring-teal-600"
                          />
                          <span>{req}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Doctor's Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Doctor's Medical Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional instructions for nursing staff or bed coordinator upon admission..."
                  value={formData.doctorNotes}
                  onChange={(e) => setFormData({ ...formData, doctorNotes: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Protocol Alert Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-700 text-base">info</span>
                <span>
                  <strong>Clinical Workflow Rule:</strong> Submitting this form creates an authorized Admission Bed Request. Physical bed assignment and occupancy status are confirmed through Hospital Bed Management.
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
                  {submitting ? 'Submitting Request...' : 'Submit Admission Request'}
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
