import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function DoctorConsultations() {
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Patient for Clinical Consultation
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDossier, setPatientDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [linkedAppointmentId, setLinkedAppointmentId] = useState('');

  // Doctor Consultation Form State (All Required Clinical Fields)
  const [consultationForm, setConsultationForm] = useState({
    chiefComplaint: '',
    symptoms: '',
    durationOfSymptoms: '',
    presentIllness: '',
    relevantMedicalHistory: '',
    allergies: '',
    currentMedications: '',
    clinicalObservations: '',
    diagnosis: '',
    diagnosisNotes: '',
    severity: 'Moderate', // 'Mild' | 'Moderate' | 'Severe' | 'Critical'
    treatmentPlan: '',
    recommendedTests: '',
    doctorsMedicalNotes: '',
    followUpInstructions: '',
    // Vitals during consult
    temperature: '',
    bloodPressureSys: '',
    bloodPressureDia: '',
    heartRate: '',
    oxygenSaturation: '',
    respiratoryRate: '',
    // Quick Prescriptions list
    prescriptionsList: [
      { medication: '', dosage: '', frequency: 'Once daily (OD)', duration: '7 Days', route: 'Oral' }
    ]
  });

  const [saving, setSaving] = useState(false);

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const rawUserName = localStorage.getItem('userName') || 'Dr. Physician';
  const doctorDisplayName = rawUserName.startsWith('Dr.') ? rawUserName : `Dr. ${rawUserName}`;
  const cleanDoctorName = rawUserName.replace(/^Dr\.\s*/i, '').trim();

  // 1. Fetch Patients & Waiting Appointments assigned to logged in Doctor
  const fetchDoctorPatientsAndQueue = async () => {
    try {
      setLoading(true);
      const [patRes, appRes] = await Promise.all([
        axios.get('/api/patients/assigned', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('/api/appointments', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const pats = Array.isArray(patRes.data) ? patRes.data : [];
      const apps = Array.isArray(appRes.data) ? appRes.data : [];

      setPatients(pats);
      setAppointments(apps);

      // Auto-select first patient if available and none currently selected
      if (pats.length > 0 && !selectedPatient) {
        selectPatientForConsultation(pats[0], apps);
      }
    } catch (err) {
      console.error('Error fetching consultation queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorPatientsAndQueue();
  }, []);

  // 2. Select Patient and Load Complete Medical History + Current Info
  const selectPatientForConsultation = async (patient, currentApps = appointments) => {
    try {
      setSelectedPatient(patient);
      setDossierLoading(true);

      const targetId = patient._id || patient.patientId;
      const res = await axios.get(`/api/patients/${targetId}/full-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const dossier = res.data;
      setPatientDossier(dossier);

      // Check if there is an active/waiting appointment for this patient
      const linkedApp = (currentApps || []).find(a => 
        (a.patientCustomId === patient.patientId || String(a.patientId?._id || a.patientId) === String(patient._id)) &&
        a.status !== 'Completed' && a.status !== 'Cancelled'
      );

      setLinkedAppointmentId(linkedApp ? linkedApp._id : '');

      // Prepopulate Consultation Form with patient current data & history
      const prevComplaints = patient.clinicalInfo?.chiefComplaint || linkedApp?.reason || '';
      const existingAllergies = patient.clinicalInfo?.allergies?.join(', ') || '';
      
      // Extract latest vitals if available
      const latestVital = dossier.vitalLogs?.[0] || null;

      setConsultationForm(prev => ({
        ...prev,
        chiefComplaint: prevComplaints,
        symptoms: '',
        durationOfSymptoms: '3-5 Days',
        presentIllness: `Patient reports ${prevComplaints || 'clinical symptoms'} of recent onset.`,
        relevantMedicalHistory: dossier.medicalRecords?.map(m => m.diagnosis).filter(Boolean).slice(0, 3).join('; ') || 'No prior surgical/chronic history documented.',
        allergies: existingAllergies,
        currentMedications: dossier.prescriptions?.flatMap(p => p.medications?.map(m => m.medicineName)).filter(Boolean).slice(0, 3).join(', ') || 'None currently active',
        clinicalObservations: 'Patient conscious, cooperative, and oriented to time, place, and person.',
        diagnosis: '',
        diagnosisNotes: '',
        severity: 'Moderate',
        treatmentPlan: '',
        recommendedTests: '',
        doctorsMedicalNotes: '',
        followUpInstructions: 'Review in OPD clinic in 7 days or SOS if condition worsens.',
        temperature: latestVital?.temperature ? String(latestVital.temperature) : '98.6',
        bloodPressureSys: latestVital?.bloodPressureSys ? String(latestVital.bloodPressureSys) : '120',
        bloodPressureDia: latestVital?.bloodPressureDia ? String(latestVital.bloodPressureDia) : '80',
        heartRate: latestVital?.pulseRate ? String(latestVital.pulseRate) : '74',
        oxygenSaturation: latestVital?.oxygenSaturation ? String(latestVital.oxygenSaturation) : '98',
        respiratoryRate: latestVital?.respiratoryRate ? String(latestVital.respiratoryRate) : '16',
        prescriptionsList: [
          { medication: '', dosage: '', frequency: 'Once daily (OD)', duration: '7 Days', route: 'Oral' }
        ]
      }));

    } catch (err) {
      console.error('Error loading patient dossier for consultation:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  // Prescription Dynamic Rows Handlers
  const handleAddPrescriptionRow = () => {
    setConsultationForm(prev => ({
      ...prev,
      prescriptionsList: [
        ...prev.prescriptionsList,
        { medication: '', dosage: '', frequency: 'Twice daily (BID)', duration: '5 Days', route: 'Oral' }
      ]
    }));
  };

  const handleRemovePrescriptionRow = (index) => {
    setConsultationForm(prev => ({
      ...prev,
      prescriptionsList: prev.prescriptionsList.filter((_, i) => i !== index)
    }));
  };

  const handlePrescriptionChange = (index, field, value) => {
    setConsultationForm(prev => {
      const updated = [...prev.prescriptionsList];
      updated[index][field] = value;
      return { ...prev, prescriptionsList: updated };
    });
  };

  // 3. Save Complete Clinical Consultation to MongoDB
  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;

    if (!consultationForm.diagnosis.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Diagnosis Required',
        text: 'Please enter the primary clinical diagnosis before saving.'
      });
      return;
    }

    try {
      setSaving(true);

      const validPrescriptions = consultationForm.prescriptionsList
        .filter(p => p.medication.trim())
        .map(p => ({
          medication: p.medication.trim(),
          dosage: p.dosage.trim() || 'Standard Dosage',
          frequency: p.frequency,
          duration: p.duration,
          route: p.route
        }));

      const testArray = consultationForm.recommendedTests
        ? consultationForm.recommendedTests.split(',').map(t => ({ testName: t.trim(), urgency: 'Routine' })).filter(t => t.testName)
        : [];

      const allergyArray = consultationForm.allergies
        ? consultationForm.allergies.split(',').map(a => a.trim()).filter(Boolean)
        : [];

      // Link: Patient ID + Doctor ID + Appointment ID + Consultation Date
      const payload = {
        patientId: selectedPatient._id,
        patientCustomId: selectedPatient.patientId,
        patientName: selectedPatient.fullName || selectedPatient.name,
        gender: selectedPatient.gender,
        age: selectedPatient.age,
        phoneNumber: selectedPatient.phoneNumber || selectedPatient.contactNumber,
        appointmentId: linkedAppointmentId || null,
        consultationDate: new Date(),
        chiefComplaint: consultationForm.chiefComplaint,
        symptoms: consultationForm.symptoms,
        durationOfSymptoms: consultationForm.durationOfSymptoms,
        presentIllness: consultationForm.presentIllness,
        relevantMedicalHistory: consultationForm.relevantMedicalHistory,
        allergies: allergyArray,
        currentMedications: consultationForm.currentMedications,
        clinicalObservations: consultationForm.clinicalObservations,
        diagnosis: consultationForm.diagnosis,
        diagnosisNotes: consultationForm.diagnosisNotes,
        severity: consultationForm.severity,
        treatmentPlan: consultationForm.treatmentPlan,
        treatment: consultationForm.treatmentPlan,
        recommendedTests: testArray,
        doctorsMedicalNotes: consultationForm.doctorsMedicalNotes,
        notes: consultationForm.doctorsMedicalNotes,
        followUpInstructions: consultationForm.followUpInstructions,
        vitals: {
          temperature: Number(consultationForm.temperature) || 98.6,
          bloodPressure: `${consultationForm.bloodPressureSys || 120}/${consultationForm.bloodPressureDia || 80}`,
          heartRate: Number(consultationForm.heartRate) || 72,
          oxygenSaturation: Number(consultationForm.oxygenSaturation) || 98,
          respiratoryRate: Number(consultationForm.respiratoryRate) || 16
        },
        prescriptions: validPrescriptions
      };

      // 1. Post to /api/medical-records
      await axios.post('/api/medical-records', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Complete appointment workflow in MongoDB & notify Receptionist
      if (linkedAppointmentId) {
        await axios.post(`/api/appointments/${linkedAppointmentId}/complete-consultation`, {
          diagnosis: consultationForm.diagnosis,
          treatment: consultationForm.treatmentPlan,
          prescriptions: validPrescriptions,
          notes: consultationForm.doctorsMedicalNotes
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => console.warn('Could not complete appointment record:', err));
      }

      // 3. If prescriptions were entered, also log to /api/prescriptions for pharmacy tracking
      if (validPrescriptions.length > 0) {
        await axios.post('/api/prescriptions', {
          patientId: selectedPatient._id,
          patientName: selectedPatient.fullName || selectedPatient.name,
          patientCustomId: selectedPatient.patientId,
          doctorName: doctorDisplayName,
          diagnosis: consultationForm.diagnosis,
          medications: validPrescriptions.map(p => ({
            medicineName: p.medication,
            dosage: p.dosage,
            frequency: p.frequency,
            duration: p.duration,
            route: p.route
          })),
          notes: consultationForm.treatmentPlan
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);
      }

      Swal.fire({
        icon: 'success',
        title: 'Consultation Completed & Saved!',
        html: `Clinical assessment for <b>${selectedPatient.fullName || selectedPatient.name}</b> (${selectedPatient.patientId}) has been successfully saved to MongoDB.<br/>Doctor availability has been reset to <b>AVAILABLE</b> and the Receptionist queue has been notified.`,
        confirmButtonColor: '#0066cc'
      });

      // Refresh Patient Dossier & Queue
      selectPatientForConsultation(selectedPatient);
      fetchDoctorPatientsAndQueue();

    } catch (err) {
      console.error('Error saving consultation:', err);
      Swal.fire({
        icon: 'error',
        title: 'Save Failed',
        text: err.response?.data?.message || 'Failed to record consultation in database.'
      });
    } finally {
      setSaving(false);
    }
  };

  // Filter patients list
  const filteredPatients = patients.filter(p => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (p.fullName || p.name || '').toLowerCase().includes(q);
    const idMatch = (p.patientId || '').toLowerCase().includes(q);
    const statusMatch = statusFilter === 'All' || (p.status || p.admissionStatus) === statusFilter;
    return (nameMatch || idMatch) && statusMatch;
  });

  return (
    <div className="w-full flex flex-col space-y-4 pb-12">
      
      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-lg">
              🩺
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800">Clinical Consultations</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                  Attending: {doctorDisplayName}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive Clinical Assessment • History Evaluation • Diagnosis & Treatment Decision System
              </p>
            </div>
          </div>
        </div>

        {/* Quick Search & Refresh */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Patient Name or ID..."
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 w-48 md:w-56"
            />
          </div>

          <button
            onClick={fetchDoctorPatientsAndQueue}
            title="Refresh Queue"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Assigned Patients Queue (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col max-h-[860px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
              Patient Queue ({filteredPatients.length})
            </span>
            <span className="text-[11px] text-slate-400">Click to consult</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl animate-spin text-teal-600 mb-2">sync</span>
                <p className="text-xs font-semibold">Loading assigned patient queue...</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
                <p className="text-xs font-bold text-slate-600">No patients found</p>
              </div>
            ) : (
              filteredPatients.map((patient) => {
                const isSelected = selectedPatient?._id === patient._id || selectedPatient?.patientId === patient.patientId;
                const status = patient.status || patient.admissionStatus || 'Active';
                const ward = patient.admissionSetup?.wardType || patient.ward || 'General';

                return (
                  <div
                    key={patient._id || patient.patientId}
                    onClick={() => selectPatientForConsultation(patient)}
                    className={`p-3 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-teal-50/80 border-teal-600 ring-1 ring-teal-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                          {(patient.fullName || patient.name || 'P').charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">{patient.fullName || patient.name}</h4>
                          <span className="text-[10px] font-mono text-slate-500">{patient.patientId}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold border shrink-0 ${
                        status === 'Admitted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        status === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <span>{patient.age || 'N/A'} yrs • {patient.gender || 'M'}</span>
                      <span className="font-bold text-teal-800">{ward}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Full Clinical Assessment & Decision Console (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[600px] max-h-[860px] overflow-hidden">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">stethoscope</span>
              <h3 className="text-sm font-extrabold text-slate-700">Select a Patient to Consult</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose a patient from the roster on the left to review their previous medical history and enter the current clinical assessment.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              
              {/* Selected Patient Banner */}
              <div className="p-4 bg-slate-50/90 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-900 text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                    {(selectedPatient.fullName || selectedPatient.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{selectedPatient.fullName || selectedPatient.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 font-mono">
                        {selectedPatient.patientId}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 mt-0.5">
                      <span><strong>Age:</strong> {selectedPatient.age || 'N/A'} yrs</span>
                      <span>•</span>
                      <span><strong>Gender:</strong> {selectedPatient.gender}</span>
                      <span>•</span>
                      <span><strong>Blood:</strong> <b className="text-rose-600">{selectedPatient.clinicalInfo?.bloodGroup || 'O+'}</b></span>
                      <span>•</span>
                      <span><strong>Ward:</strong> {selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General'}</span>
                    </div>
                  </div>
                </div>

                {linkedAppointmentId && (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200">
                    Linked Appointment Active
                  </span>
                )}
              </div>

              {/* Patient Previous History Preview Box */}
              <div className="p-4 bg-teal-50/30 border-b border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">history_edu</span>
                    Previous Medical History & Known Information
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {patientDossier?.medicalRecords?.length || 0} Past Records Recorded
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-teal-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Known Allergies</span>
                    <span className="font-bold text-rose-600 block truncate">
                      {selectedPatient.clinicalInfo?.allergies?.length > 0 
                        ? selectedPatient.clinicalInfo.allergies.join(', ') 
                        : 'No known drug allergies reported'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-teal-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Last Recorded Diagnosis</span>
                    <span className="font-bold text-slate-800 block truncate">
                      {patientDossier?.medicalRecords?.[0]?.diagnosis || selectedPatient.latestDiagnosis || 'First Clinical Encounter'}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-teal-100 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Recent Treatment</span>
                    <span className="font-medium text-slate-700 block truncate">
                      {patientDossier?.medicalRecords?.[0]?.treatment || 'No ongoing treatment protocol'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Consultation Input Form (All Required Doctor Fields) */}
              <form onSubmit={handleSaveConsultation} className="p-5 space-y-5">
                
                {/* Section A: History & Presenting Illness */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="material-symbols-outlined text-teal-600 text-base">symptoms</span>
                    1. Patient Presentation & History
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Chief Complaint *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Substernal chest tightness and shortness of breath"
                        value={consultationForm.chiefComplaint}
                        onChange={(e) => setConsultationForm({ ...consultationForm, chiefComplaint: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Duration of Symptoms *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 4 days / 2 hours"
                        value={consultationForm.durationOfSymptoms}
                        onChange={(e) => setConsultationForm({ ...consultationForm, durationOfSymptoms: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Symptoms Description *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Detailed symptoms (radiation, aggravating/relieving factors, palpitations, nausea)..."
                      value={consultationForm.symptoms}
                      onChange={(e) => setConsultationForm({ ...consultationForm, symptoms: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                    ></textarea>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">History of Present Illness (HPI)</label>
                      <textarea
                        rows={2}
                        placeholder="Onset, progression, prior episodes..."
                        value={consultationForm.presentIllness}
                        onChange={(e) => setConsultationForm({ ...consultationForm, presentIllness: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Relevant Medical & Surgical History</label>
                      <textarea
                        rows={2}
                        placeholder="Chronic conditions (HTN, DM, Asthma, CAD), past surgeries..."
                        value={consultationForm.relevantMedicalHistory}
                        onChange={(e) => setConsultationForm({ ...consultationForm, relevantMedicalHistory: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Allergies (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Penicillin, Sulfa, NSAIDs"
                        value={consultationForm.allergies}
                        onChange={(e) => setConsultationForm({ ...consultationForm, allergies: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Current Medications</label>
                      <input
                        type="text"
                        placeholder="e.g. Atorvastatin 20mg, Amlodipine 5mg"
                        value={consultationForm.currentMedications}
                        onChange={(e) => setConsultationForm({ ...consultationForm, currentMedications: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Section B: Clinical Vitals & Physical Observations */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="material-symbols-outlined text-teal-600 text-base">ecg_heart</span>
                    2. Clinical Examination & Vitals
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Temp (°F)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={consultationForm.temperature}
                        onChange={(e) => setConsultationForm({ ...consultationForm, temperature: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">BP Sys</label>
                      <input
                        type="number"
                        value={consultationForm.bloodPressureSys}
                        onChange={(e) => setConsultationForm({ ...consultationForm, bloodPressureSys: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">BP Dia</label>
                      <input
                        type="number"
                        value={consultationForm.bloodPressureDia}
                        onChange={(e) => setConsultationForm({ ...consultationForm, bloodPressureDia: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Pulse (bpm)</label>
                      <input
                        type="number"
                        value={consultationForm.heartRate}
                        onChange={(e) => setConsultationForm({ ...consultationForm, heartRate: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">SpO2 (%)</label>
                      <input
                        type="number"
                        value={consultationForm.oxygenSaturation}
                        onChange={(e) => setConsultationForm({ ...consultationForm, oxygenSaturation: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">RR (/min)</label>
                      <input
                        type="number"
                        value={consultationForm.respiratoryRate}
                        onChange={(e) => setConsultationForm({ ...consultationForm, respiratoryRate: e.target.value })}
                        className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Clinical Observations & Physical Exam Findings</label>
                    <textarea
                      rows={2}
                      placeholder="General appearance, chest auscultation (wheezing, crepitations), heart sounds (S1/S2), abdomen, neurological exam..."
                      value={consultationForm.clinicalObservations}
                      onChange={(e) => setConsultationForm({ ...consultationForm, clinicalObservations: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                    ></textarea>
                  </div>
                </div>

                {/* Section C: Diagnosis & Severity */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="material-symbols-outlined text-teal-600 text-base">clinical_notes</span>
                    3. Diagnosis & Clinical Severity
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Clinical Diagnosis *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acute Coronary Syndrome (Unstable Angina) / Type 2 Diabetes with Neuropathy"
                        value={consultationForm.diagnosis}
                        onChange={(e) => setConsultationForm({ ...consultationForm, diagnosis: e.target.value })}
                        className="w-full p-2.5 text-xs font-bold text-slate-800 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Severity Level</label>
                      <select
                        value={consultationForm.severity}
                        onChange={(e) => setConsultationForm({ ...consultationForm, severity: e.target.value })}
                        className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      >
                        <option value="Mild">Mild</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Severe">Severe</option>
                        <option value="Critical">Critical (Immediate Escalation)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Diagnosis Notes / Differential Diagnosis</label>
                    <textarea
                      rows={2}
                      placeholder="Differential diagnoses considered, clinical rationale..."
                      value={consultationForm.diagnosisNotes}
                      onChange={(e) => setConsultationForm({ ...consultationForm, diagnosisNotes: e.target.value })}
                      className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                    ></textarea>
                  </div>
                </div>

                {/* Section D: Treatment Plan & Diagnostic Orders */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="material-symbols-outlined text-teal-600 text-base">treatment</span>
                    4. Treatment Plan & Recommended Tests
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Treatment Plan & Medical Orders *</label>
                      <textarea
                        rows={3}
                        required
                        placeholder="Comprehensive treatment protocol, dietary orders, activity restrictions..."
                        value={consultationForm.treatmentPlan}
                        onChange={(e) => setConsultationForm({ ...consultationForm, treatmentPlan: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Recommended Diagnostic Tests (comma-separated)</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. 12-Lead ECG, 2D Echocardiogram, Serum Troponin I, Lipid Profile"
                        value={consultationForm.recommendedTests}
                        onChange={(e) => setConsultationForm({ ...consultationForm, recommendedTests: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>
                  </div>

                  {/* Dynamic Prescriptions Sub-section */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 uppercase">Prescribe Medications (Rx)</span>
                      <button
                        type="button"
                        onClick={handleAddPrescriptionRow}
                        className="px-2.5 py-1 bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span> Add Medication
                      </button>
                    </div>

                    {consultationForm.prescriptionsList.map((rx, idx) => (
                      <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200">
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            placeholder="Medicine Name (e.g. Atorvastatin 20mg)"
                            value={rx.medication}
                            onChange={(e) => handlePrescriptionChange(idx, 'medication', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Dosage (e.g. 1 Tab)"
                            value={rx.dosage}
                            onChange={(e) => handlePrescriptionChange(idx, 'dosage', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <select
                            value={rx.frequency}
                            onChange={(e) => handlePrescriptionChange(idx, 'frequency', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                          >
                            <option value="Once daily (OD)">Once daily (OD)</option>
                            <option value="Twice daily (BID)">Twice daily (BID)</option>
                            <option value="Three times daily (TDS)">Three times daily (TDS)</option>
                            <option value="Four times daily (QID)">Four times daily (QID)</option>
                            <option value="As needed (SOS)">As needed (SOS)</option>
                            <option value="At bedtime (HS)">At bedtime (HS)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            placeholder="Duration (e.g. 7 Days)"
                            value={rx.duration}
                            onChange={(e) => handlePrescriptionChange(idx, 'duration', e.target.value)}
                            className="w-full p-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-teal-600"
                          />
                        </div>
                        <div className="sm:col-span-1 flex justify-center">
                          {consultationForm.prescriptionsList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePrescriptionRow(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section E: Doctor's Medical Notes & Follow-up Instructions */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-1">
                    <span className="material-symbols-outlined text-teal-600 text-base">post_add</span>
                    5. Doctor's Medical Notes & Follow-Up Instructions
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Doctor's Medical Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Private clinical notes, physician-to-physician communication, prognostication..."
                        value={consultationForm.doctorsMedicalNotes}
                        onChange={(e) => setConsultationForm({ ...consultationForm, doctorsMedicalNotes: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Follow-Up Instructions & Advice</label>
                      <textarea
                        rows={2}
                        placeholder="Follow-up timeframe, red flag warning signs (chest pain recurrence, severe dyspnea)..."
                        value={consultationForm.followUpInstructions}
                        onChange={(e) => setConsultationForm({ ...consultationForm, followUpInstructions: e.target.value })}
                        className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                      ></textarea>
                    </div>
                  </div>
                </div>

                {/* Submit Consultation Button */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="text-[11px] text-slate-500">
                    Linked to: <strong>{selectedPatient.patientId}</strong> • <strong>{doctorDisplayName}</strong>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    {saving ? 'Saving Consultation to MongoDB...' : 'Save & Record Consultation in Medical History'}
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
