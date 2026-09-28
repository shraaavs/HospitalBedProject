import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DoctorTransferDischarge() {
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Transfer' | 'Discharge'
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Transfer Form State
  const [transferForm, setTransferForm] = useState({
    patientId: '',
    patientName: '',
    patientCustomId: '',
    currentWard: '',
    currentBedNumber: '',
    recommendedWard: 'General Ward',
    requiredBedType: 'Standard Bed',
    reasonForTransfer: '',
    clinicalCondition: 'Stable',
    priority: 'Normal',
    doctorNotes: ''
  });

  // Discharge Form State
  const createEmptyMedRow = () => ({
    medicineName: '',
    dosage: '',
    frequency: 'Once daily (OD)',
    duration: '5 Days',
    instructions: 'Take after meals'
  });

  const [dischargeForm, setDischargeForm] = useState({
    patientId: '',
    patientName: '',
    patientCustomId: '',
    currentWard: '',
    currentBedNumber: '',
    dischargeDiagnosis: '',
    conditionAtDischarge: 'Improved / Stable',
    treatmentSummary: '',
    followUpInstructions: 'Review in OPD clinic in 7 days or earlier if symptoms recur.',
    followUpDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    dietInstructions: 'Normal light diet. Low salt, avoid heavy oily food.',
    warningSigns: 'Sudden chest pain, severe breathlessness, high fever > 101°F, persistent vomiting or dizziness.',
    doctorsFinalNotes: 'Patient is medically fit for discharge. Continue home oral medications as prescribed.',
    recommendedDischargeDate: new Date().toISOString().split('T')[0],
    prescribedMedicines: [createEmptyMedRow()]
  });

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.get('/api/transfer-discharge?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = res.data?.discharges || res.data?.records || (Array.isArray(res.data) ? res.data : []);
      setRecords(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length > 0) {
        if (!selectedRecord) {
          setSelectedRecord(data[0]);
        } else {
          const updated = data.find(d => d._id === selectedRecord._id);
          if (updated) setSelectedRecord(updated);
        }
      }
    } catch (err) {
      console.error('Error loading transfer/discharge records:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const [patRes, admRes] = await Promise.all([
        axios.get('/api/patients', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/admission-requests?myRequests=false', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const patData = patRes.data?.patients || patRes.data || [];
      const admData = admRes.data?.requests || admRes.data?.admissions || admRes.data || [];

      const combined = [...(Array.isArray(patData) ? patData.filter(p => p.status !== 'Discharged') : [])];
      const existingIds = new Set(combined.map(p => p.patientId || p._id));

      for (const adm of (Array.isArray(admData) ? admData : [])) {
        const pCustomId = adm.patientCustomId || adm.admissionId;
        if (!existingIds.has(pCustomId) && !existingIds.has(adm.patientId)) {
          combined.push({
            _id: adm._id,
            patientId: pCustomId,
            fullName: adm.patientName,
            name: adm.patientName,
            admissionSetup: { wardType: adm.allocatedWard || adm.wardType || adm.requestedWard },
            ward: adm.allocatedWard || adm.wardType || adm.requestedWard,
            bedNumber: adm.allocatedBedNumber || 'Standard Bed',
            clinicalInfo: { chiefComplaint: adm.diagnosis || adm.admissionReason },
            assignedDoctor: adm.doctorName
          });
          existingIds.add(pCustomId);
        }
      }

      setPatients(combined);
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  useEffect(() => {
    fetchRecords();
    fetchPatients();
  }, []);

  const handleSelectTransferPatient = (pId) => {
    const p = patients.find(pat => pat._id === pId || pat.patientId === pId);
    if (p) {
      setTransferForm(prev => ({
        ...prev,
        patientId: p._id,
        patientName: p.fullName || p.name,
        patientCustomId: p.patientId,
        currentWard: p.admissionSetup?.wardType || p.ward || 'General Ward',
        currentBedNumber: p.bedNumber || 'GW-Bed 01',
        reasonForTransfer: p.clinicalInfo?.chiefComplaint ? `Transfer evaluation for: ${p.clinicalInfo.chiefComplaint}` : prev.reasonForTransfer
      }));
    }
  };

  const handleSelectDischargePatient = (pId) => {
    const p = patients.find(pat => pat._id === pId || pat.patientId === pId);
    if (p) {
      setDischargeForm(prev => ({
        ...prev,
        patientId: p._id,
        patientName: p.fullName || p.name,
        patientCustomId: p.patientId,
        currentWard: p.admissionSetup?.wardType || p.ward || 'General Ward',
        currentBedNumber: p.bedNumber || 'GW-Bed 01',
        dischargeDiagnosis: p.clinicalInfo?.chiefComplaint || 'Clinical Condition Resolved',
        treatmentSummary: `Inpatient management completed in ${p.admissionSetup?.wardType || p.ward || 'Ward'}. Course of treatment completed uneventfully.`
      }));
    }
  };

  const handleAddMedRow = () => {
    setDischargeForm(prev => ({
      ...prev,
      prescribedMedicines: [...prev.prescribedMedicines, createEmptyMedRow()]
    }));
  };

  const handleRemoveMedRow = (idx) => {
    if (dischargeForm.prescribedMedicines.length === 1) return;
    setDischargeForm(prev => ({
      ...prev,
      prescribedMedicines: prev.prescribedMedicines.filter((_, i) => i !== idx)
    }));
  };

  const handleMedChange = (idx, field, value) => {
    const updated = [...dischargeForm.prescribedMedicines];
    updated[idx][field] = value;
    setDischargeForm(prev => ({ ...prev, prescribedMedicines: updated }));
  };

  // Submit Transfer Recommendation
  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.patientId || !transferForm.reasonForTransfer.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Required Fields',
        text: 'Please select an inpatient and provide the medical reason for transfer.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post('/api/transfer-discharge', {
        requestType: 'Transfer',
        patientId: transferForm.patientId,
        patientName: transferForm.patientName,
        patientCustomId: transferForm.patientCustomId,
        currentWard: transferForm.currentWard,
        currentBedNumber: transferForm.currentBedNumber,
        transferDetails: {
          recommendedWard: transferForm.recommendedWard,
          targetWard: transferForm.recommendedWard,
          requiredBedType: transferForm.requiredBedType,
          reasonForTransfer: transferForm.reasonForTransfer,
          medicalReason: transferForm.reasonForTransfer,
          clinicalCondition: transferForm.clinicalCondition,
          priority: transferForm.priority,
          doctorNotes: transferForm.doctorNotes,
          specialPrecautions: transferForm.doctorNotes
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Transfer Order Authorized',
        text: `Doctor transfer order for ${transferForm.patientName} authorized. Nurse has been notified to assign the destination bed.`,
        timer: 2800,
        showConfirmButton: false
      });

      setShowTransferModal(false);
      setTransferForm({
        patientId: '',
        patientName: '',
        patientCustomId: '',
        currentWard: '',
        currentBedNumber: '',
        recommendedWard: 'General Ward',
        requiredBedType: 'Standard Bed',
        reasonForTransfer: '',
        clinicalCondition: 'Stable',
        priority: 'Normal',
        doctorNotes: ''
      });

      const created = res.data;
      setRecords(prev => [created, ...prev]);
      setSelectedRecord(created);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit transfer recommendation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Doctor confirms / authorizes an existing transfer request
  const handleApproveTransferByDoctor = async (record) => {
    try {
      const confirm = await Swal.fire({
        title: 'Confirm Bed Transfer Order?',
        html: `You are approving the bed transfer of <b>${record.patientName}</b> (${record.currentWard} &bull; ${record.currentBedNumber}) to <b>${record.transferDetails?.recommendedWard || record.transferDetails?.targetWard}</b>.<br/><br/><span class="text-xs text-slate-500">A notification will be dispatched to the Nursing station to allocate destination bed and execute patient handover.</span>`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Authorize & Notify Nurse',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#4f46e5'
      });

      if (!confirm.isConfirmed) return;

      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.put(`/api/transfer-discharge/${record._id}/doctor-approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Transfer Confirmed',
        text: res.data?.message || 'Transfer order authorized and forwarded to Nurse for bed assignment.',
        confirmButtonColor: '#4f46e5'
      });

      await fetchRecords();
      if (res.data?.order) {
        setSelectedRecord(res.data.order);
      }
    } catch (err) {
      console.error('Error in doctor transfer approval:', err);
      Swal.fire('Approval Error', err.response?.data?.message || 'Failed to approve transfer', 'error');
    }
  };

  // Submit Discharge Recommendation
  const handleCreateDischarge = async (e) => {
    e.preventDefault();
    if (!dischargeForm.patientId || !dischargeForm.dischargeDiagnosis.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Missing Required Fields',
        text: 'Please select an inpatient and provide the discharge diagnosis.'
      });
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const docName = localStorage.getItem('userName') || 'Dr. Attending Physician';
      const docReg = localStorage.getItem('userReg') || 'MCI-884920';
      const docSig = `Dr. ${docName.replace(/^Dr\.\s*/i, '')} (MD, Reg: ${docReg})`;

      const res = await axios.post('/api/transfer-discharge/discharges', {
        requestType: 'Discharge',
        patientId: dischargeForm.patientId,
        patientName: dischargeForm.patientName,
        patientCustomId: dischargeForm.patientCustomId,
        currentWard: dischargeForm.currentWard,
        currentBedNumber: dischargeForm.currentBedNumber,
        dischargeDiagnosis: dischargeForm.dischargeDiagnosis,
        conditionAtDischarge: dischargeForm.conditionAtDischarge,
        patientConditionAtDischarge: dischargeForm.conditionAtDischarge,
        treatmentSummary: dischargeForm.treatmentSummary,
        prescribedMedicines: dischargeForm.prescribedMedicines.filter(m => m.medicineName.trim()),
        followUpInstructions: dischargeForm.followUpInstructions,
        followUpDate: dischargeForm.followUpDate,
        nextFollowUpDate: dischargeForm.followUpDate,
        dietInstructions: dischargeForm.dietInstructions,
        dietAndActivityAdvice: dischargeForm.dietInstructions,
        warningSigns: dischargeForm.warningSigns,
        doctorsFinalNotes: dischargeForm.doctorsFinalNotes,
        instructionsForReceptionist: dischargeForm.instructionsForReceptionist || 'Verify itemized stay charges, process payment, and issue discharge exit pass.',
        doctorSignature: docSig,
        doctorRegistrationNumber: docReg,
        doctorSignedAt: new Date(),
        recommendedDischargeDate: dischargeForm.recommendedDischargeDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Discharge Order Authorized & Signed',
        html: `Discharge order with <b>Doctor's Digital Signature</b> (${docSig}) has been submitted.<br/><br/>The <b>Receptionist</b> can now review instructions, generate billing, and collect settlement. The <b>Nurse</b> has been alerted for bed clearance readiness.`,
        confirmButtonColor: '#059669'
      });

      setShowDischargeModal(false);
      setDischargeForm({
        patientId: '',
        patientName: '',
        patientCustomId: '',
        currentWard: '',
        currentBedNumber: '',
        dischargeDiagnosis: '',
        conditionAtDischarge: 'Improved / Stable',
        treatmentSummary: '',
        followUpInstructions: '',
        followUpDate: '',
        dietInstructions: '',
        warningSigns: '',
        doctorsFinalNotes: '',
        recommendedDischargeDate: new Date().toISOString().split('T')[0],
        prescribedMedicines: [createEmptyMedRow()]
      });

      const created = res.data;
      setRecords(prev => [created, ...prev]);
      setSelectedRecord(created);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to authorize discharge recommendation', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRecords = records.filter(rec => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = (rec.patientName || '').toLowerCase().includes(term) ||
                          (rec.patientCustomId || '').toLowerCase().includes(term) ||
                          (rec.currentWard || '').toLowerCase().includes(term) ||
                          (rec.currentBedNumber || '').toLowerCase().includes(term) ||
                          (rec.transferDetails?.recommendedWard || '').toLowerCase().includes(term) ||
                          (rec.dischargeDetails?.dischargeDiagnosis || '').toLowerCase().includes(term);

    const matchesTab = activeTab === 'All' || rec.requestType === activeTab;
    const matchesStatus = statusFilter === 'All' || rec.status === statusFilter;

    return matchesSearch && matchesTab && matchesStatus;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100 shadow-2xs">
            <span className="material-symbols-outlined text-2xl">sync_alt</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Transfer & Discharge Recommendations</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Doctor Clinical Authority • Inpatient Bed Transfers & Administrative Discharge Authorization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-center">
          <button
            onClick={() => {
              if (patients.length > 0) handleSelectTransferPatient(patients[0]._id);
              setShowTransferModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">swap_horiz</span>
            Recommend Bed Transfer
          </button>

          <button
            onClick={() => {
              if (patients.length > 0) handleSelectDischargePatient(patients[0]._id);
              setShowDischargeModal(true);
            }}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">check_circle</span>
            Authorize Patient Discharge
          </button>
        </div>
      </div>

      {/* Workflow Architecture Visualizer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Transfer Workflow Pipeline */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-indigo-600 text-sm">swap_horiz</span>
              Transfer Recommendation Workflow
            </span>
            <span className="text-[10px] text-slate-400">Governance Protected</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Doctor Recommendation $\rightarrow$ Bed Management $\rightarrow$ Destination Bed Availability $\rightarrow$ Transfer Approval $\rightarrow$ New Bed Allocation $\rightarrow$ Old Bed Release
          </p>
        </div>

        {/* Discharge Workflow Pipeline */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-emerald-600 text-sm">verified</span>
              Discharge Authorization Workflow
            </span>
            <span className="text-[10px] text-slate-400">Receptionist Integrated</span>
          </div>
          <p className="text-[11px] text-slate-600 font-medium">
            Doctor $\rightarrow$ Discharge Recommendation $\rightarrow$ Receptionist $\rightarrow$ Billing $\rightarrow$ Payment $\rightarrow$ Final Discharge $\rightarrow$ Bed & Resources Released
          </p>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Orders Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search patient, ID, ward, diagnosis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="flex items-center justify-between gap-1 overflow-x-auto text-xs pb-1">
              <div className="flex items-center gap-1">
                {['All', 'Transfer', 'Discharge'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors whitespace-nowrap ${
                      activeTab === tab
                        ? 'bg-teal-700 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {tab} ({records.filter(r => tab === 'All' || r.requestType === tab).length})
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-1 text-[11px] font-bold rounded-lg border border-slate-200 bg-white"
              >
                <option value="All">All Statuses</option>
                <option value="Pending Approval">Pending Approval</option>
                <option value="Pending Discharge Verification">Pending Verification</option>
                <option value="Discharge Authorized">Authorized</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[580px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-teal-600 mb-1">progress_activity</span>
                <p>Loading medical orders...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">sync_disabled</span>
                <p>No transfer or discharge orders found.</p>
              </div>
            ) : (
              filteredRecords.map(rec => {
                const isSelected = selectedRecord?._id === rec._id;
                const isTransfer = rec.requestType === 'Transfer';

                return (
                  <div
                    key={rec._id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/80 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-slate-900">{rec.patientName}</h4>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded font-bold">
                            {rec.patientCustomId || 'P-INPATIENT'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Current: <strong>{rec.currentWard}</strong> • Bed {rec.currentBedNumber}
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isTransfer ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rec.requestType}
                      </span>
                    </div>

                    <div className="mt-2 text-[11px] text-slate-500 truncate">
                      {isTransfer ? (
                        <span>Target Ward: <strong className="text-indigo-900">{rec.transferDetails?.recommendedWard || rec.transferDetails?.targetWard}</strong></span>
                      ) : (
                        <span>Discharge Dx: <strong className="text-emerald-900">{rec.dischargeDetails?.dischargeDiagnosis || 'Stable'}</strong></span>
                      )}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between border-t border-slate-100 pt-1.5">
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        rec.status === 'Completed' ? 'bg-slate-100 text-slate-700' :
                        rec.status === 'Discharge Authorized' || rec.status === 'Transfer Approved' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {rec.status}
                      </span>
                      <span>{new Date(rec.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Order Dossier (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {!selectedRecord ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">folder_open</span>
              <p className="text-xs font-semibold">Select an order from the list to view medical recommendations.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">{selectedRecord.patientName}</h3>
                    <span className={`text-xs px-2 py-0.5 font-bold rounded-md ${
                      selectedRecord.requestType === 'Transfer' ? 'bg-indigo-100 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedRecord.requestType} Recommendation
                    </span>
                    <span className="text-xs font-mono px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {selectedRecord.patientCustomId}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Current Location: <strong>{selectedRecord.currentWard}</strong> (Bed {selectedRecord.currentBedNumber}) • Recommended on <strong>{new Date(selectedRecord.createdAt).toLocaleDateString('en-GB')}</strong> by <strong>{selectedRecord.doctorName}</strong>
                  </p>
                </div>

                <span className={`self-start sm:self-center px-3 py-1 text-xs font-bold rounded-full ${
                  selectedRecord.status === 'Completed' ? 'bg-slate-100 text-slate-700' :
                  selectedRecord.status === 'Discharge Authorized' || selectedRecord.status === 'Transfer Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                  'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {selectedRecord.status}
                </span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[580px]">
                {/* 1. IF TRANSFER RECORD */}
                {selectedRecord.requestType === 'Transfer' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-indigo-700 block">Recommended Destination Ward</span>
                        <p className="text-xs font-black text-indigo-950">
                          {selectedRecord.transferDetails?.recommendedWard || selectedRecord.transferDetails?.targetWard}
                        </p>
                        <span className="text-[11px] text-indigo-800">
                          Bed Type: <strong>{selectedRecord.transferDetails?.requiredBedType || 'Standard Bed'}</strong>
                        </span>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Clinical Condition & Priority</span>
                        <p className="text-xs font-bold text-slate-900">
                          Condition: <strong className="text-teal-800">{selectedRecord.transferDetails?.clinicalCondition || 'Stable'}</strong>
                        </p>
                        <span className="text-[11px] text-slate-600">
                          Priority: <strong>{selectedRecord.transferDetails?.priority || 'Normal'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Medical Reason for Inpatient Bed Transfer
                      </span>
                      <p className="text-xs text-slate-800 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
                        {selectedRecord.transferDetails?.reasonForTransfer || selectedRecord.transferDetails?.medicalReason}
                      </p>
                    </div>

                    {(selectedRecord.transferDetails?.doctorNotes || selectedRecord.transferDetails?.specialPrecautions) && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Doctor's Transfer Notes & Nursing Precautions
                        </span>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                          {selectedRecord.transferDetails?.doctorNotes || selectedRecord.transferDetails?.specialPrecautions}
                        </p>
                      </div>
                    )}

                    {/* Sequential Workflow Indicator */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-indigo-600 text-sm">timeline</span>
                          3-Step Bed Transfer Pipeline Status
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                          {selectedRecord.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className={`p-2 rounded-lg border ${
                          selectedRecord.status === 'Doctor Approved' || selectedRecord.status === 'Transferred' || selectedRecord.status === 'Completed'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'bg-amber-50 border-amber-300 text-amber-800 font-bold'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-xs">
                              {selectedRecord.status === 'Pending Approval' || selectedRecord.status === 'Pending Doctor Confirmation' ? 'hourglass_top' : 'check_circle'}
                            </span>
                            <span>1. Doctor</span>
                          </div>
                          <span className="block text-[9px] font-normal mt-0.5">
                            {selectedRecord.status === 'Pending Approval' || selectedRecord.status === 'Pending Doctor Confirmation' ? 'Awaiting Doctor' : 'Approved'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-lg border ${
                          selectedRecord.status === 'Transferred' || selectedRecord.status === 'Completed' || selectedRecord.status === 'Transfer Completed'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : selectedRecord.status === 'Doctor Approved'
                            ? 'bg-blue-50 border-blue-300 text-blue-800 font-bold animate-pulse'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-xs">
                              {selectedRecord.status === 'Transferred' || selectedRecord.status === 'Completed' ? 'check_circle' : 'pending_actions'}
                            </span>
                            <span>2. Nurse</span>
                          </div>
                          <span className="block text-[9px] font-normal mt-0.5">
                            {selectedRecord.status === 'Transferred' || selectedRecord.status === 'Completed'
                              ? `Bed ${selectedRecord.transferDetails?.allocatedBedNumber || 'Assigned'}`
                              : selectedRecord.status === 'Doctor Approved'
                              ? 'Assigning Bed...'
                              : 'Pending Step 1'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-lg border ${
                          selectedRecord.status === 'Transferred' || selectedRecord.status === 'Completed'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                            : 'bg-slate-100 border-slate-200 text-slate-400'
                        }`}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="material-symbols-outlined text-xs">
                              {selectedRecord.status === 'Transferred' || selectedRecord.status === 'Completed' ? 'check_circle' : 'receipt_long'}
                            </span>
                            <span>3. Receptionist</span>
                          </div>
                          <span className="block text-[9px] font-normal mt-0.5">
                            {selectedRecord.status === 'Transferred' || selectedRecord.status === 'Completed' ? 'Synced for Discharge' : 'Pending Transfer'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Doctor Action Button if order is still Pending Approval */}
                    {(selectedRecord.status === 'Pending Approval' || selectedRecord.status === 'Pending Doctor Confirmation') && (
                      <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-amber-900">Doctor Confirmation Required</p>
                          <p className="text-[11px] text-amber-700">Confirm this transfer order to immediately notify the nursing station to assign the bed.</p>
                        </div>
                        <button
                          onClick={() => handleApproveTransferByDoctor(selectedRecord)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">check_circle</span>
                          Confirm Transfer Order
                        </button>
                      </div>
                    )}

                    <div className="p-3.5 bg-indigo-50/50 rounded-xl border border-indigo-200 text-xs space-y-1 text-indigo-900">
                      <span className="font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-indigo-600">verified_user</span>
                        Workflow Rules:
                      </span>
                      <p className="text-slate-600">
                        1. Doctor authorizes transfer &rarr; 2. Nurse receives live notification & assigns available bed in destination ward &rarr; 3. Receptionist is notified and patient file is updated for billing & discharge clearance.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. IF DISCHARGE RECORD */}
                {selectedRecord.requestType === 'Discharge' && (
                  <div className="space-y-4">
                    {/* Diagnosis & Condition */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-emerald-800 block">Final Discharge Diagnosis</span>
                        <p className="text-xs font-black text-emerald-950">
                          {selectedRecord.dischargeDetails?.dischargeDiagnosis || 'Clinical Assessment'}
                        </p>
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Condition at Discharge</span>
                        <p className="text-xs font-bold text-teal-800">
                          {selectedRecord.dischargeDetails?.conditionAtDischarge || selectedRecord.dischargeDetails?.patientConditionAtDischarge || 'Improved / Stable'}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          Rec. Date: {new Date(selectedRecord.dischargeDetails?.recommendedDischargeDate || selectedRecord.createdAt).toLocaleDateString('en-GB')}
                        </span>
                      </div>
                    </div>

                    {/* Treatment Summary */}
                    {selectedRecord.dischargeDetails?.treatmentSummary && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Inpatient Treatment Summary
                        </span>
                        <p className="text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                          {selectedRecord.dischargeDetails.treatmentSummary}
                        </p>
                      </div>
                    )}

                    {/* Prescribed Medicines Schedule */}
                    {(selectedRecord.dischargeDetails?.prescribedMedicines?.length > 0) && (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200">
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-teal-700 text-base">pill</span>
                            Discharge Medication Regimen
                          </span>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {selectedRecord.dischargeDetails.prescribedMedicines.map((med, idx) => (
                            <div key={idx} className="p-3 flex items-center justify-between text-xs bg-white">
                              <div>
                                <strong className="text-slate-900">{med.medicineName}</strong>
                                <span className="ml-2 text-slate-600">({med.dosage})</span>
                                {med.instructions && <p className="text-[11px] text-slate-500 italic mt-0.5">{med.instructions}</p>}
                              </div>
                              <div className="text-right">
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold text-[11px]">
                                  {med.frequency}
                                </span>
                                <span className="block text-[10px] text-slate-400 mt-0.5">{med.duration}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Follow-up & Diet */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Follow-up Instructions</span>
                        <p className="text-xs text-slate-800 font-semibold">{selectedRecord.dischargeDetails?.followUpInstructions || 'Review in OPD clinic as advised.'}</p>
                        {selectedRecord.dischargeDetails?.followUpDate && (
                          <p className="text-[11px] text-teal-700 font-bold">
                            Follow-up Date: {new Date(selectedRecord.dischargeDetails.followUpDate).toLocaleDateString('en-GB')}
                          </p>
                        )}
                      </div>

                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Diet & Activity Advice</span>
                        <p className="text-xs text-slate-800">{selectedRecord.dischargeDetails?.dietInstructions || selectedRecord.dischargeDetails?.dietAndActivityAdvice || 'Normal balanced diet.'}</p>
                      </div>
                    </div>

                    {/* Warning Signs & Doctor Notes */}
                    {selectedRecord.dischargeDetails?.warningSigns && (
                      <div className="p-3.5 bg-rose-50/60 rounded-xl border border-rose-200 space-y-1 text-rose-950">
                        <span className="text-[10px] font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-rose-600">warning</span>
                          Warning Signs & Red Flags (Return to Emergency if Observed)
                        </span>
                        <p className="text-xs leading-relaxed font-semibold">{selectedRecord.dischargeDetails.warningSigns}</p>
                      </div>
                    )}

                    {selectedRecord.dischargeDetails?.doctorsFinalNotes && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Doctor's Final Clinical Notes</span>
                        <p className="text-xs text-slate-700 leading-relaxed bg-white p-2 rounded-lg border border-slate-200">{selectedRecord.dischargeDetails.doctorsFinalNotes}</p>
                      </div>
                    )}

                    {/* Receptionist Integration Note */}
                    <div className="p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs space-y-1 text-emerald-900">
                      <span className="font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-emerald-600">receipt_long</span>
                        Receptionist Discharge Assistance Integration:
                      </span>
                      <p className="text-slate-600">
                        This authorization is queued at the Receptionist desk for itemized hospital bill computation (bed days, consultations, medicines, labs, resources), payment settlement, and bed release.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE TRANSFER RECOMMENDATION */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col my-auto">
            <div className="p-4 bg-indigo-50 border-b border-indigo-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-700 text-xl">swap_horiz</span>
                <h3 className="font-bold text-slate-900 text-sm">Recommend Inpatient Bed Transfer</h3>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTransfer} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Select Patient */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Inpatient *</label>
                <select
                  required
                  value={transferForm.patientId}
                  onChange={(e) => handleSelectTransferPatient(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-white font-semibold"
                >
                  <option value="">-- Choose Admitted Inpatient --</option>
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.fullName || p.name} ({p.patientId}) • Current: {p.admissionSetup?.wardType || p.ward || 'General'} (Bed {p.bedNumber || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Ward vs Recommended Ward */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Recommended Destination Ward *</label>
                  <select
                    value={transferForm.recommendedWard}
                    onChange={(e) => setTransferForm({ ...transferForm, recommendedWard: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-white font-bold"
                  >
                    <option value="General Ward">General Ward</option>
                    <option value="Special Ward">Special Ward</option>
                    <option value="ICU">ICU (Intensive Care)</option>
                    <option value="CCU">CCU (Cardiac Care)</option>
                    <option value="Step-Down Unit">Step-Down Unit (SDU)</option>
                    <option value="Emergency">Emergency Ward</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Required Bed Type *</label>
                  <select
                    value={transferForm.requiredBedType}
                    onChange={(e) => setTransferForm({ ...transferForm, requiredBedType: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-white font-bold"
                  >
                    <option value="Standard Bed">Standard Bed</option>
                    <option value="ICU Bed">ICU Bed</option>
                    <option value="Cardiac Monitor Bed">Cardiac Monitor Bed</option>
                    <option value="Ventilator Bed">Ventilator Bed</option>
                    <option value="Isolation Bed">Isolation Bed</option>
                    <option value="Deluxe Room">Deluxe Room</option>
                    <option value="Semi-Private Bed">Semi-Private Bed</option>
                  </select>
                </div>
              </div>

              {/* Clinical Condition & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Patient's Clinical Condition *</label>
                  <select
                    value={transferForm.clinicalCondition}
                    onChange={(e) => setTransferForm({ ...transferForm, clinicalCondition: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-white"
                  >
                    <option value="Improved / Step-Down">Improved / Step-Down</option>
                    <option value="Deteriorating / Step-Up">Deteriorating / Step-Up</option>
                    <option value="Stable">Stable</option>
                    <option value="Critical">Critical</option>
                    <option value="Guarded">Guarded</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Transfer Priority *</label>
                  <select
                    value={transferForm.priority}
                    onChange={(e) => setTransferForm({ ...transferForm, priority: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 bg-white font-bold"
                  >
                    <option value="Normal">Normal / Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Reason for Transfer & Instructions */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Reason for Transfer & Clinical Instructions *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Medical reason for transfer (e.g. step-down from ICU to Special Ward), clinical justification, and instructions/precautions during handover..."
                  value={transferForm.reasonForTransfer}
                  onChange={(e) => setTransferForm({ ...transferForm, reasonForTransfer: e.target.value, doctorNotes: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  {submitting ? 'Submitting...' : 'Submit Transfer Recommendation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE DISCHARGE RECOMMENDATION */}
      {showDischargeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col my-auto">
            <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-xl">verified</span>
                <h3 className="font-bold text-slate-900 text-sm">Authorize Patient Discharge Recommendation</h3>
              </div>
              <button onClick={() => setShowDischargeModal(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDischarge} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Select Patient */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Select Inpatient Ready for Discharge *</label>
                <select
                  required
                  value={dischargeForm.patientId}
                  onChange={(e) => handleSelectDischargePatient(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 bg-white font-semibold"
                >
                  <option value="">-- Choose Admitted Inpatient --</option>
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.fullName || p.name} ({p.patientId}) • Ward: {p.admissionSetup?.wardType || p.ward || 'General'} (Bed {p.bedNumber || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Diagnosis, Condition & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Final Discharge Diagnosis *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute STEMI - Post PCI Stenting"
                    value={dischargeForm.dischargeDiagnosis}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDiagnosis: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 font-bold"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Condition at Discharge *</label>
                  <select
                    value={dischargeForm.conditionAtDischarge}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, conditionAtDischarge: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600 bg-white font-bold"
                  >
                    <option value="Fully Recovered">Fully Recovered</option>
                    <option value="Improved / Stable">Improved / Stable</option>
                    <option value="Clinically Stable">Clinically Stable</option>
                    <option value="Guarded">Guarded</option>
                    <option value="Referred to Specialist">Referred to Specialist</option>
                    <option value="Against Medical Advice (LAMA)">Against Medical Advice (LAMA)</option>
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Recommended Discharge Date *</label>
                  <input
                    type="date"
                    required
                    value={dischargeForm.recommendedDischargeDate}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, recommendedDischargeDate: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              {/* Treatment Summary */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Inpatient Treatment Summary</label>
                <textarea
                  rows={2}
                  placeholder="Brief clinical summary of hospitalization, procedures, and recovery..."
                  value={dischargeForm.treatmentSummary}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentSummary: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {/* Final Medicines / Prescription Builder */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-emerald-700 text-sm">pill</span>
                    Discharge Medicines & Final Prescription
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMedRow}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span> Add Medicine
                  </button>
                </div>

                <div className="space-y-2">
                  {dischargeForm.prescribedMedicines.map((med, idx) => (
                    <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Medicine Name (e.g. Atorvastatin)"
                            value={med.medicineName}
                            onChange={(e) => handleMedChange(idx, 'medicineName', e.target.value)}
                            className="w-full p-1.5 text-xs rounded-lg border border-slate-300 font-bold"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Dose (20mg)"
                            value={med.dosage}
                            onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
                            className="w-full p-1.5 text-xs rounded-lg border border-slate-300"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            placeholder="Freq (OD / BD)"
                            value={med.frequency}
                            onChange={(e) => handleMedChange(idx, 'frequency', e.target.value)}
                            className="w-full p-1.5 text-xs rounded-lg border border-slate-300"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Duration (14d)"
                            value={med.duration}
                            onChange={(e) => handleMedChange(idx, 'duration', e.target.value)}
                            className="w-full p-1.5 text-xs rounded-lg border border-slate-300"
                          />
                        </div>
                        <div className="sm:col-span-1 flex items-center justify-center">
                          {dischargeForm.prescribedMedicines.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMedRow(idx)}
                              className="text-rose-600 hover:text-rose-800"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Follow-up & Diet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Follow-up Instructions & Date</label>
                  <textarea
                    rows={2}
                    placeholder="Instructions for next OPD visit..."
                    value={dischargeForm.followUpInstructions}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, followUpInstructions: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-slate-300"
                  />
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 font-bold">Review Date:</span>
                    <input
                      type="date"
                      value={dischargeForm.followUpDate}
                      onChange={(e) => setDischargeForm({ ...dischargeForm, followUpDate: e.target.value })}
                      className="p-1 text-xs rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Diet & Activity Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Low salt diet, avoid heavy lifting, diabetic carbohydrate restrictions..."
                    value={dischargeForm.dietInstructions}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, dietInstructions: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Warning Signs & Doctor Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-rose-800 block mb-1">Warning Signs / Red Flags</label>
                  <textarea
                    rows={2}
                    placeholder="Specific red flags for immediate return to emergency (e.g. chest pain, high fever)..."
                    value={dischargeForm.warningSigns}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, warningSigns: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-rose-300 bg-rose-50/30"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Doctor's Final Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Final clinical remarks or instructions for family/caregivers..."
                    value={dischargeForm.doctorsFinalNotes}
                    onChange={(e) => setDischargeForm({ ...dischargeForm, doctorsFinalNotes: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              {/* Instructions for Receptionist */}
              <div>
                <label className="text-xs font-bold text-teal-800 block mb-1">Specific Instructions for Receptionist Desk (Billing, Verification & Gate Pass)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please verify itemized stay charges, compute dispensed pharmacy, collect settlement, issue discharge receipt and exit pass..."
                  value={dischargeForm.instructionsForReceptionist || ''}
                  onChange={(e) => setDischargeForm({ ...dischargeForm, instructionsForReceptionist: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl border border-teal-200 bg-teal-50/20 focus:outline-none focus:border-teal-600 font-medium"
                />
              </div>

              {/* Doctor Digital Signature Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50/30 to-slate-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-lg">draw</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Doctor's Digital Authorization Signature</span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Dr. {localStorage.getItem('userName') || 'Attending Physician'} • License Reg: MCI-884920 • Timestamp: {new Date().toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Digital Authorization Active
                </span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-900 border border-emerald-200">
                <strong>Workflow Synchronization:</strong> Authorizing this order signs the medical discharge, updates patient records, dispatches instructions to the <strong>Receptionist Discharge Assistance</strong> desk for billing settlement, and queues the bed for <strong>Nurse Clearance & Sanitization</strong>.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowDischargeModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">draw</span>
                  {submitting ? 'Authorizing & Signing...' : 'Digitally Sign & Forward to Receptionist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
