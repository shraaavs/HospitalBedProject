import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DoctorPrescriptions() {
  const location = useLocation();
  const printRef = useRef(null);

  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Create Prescription Modal / Drawer
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedPatientObj, setSelectedPatientObj] = useState(null);
  const [patientHistory, setPatientHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Print Slip Modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [prescriptionToPrint, setPrescriptionToPrint] = useState(null);

  // Initial Empty Medicine Template
  const createEmptyMedication = () => ({
    medicineName: '',
    drugId: '',
    dosage: '',
    route: 'Oral',
    frequency: 'Once daily (OD)',
    duration: '5 days',
    quantity: '1',
    instructions: 'Take after meals with water',
    timing: 'After Food',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    specialInstructions: ''
  });

  // Form State
  const [formData, setFormData] = useState({
    patientName: '',
    patientCustomId: '',
    ward: '',
    bedNumber: '',
    admissionCustomId: '',
    diagnosis: '',
    consultationId: '',
    appointmentId: '',
    notes: '',
    prescriptionDate: new Date().toISOString().split('T')[0],
    medications: [createEmptyMedication()]
  });

  const commonMedicines = [
    { name: 'Atorvastatin', id: 'DRUG-101', defaultDose: '20 mg', route: 'Oral', timing: 'Bedtime' },
    { name: 'Aspirin Cardio', id: 'DRUG-102', defaultDose: '75 mg', route: 'Oral', timing: 'After Food' },
    { name: 'Amlodipine Besylate', id: 'DRUG-103', defaultDose: '5 mg', route: 'Oral', timing: 'Before Food' },
    { name: 'Metoprolol Succinate', id: 'DRUG-104', defaultDose: '50 mg', route: 'Oral', timing: 'After Food' },
    { name: 'Telmisartan', id: 'DRUG-105', defaultDose: '40 mg', route: 'Oral', timing: 'After Food' },
    { name: 'Nitroglycerin SL', id: 'DRUG-106', defaultDose: '0.4 mg', route: 'Sublingual', timing: 'As Directed' },
    { name: 'Clopidogrel (Plavix)', id: 'DRUG-107', defaultDose: '75 mg', route: 'Oral', timing: 'After Food' },
    { name: 'Amoxicillin + Clavulanate', id: 'DRUG-108', defaultDose: '625 mg', route: 'Oral', timing: 'With Food' },
    { name: 'Paracetamol', id: 'DRUG-109', defaultDose: '650 mg', route: 'Oral', timing: 'After Food' },
    { name: 'Pantoprazole', id: 'DRUG-110', defaultDose: '40 mg', route: 'Oral', timing: 'Before Food' },
    { name: 'Furosemide (Lasix)', id: 'DRUG-111', defaultDose: '20 mg', route: 'Oral', timing: 'Before Food' },
    { name: 'Metformin HCl', id: 'DRUG-112', defaultDose: '500 mg', route: 'Oral', timing: 'With Food' },
    { name: 'Ceftriaxone Sodium', id: 'DRUG-113', defaultDose: '1 g', route: 'Intravenous (IV)', timing: 'As Directed' },
    { name: 'Enoxaparin Sodium', id: 'DRUG-114', defaultDose: '40 mg/0.4ml', route: 'Subcutaneous', timing: 'As Directed' }
  ];

  const fetchPrescriptionsAndPatients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [rxRes, patientsRes] = await Promise.all([
        axios.get('/api/prescriptions', { headers }),
        axios.get('/api/patients/assigned', { headers })
      ]);

      const rxData = rxRes.data || [];
      setPrescriptions(rxData);
      if (rxData.length > 0 && !selectedPrescription) {
        setSelectedPrescription(rxData[0]);
      }

      const pData = patientsRes.data || [];
      setPatients(pData);

      // If patient passed via navigation state
      if (location.state?.patientId) {
        const targetId = location.state.patientId;
        const found = pData.find(p => p._id === targetId || p.patientId === targetId);
        if (found) {
          handleSelectPatient(found._id, pData);
          setIsModalOpen(true);
        }
      }
    } catch (err) {
      console.error('Error fetching prescriptions/patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptionsAndPatients();
  }, []);

  const handleSelectPatient = async (patientId, patientList = patients) => {
    setSelectedPatientId(patientId);
    const patientObj = patientList.find(p => p._id === patientId || p.patientId === patientId);
    setSelectedPatientObj(patientObj || null);

    if (patientObj) {
      setFormData(prev => ({
        ...prev,
        patientName: patientObj.fullName || patientObj.name,
        patientCustomId: patientObj.patientId || '',
        ward: patientObj.admissionSetup?.wardType || patientObj.ward || '',
        bedNumber: patientObj.bedNumber || '',
        admissionCustomId: patientObj.admissionStatus === 'Admitted' ? (patientObj.admissionId || `ADM-${patientObj.patientId}`) : '',
        diagnosis: patientObj.clinicalInfo?.chiefComplaint || prev.diagnosis
      }));

      // Fetch patient previous prescriptions to check interactions & duplicates
      try {
        setHistoryLoading(true);
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        const res = await axios.get(`/api/prescriptions/patient/${patientObj._id || patientObj.patientId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setPatientHistory(res.data || []);
      } catch (err) {
        console.error('Error loading patient medication history:', err);
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const handleAddMedicationRow = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, createEmptyMedication()]
    }));
  };

  const handleRemoveMedicationRow = (idx) => {
    if (formData.medications.length === 1) return;
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== idx)
    }));
  };

  const handleMedicationChange = (index, field, value) => {
    const updated = [...formData.medications];
    updated[index][field] = value;

    // Auto-fill drug details if user selects from catalog
    if (field === 'medicineName') {
      const match = commonMedicines.find(m => m.name.toLowerCase() === value.trim().toLowerCase());
      if (match) {
        if (!updated[index].drugId) updated[index].drugId = match.id;
        if (!updated[index].dosage) updated[index].dosage = match.defaultDose;
        if (match.route) updated[index].route = match.route;
        if (match.timing) updated[index].timing = match.timing;
      }
    }

    // Auto-calculate End Date if duration is standard days
    if (field === 'duration' || field === 'startDate') {
      const durationVal = field === 'duration' ? value : updated[index].duration;
      const startVal = field === 'startDate' ? value : updated[index].startDate;
      const daysMatch = durationVal.match(/(\d+)\s*(day|days|d)/i);
      if (daysMatch && startVal) {
        const days = parseInt(daysMatch[1], 10);
        const sDate = new Date(startVal);
        sDate.setDate(sDate.getDate() + days);
        updated[index].endDate = sDate.toISOString().split('T')[0];
      }
    }

    setFormData(prev => ({ ...prev, medications: updated }));
  };

  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!formData.patientName) {
      Swal.fire({ icon: 'warning', title: 'Missing Patient', text: 'Please select an assigned patient.' });
      return;
    }

    for (const [idx, med] of formData.medications.entries()) {
      if (!med.medicineName.trim() || !med.dosage.trim()) {
        Swal.fire({
          icon: 'warning',
          title: `Medicine #${idx + 1} Incomplete`,
          text: 'Please enter both the Medicine Name and Dosage for every item.'
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.post('/api/prescriptions', {
        patientId: selectedPatientId || undefined,
        patientName: formData.patientName,
        patientCustomId: formData.patientCustomId,
        ward: formData.ward,
        bedNumber: formData.bedNumber,
        admissionCustomId: formData.admissionCustomId,
        diagnosis: formData.diagnosis,
        consultationId: formData.consultationId || undefined,
        appointmentId: formData.appointmentId || undefined,
        medications: formData.medications,
        notes: formData.notes,
        prescriptionDate: formData.prescriptionDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Prescription Issued Successfully',
        text: `Prescription for ${formData.patientName} has been linked to the medical records and queued for pharmacy review.`,
        timer: 2000,
        showConfirmButton: false
      });

      setIsModalOpen(false);
      setFormData({
        patientName: '',
        patientCustomId: '',
        ward: '',
        bedNumber: '',
        admissionCustomId: '',
        diagnosis: '',
        consultationId: '',
        appointmentId: '',
        notes: '',
        prescriptionDate: new Date().toISOString().split('T')[0],
        medications: [createEmptyMedication()]
      });
      setSelectedPatientId('');
      setSelectedPatientObj(null);
      setPatientHistory([]);
      
      const newRx = res.data;
      setPrescriptions(prev => [newRx, ...prev]);
      setSelectedPrescription(newRx);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error Saving Prescription',
        text: err.response?.data?.message || 'Failed to save prescription.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (rxId, newStatus) => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await axios.put(`/api/prescriptions/${rxId}/status`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const updated = res.data;
      setPrescriptions(prev => prev.map(p => p._id === rxId ? updated : p));
      if (selectedPrescription?._id === rxId) setSelectedPrescription(updated);

      Swal.fire({
        icon: 'success',
        title: `Status: ${newStatus}`,
        timer: 1200,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to update status', 'error');
    }
  };

  const handlePrint = (rx) => {
    setPrescriptionToPrint(rx);
    setIsPrintModalOpen(true);
  };

  const executePrint = () => {
    window.print();
  };

  const filteredPrescriptions = prescriptions.filter(rx => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (rx.patientName || '').toLowerCase().includes(term) ||
                          (rx.patientCustomId || '').toLowerCase().includes(term) ||
                          (rx.diagnosis || '').toLowerCase().includes(term) ||
                          (rx.medications || []).some(m => (m.medicineName || '').toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'All' || rx.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full h-full flex flex-col space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-100">
              <span className="material-symbols-outlined text-2xl">prescriptions</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Prescriptions & Clinical Regimens</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Doctor Rx Suite • Dosage, Route, Timing, Duration, Quantity & Pharmacy Verification
              </p>
            </div>
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
            <span className="material-symbols-outlined text-base">add_circle</span>
            Create New Prescription
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">receipt_long</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total Prescriptions</p>
            <p className="text-xl font-black text-slate-900">{prescriptions.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">check_circle</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Active Regimens</p>
            <p className="text-xl font-black text-emerald-700">
              {prescriptions.filter(p => p.status === 'Active').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">local_pharmacy</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Dispensed / Filled</p>
            <p className="text-xl font-black text-blue-700">
              {prescriptions.filter(p => p.status === 'Dispensed').length}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-xl">pause_circle</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Discontinued / Done</p>
            <p className="text-xl font-black text-amber-700">
              {prescriptions.filter(p => p.status === 'Completed' || p.status === 'Discontinued').length}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left: Prescriptions List & Filters (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60 space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">search</span>
              <input
                type="text"
                placeholder="Search by Patient, ID, Diagnosis or Medicine..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {['All', 'Active', 'Completed', 'Dispensed', 'Discontinued'].map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 max-h-[600px]">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined animate-spin text-2xl text-teal-600 mb-1">progress_activity</span>
                <p>Loading prescriptions...</p>
              </div>
            ) : filteredPrescriptions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">pill_off</span>
                <p>No prescriptions match the filter.</p>
              </div>
            ) : (
              filteredPrescriptions.map(rx => {
                const isSelected = selectedPrescription?._id === rx._id;
                return (
                  <div
                    key={rx._id}
                    onClick={() => setSelectedPrescription(rx)}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? 'bg-teal-50/70 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xs font-bold text-slate-900">{rx.patientName}</h3>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono font-bold">
                            {rx.patientCustomId || 'P-REC'}
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-700 font-semibold mt-0.5">
                          {rx.diagnosis || 'Clinical Prescription'}
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        rx.status === 'Active' ? 'bg-emerald-100 text-emerald-800' :
                        rx.status === 'Dispensed' ? 'bg-blue-100 text-blue-800' :
                        rx.status === 'Completed' ? 'bg-slate-100 text-slate-700' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        {rx.status}
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {(rx.medications || []).slice(0, 3).map((m, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md font-medium">
                          {m.medicineName} ({m.dosage})
                        </span>
                      ))}
                      {(rx.medications || []).length > 3 && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded font-bold">
                          +{rx.medications.length - 3} more
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Prescribed by: {rx.doctorName}</span>
                      <span>{new Date(rx.createdAt).toLocaleDateString('en-GB')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Prescription Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden">
          {!selectedPrescription ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">medication</span>
              <p className="text-xs font-semibold">Select a prescription from the list to view clinical details.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              {/* Header Info */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{selectedPrescription.patientName}</span>
                    <span className="text-xs font-mono px-2 py-0.5 bg-teal-100 text-teal-800 font-bold rounded-md">
                      {selectedPrescription.patientCustomId}
                    </span>
                    {selectedPrescription.ward && (
                      <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-semibold border border-indigo-100">
                        {selectedPrescription.ward} {selectedPrescription.bedNumber ? `• Bed ${selectedPrescription.bedNumber}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Prescribed on <strong>{new Date(selectedPrescription.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong> by <strong>{selectedPrescription.doctorName}</strong> ({selectedPrescription.doctorDepartment})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePrint(selectedPrescription)}
                    className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">print</span>
                    Print Rx Slip
                  </button>

                  <select
                    value={selectedPrescription.status}
                    onChange={(e) => handleUpdateStatus(selectedPrescription._id, e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Dispensed">Dispensed</option>
                    <option value="Completed">Completed</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                </div>
              </div>

              {/* Prescription Body Details */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[550px]">
                {/* Clinical Indication & Links */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Indication / Diagnosis</span>
                    <span className="text-xs font-bold text-slate-800">{selectedPrescription.diagnosis || 'General Treatment'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Admission Reference</span>
                    <span className="text-xs font-semibold text-slate-700">{selectedPrescription.admissionCustomId || 'Outpatient / Direct Rx'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Pharmacy Status</span>
                    <span className="text-xs font-semibold text-teal-700">Authorized by Doctor (Stock issued via Pharmacy)</span>
                  </div>
                </div>

                {/* Medication Items Detailed Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-teal-700 text-base">medication</span>
                      Prescribed Medications ({selectedPrescription.medications?.length || 0})
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {(selectedPrescription.medications || []).map((med, idx) => (
                      <div key={idx} className="p-4 space-y-2 hover:bg-slate-50/60 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{med.medicineName}</span>
                              {med.drugId && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold">
                                  {med.drugId}
                                </span>
                              )}
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-800 text-[11px] font-bold rounded-md border border-teal-100">
                                {med.dosage}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                              <span>Route: <strong className="text-slate-700">{med.route || 'Oral'}</strong></span>
                              <span>•</span>
                              <span>Timing: <strong className="text-slate-700">{med.timing || 'After Food'}</strong></span>
                              <span>•</span>
                              <span>Duration: <strong className="text-slate-700">{med.duration}</strong></span>
                              <span>•</span>
                              <span>Qty: <strong className="text-slate-700">{med.quantity || '1'}</strong></span>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {med.frequency}
                            </span>
                            {med.startDate && (
                              <span className="text-[10px] text-slate-400 mt-0.5">
                                {new Date(med.startDate).toLocaleDateString('en-GB')} {med.endDate ? `to ${new Date(med.endDate).toLocaleDateString('en-GB')}` : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Instructions */}
                        {(med.instructions || med.specialInstructions) && (
                          <div className="p-2.5 bg-teal-50/50 rounded-lg border border-teal-100/60 text-xs text-slate-700 space-y-1">
                            {med.instructions && (
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm text-teal-700">info</span>
                                <span><strong>Instructions:</strong> {med.instructions}</span>
                              </div>
                            )}
                            {med.specialInstructions && (
                              <div className="flex items-center gap-1.5 text-amber-900">
                                <span className="material-symbols-outlined text-sm text-amber-600">warning</span>
                                <span><strong>Special Precautions:</strong> {med.specialInstructions}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Doctor's Notes */}
                {selectedPrescription.notes && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Doctor Clinical Notes & Follow-up Instructions
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {selectedPrescription.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW PRESCRIPTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden border border-slate-200 flex flex-col my-auto">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">edit_note</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Write Clinical Prescription (Rx)</h3>
                  <p className="text-[11px] text-slate-500">Formulate dosage, administration route, frequency, quantity & timing</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSavePrescription} className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Select Patient & Basic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Select Patient *</label>
                  <select
                    required
                    value={selectedPatientId}
                    onChange={(e) => handleSelectPatient(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="">-- Choose Assigned Patient --</option>
                    {patients.map(p => (
                      <option key={p._id} value={p._id}>
                        {p.fullName || p.name} ({p.patientId}) {p.admissionStatus === 'Admitted' ? `• [${p.admissionSetup?.wardType || 'Admitted'}]` : '• [Outpatient]'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Diagnosis / Indication</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acute Bronchitis & Hypertension"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">Prescription Date</label>
                  <input
                    type="date"
                    required
                    value={formData.prescriptionDate}
                    onChange={(e) => setFormData({ ...formData, prescriptionDate: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600 bg-white"
                  />
                </div>
              </div>

              {/* Selected Patient Banner with Allergies & History */}
              {selectedPatientObj && (
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-teal-900">{selectedPatientObj.fullName || selectedPatientObj.name}</span>
                      <span className="font-mono text-teal-700 bg-white px-1.5 py-0.5 rounded border border-teal-200 font-bold text-[10px]">
                        {selectedPatientObj.patientId}
                      </span>
                      <span className="text-slate-600">
                        Age: {selectedPatientObj.age || '--'}, Gender: {selectedPatientObj.gender || '--'}, Blood: <strong>{selectedPatientObj.clinicalInfo?.bloodGroup || 'O+'}</strong>
                      </span>
                    </div>

                    {selectedPatientObj.clinicalInfo?.allergies?.length > 0 ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-md text-[10px] flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">warning</span>
                        Allergies: {selectedPatientObj.clinicalInfo.allergies.join(', ')}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">No known drug allergies reported</span>
                    )}
                  </div>

                  {/* Previous Medication Check */}
                  <div className="pt-2 border-t border-teal-200/60">
                    <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block mb-1">
                      Medication History (Check to avoid drug duplication / interactions):
                    </span>
                    {historyLoading ? (
                      <p className="text-[11px] text-teal-700 italic">Checking previous regimens...</p>
                    ) : patientHistory.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">No prior prescriptions recorded.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {patientHistory.flatMap(h => h.medications || []).map((m, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-white border border-teal-300 text-teal-900 rounded text-[10px] font-medium">
                            {m.medicineName} ({m.dosage}) - {m.frequency}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medications List Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-teal-700 text-base">pill</span>
                    Medication Items ({formData.medications.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddMedicationRow}
                    className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1 px-2.5 py-1 bg-teal-50 hover:bg-teal-100 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span> Add Another Medicine
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.medications.map((med, idx) => (
                    <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-teal-800 flex items-center gap-1">
                          <span className="w-5 h-5 rounded-full bg-teal-700 text-white text-[10px] flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          Medicine #{idx + 1}
                        </span>
                        {formData.medications.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationRow(idx)}
                            className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-0.5"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span> Remove
                          </button>
                        )}
                      </div>

                      {/* Line 1: Medicine Name, Drug ID, Dosage, Route */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-5">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Medicine Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Atorvastatin"
                            list={`meds-${idx}`}
                            value={med.medicineName}
                            onChange={(e) => handleMedicationChange(idx, 'medicineName', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600 font-semibold"
                          />
                          <datalist id={`meds-${idx}`}>
                            {commonMedicines.map((m, i) => (
                              <option key={i} value={m.name}>{m.defaultDose} ({m.route})</option>
                            ))}
                          </datalist>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Drug ID</label>
                          <input
                            type="text"
                            placeholder="e.g. DRUG-101"
                            value={med.drugId}
                            onChange={(e) => handleMedicationChange(idx, 'drugId', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600 font-mono"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Dosage *</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 500 mg / 1 tab"
                            value={med.dosage}
                            onChange={(e) => handleMedicationChange(idx, 'dosage', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Route</label>
                          <select
                            value={med.route}
                            onChange={(e) => handleMedicationChange(idx, 'route', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600 font-semibold"
                          >
                            <option value="Oral">Oral</option>
                            <option value="Intravenous (IV)">Intravenous (IV)</option>
                            <option value="Intramuscular (IM)">Intramuscular (IM)</option>
                            <option value="Subcutaneous">Subcutaneous</option>
                            <option value="Sublingual">Sublingual</option>
                            <option value="Topical">Topical</option>
                            <option value="Inhalation">Inhalation</option>
                            <option value="Rectal">Rectal</option>
                            <option value="Ophthalmic">Ophthalmic</option>
                            <option value="Otic">Otic</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>

                      {/* Line 2: Frequency, Timing (Before/After food), Duration, Quantity */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-4">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Frequency</label>
                          <select
                            value={med.frequency}
                            onChange={(e) => handleMedicationChange(idx, 'frequency', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          >
                            <option value="Once daily (OD)">Once daily (OD)</option>
                            <option value="Twice daily (BID)">Twice daily (BD / BID)</option>
                            <option value="Thrice daily (TID)">Thrice daily (TID)</option>
                            <option value="Four times daily (QID)">Four times daily (QID)</option>
                            <option value="As needed (PRN)">As needed (PRN)</option>
                            <option value="At bedtime (HS)">At bedtime (HS)</option>
                            <option value="Every 4 hours (Q4H)">Every 4 hours (Q4H)</option>
                            <option value="Every 6 hours (Q6H)">Every 6 hours (Q6H)</option>
                            <option value="Every 8 hours (Q8H)">Every 8 hours (Q8H)</option>
                            <option value="STAT (Immediately)">STAT (Immediately)</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Timing (Before/After Food)</label>
                          <select
                            value={med.timing}
                            onChange={(e) => handleMedicationChange(idx, 'timing', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          >
                            <option value="After Food">After Food</option>
                            <option value="Before Food">Before Food</option>
                            <option value="With Food">With Food</option>
                            <option value="Empty Stomach">Empty Stomach</option>
                            <option value="Bedtime">Bedtime</option>
                            <option value="As Directed">As Directed</option>
                          </select>
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Duration</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 5 days / 2 weeks"
                            value={med.duration}
                            onChange={(e) => handleMedicationChange(idx, 'duration', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Quantity</label>
                          <input
                            type="text"
                            placeholder="e.g. 10 tabs / 1 bot"
                            value={med.quantity}
                            onChange={(e) => handleMedicationChange(idx, 'quantity', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>

                      {/* Line 3: Start Date, End Date, Instructions, Special Instructions */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Start Date</label>
                          <input
                            type="date"
                            value={med.startDate}
                            onChange={(e) => handleMedicationChange(idx, 'startDate', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">End Date</label>
                          <input
                            type="date"
                            value={med.endDate || ''}
                            onChange={(e) => handleMedicationChange(idx, 'endDate', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Instructions</label>
                          <input
                            type="text"
                            placeholder="e.g. Take with warm water"
                            value={med.instructions}
                            onChange={(e) => handleMedicationChange(idx, 'instructions', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Special Instructions / Precautions</label>
                          <input
                            type="text"
                            placeholder="e.g. Avoid dairy / monitor BP"
                            value={med.specialInstructions}
                            onChange={(e) => handleMedicationChange(idx, 'specialInstructions', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor's Notes & Advice */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Doctor's Medical Notes & Advice</label>
                <textarea
                  rows={2}
                  placeholder="Dietary precautions, lifestyle modifications, or follow-up schedules..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-teal-600"
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-700 text-base">info</span>
                <span>
                  <strong>Pharmacy / Inventory Workflow Note:</strong> Doctor prescriptions create clinical dispensing orders. Actual inventory quantity decrement occurs when the pharmacy verifies and issues the medication.
                </span>
              </div>

              {/* Submit Buttons */}
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
                  <span className="material-symbols-outlined text-base">verified</span>
                  {submitting ? 'Saving Prescription...' : 'Authorize & Save Prescription'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE OFFICIAL PRESCRIPTION SLIP MODAL */}
      {isPrintModalOpen && prescriptionToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col my-auto max-h-[95vh]">
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center no-print">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-teal-700">print</span>
                Official Prescription Preview
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={executePrint}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">print</span> Print Now
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div ref={printRef} className="p-8 space-y-6 bg-white text-slate-900 overflow-y-auto font-sans">
              {/* Hospital Letterhead */}
              <div className="border-b-2 border-teal-800 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-teal-900 tracking-tight">MEDIFLOW HOSPITAL</h2>
                  <p className="text-xs text-slate-600">Multi-Speciality Healthcare & Research Institute</p>
                  <p className="text-[11px] text-slate-500">Department of {prescriptionToPrint.doctorDepartment || 'Cardiology & General Medicine'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{prescriptionToPrint.doctorName}</p>
                  <p className="text-xs text-slate-600">Consultant Physician</p>
                  <p className="text-[10px] text-slate-500 font-mono">Reg. No: MED-IN-99420</p>
                </div>
              </div>

              {/* Patient & Prescription Info Box */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient Name</span>
                  <span className="font-bold text-slate-900">{prescriptionToPrint.patientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Patient ID</span>
                  <span className="font-bold text-slate-900 font-mono">{prescriptionToPrint.patientCustomId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Date</span>
                  <span className="font-bold text-slate-900">
                    {new Date(prescriptionToPrint.createdAt || prescriptionToPrint.prescriptionDate).toLocaleDateString('en-GB')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Diagnosis</span>
                  <span className="font-bold text-teal-800">{prescriptionToPrint.diagnosis || 'Clinical Assessment'}</span>
                </div>
              </div>

              {/* Rx Symbol & Medication Table */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-300 pb-1">
                  <span className="text-2xl font-serif font-black text-teal-900 italic">℞</span>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Prescribed Medication Regimen</span>
                </div>

                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="p-2">#</th>
                      <th className="p-2">Medicine & Dosage</th>
                      <th className="p-2">Route</th>
                      <th className="p-2">Frequency & Timing</th>
                      <th className="p-2">Duration</th>
                      <th className="p-2">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(prescriptionToPrint.medications || []).map((med, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2">
                          <p className="font-bold text-slate-900">{med.medicineName}</p>
                          <p className="text-[11px] text-teal-700 font-semibold">{med.dosage} {med.drugId ? `(${med.drugId})` : ''}</p>
                          {med.instructions && <p className="text-[10px] text-slate-500 italic">Inst: {med.instructions}</p>}
                          {med.specialInstructions && <p className="text-[10px] text-amber-700 font-semibold">Caution: {med.specialInstructions}</p>}
                        </td>
                        <td className="p-2 font-medium text-slate-700">{med.route || 'Oral'}</td>
                        <td className="p-2">
                          <span className="font-bold text-slate-900 block">{med.frequency}</span>
                          <span className="text-[11px] text-slate-600">{med.timing || 'After Food'}</span>
                        </td>
                        <td className="p-2 font-medium text-slate-800">{med.duration}</td>
                        <td className="p-2 font-medium text-slate-800">{med.quantity || '1'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Doctor's Notes */}
              {prescriptionToPrint.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-0.5">Special Advice / Follow-up:</span>
                  <p className="text-slate-600">{prescriptionToPrint.notes}</p>
                </div>
              )}

              {/* Footer Signature */}
              <div className="pt-10 flex justify-between items-end border-t border-slate-200 text-xs">
                <div className="text-[10px] text-slate-400">
                  <p>Electronically generated via MediFlow Hospital Information System</p>
                  <p>Valid for pharmacy verification and patient dispensing</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <p className="font-bold text-slate-900">{prescriptionToPrint.doctorName}</p>
                  <p className="text-[10px] text-slate-500">Authorized Signature & Stamp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
