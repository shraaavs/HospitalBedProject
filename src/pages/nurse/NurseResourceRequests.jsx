import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NurseResourceRequests() {
  const location = useLocation();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState([]);
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
    { type: 'Oxygen Cylinder', icon: 'local_fire_department', desc: 'High-pressure Medical O2 Cylinder (40L/47L) with regulator' },
    { type: 'Ventilator', icon: 'air', desc: 'Mechanical ventilator with invasive & non-invasive modes' },
    { type: 'Infusion Pump', icon: 'water_drop', desc: 'High-precision smart volumetric syringe / infusion pump' },
    { type: 'Cardiac Monitor', icon: 'monitor_heart', desc: 'Multi-parameter bedside ECG / SpO2 / NIBP / Temp monitor' },
    { type: 'Wheelchair', icon: 'accessible', desc: 'Standard or bariatric patient transport wheelchair' },
    { type: 'Suction Machine', icon: 'cyclone', desc: 'High-vacuum airway secretion extractor' },
    { type: 'Defibrillator', icon: 'electric_bolt', desc: 'Automated External & Manual Biphasic Defibrillator' },
    { type: 'Nebulizer', icon: 'cloud', desc: 'Ultrasonic heavy-duty aerosol medication delivery system' },
    { type: 'Syringe Pump', icon: 'vaccines', desc: 'Micro-infusion pump for precise critical drug delivery' },
    { type: 'ECG Machine', icon: 'ecg', desc: '12-lead diagnostic resting electrocardiograph' },
    { type: 'Hospital Bed / Specialty Mattress', icon: 'bed', desc: 'Air mattress / bariatric / orthopedic specialty bed' },
    { type: 'Other Medical Equipment', icon: 'medical_services', desc: 'Specialized clinical or therapeutic hardware' }
  ];

  const [formData, setFormData] = useState({
    patientName: '',
    patientCustomId: '',
    ward: '',
    bedNumber: '',
    admissionCustomId: '',
    resourceType: 'Oxygen Cylinder',
    quantity: 1,
    priority: 'Normal',
    clinicalReason: '',
    requiredFrom: new Date().toISOString().slice(0, 16),
    requiredUntil: '',
    additionalInstructions: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch requests and nurse's assigned patients in parallel
      const [reqRes, patRes] = await Promise.all([
        axios.get('/api/resource-requests', { headers }),
        axios.get('/api/patients/assigned', { headers }).catch(async () => {
          // fallback to all patients if assigned endpoint not populated
          return axios.get('/api/patients', { headers });
        })
      ]);

      const reqData = reqRes.data || [];
      const patList = patRes.data?.patients || patRes.data || [];

      setRequests(Array.isArray(reqData) ? reqData : []);
      setAssignedPatients(Array.isArray(patList) ? patList : []);

      if (Array.isArray(reqData) && reqData.length > 0 && !selectedRequest) {
        setSelectedRequest(reqData[0]);
      }

      // Check if routed from emergency / vitals with preselected patient
      if (location.state?.patientId) {
        const targetId = location.state.patientId;
        const found = (Array.isArray(patList) ? patList : []).find(p => p._id === targetId || p.patientId === targetId);
        if (found) {
          handleSelectPatient(found._id, patList);
          setIsModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching nurse resource requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectPatient = (patientId, patientList = assignedPatients) => {
    setSelectedPatientId(patientId);
    const p = patientList.find(pat => pat._id === patientId || pat.patientId === patientId);
    if (p) {
      setSelectedPatientObj(p);
      const wardName = p.admissionSetup?.wardType || p.ward || 'General Ward';
      const bedNum = p.bedNumber || 'Unassigned';
      const admId = p.admissionId || `ADM-${p.patientId || '001'}`;

      setFormData(prev => ({
        ...prev,
        patientName: p.fullName || '',
        patientCustomId: p.patientId || '',
        ward: wardName,
        bedNumber: bedNum,
        admissionCustomId: admId,
        clinicalReason: prev.clinicalReason || (p.diagnosis ? `Required for patient with diagnosis: ${p.diagnosis}` : '')
      }));
    }
  };

  const handleOpenModal = () => {
    if (assignedPatients.length > 0 && !selectedPatientId) {
      handleSelectPatient(assignedPatients[0]._id, assignedPatients);
    }
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();

    if (!selectedPatientId && !formData.patientName) {
      Swal.fire({
        icon: 'warning',
        title: 'Patient Required',
        text: 'Please select an assigned patient for this resource request.'
      });
      return;
    }

    if (!formData.clinicalReason || formData.clinicalReason.trim().length < 5) {
      Swal.fire({
        icon: 'warning',
        title: 'Clinical Reason Required',
        text: 'Please provide a clear clinical / medical reason for requesting this resource.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        patientId: selectedPatientObj?._id || selectedPatientId,
        patientName: formData.patientName,
        patientCustomId: formData.patientCustomId,
        ward: formData.ward,
        bedNumber: formData.bedNumber,
        admissionCustomId: formData.admissionCustomId,
        resourceType: formData.resourceType,
        quantity: Number(formData.quantity) || 1,
        priority: formData.priority,
        clinicalReason: formData.clinicalReason,
        requiredFrom: formData.requiredFrom,
        requiredUntil: formData.requiredUntil || undefined,
        additionalInstructions: formData.additionalInstructions
      };

      const res = await axios.post('/api/resource-requests', payload, { headers });

      Swal.fire({
        icon: 'success',
        title: 'Resource Request Submitted',
        html: `Request <b>${res.data.requestId || 'RR-ID'}</b> for <b>${formData.quantity}x ${formData.resourceType}</b> has been sent to the Central Resource & Admin Staff for availability verification and allocation.`,
        confirmButtonColor: '#0066cc'
      });

      setIsModalOpen(false);
      // Reset form defaults
      setFormData({
        patientName: '',
        patientCustomId: '',
        ward: '',
        bedNumber: '',
        admissionCustomId: '',
        resourceType: 'Oxygen Cylinder',
        quantity: 1,
        priority: 'Normal',
        clinicalReason: '',
        requiredFrom: new Date().toISOString().slice(0, 16),
        requiredUntil: '',
        additionalInstructions: ''
      });
      setSelectedPatientId('');
      setSelectedPatientObj(null);

      // Refresh requests list
      await fetchData();
      if (res.data) {
        setSelectedRequest(res.data);
      }
    } catch (err) {
      console.error('Error submitting resource request:', err);
      Swal.fire({
        icon: 'error',
        title: 'Request Failed',
        text: err.response?.data?.message || 'Failed to submit resource request. Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered requests list
  const filteredRequests = requests.filter(req => {
    // Status filter
    if (statusFilter !== 'All' && req.status !== statusFilter) {
      return false;
    }
    // Priority filter
    if (priorityFilter !== 'All') {
      const p = req.priority || req.urgency;
      if (priorityFilter === 'Emergency' && p !== 'Emergency' && p !== 'Critical / Emergency') return false;
      if (priorityFilter === 'Urgent' && p !== 'Urgent') return false;
      if (priorityFilter === 'Normal' && p !== 'Normal' && p !== 'Routine') return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = req.patientName?.toLowerCase().includes(q);
      const matchPid = req.patientCustomId?.toLowerCase().includes(q);
      const matchRid = req.requestId?.toLowerCase().includes(q);
      const matchType = req.resourceType?.toLowerCase().includes(q);
      const matchReason = (req.clinicalReason || req.reason)?.toLowerCase().includes(q);
      const matchDoctor = req.doctorName?.toLowerCase().includes(q);
      if (!matchName && !matchPid && !matchRid && !matchType && !matchReason && !matchDoctor) {
        return false;
      }
    }
    return true;
  });

  // KPI Metrics Calculation
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'Pending').length;
  const approvedCount = requests.filter(r => r.status === 'Approved').length;
  const allocatedCount = requests.filter(r => r.status === 'Allocated' || r.status === 'In Use').length;
  const releasedCount = requests.filter(r => r.status === 'Released').length;

  const getPriorityBadge = (priority) => {
    const p = (priority || 'Normal').toLowerCase();
    if (p.includes('emergency') || p.includes('critical')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
          <span className="material-symbols-outlined text-[14px]">emergency</span> Emergency
        </span>
      );
    }
    if (p.includes('urgent')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          <span className="material-symbols-outlined text-[14px]">priority_high</span> Urgent
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
        <span className="material-symbols-outlined text-[14px]">low_priority</span> Routine / Normal
      </span>
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending Review
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="material-symbols-outlined text-[13px]">verified</span> Approved
          </span>
        );
      case 'Allocated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="material-symbols-outlined text-[13px]">inventory_2</span> Allocated
          </span>
        );
      case 'In Use':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-[13px]">medical_information</span> In Use
          </span>
        );
      case 'Released':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span className="material-symbols-outlined text-[13px]">check_circle</span> Released
          </span>
        );
      case 'Unavailable':
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
            <span className="material-symbols-outlined text-[13px]">cancel</span> Unavailable / Denied
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status || 'Pending'}
          </span>
        );
    }
  };

  const getWorkflowStepStatus = (currentStatus, stepName) => {
    const sequence = ['Pending', 'Approved', 'Allocated', 'In Use', 'Released'];
    const currentIndex = sequence.indexOf(currentStatus);
    const stepIndex = sequence.indexOf(stepName);

    if (currentStatus === 'Unavailable' || currentStatus === 'Rejected') {
      if (stepName === 'Pending') return 'done';
      return 'failed';
    }

    if (currentIndex > stepIndex) return 'done';
    if (currentIndex === stepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0066cc] to-[#004d99] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <span className="material-symbols-outlined text-[28px]">medical_services</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Nurse Resource Requests</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Ward Medical Equipment
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Submit and track clinical medical resource requirements for assigned patients through central inventory approval
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={fetchData}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
          </button>
          <button
            onClick={handleOpenModal}
            className="px-5 py-2.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-sm font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span> Request Medical Resource
          </button>
        </div>
      </div>

      {/* Hospital Workflow Notice Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">account_tree</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Hospital Resource Management Workflow</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Nurse &rarr; Resource Request &rarr; Resource / Admin Staff &rarr; Availability Check &rarr; Approval &rarr; Allocation &rarr; Patient Delivery
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-blue-700 bg-white/90 border border-blue-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
          <span className="material-symbols-outlined text-[16px] text-blue-600">lock</span> Central Inventory Controlled
        </div>
      </div>

      {/* KPI Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Requests</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Logged requests</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">dataset</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Review</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</h3>
            <p className="text-[11px] text-amber-600/80 mt-1">Awaiting verification</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">pending_actions</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Approved</p>
            <h3 className="text-2xl font-bold text-blue-700 mt-1">{approvedCount}</h3>
            <p className="text-[11px] text-blue-600/80 mt-1">Ready for dispatch</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Allocated / In Use</p>
            <h3 className="text-2xl font-bold text-indigo-700 mt-1">{allocatedCount}</h3>
            <p className="text-[11px] text-indigo-600/80 mt-1">Active at bedside</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">medical_information</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Released</p>
            <h3 className="text-2xl font-bold text-emerald-700 mt-1">{releasedCount}</h3>
            <p className="text-[11px] text-emerald-600/80 mt-1">Returned to inventory</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">task_alt</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient, ID, resource type, reason..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Allocated">Allocated</option>
              <option value="In Use">In Use</option>
              <option value="Released">Released</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Priorities</option>
              <option value="Emergency">Emergency</option>
              <option value="Urgent">Urgent</option>
              <option value="Normal">Routine / Normal</option>
            </select>
          </div>

          {(statusFilter !== 'All' || priorityFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter('All');
                setPriorityFilter('All');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-red-600 hover:text-red-700 hover:underline px-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Request List Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              Active Requests ({filteredRequests.length})
            </h3>
            <span className="text-xs text-slate-400">Select card to view details</span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500 mt-3">Loading real-time resource requests from MongoDB...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <span className="material-symbols-outlined text-[48px] text-slate-300">medical_information</span>
              <h4 className="text-base font-bold text-slate-700 mt-2">No Resource Requests Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                There are no resource requests matching the current filters. Click "Request Medical Resource" to submit a new equipment requirement.
              </p>
              <button
                onClick={handleOpenModal}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors"
              >
                + Create New Request
              </button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredRequests.map((req) => {
                const isSelected = selectedRequest?._id === req._id;
                return (
                  <div
                    key={req._id}
                    onClick={() => setSelectedRequest(req)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/20'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
                          <span className="material-symbols-outlined text-[20px]">
                            {req.resourceType?.toLowerCase().includes('oxygen')
                              ? 'local_fire_department'
                              : req.resourceType?.toLowerCase().includes('ventilator')
                              ? 'air'
                              : req.resourceType?.toLowerCase().includes('pump')
                              ? 'water_drop'
                              : req.resourceType?.toLowerCase().includes('monitor')
                              ? 'monitor_heart'
                              : req.resourceType?.toLowerCase().includes('wheelchair')
                              ? 'accessible'
                              : 'medical_services'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{req.resourceType}</h4>
                            <span className="text-xs font-bold text-slate-500">x{req.quantity || 1}</span>
                          </div>
                          <p className="text-xs font-medium text-slate-600 mt-0.5">
                            {req.patientName} <span className="text-slate-400">({req.patientCustomId || 'PID'})</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(req.status)}
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">location_on</span>
                        <span>{req.ward} • Bed {req.bedNumber}</span>
                      </div>
                      {getPriorityBadge(req.priority || req.urgency)}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>ID: <strong className="text-slate-600">{req.requestId || 'RR-ID'}</strong></span>
                      <span>Requested: {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Request Detailed Dossier */}
        <div className="lg:col-span-7">
          {selectedRequest ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                        {selectedRequest.requestId || 'RR-1001'}
                      </span>
                      {getStatusBadge(selectedRequest.status)}
                      {getPriorityBadge(selectedRequest.priority || selectedRequest.urgency)}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                      {selectedRequest.quantity || 1}x {selectedRequest.resourceType}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requested by {selectedRequest.requestedByModel === 'Nurse' ? 'Staff Nurse' : 'Doctor'} on {new Date(selectedRequest.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate('/beds')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">single_bed</span> Ward Monitoring
                    </button>
                  </div>
                </div>
              </div>

              {/* Real-time Workflow Progression Timeline */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-blue-600">timeline</span>
                  Resource Management Protocol Progression
                </h4>

                <div className="relative flex items-center justify-between max-w-2xl mx-auto px-2">
                  {/* Connecting Line */}
                  <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-slate-200 -z-0"></div>

                  {/* Steps */}
                  {[
                    { key: 'Pending', label: '1. Request Logged', icon: 'edit_note' },
                    { key: 'Approved', label: '2. Admin Approved', icon: 'verified' },
                    { key: 'Allocated', label: '3. Asset Allocated', icon: 'inventory_2' },
                    { key: 'In Use', label: '4. At Bedside', icon: 'medical_information' },
                    { key: 'Released', label: '5. Released', icon: 'task_alt' }
                  ].map((step) => {
                    const status = getWorkflowStepStatus(selectedRequest.status, step.key);
                    const isDone = status === 'done';
                    const isCurrent = status === 'current';

                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                            isDone
                              ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                              : isCurrent
                              ? 'bg-[#0066cc] text-white ring-4 ring-blue-100 animate-pulse'
                              : 'bg-white text-slate-400 border-2 border-slate-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                        </div>
                        <span
                          className={`text-[11px] font-semibold mt-2 text-center max-w-[70px] leading-tight ${
                            isDone
                              ? 'text-emerald-700'
                              : isCurrent
                              ? 'text-blue-700 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detailed Request Information Grid */}
              <div className="p-6 space-y-6">
                {/* Patient & Location Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Target Patient & Ward Bed Location
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-[11px] text-slate-400">Patient Name</p>
                      <p className="text-sm font-bold text-slate-800">{selectedRequest.patientName}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Patient ID</p>
                      <p className="text-sm font-bold text-slate-800">{selectedRequest.patientCustomId || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Ward & Bed</p>
                      <p className="text-sm font-bold text-blue-700">{selectedRequest.ward} • Bed {selectedRequest.bedNumber}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Admission ID</p>
                      <p className="text-sm font-bold text-slate-800">{selectedRequest.admissionCustomId || 'ADM-Active'}</p>
                    </div>
                  </div>
                </div>

                {/* Clinical / Medical Reason */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-blue-600">clinical_notes</span>
                    Clinical / Medical Reason
                  </h4>
                  <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-100 text-sm font-medium text-slate-800 leading-relaxed">
                    {selectedRequest.clinicalReason || selectedRequest.reason || 'No clinical reason recorded.'}
                  </div>
                </div>

                {/* Schedule & Additional Instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h5 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-slate-500">schedule</span>
                      Required Schedule
                    </h5>
                    <div className="space-y-1.5 text-xs text-slate-700">
                      <p>
                        <span className="text-slate-400">From:</span>{' '}
                        <strong>{new Date(selectedRequest.requiredFrom || selectedRequest.createdAt).toLocaleString()}</strong>
                      </p>
                      <p>
                        <span className="text-slate-400">Until:</span>{' '}
                        <strong>
                          {selectedRequest.requiredUntil
                            ? new Date(selectedRequest.requiredUntil).toLocaleString()
                            : 'Ongoing / As Needed'}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <h5 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-slate-500">notes</span>
                      Additional Instructions
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed italic">
                      {selectedRequest.additionalInstructions ||
                        selectedRequest.nurseNotes ||
                        selectedRequest.doctorNotes ||
                        'None provided.'}
                    </p>
                  </div>
                </div>

                {/* Central Resource / Allocation Dossier */}
                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-indigo-600">inventory</span>
                    Central Inventory & Allocation Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-700">
                    <div>
                      <p className="text-[11px] text-slate-400">Coordinator / Staff</p>
                      <p className="font-semibold text-slate-800">{selectedRequest.allocatedBy || 'Resource Staff'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Asset Serial / ID</p>
                      <p className="font-semibold text-slate-800">
                        {selectedRequest.allocatedResourceDetails?.serialNumber ||
                          selectedRequest.allocatedResourceDetails?.assetTag ||
                          'Assigned upon dispatch'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400">Allocation Status</p>
                      <p className="font-semibold text-indigo-700">{selectedRequest.status}</p>
                    </div>
                  </div>
                </div>

                {/* Nurse Responsibility Notice */}
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-amber-600 flex-shrink-0">info</span>
                  <span>
                    <strong>Nurse Protocol Note:</strong> Nurses can log resource requirements and monitor status. Inventory modification, asset barcode pairing, and physical release are managed by Central Resource/Admin staff.
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-[48px] text-slate-300">touch_app</span>
              <h3 className="text-base font-bold text-slate-700 mt-2">No Request Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Select a resource request from the list on the left to inspect complete medical reasons, schedule, and workflow progress.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Resource Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">add_box</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">New Medical Resource Request</h3>
                  <p className="text-xs text-slate-500">Route equipment request to central hospital inventory</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitRequest} className="p-6 space-y-5">
              {/* 1. Patient Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Assigned Patient <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedPatientId}
                  onChange={(e) => handleSelectPatient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select Assigned Patient --</option>
                  {assignedPatients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.fullName} ({p.patientId || 'PID'}) • {p.ward || p.admissionSetup?.wardType || 'Ward'} Bed {p.bedNumber || 'Unassigned'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient & Admission Read-Only Summary */}
              {selectedPatientObj && (
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Patient ID:</span>{' '}
                    <strong className="text-slate-800">{formData.patientCustomId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Admission ID:</span>{' '}
                    <strong className="text-slate-800">{formData.admissionCustomId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Location:</span>{' '}
                    <strong className="text-blue-700">{formData.ward} • Bed {formData.bedNumber}</strong>
                  </div>
                </div>
              )}

              {/* 2. Resource Type & Quantity */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Resource Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.resourceType}
                    onChange={(e) => setFormData({ ...formData, resourceType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {resourceTypesCatalog.map((item) => (
                      <option key={item.type} value={item.type}>
                        {item.type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* 3. Priority Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Clinical Priority <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Normal', label: 'Routine / Normal', color: 'blue' },
                    { id: 'Urgent', label: 'Urgent', color: 'amber' },
                    { id: 'Emergency', label: 'Critical Emergency', color: 'red' }
                  ].map((p) => (
                    <label
                      key={p.id}
                      className={`p-3 rounded-xl border text-center cursor-pointer font-bold text-xs transition-all ${
                        formData.priority === p.id
                          ? p.id === 'Emergency'
                            ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20'
                            : p.id === 'Urgent'
                            ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                            : 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="priority"
                        value={p.id}
                        checked={formData.priority === p.id}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="sr-only"
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Clinical / Medical Reason */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Clinical / Medical Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={formData.clinicalReason}
                  onChange={(e) => setFormData({ ...formData, clinicalReason: e.target.value })}
                  placeholder="e.g. Patient experiencing respiratory distress / SpO2 at 88% / Continuous IV Infusion protocol..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  required
                ></textarea>
              </div>

              {/* 5. Schedule (Required From & Required Until) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Required From <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.requiredFrom}
                    onChange={(e) => setFormData({ ...formData, requiredFrom: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Required Until (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.requiredUntil}
                    onChange={(e) => setFormData({ ...formData, requiredUntil: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 6. Additional Instructions */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Additional Instructions / Nursing Notes
                </label>
                <input
                  type="text"
                  value={formData.additionalInstructions}
                  onChange={(e) => setFormData({ ...formData, additionalInstructions: e.target.value })}
                  placeholder="e.g. Needs oxygen flowmeter attachment and pediatric nasal cannula..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-sm font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Submitting Request...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">send</span> Submit Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
