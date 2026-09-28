import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NurseBedPatientMonitoring() {
  const navigate = useNavigate();

  const [beds, setBeds] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [observations, setObservations] = useState([]);
  const [transferOrders, setTransferOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Selected Bed / Patient Drawer
  const [selectedBed, setSelectedBed] = useState(null);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferForm, setTransferForm] = useState({
    recommendedWard: 'ICU',
    requiredBedType: 'ICU Bed',
    priority: 'Urgent',
    reasonForTransfer: '',
    clinicalNotes: ''
  });
  const [submittingTransfer, setSubmittingTransfer] = useState(false);

  // Discharge Modal State
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeForm, setDischargeForm] = useState({
    dischargeType: 'Routine Normal Discharge',
    dischargeCondition: 'Stable / Improved',
    dischargeDiagnosis: '',
    clinicalSummary: '',
    dietaryInstructions: 'Normal Balanced Diet',
    activityRestrictions: 'Routine Activity',
    followUpDays: '7',
    followUpNotes: 'Follow-up consultation in 1 week.'
  });
  const [submittingDischarge, setSubmittingDischarge] = useState(false);

  // Direct Inpatient Bed Allocation Modal State
  const [showDirectAllocateModal, setShowDirectAllocateModal] = useState(false);
  const [awaitingAdmissions, setAwaitingAdmissions] = useState([]);
  const [allocateForm, setAllocateForm] = useState({
    patientId: '',
    patientName: '',
    admissionRequestId: '',
    notes: ''
  });
  const [submittingDirectAllocation, setSubmittingDirectAllocation] = useState(false);

  // Filters
  const [wardFilter, setWardFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Occupied' | 'Available' | 'Cleaning' | 'Reserved'
  const [conditionFilter, setConditionFilter] = useState('All'); // 'All' | 'Stable' | 'Critical' | 'Guarded'
  const [searchQuery, setSearchQuery] = useState('');

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'Nurse';
  const userName = localStorage.getItem('userName') || 'Staff Nurse';
  const userDepartment = localStorage.getItem('userDepartment') || 'General Medicine';

  // Open Transfer Modal with Prefill
  const handleOpenTransferModal = (bed) => {
    setSelectedBed(bed);
    setTransferForm({
      recommendedWard: bed.wardType === 'ICU' ? 'General Ward' : 'ICU',
      requiredBedType: bed.wardType === 'ICU' ? 'Standard Bed' : 'ICU Bed',
      priority: bed.clinicalCondition === 'Critical' ? 'Emergency' : 'Urgent',
      reasonForTransfer: bed.clinicalCondition === 'Critical' ? 'Patient condition deteriorated, requires intensive monitoring.' : 'Routine ward step-down / step-up transfer.',
      clinicalNotes: `Patient ${bed.patName} (${bed.patId}) in ${bed.wardType} - ${bed.bedNumber}. Current Acuity: ${bed.clinicalCondition}.`
    });
    setShowTransferModal(true);
  };

  // Open Discharge Modal with Prefill
  const handleOpenDischargeModal = (bed) => {
    setSelectedBed(bed);
    setDischargeForm({
      dischargeType: 'Routine Normal Discharge',
      dischargeCondition: bed.clinicalCondition === 'Stable' ? 'Stable / Improved' : 'Clinically Stable for Discharge',
      dischargeDiagnosis: bed.patDiagnosis || 'Clinical Inpatient Care',
      clinicalSummary: `Patient ${bed.patName} evaluated in ${bed.wardType} (${bed.bedNumber}). Vitals stable, cleared for discharge processing.`,
      dietaryInstructions: 'Normal balanced diet, adequate hydration.',
      activityRestrictions: 'Avoid heavy exertion for 3-5 days.',
      followUpDays: '7',
      followUpNotes: 'Follow-up with attending physician in 7 days.'
    });
    setShowDischargeModal(true);
  };

  // Submit Bed Transfer Recommendation
  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!selectedBed) return;

    if (!transferForm.reasonForTransfer.trim()) {
      Swal.fire('Reason Required', 'Please specify clinical justification for bed transfer.', 'warning');
      return;
    }

    try {
      setSubmittingTransfer(true);
      const payload = {
        requestType: 'Transfer',
        patientId: selectedBed.patientObj?._id,
        patientName: selectedBed.patName,
        patientCustomId: selectedBed.patId,
        currentWard: selectedBed.wardType,
        currentBedNumber: selectedBed.bedNumber,
        transferDetails: {
          recommendedWard: transferForm.recommendedWard,
          targetWard: transferForm.recommendedWard,
          requiredBedType: transferForm.requiredBedType,
          priority: transferForm.priority,
          reasonForTransfer: transferForm.reasonForTransfer,
          medicalReason: transferForm.reasonForTransfer,
          clinicalNotes: transferForm.clinicalNotes,
          recommendedByNurse: userName
        }
      };

      await axios.post('/api/transfer-discharge', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Bed Transfer Requested',
        text: `Transfer request for ${selectedBed.patName} to ${transferForm.recommendedWard} dispatched to Bed Management.`,
        timer: 2000,
        showConfirmButton: false
      });

      setShowTransferModal(false);
      fetchMonitoringData();
    } catch (err) {
      console.error('Error submitting bed transfer:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit bed transfer request.', 'error');
    } finally {
      setSubmittingTransfer(false);
    }
  };

  // Submit Discharge Request / Assistance
  const handleSubmitDischarge = async (e) => {
    e.preventDefault();
    if (!selectedBed) return;

    try {
      setSubmittingDischarge(true);
      const followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + parseInt(dischargeForm.followUpDays || '7', 10));

      const payload = {
        requestType: 'Discharge',
        patientId: selectedBed.patientObj?._id,
        patientName: selectedBed.patName,
        patientCustomId: selectedBed.patId,
        currentWard: selectedBed.wardType,
        currentBedNumber: selectedBed.bedNumber,
        dischargeDetails: {
          dischargeType: dischargeForm.dischargeType,
          dischargeCondition: dischargeForm.dischargeCondition,
          dischargeDiagnosis: dischargeForm.dischargeDiagnosis,
          clinicalSummary: dischargeForm.clinicalSummary,
          dietaryInstructions: dischargeForm.dietaryInstructions,
          activityRestrictions: dischargeForm.activityRestrictions,
          followUpDate,
          followUpNotes: dischargeForm.followUpNotes,
          recommendedByNurse: userName
        }
      };

      await axios.post('/api/transfer-discharge', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Discharge Recommendation Submitted',
        text: `Discharge order initiated for ${selectedBed.patName}. Forwarded to Billing & Receptionist Discharge Desk.`,
        timer: 2000,
        showConfirmButton: false
      });

      setShowDischargeModal(false);
      fetchMonitoringData();
    } catch (err) {
      console.error('Error submitting discharge:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to initiate discharge order.', 'error');
    } finally {
      setSubmittingDischarge(false);
    }
  };

  // Open Direct Bed Allocation Modal
  const handleOpenDirectAllocateModal = (bed) => {
    setSelectedBed(bed);
    // Pre-select first pending admission if available
    const firstAwaiting = awaitingAdmissions[0];
    setAllocateForm({
      patientId: firstAwaiting ? (firstAwaiting.patientId?._id || firstAwaiting.patientId || firstAwaiting.patientCustomId) : '',
      patientName: firstAwaiting ? firstAwaiting.patientName : '',
      admissionRequestId: firstAwaiting ? (firstAwaiting._id || firstAwaiting.admissionId) : '',
      notes: `Bed allocation to ${bed.wardType} - ${bed.bedNumber} authorized by Nursing Staff.`
    });
    setShowDirectAllocateModal(true);
  };

  // Submit Direct Bed Allocation
  const handleSubmitDirectAllocation = async (e) => {
    e.preventDefault();
    if (!selectedBed) return;

    if (!allocateForm.patientName && !allocateForm.patientId) {
      Swal.fire('Patient Required', 'Please select or specify the patient to admit.', 'warning');
      return;
    }

    try {
      setSubmittingDirectAllocation(true);
      const res = await axios.put(`/api/beds/${selectedBed._id}/allocate`, {
        patientId: allocateForm.patientId,
        patientName: allocateForm.patientName,
        admissionRequestId: allocateForm.admissionRequestId,
        notes: allocateForm.notes || `Bed allocated by Nurse ${userName}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data?.success || res.status === 200) {
        Swal.fire({
          icon: 'success',
          title: 'Bed Allocated Successfully!',
          text: `Bed ${selectedBed.bedNumber} (${selectedBed.wardType}) is now occupied by ${allocateForm.patientName || 'Inpatient'}.`,
          timer: 2500,
          showConfirmButton: false
        });

        setShowDirectAllocateModal(false);
        fetchMonitoringData();
      }
    } catch (err) {
      console.error('Error allocating bed:', err);
      Swal.fire('Allocation Error', err.response?.data?.message || 'Failed to allocate bed.', 'error');
    } finally {
      setSubmittingDirectAllocation(false);
    }
  };

  // Fetch Live Beds, Patients, Vitals and Observations from MongoDB
  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [bedsRes, patientsRes, vitalsRes, obsRes, admRes, transferRes] = await Promise.all([
        axios.get('/api/beds', { headers }),
        axios.get('/api/patients/assigned', { headers }),
        axios.get('/api/vitals', { headers }),
        axios.get('/api/nursing-observations', { headers }),
        axios.get('/api/admission-requests', { headers }).catch(() => ({ data: [] })),
        axios.get('/api/transfer-discharge', { headers }).catch(() => ({ data: [] }))
      ]);

      setBeds(bedsRes.data || []);
      const patList = Array.isArray(patientsRes.data) ? patientsRes.data : (patientsRes.data?.patients || []);
      setAssignedPatients(patList);
      setVitals(vitalsRes.data || []);
      setObservations(obsRes.data || []);

      const rawAdmissions = admRes.data?.requests || admRes.data?.admissions || admRes.data || [];
      const pendingAdmissions = (Array.isArray(rawAdmissions) ? rawAdmissions : []).filter(
        a => a.status !== 'Bed Allocated' && a.status !== 'Allocated' && a.status !== 'Admission Confirmed'
      );
      setAwaitingAdmissions(pendingAdmissions);

      const rawTransfers = Array.isArray(transferRes.data) ? transferRes.data : [];
      setTransferOrders(rawTransfers.filter(t => t.requestType === 'Transfer'));
    } catch (err) {
      console.error('Error fetching bed & patient monitoring data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(fetchMonitoringData, 30000); // 30-sec live polling
    return () => clearInterval(interval);
  }, []);

  // Merge Beds with Inpatient Clinical Profiles, Latest Vitals & Acuity Condition
  const enrichedBeds = beds.map((bed) => {
    const patientObj = assignedPatients.find(
      p => (p.bedId?._id && String(p.bedId._id) === String(bed._id)) ||
           (p.bedId?.bedNumber && p.bedId.bedNumber === bed.bedNumber) ||
           (p.bedNumber && p.bedNumber === bed.bedNumber) ||
           (bed.patientId && (p.patientId === bed.patientId || String(p._id) === String(bed.patientId))) ||
           (bed.patientName && p.fullName?.toLowerCase() === bed.patientName.toLowerCase())
    );

    const patId = patientObj?.patientId || bed.patientId;
    const patName = patientObj?.fullName || patientObj?.name || bed.patientName;
    const patAdmissionStatus = patientObj?.status || (bed.status === 'Occupied' ? 'Admitted' : 'None');
    const patAssignedDoc = patientObj?.assignedDoctor || patientObj?.admissionSetup?.assignedDoctor || 'Attending Physician';
    const patDiagnosis = patientObj?.latestDiagnosis || patientObj?.clinicalInfo?.chiefComplaint || 'Clinical Inpatient Care';

    // Find latest vital
    const patVitals = vitals.filter(v => v.patientCustomId === patId || String(v.patientId) === String(patientObj?._id));
    const latestVital = patVitals[0] || null;

    // Find latest observation
    const patObs = observations.filter(o => o.patientCustomId === patId || String(o.patientId) === String(patientObj?._id));
    const latestObs = patObs[0] || null;

    // Condition heuristic
    let clinicalCondition = 'Stable';
    if (latestObs?.generalCondition) {
      clinicalCondition = latestObs.generalCondition;
    } else if (latestVital?.isCritical || patientObj?.patientStatus === 'Critical' || bed.wardType === 'ICU') {
      clinicalCondition = 'Critical';
    } else if (patientObj?.patientStatus === 'Guarded') {
      clinicalCondition = 'Guarded';
    }

    const isNurseAssigned = Boolean(patientObj) || (bed.wardType?.toLowerCase().includes(userDepartment.toLowerCase()));

    const activeTransferDirective = transferOrders.find(
      t => (t.status === 'Doctor Approved' || t.status === 'Pending' || t.status === 'Requested') &&
           (t.patientCustomId === patId || String(t.patientId) === String(patientObj?._id) || (patName && t.patientName?.toLowerCase() === patName.toLowerCase()))
    );

    return {
      ...bed,
      patientObj,
      patId,
      patName,
      patAdmissionStatus,
      patAssignedDoc,
      patDiagnosis,
      latestVital,
      latestObs,
      clinicalCondition,
      isNurseAssigned,
      activeTransferDirective
    };
  });

  // Filter beds
  const filteredBeds = enrichedBeds.filter((bed) => {
    if (wardFilter !== 'All' && !bed.wardType?.toLowerCase().includes(wardFilter.toLowerCase())) return false;
    if (statusFilter !== 'All' && bed.status !== statusFilter) return false;
    if (conditionFilter !== 'All' && bed.status === 'Occupied' && !bed.clinicalCondition?.toLowerCase().includes(conditionFilter.toLowerCase())) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchBed = (bed.bedNumber || '').toLowerCase().includes(q);
      const matchWard = (bed.wardType || '').toLowerCase().includes(q);
      const matchName = (bed.patName || '').toLowerCase().includes(q);
      const matchId = (bed.patId || '').toLowerCase().includes(q);
      const matchDoc = (bed.patAssignedDoc || '').toLowerCase().includes(q);
      const matchDiag = (bed.patDiagnosis || '').toLowerCase().includes(q);
      return matchBed || matchWard || matchName || matchId || matchDoc || matchDiag;
    }
    return true;
  });

  // Unique wards
  const uniqueWards = ['All', ...new Set(beds.map(b => b.wardType).filter(Boolean))];

  // Stats calculation
  const totalBedsCount = beds.length;
  const occupiedBedsCount = beds.filter(b => b.status === 'Occupied').length;
  const availableBedsCount = beds.filter(b => b.status === 'Available').length;
  const criticalPatientsCount = enrichedBeds.filter(b => b.status === 'Occupied' && (b.clinicalCondition === 'Critical' || b.clinicalCondition === 'Deteriorating' || b.latestVital?.isCritical)).length;
  const assignedBedsCount = enrichedBeds.filter(b => b.isNurseAssigned).length;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
                  <span className="material-symbols-outlined text-2xl">single_bed</span>
                </span>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Bed & Inpatient Clinical Monitoring
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                      Module 7
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time ward telemetry, bed occupancy status, inpatient condition, and vital monitoring
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchMonitoringData}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                title="Refresh Live Beds"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Live Refresh
              </button>

              <div className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-teal-700">lock</span>
                Bed Allocation: Admin Controlled
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Ward Beds</span>
                <span className="text-lg font-black text-slate-800">{totalBedsCount}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">bed</span>
            </div>

            <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Occupied Beds</span>
                <span className="text-lg font-black text-blue-700">{occupiedBedsCount}</span>
              </div>
              <span className="material-symbols-outlined text-blue-500">hotel</span>
            </div>

            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Available Beds</span>
                <span className="text-lg font-black text-emerald-700">{availableBedsCount}</span>
              </div>
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
            </div>

            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-0.5">Critical Acuity</span>
                <span className="text-lg font-black text-rose-700">{criticalPatientsCount}</span>
              </div>
              <span className="material-symbols-outlined text-rose-500">crisis_alert</span>
            </div>

            <div className="bg-teal-50/60 p-2.5 rounded-xl border border-teal-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-0.5">Assigned to You</span>
                <span className="text-lg font-black text-teal-800">{assignedBedsCount}</span>
              </div>
              <span className="material-symbols-outlined text-teal-600">groups</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Policy Guard Banner */}
        <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-white/10 rounded-xl">
              <span className="material-symbols-outlined text-teal-400">verified_user</span>
            </span>
            <div>
              <p className="font-bold text-sm">Bed Allocation Authority Notice</p>
              <p className="text-slate-300 text-[11px] mt-0.5">
                Nurses monitor live bed telemetry and inpatient status. Hospital bed allocation, transfer, and release workflows remain governed by Central Bed Management / Admin.
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-teal-500/20 text-teal-300 font-bold text-[10px] rounded-full border border-teal-400/30 uppercase tracking-wider">
            Live Read-Only Monitoring
          </span>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search bed, patient, diagnosis, doctor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Ward Filter */}
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              {uniqueWards.map(w => (
                <option key={w} value={w}>Ward: {w}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              <option value="All">Bed Status: All</option>
              <option value="Occupied">Occupied</option>
              <option value="Available">Available</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Reserved">Reserved</option>
              <option value="Maintenance">Maintenance</option>
            </select>

            {/* Condition Filter */}
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              <option value="All">Patient Acuity: All</option>
              <option value="Stable">Stable</option>
              <option value="Guarded">Guarded</option>
              <option value="Critical">Critical / STAT</option>
            </select>
          </div>
        </div>

        {/* 2-Column Bed Matrix & Telemetry View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Bed Grid (7 Cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-teal-700">grid_view</span>
                Ward Bed Matrix ({filteredBeds.length} Beds)
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Click to inspect monitoring details</span>
            </div>

            {loading ? (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent"></div>
                <p className="text-xs font-semibold">Loading Live Hospital Bed Database...</p>
              </div>
            ) : filteredBeds.length === 0 ? (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">hotel</span>
                <p className="text-xs font-bold text-slate-600">No beds found matching filter</p>
                <p className="text-[11px] text-slate-400">Try changing the ward or status filter above.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredBeds.map((bed) => {
                  const isSelected = selectedBed?._id === bed._id;
                  const isOccupied = bed.status === 'Occupied';
                  const isCritical = isOccupied && (bed.clinicalCondition === 'Critical' || bed.clinicalCondition === 'Deteriorating' || bed.latestVital?.isCritical);

                  return (
                    <div
                      key={bed._id}
                      onClick={() => setSelectedBed(bed)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2.5 relative ${
                        isSelected
                          ? 'bg-teal-50/60 border-teal-600 ring-2 ring-teal-600/30 shadow-md'
                          : isCritical
                          ? 'bg-rose-50/40 border-rose-300 hover:border-rose-400 shadow-xs'
                          : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Bed Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="p-1.5 bg-slate-100 rounded-lg text-slate-700 font-black text-xs">
                            {bed.bedNumber}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">{bed.wardType} Ward</span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          bed.status === 'Occupied'
                            ? isCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                              : 'bg-blue-100 text-blue-800'
                            : bed.status === 'Available'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bed.status === 'Cleaning'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {bed.status}
                        </span>
                      </div>

                      {/* Inpatient Telemetry Snippet */}
                      {isOccupied ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-sm truncate max-w-[150px]">
                              {bed.patName}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {bed.patId}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 truncate">
                            Dx: <strong className="text-slate-700">{bed.patDiagnosis}</strong>
                          </p>

                          {/* Vital & Condition Chips */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isCritical ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              Acuity: {bed.clinicalCondition}
                            </span>

                            {bed.latestVital && (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                                SpO2: {bed.latestVital.oxygenSaturation}% • HR: {bed.latestVital.pulseRate}
                              </span>
                            )}
                          </div>

                          {bed.activeTransferDirective && (
                            <div className="mt-1.5 p-1.5 bg-amber-500/15 border border-amber-400/30 rounded-lg flex items-center justify-between text-[10px] text-amber-900 font-bold">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-amber-700">swap_horiz</span>
                                Transfer to {bed.activeTransferDirective.transferDetails?.targetWard || bed.activeTransferDirective.transferDetails?.recommendedWard}
                              </span>
                              <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-black uppercase">
                                Doctor Order
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="py-4 text-center text-slate-400 space-y-1">
                          <span className="material-symbols-outlined text-2xl text-slate-300">bed</span>
                          <p className="text-[11px] font-medium">
                            {bed.status === 'Available' ? 'Ready for Patient Intake' : `Status: ${bed.status}`}
                          </p>
                        </div>
                      )}

                      {/* Footer: Doctor & Nursing Tag */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>{isOccupied ? `Doc: ${bed.patAssignedDoc}` : `Type: ${bed.bedType || 'Standard'}`}</span>
                        {bed.isNurseAssigned && (
                          <span className="text-teal-700 font-bold flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-xs">check</span> Assigned Ward
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Patient Telemetry & Monitoring Panel (5 Cols) */}
          <div className="lg:col-span-5">
            {selectedBed ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden sticky top-24">
                {/* Panel Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white/20 text-white rounded font-bold text-xs">
                        {selectedBed.bedNumber}
                      </span>
                      <h2 className="text-base font-black tracking-tight">{selectedBed.wardType} Ward</h2>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Status: <strong className="text-teal-300">{selectedBed.status}</strong> • Type: {selectedBed.bedType || 'Standard Bed'}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    selectedBed.status === 'Occupied' ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
                  }`}>
                    {selectedBed.status}
                  </span>
                </div>

                {/* Panel Body */}
                <div className="p-5 space-y-5 max-h-[calc(100vh-280px)] overflow-y-auto text-xs">
                  {selectedBed.status === 'Occupied' ? (
                    <>
                      {/* Patient Profile */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Patient Details</span>
                          <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-bold text-[10px]">
                            {selectedBed.patId}
                          </span>
                        </div>
                        <p className="text-base font-black text-slate-900">{selectedBed.patName}</p>
                        <p className="text-slate-600 font-medium text-[11px]">
                          Admission Status: <strong className="text-slate-800">{selectedBed.patAdmissionStatus}</strong> • Diagnosis: <strong className="text-slate-800">{selectedBed.patDiagnosis}</strong>
                        </p>
                        <p className="text-teal-800 font-semibold text-[11px]">
                          Attending Doctor: {selectedBed.patAssignedDoc}
                        </p>
                      </div>

                      {/* Clinical Acuity & Condition */}
                      <div className="p-4 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-1.5">
                        <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider block">
                          Inpatient Clinical Condition & Acuity
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-teal-950">{selectedBed.clinicalCondition}</span>
                          {selectedBed.latestObs && (
                            <span className="text-[10px] text-slate-400">
                              Logged {selectedBed.latestObs.observationDate} ({selectedBed.latestObs.observationTime})
                            </span>
                          )}
                        </div>
                        {selectedBed.latestObs?.nursingAssessment && (
                          <p className="text-[11px] text-slate-700 bg-white p-2 rounded-xl border border-teal-100 font-medium">
                            "{selectedBed.latestObs.nursingAssessment}"
                          </p>
                        )}
                      </div>

                      {/* Doctor Bed Transfer Directive Banner */}
                      {selectedBed.activeTransferDirective && (
                        <div className="bg-amber-500/10 border border-amber-400/40 p-3.5 rounded-2xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-amber-700">swap_horiz</span>
                              Doctor Bed Transfer Directive
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-200 text-amber-900 uppercase">
                              {selectedBed.activeTransferDirective.status}
                            </span>
                          </div>
                          <p className="text-xs font-black text-slate-900">
                            Transfer to <span className="text-teal-800 font-extrabold">{selectedBed.activeTransferDirective.transferDetails?.targetWard || selectedBed.activeTransferDirective.transferDetails?.recommendedWard}</span> ({selectedBed.activeTransferDirective.transferDetails?.requiredBedType || 'Standard Bed'})
                          </p>
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <p>👨‍⚕️ Prescribed by: <strong className="text-slate-800">{selectedBed.activeTransferDirective.doctorName || 'Doctor'}</strong></p>
                            <p>📋 Reason: {selectedBed.activeTransferDirective.transferDetails?.reasonForTransfer || selectedBed.activeTransferDirective.transferDetails?.medicalReason || 'Ward Escalation'}</p>
                            {selectedBed.activeTransferDirective.transferDetails?.doctorNotes && (
                              <p className="p-2 bg-white rounded-lg border border-amber-200 text-amber-950 font-medium mt-1">
                                <strong>Instructions for Nurse:</strong> "{selectedBed.activeTransferDirective.transferDetails.doctorNotes}"
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedBed(null);
                              navigate('/nurse/transfer-discharge');
                            }}
                            className="w-full py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1"
                          >
                            <span>Execute Handover in Transfer Module</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        </div>
                      )}

                      {/* Real-time Vital Telemetry */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Latest Vital Signs Telemetry
                          </span>
                          <span className="text-[10px] text-teal-700 font-bold">Live Stream</span>
                        </div>

                        {selectedBed.latestVital ? (
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Blood Pressure</span>
                              <span className="font-black text-slate-800 text-xs">
                                {selectedBed.latestVital.bloodPressure || `${selectedBed.latestVital.bloodPressureSys}/${selectedBed.latestVital.bloodPressureDia}`} mmHg
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Pulse Rate</span>
                              <span className="font-black text-slate-800 text-xs">
                                {selectedBed.latestVital.pulseRate} bpm
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">SpO2 Oxygen</span>
                              <span className="font-black text-emerald-700 text-xs">
                                {selectedBed.latestVital.oxygenSaturation}%
                              </span>
                            </div>
                            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                              <span className="text-[9px] font-bold text-slate-400 uppercase block">Temperature</span>
                              <span className="font-black text-slate-800 text-xs">
                                {selectedBed.latestVital.temperature} °F
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-[11px]">
                            No vital telemetry recorded yet for this admission.
                          </div>
                        )}
                      </div>

                      {/* Clinical Actions Toolbar */}
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                          Inpatient Clinical Actions
                        </span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => navigate('/vitals', { state: { patientId: selectedBed.patId } })}
                            className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm text-teal-700">monitor_heart</span>
                            Vitals
                          </button>
                          <button
                            onClick={() => navigate('/nursing-observations')}
                            className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm text-teal-700">edit_note</span>
                            Observations
                          </button>
                        </div>

                        {/* Bed Transfer & Discharge Actions */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            onClick={() => handleOpenTransferModal(selectedBed)}
                            className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-base">swap_horiz</span>
                            Bed Transfer
                          </button>
                          <button
                            onClick={() => handleOpenDischargeModal(selectedBed)}
                            className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-base">output</span>
                            Discharge
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
                        <span className="material-symbols-outlined text-4xl">single_bed</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">Bed is Available & Sanitized</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                          {selectedBed.wardType} Ward • Bed {selectedBed.bedNumber} is vacant and ready for patient admission.
                        </p>
                      </div>
                      
                      {selectedBed.status === 'Available' && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenDirectAllocateModal(selectedBed)}
                            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-98"
                          >
                            <span className="material-symbols-outlined text-base">domain_add</span>
                            Allocate Bed {selectedBed.bedNumber} to Patient
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-5xl text-slate-300">single_bed</span>
                <h3 className="font-bold text-slate-700 text-sm">Select a Bed to Monitor</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click on any bed from the ward matrix on the left to inspect real-time inpatient data, vital telemetry, acuity status, bed transfer, and discharge options.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bed Transfer Recommendation Modal */}
      {showTransferModal && selectedBed && typeof document !== 'undefined' && createPortal(
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
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTransferModal(false);
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
            <div className="p-4 sm:p-5 border-b border-amber-200 bg-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/20 text-white rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">swap_horiz</span>
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    Request Bed Transfer
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Patient: <strong className="text-white">{selectedBed.patName}</strong> ({selectedBed.patId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
              {/* Current Allocation Summary */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Current Ward & Bed</span>
                  <span className="font-bold text-slate-800">{selectedBed.wardType} • {selectedBed.bedNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase block">Patient Acuity</span>
                  <span className="font-bold text-slate-800">{selectedBed.clinicalCondition}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitTransfer} className="space-y-4">
                {/* Target Ward & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Recommended Ward *
                    </label>
                    <select
                      value={transferForm.recommendedWard}
                      onChange={(e) => setTransferForm({ ...transferForm, recommendedWard: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="ICU">ICU (Intensive Care Unit)</option>
                      <option value="General Ward">General Ward</option>
                      <option value="Special Ward">Special Ward / Private</option>
                      <option value="Surgery Ward">Surgery / Post-Op Ward</option>
                      <option value="Emergency Ward">Emergency Rapid Unit</option>
                      <option value="Step-Down Unit">Step-Down Unit (SDU)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Priority Level *
                    </label>
                    <select
                      value={transferForm.priority}
                      onChange={(e) => setTransferForm({ ...transferForm, priority: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    >
                      <option value="Emergency">🚨 Emergency (Immediate Transfer)</option>
                      <option value="Urgent">⚡ Urgent (Within 2 Hours)</option>
                      <option value="Normal">Routine / Normal (Next Available)</option>
                    </select>
                  </div>
                </div>

                {/* Bed Type */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Required Bed Specification *
                  </label>
                  <select
                    value={transferForm.requiredBedType}
                    onChange={(e) => setTransferForm({ ...transferForm, requiredBedType: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="ICU Bed">ICU Bed (with Ventilator & Continuous Telemetry)</option>
                    <option value="Standard Bed">Standard Inpatient Bed</option>
                    <option value="Special Bed">Special / Private Bed</option>
                    <option value="Oxygen Supported Bed">Oxygen Supported Bed</option>
                    <option value="Isolation Bed">Isolation Negative-Pressure Bed</option>
                  </select>
                </div>

                {/* Clinical Reason for Transfer */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Reason for Transfer & Clinical Handover Notes *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={transferForm.reasonForTransfer}
                    onChange={(e) => setTransferForm({ ...transferForm, reasonForTransfer: e.target.value, clinicalNotes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    placeholder="Enter reason for transfer (e.g. Acute respiratory distress requiring ICU care, step-down telemetry) and nursing handover notes..."
                  ></textarea>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowTransferModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingTransfer}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    {submittingTransfer ? 'Dispatching...' : 'Dispatch Transfer Order'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Discharge Recommendation Modal */}
      {showDischargeModal && selectedBed && typeof document !== 'undefined' && createPortal(
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
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDischargeModal(false);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '580px',
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
            <div className="p-4 sm:p-5 border-b border-emerald-200 bg-emerald-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/20 text-white rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">output</span>
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    Initiate Patient Discharge
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Patient: <strong className="text-white">{selectedBed.patName}</strong> ({selectedBed.patId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDischargeModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
              {/* Ward Location */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Current Ward & Bed</span>
                  <span className="font-bold text-slate-800">{selectedBed.wardType} • {selectedBed.bedNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Attending Doctor</span>
                  <span className="font-bold text-slate-800">{selectedBed.patAssignedDoc}</span>
                </div>
              </div>

              <form onSubmit={handleSubmitDischarge} className="space-y-4">
                {/* Discharge Type & Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Discharge Type *
                    </label>
                    <select
                      value={dischargeForm.dischargeType}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeType: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Routine Normal Discharge">Routine Normal Discharge</option>
                      <option value="Discharge against Medical Advice (DAMA)">Discharge against Medical Advice (DAMA)</option>
                      <option value="Transfer to External Specialized Center">Transfer to External Specialized Center</option>
                      <option value="Home Health Care Referral">Home Health Care Referral</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Discharge Condition *
                    </label>
                    <select
                      value={dischargeForm.dischargeCondition}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeCondition: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Stable / Improved">Stable / Improved</option>
                      <option value="Completely Recovered">Completely Recovered</option>
                      <option value="Clinically Stable for Discharge">Clinically Stable for Discharge</option>
                      <option value="Guarded / Requires Home Care">Guarded / Requires Home Care</option>
                    </select>
                  </div>
                </div>

                {/* Final Diagnosis */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Discharge Diagnosis *
                  </label>
                  <input
                    type="text"
                    required
                    value={dischargeForm.dischargeDiagnosis}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDiagnosis: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Acute Gastroenteritis - Resolved"
                  />
                </div>

                {/* Clinical Summary */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Clinical Discharge Summary & Nursing Clearance *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={dischargeForm.clinicalSummary}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, clinicalSummary: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="e.g. Patient successfully completed IV antibiotic course, afebril for 48 hours..."
                  ></textarea>
                </div>

                {/* Instructions & Follow-up */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Dietary / Lifestyle Advice
                    </label>
                    <input
                      type="text"
                      value={dischargeForm.dietaryInstructions}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, dietaryInstructions: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Follow-up Consultation
                    </label>
                    <input
                      type="text"
                      value={dischargeForm.followUpNotes}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, followUpNotes: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowDischargeModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDischarge}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">task_alt</span>
                    {submittingDischarge ? 'Processing...' : 'Submit Discharge Clearance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Direct Bed Allocation Modal */}
      {showDirectAllocateModal && selectedBed && typeof document !== 'undefined' && createPortal(
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
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDirectAllocateModal(false);
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
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-indigo-200 bg-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/20 text-white rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">bedroom_parent</span>
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    Allocate Bed {selectedBed.bedNumber}
                  </h3>
                  <p className="text-xs text-indigo-100 mt-0.5">
                    Ward: <strong className="text-white">{selectedBed.wardType}</strong> • Type: <strong className="text-white">{selectedBed.type || 'Standard'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDirectAllocateModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
              <form onSubmit={handleSubmitDirectAllocation} className="space-y-4">
                {/* Pending Admission Selector */}
                {awaitingAdmissions.length > 0 ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Select Awaiting Emergency / Admission Patient *
                    </label>
                    <select
                      value={allocateForm.admissionRequestId || ''}
                      onChange={(e) => {
                        const selReq = awaitingAdmissions.find(a => (a._id || a.admissionId) === e.target.value);
                        if (selReq) {
                          setAllocateForm(prev => ({
                            ...prev,
                            admissionRequestId: selReq._id || selReq.admissionId,
                            patientId: selReq.patientId?._id || selReq.patientId || selReq.patientCustomId || '',
                            patientName: selReq.patientName || '',
                            notes: `Allocated bed ${selectedBed.bedNumber} (${selectedBed.wardType}) for ${selReq.reason || 'Emergency Care'}`
                          }));
                        } else {
                          setAllocateForm(prev => ({
                            ...prev,
                            admissionRequestId: '',
                            patientId: '',
                            patientName: ''
                          }));
                        }
                      }}
                      className="w-full p-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 font-bold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Choose awaiting request or enter custom below --</option>
                      {awaitingAdmissions.map((adm) => (
                        <option key={adm._id || adm.admissionId} value={adm._id || adm.admissionId}>
                          {adm.patientName} ({adm.patientCustomId || adm.emergencyId || 'Pending'}) - {adm.ward || adm.department || 'Awaiting Bed'} [{adm.priority || adm.severity || 'Normal'}]
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs">
                    <span className="font-bold">Notice:</span> No pending admission queue records found. You can enter patient information manually below.
                  </div>
                )}

                {/* Patient Name */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={allocateForm.patientName || ''}
                    onChange={(e) => setAllocateForm({ ...allocateForm, patientName: e.target.value })}
                    placeholder="Enter patient full name"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Patient / MRN ID */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Patient ID / MRN (Optional)
                  </label>
                  <input
                    type="text"
                    value={allocateForm.patientId || ''}
                    onChange={(e) => setAllocateForm({ ...allocateForm, patientId: e.target.value })}
                    placeholder="e.g. PAT-10024 or EMG-9087"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Allocation Notes */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Admission & Handover Notes
                  </label>
                  <textarea
                    rows={2}
                    value={allocateForm.notes || ''}
                    onChange={(e) => setAllocateForm({ ...allocateForm, notes: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Notes for nursing shift, special care, or equipment setup..."
                  ></textarea>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowDirectAllocateModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingDirectAllocation}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">how_to_reg</span>
                    {submittingDirectAllocation ? 'Assigning...' : `Confirm & Allocate Bed ${selectedBed.bedNumber}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
