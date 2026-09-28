import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function NurseMedicationTreatment() {
  const location = useLocation();

  // State
  const [prescriptions, setPrescriptions] = useState([]);
  const [administrations, setAdministrations] = useState([]);
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('due'); // 'due' | 'administered' | 'all'

  // Selected for Administration
  const [selectedMedItem, setSelectedMedItem] = useState(null);
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [administerForm, setAdministerForm] = useState({
    status: 'Administered',
    administeredDose: '',
    administeredRoute: 'Oral',
    administeredDate: new Date().toISOString().split('T')[0],
    administeredTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    remarks: '',
    reasonNotAdministered: '',
    bp: '',
    pulse: '',
    sugar: ''
  });
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [patientFilter, setPatientFilter] = useState('All');
  const [routeFilter, setRouteFilter] = useState('All');

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'Nurse';
  const userName = localStorage.getItem('userName') || 'Staff Nurse';
  const isNurse = userRole === 'Nurse';

  // Fetch live Prescriptions, Administrations, and Assigned Patients
  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };

      const [rxRes, adminRes, patRes] = await Promise.all([
        axios.get('/api/prescriptions', { headers }),
        axios.get('/api/medication-administrations', { headers }),
        axios.get('/api/patients/assigned', { headers })
      ]);

      setPrescriptions(rxRes.data || []);
      setAdministrations(adminRes.data || []);
      setAssignedPatients(Array.isArray(patRes.data) ? patRes.data : (patRes.data?.patients || []));
    } catch (err) {
      console.error('Error fetching medication treatment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Flatten active prescriptions into individual scheduled medication items
  const scheduledMedications = [];
  const existingRxKeys = new Set();

  prescriptions.forEach((rx) => {
    if (rx.status === 'Active' && rx.medications && Array.isArray(rx.medications)) {
      rx.medications.forEach((med, mIdx) => {
        // Find recent administration log for this specific medicine & patient today
        const todayStr = new Date().toISOString().split('T')[0];
        const lastAdmin = administrations.find(
          a => (a.prescriptionId === rx._id || a.patientCustomId === rx.patientCustomId) &&
               a.medicineName.toLowerCase() === med.medicineName.toLowerCase() &&
               a.administeredDate === todayStr
        );

        const itemKey = `${rx._id}-${mIdx}`;
        existingRxKeys.add(`${rx.patientCustomId || rx.patientName}-${med.medicineName}`.toLowerCase());

        scheduledMedications.push({
          key: itemKey,
          prescriptionId: rx._id,
          patientId: rx.patientId?._id || rx.patientId,
          patientName: rx.patientName,
          patientCustomId: rx.patientCustomId || `P-${rx._id.toString().slice(-4)}`,
          ward: rx.ward || 'General Ward',
          bedNumber: rx.bedNumber || 'Bed #01',
          doctorName: rx.doctorName || 'Attending Physician',
          doctorDepartment: rx.doctorDepartment || 'General Medicine',
          diagnosis: rx.diagnosis,
          prescriptionDate: rx.prescriptionDate || rx.createdAt,
          notes: rx.notes,
          medicineName: med.medicineName,
          drugId: med.drugId,
          dosage: med.dosage,
          route: med.route || 'Oral',
          frequency: med.frequency || 'Once daily (OD)',
          duration: med.duration || '5 days',
          quantity: med.quantity || '1',
          instructions: med.instructions || med.specialInstructions || 'Take with water as directed.',
          timing: med.timing || 'After Food',
          startDate: med.startDate,
          endDate: med.endDate,
          lastAdmin: lastAdmin || null,
          isDueToday: !lastAdmin || lastAdmin.status === 'Not Administered'
        });
      });
    }
  });

  // Also include treatments prescribed during admission for all assigned ward patients
  assignedPatients.forEach((pat, pIdx) => {
    const pCustomId = pat.patientId || `P-${pat._id?.toString().slice(-4)}`;
    const pName = pat.fullName || pat.name || 'Admitted Patient';
    const pWard = pat.admissionSetup?.wardType || pat.ward || 'General Ward';
    const pBed = pat.bedId?.bedNumber || pat.bedNumber || 'Assigned Bed';
    const pDoc = pat.admissionSetup?.assignedDoctor || pat.assignedDoctor || 'Attending Physician';
    const pDx = pat.latestDiagnosis || pat.diagnosis || pat.clinicalInfo?.chiefComplaint || 'Inpatient Care';

    // If patient has prescription array in their dossier/record
    if (pat.prescriptions && Array.isArray(pat.prescriptions) && pat.prescriptions.length > 0) {
      pat.prescriptions.forEach((med, mIdx) => {
        const medName = med.medication || med.medicineName || 'Prescribed Medication';
        const checkKey = `${pCustomId}-${medName}`.toLowerCase();
        if (!existingRxKeys.has(checkKey)) {
          existingRxKeys.add(checkKey);
          const todayStr = new Date().toISOString().split('T')[0];
          const lastAdmin = administrations.find(
            a => (a.patientCustomId === pCustomId || String(a.patientId) === String(pat._id)) &&
                 a.medicineName.toLowerCase() === medName.toLowerCase() &&
                 a.administeredDate === todayStr
          );

          scheduledMedications.push({
            key: `pat-rx-${pat._id || pIdx}-${mIdx}`,
            prescriptionId: pat._id,
            patientId: pat._id,
            patientName: pName,
            patientCustomId: pCustomId,
            ward: pWard,
            bedNumber: pBed,
            doctorName: pDoc,
            doctorDepartment: pWard,
            diagnosis: pDx,
            prescriptionDate: pat.createdAt || new Date(),
            notes: pat.treatment || '',
            medicineName: medName,
            drugId: med.drugId || `MED-${mIdx + 1}`,
            dosage: med.dosage || 'Standard Dose',
            route: med.route || 'Oral',
            frequency: med.frequency || 'Once daily (OD)',
            duration: med.duration || '5 days',
            quantity: '1',
            instructions: med.instructions || 'Administer according to clinical protocol.',
            timing: 'After Food',
            lastAdmin: lastAdmin || null,
            isDueToday: !lastAdmin || lastAdmin.status === 'Not Administered'
          });
        }
      });
    } else if (pat.treatment && typeof pat.treatment === 'string' && pat.treatment.trim() && pat.treatment.toLowerCase() !== 'standard care' && pat.treatment.toLowerCase() !== 'clinical evaluation') {
      const medName = pat.treatment.replace(/^Rx Prescribed:\s*/i, '').split('(')[0].trim() || pat.treatment;
      const checkKey = `${pCustomId}-${medName}`.toLowerCase();
      if (!existingRxKeys.has(checkKey) && medName.length > 2) {
        existingRxKeys.add(checkKey);
        const todayStr = new Date().toISOString().split('T')[0];
        const lastAdmin = administrations.find(
          a => (a.patientCustomId === pCustomId || String(a.patientId) === String(pat._id)) &&
               a.medicineName.toLowerCase() === medName.toLowerCase() &&
               a.administeredDate === todayStr
        );

        scheduledMedications.push({
          key: `pat-tx-${pat._id || pIdx}`,
          prescriptionId: pat._id,
          patientId: pat._id,
          patientName: pName,
          patientCustomId: pCustomId,
          ward: pWard,
          bedNumber: pBed,
          doctorName: pDoc,
          doctorDepartment: pWard,
          diagnosis: pDx,
          prescriptionDate: pat.createdAt || new Date(),
          notes: pat.treatment,
          medicineName: medName,
          drugId: `TX-${pIdx + 1}`,
          dosage: 'Therapeutic Dose',
          route: 'Oral',
          frequency: 'As Prescribed',
          duration: '5 days',
          quantity: '1',
          instructions: pat.treatment,
          timing: 'Scheduled Dose',
          lastAdmin: lastAdmin || null,
          isDueToday: !lastAdmin || lastAdmin.status === 'Not Administered'
        });
      }
    }
  });

  // Open modal to record administration
  const handleOpenAdministerModal = (item) => {
    setSelectedMedItem(item);
    setAdministerForm({
      status: 'Administered',
      administeredDose: item.dosage,
      administeredRoute: item.route || 'Oral',
      administeredDate: new Date().toISOString().split('T')[0],
      administeredTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      remarks: '',
      reasonNotAdministered: '',
      bp: '',
      pulse: '',
      sugar: ''
    });
    setShowAdministerModal(true);
  };

  // Submit Administration Log to MongoDB
  const handleSubmitAdministration = async (e) => {
    e.preventDefault();
    if (!selectedMedItem) return;

    if (administerForm.status !== 'Administered' && !administerForm.reasonNotAdministered.trim() && !administerForm.remarks.trim()) {
      Swal.fire('Reason Required', 'Please provide a clinical remark or reason for withholding this medication dose.', 'warning');
      return;
    }

    try {
      setSubmittingAdmin(true);
      const payload = {
        prescriptionId: selectedMedItem.prescriptionId,
        patientId: selectedMedItem.patientId,
        patientCustomId: selectedMedItem.patientCustomId,
        patientName: selectedMedItem.patientName,
        ward: selectedMedItem.ward,
        bedNumber: selectedMedItem.bedNumber,
        medicineName: selectedMedItem.medicineName,
        prescribedDosage: selectedMedItem.dosage,
        prescribedRoute: selectedMedItem.route,
        prescribedFrequency: selectedMedItem.frequency,
        prescribedDuration: selectedMedItem.duration,
        scheduledTime: selectedMedItem.timing || '08:00 AM',
        doctorInstructions: selectedMedItem.instructions,
        prescribedDoctorName: selectedMedItem.doctorName,
        status: administerForm.status,
        administeredDose: administerForm.status === 'Administered' ? administerForm.administeredDose : 'None (Withheld)',
        administeredRoute: administerForm.administeredRoute,
        administeredDate: administerForm.administeredDate,
        administeredTime: administerForm.administeredTime,
        remarks: administerForm.remarks,
        reasonNotAdministered: administerForm.reasonNotAdministered,
        vitalCheckBeforeAdmin: {
          bloodPressure: administerForm.bp,
          pulseRate: administerForm.pulse,
          bloodSugar: administerForm.sugar
        }
      };

      await axios.post('/api/medication-administrations', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: administerForm.status === 'Administered' ? 'Medication Administered' : 'Administration Logged',
        text: `Recorded in patient's MongoDB medication administration history.`,
        timer: 1800,
        showConfirmButton: false
      });

      setShowAdministerModal(false);
      fetchData();
    } catch (err) {
      console.error('Error logging medication administration:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to record medication administration.', 'error');
    } finally {
      setSubmittingAdmin(false);
    }
  };

  // Filtered lists
  const filteredMeds = scheduledMedications.filter((item) => {
    if (patientFilter !== 'All' && item.patientCustomId !== patientFilter) return false;
    if (routeFilter !== 'All' && item.route !== routeFilter) return false;
    if (activeTab === 'due' && !item.isDueToday) return false;
    if (activeTab === 'administered' && item.isDueToday) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.patientName.toLowerCase().includes(q);
      const matchMed = item.medicineName.toLowerCase().includes(q);
      const matchDoc = item.doctorName.toLowerCase().includes(q);
      const matchId = item.patientCustomId.toLowerCase().includes(q);
      return matchName || matchMed || matchDoc || matchId;
    }
    return true;
  });

  const patientOptions = Array.from(
    new Map(
      [
        ...scheduledMedications.map(m => [m.patientCustomId, { id: m.patientCustomId, label: `${m.patientName} (${m.patientCustomId})` }]),
        ...assignedPatients.map(p => [p.patientId || p._id, { id: p.patientId || p._id, label: `${p.fullName || p.name} (${p.patientId || 'Admitted'})` }])
      ]
    ).values()
  );

  const uniqueRoutes = ['All', ...new Set(scheduledMedications.map(m => m.route).filter(Boolean))];

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 bg-teal-50 text-teal-700 rounded-xl border border-teal-200">
                  <span className="material-symbols-outlined text-2xl">medication</span>
                </span>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    Medication & Treatment Administration (eMAR)
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wider">
                      Module 5
                    </span>
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View doctor prescriptions, scheduled administration times, and record live doses in MongoDB
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                className="px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                title="Refresh Live Data"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Refresh
              </button>

              <div className="px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-teal-700">lock</span>
                Prescription Source: Doctor Direct Rx
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-100">
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Active Prescriptions</span>
                <span className="text-lg font-black text-slate-800">{prescriptions.filter(p => p.status === 'Active').length}</span>
              </div>
              <span className="material-symbols-outlined text-slate-400">prescriptions</span>
            </div>

            <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Medications Due Today</span>
                <span className="text-lg font-black text-amber-700">
                  {scheduledMedications.filter(m => m.isDueToday).length}
                </span>
              </div>
              <span className="material-symbols-outlined text-amber-500">pending_actions</span>
            </div>

            <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Administered Doses</span>
                <span className="text-lg font-black text-emerald-700">
                  {administrations.filter(a => a.status === 'Administered').length}
                </span>
              </div>
              <span className="material-symbols-outlined text-emerald-500">check_circle</span>
            </div>

            <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block mb-0.5">Held / Not Given</span>
                <span className="text-lg font-black text-rose-700">
                  {administrations.filter(a => a.status === 'Not Administered' || a.status === 'Refused' || a.status === 'Held').length}
                </span>
              </div>
              <span className="material-symbols-outlined text-rose-500">do_not_disturb_on</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Notice on Prescription Authority */}
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-center gap-3">
          <span className="material-symbols-outlined text-blue-600 text-xl shrink-0">verified_user</span>
          <div>
            <span className="font-black uppercase tracking-wider text-[10px] text-blue-800">Clinical Protocol Guard:</span>{' '}
            <span className="font-medium">
              Prescription orders and therapeutic modifications are authorized strictly by the attending Doctor. Nurses record dose administration, timing, route, and clinical observations.
            </span>
          </div>
        </div>

        {/* Tab Selection & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab('due')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'due' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">schedule</span>
              Due for Administration ({scheduledMedications.filter(m => m.isDueToday).length})
            </button>
            <button
              onClick={() => setActiveTab('administered')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'administered' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">task_alt</span>
              Administered Today ({scheduledMedications.filter(m => !m.isDueToday).length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'all' ? 'bg-white text-teal-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-sm">list</span>
              All Scheduled Items ({scheduledMedications.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-60">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search patient, drug, doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
              />
            </div>

            {/* Patient Filter */}
            <select
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              className="p-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700 max-w-[180px]"
            >
              <option value="All">All Patients ({patientOptions.length})</option>
              {patientOptions.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>

            {/* Route Filter */}
            <select
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
              className="p-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-700"
            >
              {uniqueRoutes.map(r => (
                <option key={r} value={r}>Route: {r}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Medication Schedule List / Cards */}
        {loading ? (
          <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-2">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-3 border-teal-600 border-t-transparent"></div>
            <p className="text-xs font-semibold">Loading Prescriptions & Administration Schedules...</p>
          </div>
        ) : filteredMeds.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl border border-slate-200 text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-slate-300">medication</span>
            <p className="text-xs font-bold text-slate-600">No medication schedules found matching criteria</p>
            <p className="text-[11px] text-slate-400">All prescribed medications for your ward are up to date.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMeds.map((med) => (
              <div
                key={med.key}
                className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-sm transition-all text-xs space-y-3"
              >
                {/* Card Header: Patient Info & Bed */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{med.patientName}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md">
                        {med.patientCustomId}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {med.ward} • {med.bedNumber} • Dx: {med.diagnosis}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    med.isDueToday
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : med.lastAdmin?.status === 'Administered'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {med.isDueToday ? 'Due Today' : med.lastAdmin?.status || 'Administered'}
                  </span>
                </div>

                {/* Medicine & Dosage Details */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-teal-900 text-base">{med.medicineName}</span>
                      <span className="px-2 py-0.5 bg-teal-50 text-teal-800 font-bold text-[10px] rounded-md border border-teal-100">
                        {med.dosage}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-600 font-medium">
                      <span>Route: <strong className="text-slate-800">{med.route}</strong></span>
                      <span>•</span>
                      <span>Freq: <strong className="text-slate-800">{med.frequency}</strong></span>
                      <span>•</span>
                      <span>Timing: <strong className="text-slate-800">{med.timing}</strong></span>
                      <span>•</span>
                      <span>Duration: <strong className="text-slate-800">{med.duration}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Doctor's Clinical Directives */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px]">
                  <span className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Doctor Instructions:</span>
                  <p className="text-slate-700 font-semibold">{med.instructions}</p>
                  <p className="text-[10px] text-teal-700 font-bold mt-1">Prescribed by {med.doctorName} ({med.doctorDepartment})</p>
                </div>

                {/* Last Administration Note (if any) */}
                {med.lastAdmin && (
                  <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-[11px] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800">
                        Last Log: {med.lastAdmin.status} at {med.lastAdmin.administeredTime} ({med.lastAdmin.administeredDate})
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">{med.lastAdmin.nurseName}</span>
                    </div>
                    {med.lastAdmin.remarks && (
                      <p className="text-slate-600 text-[10px]">Remarks: {med.lastAdmin.remarks}</p>
                    )}
                    {med.lastAdmin.reasonNotAdministered && (
                      <p className="text-rose-700 text-[10px] font-bold">Reason: {med.lastAdmin.reasonNotAdministered}</p>
                    )}
                  </div>
                )}

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">Rx Date: {new Date(med.prescriptionDate).toLocaleDateString()}</span>
                  
                  {isNurse && (
                    <button
                      onClick={() => handleOpenAdministerModal(med)}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <span className="material-symbols-outlined text-sm">vaccines</span>
                      Record Administration
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Administration History Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-teal-700">history</span>
              Live Medication Administration History Log ({administrations.length})
            </h3>
            <span className="text-[11px] text-teal-800 font-bold">MongoDB Live Records</span>
          </div>

          {administrations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No administration logs recorded yet in database.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs max-h-96 overflow-y-auto">
              {administrations.map((adm) => (
                <div key={adm._id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{adm.patientName} ({adm.patientCustomId})</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-black text-teal-800">{adm.medicineName}</span>
                      <span className="px-2 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                        {adm.administeredDose || adm.prescribedDosage}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Route: {adm.administeredRoute} • Ward: {adm.ward} ({adm.bedNumber}) • Doctor: {adm.prescribedDoctorName}
                    </p>
                    {adm.remarks && (
                      <p className="text-[11px] text-slate-600 font-medium bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {adm.remarks}
                      </p>
                    )}
                    {adm.reasonNotAdministered && (
                      <p className="text-[11px] text-rose-700 font-bold">
                        Reason Not Given: {adm.reasonNotAdministered}
                      </p>
                    )}
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 ${
                      adm.status === 'Administered' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {adm.status}
                    </span>
                    <p className="text-[10px] text-slate-400">
                      {adm.administeredDate} at {adm.administeredTime}
                    </p>
                    <p className="text-[10px] text-teal-700 font-semibold">
                      Nurse: {adm.nurseName}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Record Administration Modal rendered directly in document.body to avoid parent CSS clipping */}
      {showAdministerModal && selectedMedItem && typeof document !== 'undefined' && createPortal(
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
            if (e.target === e.currentTarget) setShowAdministerModal(false);
          }}
        >
          <div 
            style={{
              width: '100%',
              maxWidth: '580px',
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
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-teal-500/20 text-teal-400 rounded-xl border border-teal-500/30 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">vaccines</span>
                </span>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                    Record Medication Administration
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Patient: <span className="font-bold text-teal-300">{selectedMedItem.patientName}</span> ({selectedMedItem.patientCustomId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdministerModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Scrollable Container */}
            <div className="overflow-y-auto flex-1">
              {/* Prescribed Drug Summary */}
              <div className="p-4 bg-teal-50 border-b border-teal-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-teal-950 text-sm">{selectedMedItem.medicineName}</span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-bold text-[11px]">
                      {selectedMedItem.dosage}
                    </span>
                  </div>
                  <span className="font-bold text-teal-800 text-xs bg-white px-2 py-0.5 rounded border border-teal-200">
                    Route: {selectedMedItem.route}
                  </span>
                </div>
                <div className="text-[11px] text-slate-700 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                  <span>Frequency: <strong className="text-slate-900">{selectedMedItem.frequency}</strong></span>
                  <span>Timing: <strong className="text-slate-900">{selectedMedItem.timing}</strong></span>
                </div>
                {selectedMedItem.instructions && (
                  <p className="text-[11px] text-teal-900 bg-white/80 p-2 rounded-lg border border-teal-100 mt-1">
                    <strong className="text-teal-950">Doctor Instructions:</strong> "{selectedMedItem.instructions}"
                  </p>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmitAdministration} className="p-5 space-y-4 text-xs">
                {/* Administration Status */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                    Administration Outcome *
                  </label>
                  <select
                    value={administerForm.status}
                    onChange={(e) => setAdministerForm({ ...administerForm, status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Administered">Administered (Successfully Given)</option>
                    <option value="Not Administered">Not Administered (Withheld / Fasting / NPO)</option>
                    <option value="Refused">Refused by Patient</option>
                    <option value="Held">Held (Doctor Instruction / Adverse Sign)</option>
                  </select>
                </div>

                {/* Dose & Route */}
                {administerForm.status === 'Administered' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Dose Given *</label>
                      <input
                        type="text"
                        required
                        value={administerForm.administeredDose}
                        onChange={(e) => setAdministerForm({ ...administerForm, administeredDose: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        placeholder="e.g. 75 mg"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Route *</label>
                      <select
                        value={administerForm.administeredRoute}
                        onChange={(e) => setAdministerForm({ ...administerForm, administeredRoute: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-bold text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      >
                        <option value="Oral">Oral</option>
                        <option value="Intravenous (IV)">Intravenous (IV)</option>
                        <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                        <option value="Subcutaneous">Subcutaneous</option>
                        <option value="Sublingual">Sublingual</option>
                        <option value="Topical">Topical</option>
                        <option value="Inhalation">Inhalation</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* If Not Administered / Refused / Held */}
                {administerForm.status !== 'Administered' && (
                  <div>
                    <label className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1.5">
                      Reason for Withholding Dose *
                    </label>
                    <select
                      value={administerForm.reasonNotAdministered}
                      onChange={(e) => setAdministerForm({ ...administerForm, reasonNotAdministered: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-rose-300 bg-rose-50/70 font-bold text-rose-900 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
                    >
                      <option value="">-- Select Clinical Reason --</option>
                      <option value="Patient NPO / Fasting for Procedure">Patient NPO / Fasting for Procedure</option>
                      <option value="Patient Refused Medication">Patient Refused Medication</option>
                      <option value="Severe Nausea / Vomiting">Severe Nausea / Vomiting</option>
                      <option value="Hypotension / Vitals Out of Range">Hypotension / Vitals Out of Range</option>
                      <option value="Doctor Verbal Order to Hold">Doctor Verbal Order to Hold</option>
                      <option value="Medication Unavailable from Pharmacy">Medication Unavailable from Pharmacy</option>
                      <option value="Patient Asleep / Unresponsive">Patient Asleep / Unresponsive</option>
                    </select>
                  </div>
                )}

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Date Given</label>
                    <input
                      type="date"
                      value={administerForm.administeredDate}
                      onChange={(e) => setAdministerForm({ ...administerForm, administeredDate: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Time Given</label>
                    <input
                      type="text"
                      value={administerForm.administeredTime}
                      onChange={(e) => setAdministerForm({ ...administerForm, administeredTime: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-semibold text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      placeholder="e.g. 09:30 AM"
                    />
                  </div>
                </div>

                {/* Optional Pre-admin Vital Check */}
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Pre-Administration Vitals (Optional)
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="BP (e.g. 120/80)"
                      value={administerForm.bp}
                      onChange={(e) => setAdministerForm({ ...administerForm, bp: e.target.value })}
                      className="p-2 rounded-lg border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                    <input
                      type="text"
                      placeholder="Pulse (bpm)"
                      value={administerForm.pulse}
                      onChange={(e) => setAdministerForm({ ...administerForm, pulse: e.target.value })}
                      className="p-2 rounded-lg border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                    <input
                      type="text"
                      placeholder="Sugar (mg/dL)"
                      value={administerForm.sugar}
                      onChange={(e) => setAdministerForm({ ...administerForm, sugar: e.target.value })}
                      className="p-2 rounded-lg border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Nurse Clinical Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Swallowed well with 200ml water, patient reported no discomfort..."
                    value={administerForm.remarks}
                    onChange={(e) => setAdministerForm({ ...administerForm, remarks: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium text-xs text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  ></textarea>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowAdministerModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingAdmin}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    {submittingAdmin ? 'Saving MAR...' : 'Confirm & Save MAR'}
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
