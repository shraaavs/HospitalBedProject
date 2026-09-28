import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NurseDoctorInstructions() {
  const location = useLocation();

  const [instructions, setInstructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstruction, setSelectedInstruction] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Acknowledged' | 'Completed'
  const [priorityFilter, setPriorityFilter] = useState('All'); // 'All' | 'STAT / Critical' | 'High' | 'Medium' | 'Routine'
  const [wardFilter, setWardFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Complete Action Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [actionRemarks, setActionRemarks] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  // Doctor Direct Create Modal (Available for Doctor/Admin testing)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [newInstructionForm, setNewInstructionForm] = useState({
    patientId: '',
    instructionCategory: 'Vital Monitoring',
    instruction: '',
    priority: 'Routine'
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'Nurse';
  const userName = localStorage.getItem('userName') || 'Staff Nurse';
  const userDepartment = localStorage.getItem('userDepartment') || 'General Ward';
  const isNurse = userRole === 'Nurse';
  const isDoctor = userRole === 'Doctor' || userRole === 'Admin';

  // Fetch Live Doctor Instructions and Bed Transfer Directives from MongoDB
  const fetchInstructions = async () => {
    try {
      setLoading(true);
      const [resInst, resTransfers] = await Promise.all([
        axios.get('/api/doctor-instructions', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/transfer-discharge', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: [] }))
      ]);

      const instList = Array.isArray(resInst.data) ? resInst.data : [];
      const transferList = Array.isArray(resTransfers.data) ? resTransfers.data : [];

      // Synthesize any TransferDischarge records not already in DoctorInstruction
      const existingInstIds = new Set(instList.map(i => `${i.patientCustomId || i.patientId}_${i.instruction}`));
      const transferDirectives = transferList
        .filter(td => td.requestType === 'Transfer' && !existingInstIds.has(`${td.patientCustomId || td.patientId}_[BED TRANSFER ORDER]`))
        .map(td => ({
          _id: td._id,
          patientId: td.patientId,
          patientName: td.patientName,
          patientCustomId: td.patientCustomId || (td.patientId?.patientId || 'PID'),
          ward: td.currentWard || 'General Ward',
          bedNumber: td.currentBedNumber || 'Bed',
          instructionCategory: 'Bed Transfer / Escalation',
          instruction: `[DOCTOR BED TRANSFER ORDER] Relocate patient to ${td.transferDetails?.targetWard || td.transferDetails?.recommendedWard || 'Target Ward'} (${td.transferDetails?.requiredBedType || 'Standard Bed'}). Priority: ${td.transferDetails?.priority || 'Routine'}. Condition: ${td.transferDetails?.clinicalCondition || 'Stable'}. Reason: ${td.transferDetails?.reasonForTransfer || td.transferDetails?.medicalReason || 'Ward Transfer'}. Doctor Notes: ${td.transferDetails?.doctorNotes || 'Execute bed handover.'}`,
          priority: td.transferDetails?.priority === 'Emergency' || td.transferDetails?.priority === 'Critical' ? 'STAT / Critical' : (td.transferDetails?.priority === 'Urgent' || td.transferDetails?.priority === 'High' ? 'High' : 'Routine'),
          doctorName: td.doctorName || 'Attending Physician',
          doctorDepartment: td.doctorDepartment || 'Clinical Care',
          status: td.status === 'Doctor Approved' ? 'Pending' : (td.status === 'Completed' || td.status === 'Transferred' ? 'Completed' : td.status),
          issuedAt: td.createdAt || td.authorizedAt || new Date(),
          isBedTransferDirective: true,
          transferRecord: td
        }));

      const combined = [...instList, ...transferDirectives].sort((a, b) => new Date(b.issuedAt || b.createdAt) - new Date(a.issuedAt || a.createdAt));

      setInstructions(combined);
      if (combined.length > 0 && !selectedInstruction) {
        setSelectedInstruction(combined[0]);
      }
    } catch (err) {
      console.error('Error fetching doctor instructions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Patients for Directive Creation
  const fetchPatients = async () => {
    try {
      const res = await axios.get('/api/patients/assigned', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = Array.isArray(res.data) ? res.data : (res.data?.patients || []);
      setAssignedPatients(list);
      if (list.length > 0 && !newInstructionForm.patientId) {
        setNewInstructionForm(prev => ({ ...prev, patientId: list[0]._id || list[0].patientId }));
      }
    } catch (err) {
      console.error('Error fetching assigned patients:', err);
    }
  };

  useEffect(() => {
    fetchInstructions();
    fetchPatients();
  }, []);

  // 1. Nurse Acknowledges Instruction
  const handleAcknowledge = async (instruction) => {
    try {
      const res = await axios.put(`/api/doctor-instructions/${instruction._id}/acknowledge`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Instruction Acknowledged',
        text: `You have taken responsibility for this clinical order.`,
        timer: 1500,
        showConfirmButton: false
      });

      const updated = res.data;
      setInstructions(prev => prev.map(i => i._id === updated._id ? updated : i));
      setSelectedInstruction(updated);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to acknowledge directive.', 'error');
    }
  };

  // 2. Open Complete Action Modal
  const handleOpenCompleteModal = (instruction) => {
    setSelectedInstruction(instruction);
    setActionRemarks('');
    setShowCompleteModal(true);
  };

  // 3. Nurse Completes Required Action
  const handleCompleteAction = async (e) => {
    e.preventDefault();
    if (!selectedInstruction) return;

    try {
      setSubmittingAction(true);
      const res = await axios.put(`/api/doctor-instructions/${selectedInstruction._id}/complete`, {
        nursingRemarks: actionRemarks,
        status: 'Completed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Action Completed & Documented',
        text: 'Nursing action and remarks saved into patient MongoDB record.',
        timer: 1800,
        showConfirmButton: false
      });

      const updated = res.data;
      setInstructions(prev => prev.map(i => i._id === updated._id ? updated : i));
      setSelectedInstruction(updated);
      setShowCompleteModal(false);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to complete directive.', 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // 4. Create New Doctor Instruction
  const handleCreateInstruction = async (e) => {
    e.preventDefault();
    if (!newInstructionForm.patientId || !newInstructionForm.instruction.trim()) {
      Swal.fire('Fields Required', 'Please select patient and input instruction text.', 'warning');
      return;
    }

    try {
      setSubmittingCreate(true);
      const pat = assignedPatients.find(p => p._id === newInstructionForm.patientId || p.patientId === newInstructionForm.patientId);
      
      const payload = {
        patientId: pat?._id || newInstructionForm.patientId,
        patientCustomId: pat?.patientId,
        patientName: pat?.fullName || pat?.name,
        ward: pat?.admissionSetup?.wardType || pat?.ward || 'General Ward',
        bedNumber: pat?.bedId?.bedNumber || pat?.bedNumber || 'Bed #01',
        instructionCategory: newInstructionForm.instructionCategory,
        instruction: newInstructionForm.instruction.trim(),
        priority: newInstructionForm.priority
      };

      const res = await axios.post('/api/doctor-instructions', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Instruction Dispatched',
        text: `Directive sent to ward nurses with real-time notification generated in MongoDB.`,
        timer: 2000,
        showConfirmButton: false
      });

      setShowCreateModal(false);
      setNewInstructionForm({
        patientId: assignedPatients[0]?._id || '',
        instructionCategory: 'Vital Monitoring',
        instruction: '',
        priority: 'Routine'
      });
      fetchInstructions();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to post instruction.', 'error');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Filtered Instructions
  const filteredInstructions = instructions.filter(item => {
    if (statusFilter !== 'All' && item.status !== statusFilter) return false;
    if (priorityFilter !== 'All' && item.priority !== priorityFilter) return false;
    if (wardFilter !== 'All' && !item.ward?.toLowerCase().includes(wardFilter.toLowerCase())) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (item.patientName || '').toLowerCase().includes(q);
      const matchId = (item.patientCustomId || '').toLowerCase().includes(q);
      const matchDoc = (item.doctorName || '').toLowerCase().includes(q);
      const matchText = (item.instruction || '').toLowerCase().includes(q);
      const matchCat = (item.instructionCategory || '').toLowerCase().includes(q);
      return matchName || matchId || matchDoc || matchText || matchCat;
    }
    return true;
  });

  const uniqueWards = ['All', ...new Set(instructions.map(i => i.ward).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
                  <span className="material-symbols-outlined text-2xl">assignment</span>
                </span>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Doctor Instructions & Clinical Directives
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                      Module 6
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time doctor orders, priority escalation, acknowledgement tracking, and completion logs
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchInstructions}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                title="Refresh Live Directives"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Refresh
              </button>

              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                Issue Doctor Directive
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Total Directives</span>
                <span className="text-lg font-black text-slate-800">{instructions.length}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">format_list_bulleted</span>
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Pending Action</span>
                <span className="text-lg font-black text-amber-700">
                  {instructions.filter(i => i.status === 'Pending').length}
                </span>
              </div>
              <span className="material-symbols-outlined text-amber-500">pending_actions</span>
            </div>

            <div className="bg-blue-50/60 p-2.5 rounded-xl border border-blue-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Acknowledged / Active</span>
                <span className="text-lg font-black text-blue-700">
                  {instructions.filter(i => i.status === 'Acknowledged' || i.status === 'In Progress').length}
                </span>
              </div>
              <span className="material-symbols-outlined text-blue-500">how_to_reg</span>
            </div>

            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-0.5">STAT / Critical Orders</span>
                <span className="text-lg font-black text-rose-700">
                  {instructions.filter(i => i.priority === 'STAT / Critical').length}
                </span>
              </div>
              <span className="material-symbols-outlined text-rose-500">crisis_alert</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              placeholder="Search patient, doctor, directive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              <option value="All">Status: All</option>
              <option value="Pending">Pending Action</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="p-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              <option value="All">Priority: All</option>
              <option value="STAT / Critical">🚨 STAT / Critical</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium</option>
              <option value="Routine">Routine</option>
            </select>

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
          </div>
        </div>

        {/* 2-Column Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Directives List (5 Cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-teal-700">clinical_notes</span>
                Doctor Directives Feed ({filteredInstructions.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Newest First</span>
            </div>

            {loading ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent"></div>
                <p className="text-xs font-semibold">Loading MongoDB Directives...</p>
              </div>
            ) : filteredInstructions.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-slate-300">done_all</span>
                <p className="text-xs font-bold text-slate-600">No doctor instructions match your criteria</p>
                <p className="text-[11px] text-slate-400">All instructions for your ward have been processed.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {filteredInstructions.map((item) => {
                  const isSelected = selectedInstruction?._id === item._id;
                  const isStat = item.priority === 'STAT / Critical';
                  const isHigh = item.priority === 'High';

                  return (
                    <div
                      key={item._id}
                      onClick={() => setSelectedInstruction(item)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2.5 ${
                        isSelected
                          ? 'bg-teal-50/50 border-teal-600 shadow-sm ring-1 ring-teal-600'
                          : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs'
                      }`}
                    >
                      {/* Top Row: Patient ID & Priority */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{item.patientName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
                            {item.patientCustomId}
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isStat
                            ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                            : isHigh
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.priority}
                        </span>
                      </div>

                      {/* Ward & Bed Info */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium">
                        <span>{item.ward}</span>
                        <span>•</span>
                        <span>{item.bedNumber}</span>
                        <span>•</span>
                        <span className="text-teal-800 font-bold">{item.instructionCategory}</span>
                      </div>

                      {/* Instruction Text Snippet */}
                      <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100 line-clamp-2">
                        "{item.instruction}"
                      </p>

                      {/* Footer Info: Doctor & Status Badge */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span className="text-teal-700 font-semibold">
                          Order from {item.doctorName}
                        </span>

                        <span className={`px-2 py-0.5 rounded font-bold ${
                          item.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'Acknowledged'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Detailed Directive & Nursing Execution (7 Cols) */}
          <div className="lg:col-span-7">
            {selectedInstruction ? (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden sticky top-24">
                {/* Header */}
                <div className={`p-5 text-white flex items-center justify-between ${
                  selectedInstruction.priority === 'STAT / Critical'
                    ? 'bg-gradient-to-r from-rose-900 via-rose-950 to-slate-900'
                    : selectedInstruction.priority === 'High'
                    ? 'bg-gradient-to-r from-amber-900 via-slate-900 to-teal-950'
                    : 'bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black tracking-tight">{selectedInstruction.patientName}</h2>
                      <span className="px-2 py-0.5 bg-white/20 text-white rounded text-[10px] font-bold">
                        {selectedInstruction.patientCustomId}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                      <span>{selectedInstruction.ward}</span>
                      <span>•</span>
                      <span>{selectedInstruction.bedNumber}</span>
                      <span>•</span>
                      <span>Category: {selectedInstruction.instructionCategory}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full block mb-1">
                      {selectedInstruction.status}
                    </span>
                    <span className="text-[10px] text-slate-300">
                      Issued: {new Date(selectedInstruction.issuedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-6 max-h-[calc(100vh-280px)] overflow-y-auto text-xs">
                  {/* Priority Warning for STAT */}
                  {selectedInstruction.priority === 'STAT / Critical' && (
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 flex items-center gap-3">
                      <span className="material-symbols-outlined text-rose-600 text-xl animate-bounce">warning</span>
                      <div>
                        <p className="font-black uppercase tracking-wider text-[11px] text-rose-800">
                          STAT Critical Order - Immediate Nursing Action Required
                        </p>
                        <p className="font-medium text-[11px] mt-0.5">
                          Prioritize execution and report completion to attending doctor immediately.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Doctor's Instruction Text */}
                  <div className="p-4 bg-teal-50/40 rounded-2xl border border-teal-100 space-y-2">
                    <span className="text-[10px] font-black text-teal-900 uppercase tracking-wider block">
                      Doctor's Clinical Directive & Nursing Orders:
                    </span>
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">
                      "{selectedInstruction.instruction}"
                    </p>
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Prescribed by: <strong className="text-slate-800">{selectedInstruction.doctorName}</strong> ({selectedInstruction.doctorDepartment})</span>
                      <span>Date: {new Date(selectedInstruction.issuedAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Acknowledgement Status Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Acknowledgement Log
                      </span>
                      {selectedInstruction.acknowledgedBy?.nurseName ? (
                        <div>
                          <p className="font-bold text-slate-800">{selectedInstruction.acknowledgedBy.nurseName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(selectedInstruction.acknowledgedBy.acknowledgedAt).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">Pending nurse acknowledgement</p>
                      )}
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Execution / Completion Log
                      </span>
                      {selectedInstruction.completedBy?.nurseName ? (
                        <div>
                          <p className="font-bold text-emerald-700">{selectedInstruction.completedBy.nurseName}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Date(selectedInstruction.completedBy.completedAt).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-[11px]">Action pending completion</p>
                      )}
                    </div>
                  </div>

                  {/* Nursing Action Remarks (if documented) */}
                  {selectedInstruction.nursingRemarks && (
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                        Completed Nursing Action Remarks:
                      </span>
                      <p className="text-xs font-semibold text-slate-800">
                        {selectedInstruction.nursingRemarks}
                      </p>
                    </div>
                  )}

                  {/* Nurse Action Buttons */}
                  {isNurse && (
                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-end gap-3">
                      {selectedInstruction.status === 'Pending' && (
                        <button
                          onClick={() => handleAcknowledge(selectedInstruction)}
                          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">how_to_reg</span>
                          Acknowledge Directive
                        </button>
                      )}

                      {selectedInstruction.status !== 'Completed' && (
                        <button
                          onClick={() => handleOpenCompleteModal(selectedInstruction)}
                          className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">task_alt</span>
                          Perform Action & Mark Completed
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
                <span className="material-symbols-outlined text-5xl text-slate-300">assignment</span>
                <h3 className="font-bold text-slate-700 text-sm">Select a Doctor Instruction</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Click on any patient instruction from the feed on the left to review details, acknowledge, and document nursing actions.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Action Modal */}
      {showCompleteModal && selectedInstruction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">task_alt</span>
                  Complete Clinical Action
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Document nursing performance for {selectedInstruction.patientName} ({selectedInstruction.patientCustomId})
                </p>
              </div>
              <button
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Directive Summary */}
            <div className="p-4 bg-teal-50/50 border-b border-teal-100 text-xs">
              <span className="text-[10px] font-bold text-teal-900 uppercase block mb-1">Doctor Directive:</span>
              <p className="font-bold text-slate-800">"{selectedInstruction.instruction}"</p>
            </div>

            {/* Form */}
            <form onSubmit={handleCompleteAction} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Nursing Action Remarks & Clinical Observations (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Nebulization given; post-treatment SpO2 is 97% on room air. Chest clear bilaterally..."
                  value={actionRemarks}
                  onChange={(e) => setActionRemarks(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {submittingAction ? 'Saving...' : 'Confirm Action Completed'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Doctor Issue Directive Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-400">post_add</span>
                  Issue Clinical Doctor Directive
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Create nursing orders dispatched directly to ward staff
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateInstruction} className="p-6 space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Select Patient *</label>
                <select
                  value={newInstructionForm.patientId}
                  onChange={(e) => setNewInstructionForm({ ...newInstructionForm, patientId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                >
                  {assignedPatients.map(p => (
                    <option key={p._id || p.patientId} value={p._id || p.patientId}>
                      {p.fullName || p.name} ({p.patientId}) - {p.admissionSetup?.wardType || p.ward || 'General'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Category *</label>
                  <select
                    value={newInstructionForm.instructionCategory}
                    onChange={(e) => setNewInstructionForm({ ...newInstructionForm, instructionCategory: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold"
                  >
                    <option value="Vital Monitoring">Vital Monitoring</option>
                    <option value="Medication & IV Fluid">Medication & IV Fluid</option>
                    <option value="Wound & Post-Op Care">Wound & Post-Op Care</option>
                    <option value="Diet & Nutrition">Diet & Nutrition</option>
                    <option value="Mobility & Positioning">Mobility & Positioning</option>
                    <option value="Diagnostic & Lab Order">Diagnostic & Lab Order</option>
                    <option value="General Nursing Care">General Nursing Care</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Priority *</label>
                  <select
                    value={newInstructionForm.priority}
                    onChange={(e) => setNewInstructionForm({ ...newInstructionForm, priority: e.target.value })}
                    className="w-full p-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High Priority</option>
                    <option value="STAT / Critical">🚨 STAT / Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                  Clinical Directive / Nursing Orders *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Keep NPO after 10PM, monitor hourly urine output, maintain SpO2 above 95%..."
                  value={newInstructionForm.instruction}
                  onChange={(e) => setNewInstructionForm({ ...newInstructionForm, instruction: e.target.value })}
                  className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  {submittingCreate ? 'Dispatching...' : 'Dispatch Instruction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
