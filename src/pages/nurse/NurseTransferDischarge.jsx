import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NurseTransferDischarge() {
  const [records, setRecords] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Transfer' | 'Discharge'
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Nursing Action Modals
  const [showTransferActionModal, setShowTransferActionModal] = useState(false);
  const [showAssignBedModal, setShowAssignBedModal] = useState(false);
  const [showDischargeActionModal, setShowDischargeActionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Bed Assignment Form State
  const [assignBedForm, setAssignBedForm] = useState({
    destinationBedId: '',
    destinationBedNumber: '',
    destinationWard: '',
    transferNursingNotes: '',
    handoverStaffName: '',
    vitals: {
      temperature: '98.6',
      bloodPressure: '120/80',
      heartRate: '78',
      respiratoryRate: '18',
      spo2: '98'
    }
  });

  // Transfer Nursing Form State
  const [transferPrepForm, setTransferPrepForm] = useState({
    patientPrepared: true,
    transferNursingNotes: '',
    handoverStaffName: '',
    confirmTransfer: false,
    vitals: {
      temperature: '98.6',
      bloodPressure: '120/80',
      heartRate: '78',
      respiratoryRate: '18',
      spo2: '98'
    }
  });

  // Discharge Nursing Form State
  const [dischargePrepForm, setDischargePrepForm] = useState({
    patientPrepared: true,
    medicationHandoverCompleted: true,
    instructionsExplained: true,
    finalNursingObservations: '',
    nurseRemarks: '',
    completeAssistance: true,
    vitals: {
      temperature: '98.4',
      bloodPressure: '118/78',
      heartRate: '75',
      respiratoryRate: '16',
      spo2: '99'
    }
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/transfer-discharge?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data?.discharges || res.data?.records || (Array.isArray(res.data) ? res.data : []);
      const arrayData = Array.isArray(data) ? data : [];
      setRecords(arrayData);

      if (arrayData.length > 0) {
        if (!selectedRecord) {
          setSelectedRecord(arrayData[0]);
        } else {
          const updated = arrayData.find(d => d._id === selectedRecord._id);
          if (updated) setSelectedRecord(updated);
        }
      }
    } catch (err) {
      console.error('Error fetching nurse transfer/discharge records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBeds = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/beds?status=Available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.beds || res.data || [];
      setAvailableBeds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching available beds:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchAvailableBeds();
  }, []);

  // Filtered Records
  const filteredRecords = records.filter(item => {
    if (activeTab !== 'All' && item.requestType !== activeTab) return false;
    if (statusFilter !== 'All' && item.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = item.patientName?.toLowerCase().includes(q);
      const matchPid = item.patientCustomId?.toLowerCase().includes(q);
      const matchDoc = item.doctorName?.toLowerCase().includes(q);
      const matchWard = item.currentWard?.toLowerCase().includes(q);
      const matchTargetWard = item.transferDetails?.recommendedWard?.toLowerCase().includes(q) || item.transferDetails?.targetWard?.toLowerCase().includes(q);
      const matchReason = (item.transferDetails?.reasonForTransfer || item.transferDetails?.medicalReason || item.dischargeDetails?.dischargeDiagnosis)?.toLowerCase().includes(q);

      if (!matchName && !matchPid && !matchDoc && !matchWard && !matchTargetWard && !matchReason) {
        return false;
      }
    }
    return true;
  });

  // KPI Metrics
  const totalTransfers = records.filter(r => r.requestType === 'Transfer').length;
  const pendingTransfers = records.filter(r => r.requestType === 'Transfer' && (r.status === 'Pending Approval' || r.status === 'Transfer Approved' || r.status === 'New Bed Allocated' || r.status === 'Transfer In Transit')).length;
  const totalDischarges = records.filter(r => r.requestType === 'Discharge').length;
  const pendingDischarges = records.filter(r => r.requestType === 'Discharge' && r.status !== 'Final Discharge Completed' && r.status !== 'Completed').length;

  // Open Bed Assignment Modal (Nurse allocates destination bed)
  const handleOpenAssignBedModal = (record) => {
    setSelectedRecord(record);
    const targetWard = record.transferDetails?.recommendedWard || record.transferDetails?.targetWard || 'General Ward';
    // Pre-match first available bed in target ward if any
    const matchingBed = availableBeds.find(b => (b.wardType || '').toLowerCase() === targetWard.toLowerCase()) || availableBeds[0];

    setAssignBedForm({
      destinationBedId: matchingBed ? matchingBed._id : '',
      destinationBedNumber: matchingBed ? matchingBed.bedNumber : '',
      destinationWard: matchingBed ? matchingBed.wardType : targetWard,
      transferNursingNotes: `Bed transfer to ${matchingBed?.bedNumber || targetWard} executed by Nursing staff.`,
      handoverStaffName: '',
      vitals: {
        temperature: '98.6',
        bloodPressure: '120/80',
        heartRate: '78',
        respiratoryRate: '18',
        spo2: '98'
      }
    });
    fetchAvailableBeds();
    setShowAssignBedModal(true);
  };

  // Submit Nurse Bed Assignment
  const handleSubmitAssignBed = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!assignBedForm.destinationBedNumber) {
      Swal.fire({
        icon: 'warning',
        title: 'Destination Bed Required',
        text: 'Please select an available destination bed to complete the transfer.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const payload = {
        destinationBedId: assignBedForm.destinationBedId,
        destinationBedNumber: assignBedForm.destinationBedNumber,
        destinationWard: assignBedForm.destinationWard,
        transferNursingNotes: assignBedForm.transferNursingNotes,
        handoverStaffName: assignBedForm.handoverStaffName,
        vitalsAtTransfer: assignBedForm.vitals
      };

      const res = await axios.put(`/api/transfer-discharge/${selectedRecord._id}/nurse-assign-bed`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Bed Assigned & Transferred!',
        html: `Patient <b>${selectedRecord.patientName}</b> has been transferred to Bed <b>${assignBedForm.destinationBedNumber}</b> (${assignBedForm.destinationWard}).<br/><br/><span class="text-xs text-slate-500">The previous bed was set to Cleaning, and the Receptionist was notified to synchronize records for billing & discharge.</span>`,
        confirmButtonColor: '#0066cc'
      });

      setShowAssignBedModal(false);
      await fetchRecords();
      await fetchAvailableBeds();
      if (res.data?.order) {
        setSelectedRecord(res.data.order);
      }
    } catch (err) {
      console.error('Error assigning bed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Bed Assignment Failed',
        text: err.response?.data?.message || 'Failed to assign destination bed'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Transfer Action Modal
  const handleOpenTransferModal = (record) => {
    setSelectedRecord(record);
    const existing = record.nursingAssistance || {};
    setTransferPrepForm({
      patientPrepared: existing.patientPreparedForTransfer !== undefined ? existing.patientPreparedForTransfer : true,
      transferNursingNotes: existing.transferNursingNotes || '',
      handoverStaffName: existing.handoverStaffName || '',
      confirmTransfer: existing.transferConfirmed || false,
      vitals: {
        temperature: existing.vitalsAtTransfer?.temperature || '98.6',
        bloodPressure: existing.vitalsAtTransfer?.bloodPressure || '120/80',
        heartRate: existing.vitalsAtTransfer?.heartRate || '78',
        respiratoryRate: existing.vitalsAtTransfer?.respiratoryRate || '18',
        spo2: existing.vitalsAtTransfer?.spo2 || '98'
      }
    });
    setShowTransferActionModal(true);
  };

  // Open Discharge Action Modal
  const handleOpenDischargeModal = (record) => {
    setSelectedRecord(record);
    const existing = record.nursingAssistance || {};
    setDischargePrepForm({
      patientPrepared: existing.patientPreparedForDischarge !== undefined ? existing.patientPreparedForDischarge : true,
      medicationHandoverCompleted: existing.medicationHandoverCompleted !== undefined ? existing.medicationHandoverCompleted : true,
      instructionsExplained: existing.instructionsExplainedToPatientOrFamily !== undefined ? existing.instructionsExplainedToPatientOrFamily : true,
      finalNursingObservations: existing.finalNursingObservations || '',
      nurseRemarks: existing.nurseRemarks || '',
      completeAssistance: existing.dischargeAssistanceCompleted !== undefined ? existing.dischargeAssistanceCompleted : true,
      vitals: {
        temperature: existing.vitalsAtDischarge?.temperature || '98.4',
        bloodPressure: existing.vitalsAtDischarge?.bloodPressure || '118/78',
        heartRate: existing.vitalsAtDischarge?.heartRate || '75',
        respiratoryRate: existing.vitalsAtDischarge?.respiratoryRate || '16',
        spo2: existing.vitalsAtDischarge?.spo2 || '99'
      }
    });
    setShowDischargeActionModal(true);
  };

  // Submit Nurse Transfer Preparation
  const handleSubmitTransferAssistance = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const payload = {
        patientPrepared: transferPrepForm.patientPrepared,
        transferNursingNotes: transferPrepForm.transferNursingNotes,
        vitalsAtTransfer: transferPrepForm.vitals,
        handoverStaffName: transferPrepForm.handoverStaffName,
        confirmTransfer: transferPrepForm.confirmTransfer
      };

      const res = await axios.put(`/api/transfer-discharge/${selectedRecord._id}/nurse-transfer`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: transferPrepForm.confirmTransfer ? 'Transfer Handover Confirmed' : 'Transfer Preparation Saved',
        html: `Patient transfer preparation notes and transfer vitals have been recorded in MongoDB for <b>${selectedRecord.patientName}</b>. Bed allocation and status update remain synced with Bed Management.`,
        confirmButtonColor: '#0066cc'
      });

      setShowTransferActionModal(false);
      await fetchRecords();
      if (res.data?.order) {
        setSelectedRecord(res.data.order);
      }
    } catch (err) {
      console.error('Error submitting transfer preparation:', err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.message || 'Failed to update transfer nursing assistance'
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Nurse Discharge Assistance
  const handleSubmitDischargeAssistance = async (e) => {
    e.preventDefault();
    if (!selectedRecord) return;

    if (!dischargePrepForm.finalNursingObservations.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Observations Required',
        text: 'Please enter final nursing observations before completing discharge assistance.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const payload = {
        finalNursingObservations: dischargePrepForm.finalNursingObservations,
        vitalsAtDischarge: dischargePrepForm.vitals,
        patientPrepared: dischargePrepForm.patientPrepared,
        medicationHandoverCompleted: dischargePrepForm.medicationHandoverCompleted,
        instructionsExplained: dischargePrepForm.instructionsExplained,
        nurseRemarks: dischargePrepForm.nurseRemarks,
        completeAssistance: dischargePrepForm.completeAssistance
      };

      const res = await axios.put(`/api/transfer-discharge/${selectedRecord._id}/nurse-discharge`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Discharge Assistance Logged',
        html: `Nursing observations, exit vitals, medication handover, and follow-up guidance recorded for <b>${selectedRecord.patientName}</b>. Receptionist & Billing workflow notified for administrative closure.`,
        confirmButtonColor: '#0066cc'
      });

      setShowDischargeActionModal(false);
      await fetchRecords();
      if (res.data?.order) {
        setSelectedRecord(res.data.order);
      }
    } catch (err) {
      console.error('Error submitting discharge assistance:', err);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.response?.data?.message || 'Failed to log discharge nursing assistance'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status, requestType) => {
    switch (status) {
      case 'Pending Approval':
      case 'Pending Doctor Confirmation':
      case 'Pending Discharge Verification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Doctor Order Pending
          </span>
        );
      case 'Doctor Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse">
            <span className="material-symbols-outlined text-[13px]">verified</span> Doctor Approved &bull; Assign Bed
          </span>
        );
      case 'Transfer Approved':
      case 'Discharge Authorized':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="material-symbols-outlined text-[13px]">verified</span> {status}
          </span>
        );
      case 'Transferred':
      case 'Bed Assigned by Nurse':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-[13px]">check_circle</span> Bed Assigned &bull; Transferred
          </span>
        );
      case 'New Bed Allocated':
      case 'Bed Allocated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <span className="material-symbols-outlined text-[13px]">single_bed</span> Bed Assigned by Bed Mgmt
          </span>
        );
      case 'Transfer In Transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="material-symbols-outlined text-[13px]">local_shipping</span> In Transit
          </span>
        );
      case 'Transfer Completed':
      case 'Nursing Preparation Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="material-symbols-outlined text-[13px]">check_circle</span> Nursing Prep Done
          </span>
        );
      case 'Billing In Progress':
      case 'Payment Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <span className="material-symbols-outlined text-[13px]">receipt_long</span> Reception & Billing Step
          </span>
        );
      case 'Final Discharge Completed':
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="material-symbols-outlined text-[13px]">task_alt</span> Fully Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <span className="material-symbols-outlined text-[28px]">sync_alt</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Transfer & Discharge Assistance</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  Nursing Care Workflow
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Execute nursing assistance, patient prep, vitals logging, and handover following authorized doctor decisions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRecords}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh Records
          </button>
        </div>
      </div>

      {/* Protocol Notice Banner */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#0066cc] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[22px]">policy</span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Inter-Departmental Clinical Protocol</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              • <strong>Transfers:</strong> Doctor orders &rarr; Nurse prepares patient & confirms handover &rarr; Bed Management allocates & switches bed status.<br/>
              • <strong>Discharges:</strong> Doctor authorizes &rarr; Nurse records final observations & medication handover &rarr; Receptionist & Billing complete final clearance.
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold text-blue-700 bg-white/90 border border-blue-200 px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xs whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px] text-blue-600">verified_user</span> Multi-Role Connected
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Transfers</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalTransfers}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Logged doctor orders</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">swap_horiz</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Pending Transfers</p>
            <h3 className="text-2xl font-bold text-amber-700 mt-1">{pendingTransfers}</h3>
            <p className="text-[11px] text-amber-600/80 mt-1">Requires nurse prep / transit</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">pending_actions</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Discharges</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalDischarges}</h3>
            <p className="text-[11px] text-slate-400 mt-1">Authorized discharges</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">sensor_door</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-indigo-200/80 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Active Discharge Pipeline</p>
            <h3 className="text-2xl font-bold text-indigo-700 mt-1">{pendingDischarges}</h3>
            <p className="text-[11px] text-indigo-600/80 mt-1">Awaiting nursing exit / clearance</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">assignment_turned_in</span>
          </div>
        </div>
      </div>

      {/* Tabs and Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          {[
            { key: 'All', label: 'All Orders', icon: 'list_alt' },
            { key: 'Transfer', label: 'Ward Transfers', icon: 'swap_horiz' },
            { key: 'Discharge', label: 'Discharges', icon: 'sensor_door' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === tab.key
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          <div className="relative flex-1 md:w-72">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search patient, doctor, ward, reason..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Statuses</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Transfer Approved">Transfer Approved</option>
            <option value="New Bed Allocated">New Bed Allocated</option>
            <option value="Transfer In Transit">Transfer In Transit</option>
            <option value="Transfer Completed">Transfer Completed</option>
            <option value="Discharge Authorized">Discharge Authorized</option>
            <option value="Nursing Preparation Completed">Nursing Prep Done</option>
            <option value="Final Discharge Completed">Final Discharge Completed</option>
          </select>
        </div>
      </div>

      {/* 2-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Orders */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              {activeTab === 'All' ? 'Clinical Orders' : activeTab === 'Transfer' ? 'Transfer Orders' : 'Discharge Orders'} ({filteredRecords.length})
            </h3>
            <span className="text-xs text-slate-400">Select card to view dossier</span>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-500 mt-3">Loading orders from MongoDB...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <span className="material-symbols-outlined text-[48px] text-slate-300">assignment_late</span>
              <h4 className="text-base font-bold text-slate-700 mt-2">No Records Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                There are no transfer or discharge orders matching the filter.
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {filteredRecords.map((item) => {
                const isSelected = selectedRecord?._id === item._id;
                const isTransfer = item.requestType === 'Transfer';
                const hasNurseAction = isTransfer
                  ? item.nursingAssistance?.transferConfirmed
                  : item.nursingAssistance?.dischargeAssistanceCompleted;

                return (
                  <div
                    key={item._id}
                    onClick={() => setSelectedRecord(item)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md bg-indigo-50/20'
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                            isTransfer ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {isTransfer ? 'swap_horiz' : 'sensor_door'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${
                                isTransfer ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.requestType}
                            </span>
                            <h4 className="font-bold text-slate-900 text-sm">{item.patientName}</h4>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            ID: <strong className="text-slate-700">{item.patientCustomId || 'PID'}</strong> • Doc: {item.doctorName}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(item.status, item.requestType)}
                      </div>
                    </div>

                    {/* Transfer Route or Discharge Diagnosis summary */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      {isTransfer ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-500">{item.currentWard} ({item.currentBedNumber})</span>
                          <span className="material-symbols-outlined text-[14px] text-blue-600">arrow_forward</span>
                          <span className="font-bold text-blue-700">
                            {item.transferDetails?.recommendedWard || item.transferDetails?.targetWard || 'Target Ward'}
                          </span>
                        </div>
                      ) : (
                        <div className="truncate max-w-[260px]">
                          <span className="text-slate-400">Diag:</span>{' '}
                          <span className="font-medium text-slate-800">
                            {item.dischargeDetails?.dischargeDiagnosis || 'Clinically Stable for Discharge'}
                          </span>
                        </div>
                      )}

                      {/* Nursing Status Tag */}
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          hasNurseAction ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {hasNurseAction ? 'Nurse Prep Done' : 'Awaiting Nurse Action'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Detailed Order Dossier & Nursing Actions */}
        <div className="lg:col-span-7">
          {selectedRecord ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-xs font-bold uppercase px-2.5 py-1 rounded-lg ${
                          selectedRecord.requestType === 'Transfer'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {selectedRecord.requestType} Order
                      </span>
                      {getStatusBadge(selectedRecord.status, selectedRecord.requestType)}
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mt-2">
                      {selectedRecord.patientName}{' '}
                      <span className="text-sm font-normal text-slate-400">({selectedRecord.patientCustomId})</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Ordered by <strong>{selectedRecord.doctorName}</strong> ({selectedRecord.doctorDepartment || 'Physician'}) on{' '}
                      {new Date(selectedRecord.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedRecord.requestType === 'Transfer' ? (
                      <>
                        {selectedRecord.status === 'Doctor Approved' && (
                          <button
                            onClick={() => handleOpenAssignBedModal(selectedRecord)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-all active:scale-95 animate-pulse"
                          >
                            <span className="material-symbols-outlined text-[16px]">single_bed</span>
                            Assign Destination Bed & Transfer
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenTransferModal(selectedRecord)}
                          className="px-3.5 py-2 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit_note</span>
                          {selectedRecord.nursingAssistance?.transferConfirmed ? 'Update Handover Notes' : 'Pre-Transfer Vitals & Notes'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleOpenDischargeModal(selectedRecord)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
                        >
                          <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                          {selectedRecord.nursingAssistance?.dischargeAssistanceCompleted ? 'Update Nursing Discharge Record' : 'Record Discharge Nursing Assistance'}
                        </button>

                        {/* Bed Clearance & Sanitization Action for Nurse */}
                        <button
                          onClick={async () => {
                            const bedNum = selectedRecord.currentBedNumber;
                            const result = await Swal.fire({
                              title: `Clear & Sanitize Bed ${bedNum}?`,
                              html: `
                                <div class="text-left text-xs text-slate-600 space-y-2">
                                  <p>Patient <b>${selectedRecord.patientName}</b> discharge procedure has been initiated / completed.</p>
                                  <p class="bg-blue-50 p-2.5 rounded-lg border border-blue-200 text-blue-900">
                                    Marking <b>Bed ${bedNum}</b> as <b>Available</b> confirms that bed linen was changed, medical devices were disconnected, and clinical sanitization protocols were executed.
                                  </p>
                                </div>
                              `,
                              icon: 'question',
                              showCancelButton: true,
                              confirmButtonColor: '#059669',
                              confirmButtonText: 'Confirm Sanitization & Clear Bed',
                              cancelButtonText: 'Cancel'
                            });

                            if (!result.isConfirmed) return;

                            try {
                              const token = localStorage.getItem('userToken') || localStorage.getItem('token');
                              // Find bed by bedNumber to update status
                              const bRes = await axios.get(`/api/beds?search=${encodeURIComponent(bedNum)}`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              const bedList = bRes.data?.beds || bRes.data || [];
                              const foundBed = bedList.find(b => b.bedNumber === bedNum);
                              if (foundBed) {
                                await axios.put(`/api/beds/${foundBed._id}/status`, {
                                  status: 'Available',
                                  notes: `Bed cleared and sanitized post-discharge of ${selectedRecord.patientName} by Nurse ${localStorage.getItem('userName') || 'Staff Nurse'}`
                                }, {
                                  headers: { Authorization: `Bearer ${token}` }
                                });
                              }

                              Swal.fire({
                                icon: 'success',
                                title: 'Bed Cleared & Sanitized',
                                text: `Bed ${bedNum} is now marked Available and ready for new admissions in Bed Management.`,
                                confirmButtonColor: '#059669'
                              });
                              fetchRecords();
                              fetchAvailableBeds();
                            } catch (cErr) {
                              Swal.fire('Error', cErr.response?.data?.message || 'Failed to clear bed', 'error');
                            }
                          }}
                          className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                          title="Execute bed clearance and sanitization protocol"
                        >
                          <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                          Bed Clearance
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Dossier Content */}
              <div className="p-6 space-y-6 max-h-[680px] overflow-y-auto">
                {/* 1. Patient & Location Card */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                    Current Inpatient Location
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-slate-400">Current Ward</p>
                      <p className="font-bold text-slate-800">{selectedRecord.currentWard}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Current Bed</p>
                      <p className="font-bold text-blue-700">{selectedRecord.currentBedNumber}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Attending Doctor</p>
                      <p className="font-bold text-slate-800">{selectedRecord.doctorName}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Order Status</p>
                      <p className="font-bold text-indigo-700">{selectedRecord.status}</p>
                    </div>
                  </div>
                </div>

                {/* 2. Transfer Specific Details */}
                {selectedRecord.requestType === 'Transfer' && (
                  <div className="space-y-4">
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-200/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-blue-600">swap_horiz</span>
                        Doctor's Transfer Recommendation
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400">Destination Ward</p>
                          <p className="font-bold text-slate-900">
                            {selectedRecord.transferDetails?.recommendedWard || selectedRecord.transferDetails?.targetWard || 'General Ward'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Recommended Bed Type</p>
                          <p className="font-bold text-slate-900">
                            {selectedRecord.transferDetails?.requiredBedType || 'Standard Bed'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Priority</p>
                          <p className="font-bold text-amber-700">
                            {selectedRecord.transferDetails?.priority || 'Normal'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-blue-100 text-xs">
                        <p className="text-slate-400">Clinical Reason for Transfer:</p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          {selectedRecord.transferDetails?.reasonForTransfer ||
                            selectedRecord.transferDetails?.medicalReason ||
                            'Clinical condition requires level of care adjustment.'}
                        </p>
                      </div>

                      {selectedRecord.transferDetails?.doctorNotes && (
                        <div className="mt-2 text-xs">
                          <p className="text-slate-400">Special Precautions / Doctor's Notes:</p>
                          <p className="text-slate-700 italic mt-0.5">{selectedRecord.transferDetails.doctorNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Discharge Specific Details */}
                {selectedRecord.requestType === 'Discharge' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200/80">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900 mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-emerald-600">verified</span>
                        Doctor's Authorized Discharge Summary
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                        <div>
                          <p className="text-slate-400">Discharge Diagnosis</p>
                          <p className="font-bold text-slate-900">
                            {selectedRecord.dischargeDetails?.dischargeDiagnosis || 'Diagnosis on record'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Condition at Discharge</p>
                          <p className="font-bold text-emerald-700">
                            {selectedRecord.dischargeDetails?.conditionAtDischarge || selectedRecord.dischargeDetails?.patientConditionAtDischarge || 'Improved / Stable'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Recommended Date</p>
                          <p className="font-bold text-slate-900">
                            {selectedRecord.dischargeDetails?.recommendedDischargeDate
                              ? new Date(selectedRecord.dischargeDetails.recommendedDischargeDate).toLocaleDateString()
                              : new Date().toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {selectedRecord.dischargeDetails?.treatmentSummary && (
                        <div className="mt-3 pt-3 border-t border-emerald-100 text-xs">
                          <p className="text-slate-400">Treatment Summary:</p>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {selectedRecord.dischargeDetails.treatmentSummary}
                          </p>
                        </div>
                      )}

                      {/* Prescribed Discharge Medicines */}
                      {selectedRecord.dischargeDetails?.prescribedMedicines?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-emerald-100">
                          <p className="text-xs font-bold text-slate-600 mb-2">Prescribed Take-Home Medicines:</p>
                          <div className="space-y-1.5">
                            {selectedRecord.dischargeDetails.prescribedMedicines.map((med, idx) => (
                              <div key={idx} className="bg-white p-2.5 rounded-xl border border-emerald-100 text-xs flex items-center justify-between">
                                <div>
                                  <strong className="text-slate-800">{med.medicineName}</strong>{' '}
                                  <span className="text-slate-500">({med.dosage} • {med.frequency})</span>
                                </div>
                                <span className="text-slate-400">{med.duration} — {med.instructions}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Follow Up & Diet */}
                      <div className="mt-3 pt-3 border-t border-emerald-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-slate-400">Follow-up Instructions:</p>
                          <p className="text-slate-700 font-medium mt-0.5">
                            {selectedRecord.dischargeDetails?.followUpInstructions || 'Review in OPD clinic as advised.'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Diet & Activity Advice:</p>
                          <p className="text-slate-700 font-medium mt-0.5">
                            {selectedRecord.dischargeDetails?.dietInstructions || selectedRecord.dischargeDetails?.dietAndActivityAdvice || 'Normal recovery diet.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Logged Nursing Assistance & Preparation Section */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-blue-600">health_and_safety</span>
                      Recorded Nursing Assistance & Vitals
                    </span>
                    {selectedRecord.nursingAssistance?.transferConfirmed || selectedRecord.nursingAssistance?.dischargeAssistanceCompleted ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ✓ Logged in MongoDB
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Pending Nursing Input
                      </span>
                    )}
                  </h4>

                  {selectedRecord.requestType === 'Transfer' ? (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Patient Prepared</p>
                          <p className="font-bold text-slate-800">
                            {selectedRecord.nursingAssistance?.patientPreparedForTransfer ? 'Yes (Ready)' : 'Pending'}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Handover Confirmed</p>
                          <p className="font-bold text-indigo-700">
                            {selectedRecord.nursingAssistance?.transferConfirmed ? 'Yes (Transferred)' : 'In Progress'}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Handover Staff / Nurse</p>
                          <p className="font-bold text-slate-800">
                            {selectedRecord.nursingAssistance?.handoverStaffName || selectedRecord.nursingAssistance?.transferConfirmedBy || 'Staff Nurse'}
                          </p>
                        </div>
                      </div>

                      {/* Transfer Vitals */}
                      {selectedRecord.nursingAssistance?.vitalsAtTransfer && (
                        <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100">
                          <p className="text-[11px] font-bold text-blue-900 mb-1.5">Vitals at Transfer:</p>
                          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700">
                            <span>BP: <strong>{selectedRecord.nursingAssistance.vitalsAtTransfer.bloodPressure || '120/80'}</strong></span>
                            <span>HR: <strong>{selectedRecord.nursingAssistance.vitalsAtTransfer.heartRate || '78'} bpm</strong></span>
                            <span>Temp: <strong>{selectedRecord.nursingAssistance.vitalsAtTransfer.temperature || '98.6'}°F</strong></span>
                            <span>SpO2: <strong>{selectedRecord.nursingAssistance.vitalsAtTransfer.spo2 || '98'}%</strong></span>
                            <span>RR: <strong>{selectedRecord.nursingAssistance.vitalsAtTransfer.respiratoryRate || '18'} /min</strong></span>
                          </div>
                        </div>
                      )}

                      {selectedRecord.nursingAssistance?.transferNursingNotes && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Transfer Nursing Notes:</p>
                          <p className="text-slate-800 mt-0.5">{selectedRecord.nursingAssistance.transferNursingNotes}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Patient Prepared</p>
                          <p className="font-bold text-slate-800">
                            {selectedRecord.nursingAssistance?.patientPreparedForDischarge ? 'Yes (Completed)' : 'Pending'}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Medication Handover</p>
                          <p className="font-bold text-emerald-700">
                            {selectedRecord.nursingAssistance?.medicationHandoverCompleted ? 'Yes (Delivered)' : 'Pending'}
                          </p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Instructions Explained</p>
                          <p className="font-bold text-slate-800">
                            {selectedRecord.nursingAssistance?.instructionsExplainedToPatientOrFamily ? 'Yes (Family Guided)' : 'Pending'}
                          </p>
                        </div>
                      </div>

                      {/* Discharge Vitals */}
                      {selectedRecord.nursingAssistance?.vitalsAtDischarge && (
                        <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100">
                          <p className="text-[11px] font-bold text-emerald-900 mb-1.5">Final Vitals at Discharge:</p>
                          <div className="flex items-center gap-4 flex-wrap text-xs text-slate-700">
                            <span>BP: <strong>{selectedRecord.nursingAssistance.vitalsAtDischarge.bloodPressure || '118/78'}</strong></span>
                            <span>HR: <strong>{selectedRecord.nursingAssistance.vitalsAtDischarge.heartRate || '75'} bpm</strong></span>
                            <span>Temp: <strong>{selectedRecord.nursingAssistance.vitalsAtDischarge.temperature || '98.4'}°F</strong></span>
                            <span>SpO2: <strong>{selectedRecord.nursingAssistance.vitalsAtDischarge.spo2 || '99'}%</strong></span>
                            <span>RR: <strong>{selectedRecord.nursingAssistance.vitalsAtDischarge.respiratoryRate || '16'} /min</strong></span>
                          </div>
                        </div>
                      )}

                      {selectedRecord.nursingAssistance?.finalNursingObservations && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[11px] text-slate-400">Final Nursing Observations:</p>
                          <p className="text-slate-800 mt-0.5">{selectedRecord.nursingAssistance.finalNursingObservations}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Workflow Guardrail Note */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-blue-600 flex-shrink-0">info</span>
                  <span>
                    <strong>Role Boundary:</strong> The nurse logs preparation, exit vitals, and handover. The nurse does not approve medical discharge or generate final billing (managed by Doctor, Receptionist, and Bed Management).
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-[48px] text-slate-300">touch_app</span>
              <h3 className="text-base font-bold text-slate-700 mt-2">No Order Selected</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Select a transfer or discharge record from the left list to review doctor recommendations and log nursing assistance.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal 1: Nurse Transfer Assistance Modal */}
      {showTransferActionModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#0066cc] text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Transfer Nursing Assistance</h3>
                  <p className="text-xs text-slate-500">
                    Patient: {selectedRecord.patientName} ({selectedRecord.patientCustomId}) &rarr; Destination: {selectedRecord.transferDetails?.recommendedWard || selectedRecord.transferDetails?.targetWard}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTransferActionModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitTransferAssistance} className="p-6 space-y-5">
              {/* Doctor's recommendation summary */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-1">
                <p>
                  <strong>Doctor's Transfer Reason:</strong>{' '}
                  {selectedRecord.transferDetails?.reasonForTransfer || selectedRecord.transferDetails?.medicalReason || 'Standard transfer'}
                </p>
                <p>
                  <strong>Priority:</strong> {selectedRecord.transferDetails?.priority || 'Normal'} • <strong>Bed Type:</strong>{' '}
                  {selectedRecord.transferDetails?.requiredBedType || 'Standard Bed'}
                </p>
              </div>

              {/* Vitals at Transfer */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Pre-Transfer Patient Vitals
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500">Temp (°F)</span>
                    <input
                      type="text"
                      value={transferPrepForm.vitals.temperature}
                      onChange={(e) => setTransferPrepForm({
                        ...transferPrepForm,
                        vitals: { ...transferPrepForm.vitals, temperature: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">BP (mmHg)</span>
                    <input
                      type="text"
                      value={transferPrepForm.vitals.bloodPressure}
                      onChange={(e) => setTransferPrepForm({
                        ...transferPrepForm,
                        vitals: { ...transferPrepForm.vitals, bloodPressure: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">HR (bpm)</span>
                    <input
                      type="text"
                      value={transferPrepForm.vitals.heartRate}
                      onChange={(e) => setTransferPrepForm({
                        ...transferPrepForm,
                        vitals: { ...transferPrepForm.vitals, heartRate: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Resp Rate</span>
                    <input
                      type="text"
                      value={transferPrepForm.vitals.respiratoryRate}
                      onChange={(e) => setTransferPrepForm({
                        ...transferPrepForm,
                        vitals: { ...transferPrepForm.vitals, respiratoryRate: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">SpO2 (%)</span>
                    <input
                      type="text"
                      value={transferPrepForm.vitals.spo2}
                      onChange={(e) => setTransferPrepForm({
                        ...transferPrepForm,
                        vitals: { ...transferPrepForm.vitals, spo2: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Handover Staff Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Receiving Ward Nurse / Escort Staff Name
                </label>
                <input
                  type="text"
                  value={transferPrepForm.handoverStaffName}
                  onChange={(e) => setTransferPrepForm({ ...transferPrepForm, handoverStaffName: e.target.value })}
                  placeholder="e.g. Staff Nurse Anjali (ICU) / Orderly Suresh"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Transfer Nursing Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Transfer Nursing Notes & Preparation Checklist
                </label>
                <textarea
                  rows="3"
                  value={transferPrepForm.transferNursingNotes}
                  onChange={(e) => setTransferPrepForm({ ...transferPrepForm, transferNursingNotes: e.target.value })}
                  placeholder="e.g. IV line secured in left arm, continuous O2 support attached via transport cylinder, chart & MAR handed over..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferPrepForm.patientPrepared}
                    onChange={(e) => setTransferPrepForm({ ...transferPrepForm, patientPrepared: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Patient clinical chart, active IV lines, and belongings prepped for transfer</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={transferPrepForm.confirmTransfer}
                    onChange={(e) => setTransferPrepForm({ ...transferPrepForm, confirmTransfer: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="font-bold text-slate-900">
                    Confirm that patient has been safely transferred and handed over to destination ward staff
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferActionModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0066cc] hover:bg-[#0052a3] text-white text-sm font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? 'Saving to MongoDB...' : 'Save Transfer Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 1.5: Nurse Destination Bed Assignment Modal */}
      {showAssignBedModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-indigo-100 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">single_bed</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Assign Destination Bed & Transfer</h3>
                  <p className="text-xs text-indigo-700 font-semibold">
                    Doctor Approved: {selectedRecord.patientName} ({selectedRecord.patientCustomId}) &rarr; Target Ward: {selectedRecord.transferDetails?.recommendedWard || selectedRecord.transferDetails?.targetWard}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignBedModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAssignBed} className="p-6 space-y-5">
              {/* Doctor Approval Notice */}
              <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs text-indigo-950 space-y-1">
                <div className="flex items-center gap-1 font-bold text-indigo-900">
                  <span className="material-symbols-outlined text-sm text-indigo-600">verified</span>
                  <span>Doctor Authorized Transfer</span>
                </div>
                <p>
                  Doctor <strong>{selectedRecord.doctorName}</strong> requested transferring patient from <strong>{selectedRecord.currentWard} ({selectedRecord.currentBedNumber})</strong> to <strong>{selectedRecord.transferDetails?.recommendedWard || 'Target Ward'}</strong>.
                </p>
                <p className="text-slate-600 text-[11px]">
                  Reason: {selectedRecord.transferDetails?.reasonForTransfer || selectedRecord.transferDetails?.medicalReason || 'Standard clinical step'}
                </p>
              </div>

              {/* Destination Bed Selection */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Select Destination Bed (Available Beds in Hospital) *
                </label>
                {availableBeds.length === 0 ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                    No available beds found in the system. Please verify bed status in Bed Management.
                  </div>
                ) : (
                  <select
                    value={assignBedForm.destinationBedNumber}
                    onChange={(e) => {
                      const bedNum = e.target.value;
                      const found = availableBeds.find(b => b.bedNumber === bedNum);
                      setAssignBedForm({
                        ...assignBedForm,
                        destinationBedNumber: bedNum,
                        destinationBedId: found ? found._id : '',
                        destinationWard: found ? found.wardType : assignBedForm.destinationWard
                      });
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Choose Available Bed --</option>
                    {availableBeds.map(b => (
                      <option key={b._id} value={b.bedNumber}>
                        {b.bedNumber} &bull; Ward: {b.wardType} &bull; Type: {b.bedType || 'Standard'} (Floor {b.floor || '1'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Destination Ward confirmation */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Previous Bed (Will be set to Cleaning):</span>
                  <div className="p-2.5 bg-slate-100 rounded-xl font-bold text-slate-700">
                    {selectedRecord.currentWard} &bull; {selectedRecord.currentBedNumber}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">New Destination Ward:</span>
                  <input
                    type="text"
                    value={assignBedForm.destinationWard}
                    onChange={(e) => setAssignBedForm({ ...assignBedForm, destinationWard: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              {/* Vitals at Transfer */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Pre-Transfer Patient Vitals
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500">Temp (°F)</span>
                    <input
                      type="text"
                      value={assignBedForm.vitals.temperature}
                      onChange={(e) => setAssignBedForm({
                        ...assignBedForm,
                        vitals: { ...assignBedForm.vitals, temperature: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">BP (mmHg)</span>
                    <input
                      type="text"
                      value={assignBedForm.vitals.bloodPressure}
                      onChange={(e) => setAssignBedForm({
                        ...assignBedForm,
                        vitals: { ...assignBedForm.vitals, bloodPressure: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">HR (bpm)</span>
                    <input
                      type="text"
                      value={assignBedForm.vitals.heartRate}
                      onChange={(e) => setAssignBedForm({
                        ...assignBedForm,
                        vitals: { ...assignBedForm.vitals, heartRate: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Resp Rate</span>
                    <input
                      type="text"
                      value={assignBedForm.vitals.respiratoryRate}
                      onChange={(e) => setAssignBedForm({
                        ...assignBedForm,
                        vitals: { ...assignBedForm.vitals, respiratoryRate: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">SpO2 (%)</span>
                    <input
                      type="text"
                      value={assignBedForm.vitals.spo2}
                      onChange={(e) => setAssignBedForm({
                        ...assignBedForm,
                        vitals: { ...assignBedForm.vitals, spo2: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Handover Staff Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Receiving Ward Nurse / Escort Staff
                </label>
                <input
                  type="text"
                  value={assignBedForm.handoverStaffName}
                  onChange={(e) => setAssignBedForm({ ...assignBedForm, handoverStaffName: e.target.value })}
                  placeholder="e.g. Staff Nurse Anjali / ICU In-Charge"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Transfer Notes */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nursing Transfer & Handover Notes
                </label>
                <textarea
                  rows="2"
                  value={assignBedForm.transferNursingNotes}
                  onChange={(e) => setAssignBedForm({ ...assignBedForm, transferNursingNotes: e.target.value })}
                  placeholder="e.g. Patient shifted safely, IV line and monitor connected, dossier handed over..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignBedModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || availableBeds.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-md shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? 'Transferring Bed...' : 'Confirm Bed Assignment & Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Nurse Discharge Assistance Modal */}
      {showDischargeActionModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">sensor_door</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Discharge Nursing Assistance</h3>
                  <p className="text-xs text-slate-500">
                    Patient: {selectedRecord.patientName} ({selectedRecord.patientCustomId}) • Authorized by: {selectedRecord.doctorName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDischargeActionModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitDischargeAssistance} className="p-6 space-y-5">
              {/* Doctor Summary Overview */}
              <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-slate-700 space-y-1">
                <p>
                  <strong>Doctor Diagnosis:</strong> {selectedRecord.dischargeDetails?.dischargeDiagnosis || 'Clinically Stable'}
                </p>
                <p>
                  <strong>Follow-Up Advice:</strong> {selectedRecord.dischargeDetails?.followUpInstructions || 'Follow-up in 7 days'}
                </p>
              </div>

              {/* Discharge Exit Vitals */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Final Discharge Exit Vitals
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-500">Temp (°F)</span>
                    <input
                      type="text"
                      value={dischargePrepForm.vitals.temperature}
                      onChange={(e) => setDischargePrepForm({
                        ...dischargePrepForm,
                        vitals: { ...dischargePrepForm.vitals, temperature: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">BP (mmHg)</span>
                    <input
                      type="text"
                      value={dischargePrepForm.vitals.bloodPressure}
                      onChange={(e) => setDischargePrepForm({
                        ...dischargePrepForm,
                        vitals: { ...dischargePrepForm.vitals, bloodPressure: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">HR (bpm)</span>
                    <input
                      type="text"
                      value={dischargePrepForm.vitals.heartRate}
                      onChange={(e) => setDischargePrepForm({
                        ...dischargePrepForm,
                        vitals: { ...dischargePrepForm.vitals, heartRate: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">Resp Rate</span>
                    <input
                      type="text"
                      value={dischargePrepForm.vitals.respiratoryRate}
                      onChange={(e) => setDischargePrepForm({
                        ...dischargePrepForm,
                        vitals: { ...dischargePrepForm.vitals, respiratoryRate: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500">SpO2 (%)</span>
                    <input
                      type="text"
                      value={dischargePrepForm.vitals.spo2}
                      onChange={(e) => setDischargePrepForm({
                        ...dischargePrepForm,
                        vitals: { ...dischargePrepForm.vitals, spo2: e.target.value }
                      })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Final Nursing Observations */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Final Nursing Observations <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={dischargePrepForm.finalNursingObservations}
                  onChange={(e) => setDischargePrepForm({ ...dischargePrepForm, finalNursingObservations: e.target.value })}
                  placeholder="e.g. Patient is conscious, alert, and oriented. Cannula and surgical dressings removed cleanly. Ambulating comfortably without dyspnea..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                ></textarea>
              </div>

              {/* Handover Checkboxes */}
              <div className="space-y-2.5 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dischargePrepForm.patientPrepared}
                    onChange={(e) => setDischargePrepForm({ ...dischargePrepForm, patientPrepared: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Patient prepared for discharge (IV cannula removed, personal belongings gathered)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dischargePrepForm.medicationHandoverCompleted}
                    onChange={(e) => setDischargePrepForm({ ...dischargePrepForm, medicationHandoverCompleted: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Discharge take-home medications verified and handed over with proper dosages</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dischargePrepForm.instructionsExplained}
                    onChange={(e) => setDischargePrepForm({ ...dischargePrepForm, instructionsExplained: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Post-discharge diet, activity limits, and emergency warning signs explained to patient/family</span>
                </label>
              </div>

              {/* Additional Nurse Remarks */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Additional Nurse Remarks / Handover Notes
                </label>
                <input
                  type="text"
                  value={dischargePrepForm.nurseRemarks}
                  onChange={(e) => setDischargePrepForm({ ...dischargePrepForm, nurseRemarks: e.target.value })}
                  placeholder="e.g. Patient accompanied by spouse. All discharge summaries handed over."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDischargeActionModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-500/25 flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? 'Saving to MongoDB...' : 'Complete Discharge Assistance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
