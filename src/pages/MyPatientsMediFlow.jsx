import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

function HighlightText({ text, highlight }) {
  if (!highlight || !highlight.trim() || !text) return <span>{text}</span>;
  const escaped = highlight.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.trim().toLowerCase() ? (
          <mark key={i} className="bg-amber-200 text-slate-950 font-black px-0.5 rounded shadow-xs">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function MyPatientsMediFlow() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || searchParams.get('bed') || '';
  const initialPatientId = searchParams.get('patientId') || '';

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const pageLimit = 12;

  // Selected Patient & Full Dossier
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDossier, setPatientDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Admitted' | 'Outpatient' | 'Emergency' | 'Discharged'
  const [departmentFilter, setDepartmentFilter] = useState('All');

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'Doctor';
  const rawUserName = localStorage.getItem('userName') || (userRole === 'Nurse' ? 'Staff Nurse' : 'Dr. Physician');
  const userWard = localStorage.getItem('userDepartment') || 'General Medicine';
  const isAdmin = userRole === 'Admin';
  const isNurse = userRole === 'Nurse';
  const isDoctor = userRole === 'Doctor';
  const displayName = isDoctor && !rawUserName.startsWith('Dr.') ? `Dr. ${rawUserName}` : rawUserName;

  // Active Tab inside Patient Dossier (Doctor defaults to Condition tab)
  const [activeTab, setActiveTab] = useState(isDoctor ? 'condition' : 'profile');

  // Doctor Clinical Condition & Instructions Form
  const [doctorConditionForm, setDoctorConditionForm] = useState({
    condition: 'Stable',
    diagnosis: '',
    category: 'Vital Monitoring',
    priority: 'Routine',
    instructions: ''
  });

  // Action Forms state
  const [doctorNoteText, setDoctorNoteText] = useState('');
  const [newConsultation, setNewConsultation] = useState({ diagnosis: '', treatment: '', notes: '' });
  const [newPrescription, setNewPrescription] = useState({ medication: '', dosage: '', frequency: '', duration: '', route: 'Oral' });
  const [newVitals, setNewVitals] = useState({ temperature: '', systolic: '', diastolic: '', heartRate: '', spo2: '', respiratoryRate: '' });
  const [newNursingObs, setNewNursingObs] = useState({ taskType: 'Vital Check', description: '' });
  const [quickObservation, setQuickObservation] = useState({
    generalCondition: 'Stable',
    painLevel: 0,
    nursingAssessment: '',
    shift: 'Morning Shift (07:00 AM - 03:00 PM)'
  });

  // Bed Request Form
  const [bedRequest, setBedRequest] = useState({
    wardType: 'General Ward',
    bedType: 'Standard Bed',
    priority: 'Normal',
    admissionReason: '',
    clinicalReason: '',
    doctorNotes: '',
    expectedDuration: '3-5 days'
  });

  // Resource Request Form
  const [resRequest, setResRequest] = useState({
    resourceType: 'Mechanical Ventilator',
    quantity: 1,
    priority: 'High',
    clinicalReason: '',
    requiredFrom: new Date().toISOString().slice(0, 16),
    additionalInstructions: ''
  });

  // Transfer Recommendation Form
  const [transferForm, setTransferForm] = useState({
    targetWard: 'ICU',
    bedType: 'ICU Bed',
    priority: 'Routine',
    clinicalReason: '',
    patientCondition: 'Stable',
    doctorNotes: ''
  });

  // Discharge Recommendation Form
  const [dischargeForm, setDischargeForm] = useState({
    dischargeDiagnosis: '',
    conditionAtDischarge: 'Stable / Recovered',
    treatmentSummary: '',
    finalPrescription: '',
    followUpInstructions: '',
    followUpDate: '',
    dietaryInstructions: 'Normal balanced diet',
    warningSignsToWatch: 'Fever > 101F, severe chest pain, shortness of breath',
    doctorFinalNotes: ''
  });

  const roleTitle = isAdmin ? 'Patient Registry' : isNurse ? 'Patients' : 'My Patients';
  const roleSubtitle = isAdmin
    ? 'Central Hospital Patient Directory • Live MongoDB Registry across All Departments & Wards'
    : isNurse
      ? `Nurse Care Roster • Ward: ${userWard} • Live MongoDB Patient Records assigned to ${displayName}`
      : `Doctor Patient Roster • Live MongoDB Patient Records Assigned to ${displayName}`;

  // Fetch Patients assigned strictly to the authenticated Nurse or Doctor, or all for Admin
  const fetchAssignedPatients = async (page = 1, overrideSearch = null, targetPatientId = null) => {
    try {
      setLoading(true);
      setError('');
      const searchVal = overrideSearch !== null ? overrideSearch : searchQuery;
      const params = {
        page,
        limit: pageLimit
      };
      if (searchVal && searchVal.trim()) params.search = searchVal.trim();
      if (statusFilter !== 'All') params.status = statusFilter;
      if (departmentFilter !== 'All') params.department = departmentFilter;

      const res = await axios.get('/api/patients/assigned', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });

      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
        setTotalPatients(list.length);
        setTotalPages(Math.ceil(list.length / pageLimit) || 1);
        setCurrentPage(page);
        setHasNextPage(false);
        setHasPreviousPage(false);
      } else if (res.data && res.data.patients) {
        list = res.data.patients;
        setTotalPatients(res.data.totalPatients || list.length);
        setTotalPages(res.data.totalPages || 1);
        setCurrentPage(res.data.currentPage || page);
        setHasNextPage(res.data.hasNextPage || false);
        setHasPreviousPage(res.data.hasPreviousPage || false);
      }

      setPatients(list);

      const targetId = targetPatientId || initialPatientId;
      if (targetId && list.length > 0) {
        const found = list.find(p => p._id === targetId || p.patientId === targetId || String(p._id).toLowerCase() === targetId.toLowerCase() || String(p.patientId).toLowerCase() === targetId.toLowerCase());
        if (found) {
          openPatientProfile(found);
          return;
        }
      }

      // Auto-select first matching patient when search is active or list loads
      if (list.length > 0) {
        if (!selectedPatient || (searchVal && searchVal.trim())) {
          openPatientProfile(list[0]);
        } else {
          const refreshed = list.find(p => p._id === selectedPatient._id || p.patientId === selectedPatient.patientId);
          if (refreshed) {
            setSelectedPatient(refreshed);
          } else {
            openPatientProfile(list[0]);
          }
        }
      } else {
        setSelectedPatient(null);
        setPatientDossier(null);
      }
    } catch (err) {
      console.error('Error loading assigned patients:', err);
      setError(err.response?.data?.message || 'Failed to retrieve assigned patients from MongoDB database.');
    } finally {
      setLoading(false);
    }
  };


  // Open & Fetch Full Patient Dossier
  const openPatientProfile = async (patient) => {
    try {
      setSelectedPatient(patient);
      setDossierLoading(true);
      const targetId = patient._id || patient.patientId;
      const res = await axios.get(`/api/patients/${targetId}/full-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientDossier(res.data);
      if (res.data?.patient) {
        setSelectedPatient(res.data.patient);
      }
      // Pre-fill doctor condition & discharge / transfer forms with patient diagnosis
      setDoctorConditionForm(prev => ({
        ...prev,
        diagnosis: patient.latestDiagnosis || patient.clinicalInfo?.chiefComplaint || '',
        instructions: ''
      }));
      setTransferForm(prev => ({
        ...prev,
        clinicalReason: patient.latestDiagnosis || patient.clinicalInfo?.chiefComplaint || '',
        patientCondition: 'Stable'
      }));
      setDischargeForm(prev => ({
        ...prev,
        dischargeDiagnosis: patient.latestDiagnosis || patient.clinicalInfo?.chiefComplaint || 'Clinical evaluation completed',
        treatmentSummary: `Patient evaluated and treated under clinical care.`
      }));
    } catch (err) {
      console.error('Error loading patient full dossier:', err);
      if (err.response?.status === 403) {
        Swal.fire('Access Denied', err.response?.data?.message || 'Patient belongs to another care roster / ward.', 'warning');
      }
      setPatientDossier({
        patient: patient,
        medicalRecords: [],
        appointments: [],
        prescriptions: [],
        vitalLogs: [],
        nursingTasks: [],
        transfers: [],
        resourceRequests: [],
        transferDischarges: []
      });
    } finally {
      setDossierLoading(false);
    }
  };

  // Sync with searchParams when URL changes
  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('bed') || '';
    const pid = searchParams.get('patientId') || '';
    if (s !== searchQuery) {
      setSearchQuery(s);
    }
    fetchAssignedPatients(1, s, pid);
  }, [searchParams]);

  // Debounced live search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAssignedPatients(1, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, departmentFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAssignedPatients(1, searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchParams({});
    fetchAssignedPatients(1, '');
  };

  // 1. Add Doctor Consultation / Clinical Note
  const handleSaveConsultation = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await axios.post('/api/medical-records', {
        patientId: selectedPatient._id,
        diagnosis: newConsultation.diagnosis,
        treatment: newConsultation.treatment,
        notes: newConsultation.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Consultation Recorded',
        text: 'Clinical evaluation & diagnosis saved to patient medical history in MongoDB.',
        timer: 1800,
        showConfirmButton: false
      });

      setNewConsultation({ diagnosis: '', treatment: '', notes: '' });
      openPatientProfile(selectedPatient);
      fetchAssignedPatients(currentPage);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save consultation.', 'error');
    }
  };

  // 2. Add Prescription
  const handleSavePrescription = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await axios.post('/api/medical-records', {
        patientId: selectedPatient._id,
        prescriptions: [{
          medication: newPrescription.medication,
          dosage: newPrescription.dosage,
          frequency: newPrescription.frequency,
          duration: newPrescription.duration
        }],
        treatment: `Rx Prescribed: ${newPrescription.medication} (${newPrescription.dosage}) - ${newPrescription.frequency}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Prescription Added',
        text: `${newPrescription.medication} added to patient active prescription schedule in MongoDB.`,
        timer: 1800,
        showConfirmButton: false
      });

      setNewPrescription({ medication: '', dosage: '', frequency: '', duration: '', route: 'Oral' });
      openPatientProfile(selectedPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to record prescription.', 'error');
    }
  };

  // 3. Record Vitals
  const handleSaveVitals = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      const temp = Number(newVitals.temperature) || 98.6;
      const sys = Number(newVitals.systolic) || 120;
      const dia = Number(newVitals.diastolic) || 80;
      const hr = Number(newVitals.heartRate) || 75;
      const spo2 = Number(newVitals.spo2) || 98;
      const rr = Number(newVitals.respiratoryRate) || 16;

      await axios.post('/api/vitals', {
        patientId: selectedPatient._id,
        patientName: selectedPatient.fullName || selectedPatient.name,
        patientCustomId: selectedPatient.patientId,
        wardType: selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General',
        bedNumber: selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'Assigned Bed',
        temperature: temp,
        bloodPressureSys: sys,
        bloodPressureDia: dia,
        bloodPressure: `${sys}/${dia}`,
        pulseRate: hr,
        oxygenSaturation: spo2,
        respiratoryRate: rr,
        notes: `Recorded by ${displayName} (${userRole})`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Vitals Charted',
        text: 'Patient vitals successfully recorded to MongoDB.',
        timer: 1800,
        showConfirmButton: false
      });

      setNewVitals({ temperature: '', systolic: '', diastolic: '', heartRate: '', spo2: '', respiratoryRate: '' });
      openPatientProfile(selectedPatient);
      fetchAssignedPatients(currentPage);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to log vitals.', 'error');
    }
  };

  // 4. Save Doctor Condition & Directives (Dispatches real-time notification to Nurse)
  const handleSaveDoctorCondition = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !doctorConditionForm.instructions.trim()) return;
    try {
      const instructionText = `[Condition: ${doctorConditionForm.condition}] ${doctorConditionForm.diagnosis ? `(Dx: ${doctorConditionForm.diagnosis}) ` : ''}${doctorConditionForm.instructions.trim()}`;

      // 1. Post to /api/doctor-instructions so it creates real-time notification for Nurse
      await axios.post('/api/doctor-instructions', {
        patientId: selectedPatient._id,
        patientCustomId: selectedPatient.patientId,
        patientName: selectedPatient.fullName || selectedPatient.name,
        ward: selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General Ward',
        bedNumber: selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'Assigned Bed',
        instructionCategory: doctorConditionForm.category,
        instruction: instructionText,
        priority: doctorConditionForm.priority
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Also record in medical records
      await axios.post('/api/medical-records', {
        patientId: selectedPatient._id,
        diagnosis: doctorConditionForm.diagnosis || selectedPatient.latestDiagnosis || 'Clinical Assessment',
        treatment: `Condition: ${doctorConditionForm.condition} • Priority: ${doctorConditionForm.priority}`,
        notes: doctorConditionForm.instructions.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => { });

      Swal.fire({
        icon: 'success',
        title: 'Patient Condition & Orders Dispatched',
        text: 'Patient clinical condition and instructions saved & forwarded to Nurse module.',
        timer: 2000,
        showConfirmButton: false
      });

      setDoctorConditionForm(prev => ({
        ...prev,
        instructions: ''
      }));
      openPatientProfile(selectedPatient);
      fetchAssignedPatients(currentPage);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to save condition notes', 'error');
    }
  };

  // 4b. Legacy Doctor Note Fallback
  const handleSaveDoctorNote = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !doctorNoteText.trim()) return;
    try {
      await axios.post('/api/doctor-instructions', {
        patientId: selectedPatient._id,
        patientCustomId: selectedPatient.patientId,
        patientName: selectedPatient.fullName || selectedPatient.name,
        ward: selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General Ward',
        bedNumber: selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'Assigned Bed',
        instructionCategory: 'Clinical Directive',
        instruction: doctorNoteText.trim(),
        priority: 'Routine'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await axios.post('/api/medical-records', {
        patientId: selectedPatient._id,
        treatment: 'Clinical Progress Note',
        notes: doctorNoteText.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => { });

      Swal.fire({
        icon: 'success',
        title: 'Progress Note Saved',
        text: 'Progress note dispatched to Nurse module & saved to MongoDB.',
        timer: 1600,
        showConfirmButton: false
      });

      setDoctorNoteText('');
      openPatientProfile(selectedPatient);
      fetchAssignedPatients(currentPage);
    } catch (err) {
      Swal.fire('Error', 'Failed to save note', 'error');
    }
  };

  // 5. Add Nursing Observation / Task
  const handleAddNursingObservation = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !newNursingObs.description.trim()) return;
    try {
      await axios.post('/api/nursing-tasks', {
        patient: selectedPatient._id,
        taskType: newNursingObs.taskType,
        description: newNursingObs.description.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Nursing Task Added',
        text: 'Nursing task/observation saved to MongoDB.',
        timer: 1600,
        showConfirmButton: false
      });

      setNewNursingObs({ taskType: 'Vital Check', description: '' });
      openPatientProfile(selectedPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to add nursing task', 'error');
    }
  };

  // 5b. Record Clinical Nursing Observation
  const handleRecordQuickObservation = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    if (!quickObservation.nursingAssessment.trim()) {
      Swal.fire('Assessment Required', 'Please enter your clinical nursing assessment for ' + (selectedPatient.fullName || selectedPatient.name), 'warning');
      return;
    }
    try {
      await axios.post('/api/nursing-observations', {
        patientId: selectedPatient._id,
        patientCustomId: selectedPatient.patientId,
        patientName: selectedPatient.fullName || selectedPatient.name,
        ward: selectedPatient.admissionSetup?.wardType || selectedPatient.ward || userWard || 'General Ward',
        bedNumber: selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'Assigned Bed',
        shift: quickObservation.shift,
        generalCondition: quickObservation.generalCondition,
        patientComplaints: 'Monitored at bedside.',
        painComfort: {
          level: Number(quickObservation.painLevel) || 0,
          comfortStatus: Number(quickObservation.painLevel) > 4 ? 'Distressed' : 'Comfortable / Resting',
          painLocation: 'None'
        },
        nursingAssessment: quickObservation.nursingAssessment.trim(),
        observationDate: new Date().toISOString().split('T')[0],
        observationTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Observation Logged',
        text: `Clinical observation saved for ${selectedPatient.fullName || selectedPatient.name} in MongoDB.`,
        timer: 1800,
        showConfirmButton: false
      });

      setQuickObservation({
        generalCondition: 'Stable',
        painLevel: 0,
        nursingAssessment: '',
        shift: 'Morning Shift (07:00 AM - 03:00 PM)'
      });
      openPatientProfile(selectedPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to log observation', 'error');
    }
  };

  // 6. Complete Nursing Task
  const handleCompleteNursingTask = async (taskId) => {
    try {
      await axios.put(`/api/nursing-tasks/${taskId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Task Completed',
        text: 'Nursing task marked as Completed.',
        timer: 1400,
        showConfirmButton: false
      });
      openPatientProfile(selectedPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to complete task', 'error');
    }
  };

  // 7. Submit Inpatient Bed Request
  const handleSubmitBedRequest = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await axios.post('/api/admission-requests', {
        patientId: selectedPatient._id,
        patientName: selectedPatient.fullName || selectedPatient.name,
        patientCustomId: selectedPatient.patientId,
        admissionReason: bedRequest.admissionReason || 'Inpatient care and clinical management required',
        clinicalReason: bedRequest.clinicalReason || selectedPatient.latestDiagnosis || '',
        wardType: bedRequest.wardType,
        bedType: bedRequest.bedType,
        priority: bedRequest.priority,
        doctorNotes: bedRequest.doctorNotes,
        expectedDuration: bedRequest.expectedDuration
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Bed Request Submitted',
        text: 'Admission bed requisition forwarded to Bed Management Administration.',
        timer: 2000,
        showConfirmButton: false
      });

      setBedRequest({
        wardType: 'General Ward',
        bedType: 'Standard Bed',
        priority: 'Normal',
        admissionReason: '',
        clinicalReason: '',
        doctorNotes: '',
        expectedDuration: '3-5 days'
      });
      openPatientProfile(selectedPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit bed request', 'error');
    }
  };

  // 8. Submit Medical Resource Request
  const handleSubmitResourceRequest = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await axios.post('/api/resource-requests', {
        patientId: selectedPatient._id,
        patientName: selectedPatient.fullName || selectedPatient.name,
        patientCustomId: selectedPatient.patientId,
        resourceType: resRequest.resourceType,
        quantity: Number(resRequest.quantity) || 1,
        priority: resRequest.priority,
        clinicalReason: resRequest.clinicalReason || selectedPatient.latestDiagnosis || '',
        requiredFrom: resRequest.requiredFrom,
        additionalInstructions: resRequest.additionalInstructions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Resource Requested',
        text: 'Medical equipment requisition submitted for BioMed & Admin approval.',
        timer: 2000,
        showConfirmButton: false
      });

      setResRequest({
        resourceType: 'Mechanical Ventilator',
        quantity: 1,
        priority: 'High',
        clinicalReason: '',
        requiredFrom: new Date().toISOString().slice(0, 16),
        additionalInstructions: ''
      });
      openPatientProfile(selectedPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to request resource', 'error');
    }
  };

  // 9. Submit Transfer Recommendation
  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await axios.post('/api/transfer-discharge/transfers', {
        patientId: selectedPatient._id,
        patientName: selectedPatient.fullName || selectedPatient.name,
        patientCustomId: selectedPatient.patientId,
        currentWard: selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General',
        currentBedNumber: selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'No Bed Assigned',
        targetWard: transferForm.targetWard,
        bedType: transferForm.bedType,
        priority: transferForm.priority,
        clinicalReason: transferForm.clinicalReason,
        patientCondition: transferForm.patientCondition,
        doctorNotes: transferForm.doctorNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Also create a linked Doctor Instruction so it appears in the Nurse's Doctor Instructions feed & bedside monitoring
      try {
        await axios.post('/api/doctor-instructions', {
          patientId: selectedPatient._id,
          patientName: selectedPatient.fullName || selectedPatient.name,
          patientCustomId: selectedPatient.patientId,
          ward: selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General',
          bedNumber: selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'No Bed Assigned',
          instructionCategory: 'Bed Transfer / Escalation',
          instruction: `[BED TRANSFER ORDER] Relocate patient to ${transferForm.targetWard} (${transferForm.bedType}). Priority: ${transferForm.priority}. Clinical Condition: ${transferForm.patientCondition}. Reason: ${transferForm.clinicalReason || 'Clinical Escalation'}. Instructions for Nurse: ${transferForm.doctorNotes || 'Execute bed transfer and handover.'}`,
          priority: transferForm.priority === 'Emergency' || transferForm.priority === 'Critical' ? 'STAT / Critical' : (transferForm.priority === 'Urgent' || transferForm.priority === 'High' ? 'High' : 'Routine')
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch (mirrorErr) {
        console.warn('Doctor instruction mirror notice:', mirrorErr);
      }

      Swal.fire({
        icon: 'success',
        title: 'Transfer Request & Nurse Directive Issued',
        text: `Doctor bed transfer order to ${transferForm.targetWard} (${transferForm.bedType}) dispatched to Nurse Station and Bed Management.`,
        timer: 2500,
        showConfirmButton: false
      });

      setTransferForm({
        targetWard: 'Special Ward',
        bedType: 'Standard Bed',
        priority: 'Routine',
        clinicalReason: '',
        patientCondition: 'Stable',
        doctorNotes: ''
      });
      openPatientProfile(selectedPatient);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit transfer recommendation', 'error');
    }
  };

  // 10. Submit Discharge Recommendation
  const handleSubmitDischarge = async (e) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      const docName = rawUserName || 'Dr. Attending Physician';
      const docReg = localStorage.getItem('userReg') || 'MCI-884920';
      const docSig = `Dr. ${docName.replace(/^Dr\.\s*/i, '')} (MD, Reg: ${docReg})`;

      await axios.post('/api/transfer-discharge/discharges', {
        patientId: selectedPatient._id,
        patientName: selectedPatient.fullName || selectedPatient.name,
        patientCustomId: selectedPatient.patientId,
        ward: selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General',
        bedNumber: selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'Standard',
        dischargeDiagnosis: dischargeForm.dischargeDiagnosis || selectedPatient.clinicalInfo?.chiefComplaint || 'Clinical Condition Resolved',
        conditionAtDischarge: dischargeForm.conditionAtDischarge,
        treatmentSummary: dischargeForm.treatmentSummary,
        finalPrescription: dischargeForm.finalPrescription,
        followUpInstructions: dischargeForm.followUpInstructions,
        followUpDate: dischargeForm.followUpDate,
        dietaryInstructions: dischargeForm.dietaryInstructions,
        warningSignsToWatch: dischargeForm.warningSignsToWatch,
        doctorFinalNotes: dischargeForm.doctorFinalNotes,
        instructionsForReceptionist: dischargeForm.instructionsForReceptionist || 'Verify room stay, settle billing invoice, issue official gate pass and medicines.',
        doctorSignature: docSig,
        doctorRegistrationNumber: docReg,
        doctorSignedAt: new Date()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Discharge Order Authorized & Signed',
        html: `Discharge authorization with <b>Doctor's Digital Signature</b> (${docSig}) has been forwarded to the <b>Receptionist Discharge Assistance</b> module for final billing and bed clearance.<br/><br/><span class="text-xs text-slate-500">Nurse station has been notified for exit vitals and bed preparation.</span>`,
        confirmButtonColor: '#059669'
      });

      openPatientProfile(selectedPatient);
      fetchAssignedPatients(currentPage);
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to submit discharge recommendation', 'error');
    }
  };

  // Helper status badge styles
  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'admitted') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (s === 'emergency') return 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
    if (s === 'discharged') return 'bg-slate-100 text-slate-600 border-slate-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  // Filter department list for dropdown
  const departments = ['All', ...new Set(patients.map(p => p.department || p.admissionSetup?.wardType || p.ward).filter(Boolean))];

  return (
    <div className="w-full flex flex-col space-y-4 pb-12">

      {/* 1. Header & Live Roster Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-lg">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800">
                  {roleTitle}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                  {totalPatients} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {roleSubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <form onSubmit={handleSearchSubmit} className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Name, Patient ID, Bed..."
              className="pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 w-48 md:w-64 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </form>

          {/* Status Filter Tabs (Registered, Admitted, Emergency, Transferred, Discharged) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {(isAdmin ? ['All', 'Registered', 'Admitted', 'Emergency', 'Transferred', 'Discharged'] : ['All', 'Admitted', 'Outpatient', 'Emergency', 'Discharged']).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-lg transition-all ${statusFilter === st
                  ? 'bg-white text-teal-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {st}
              </button>
            ))}
          </div>


          {departments.length > 2 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-teal-600"
            >
              {departments.map((d, i) => (
                <option key={i} value={d}>{d === 'All' ? 'All Departments' : d}</option>
              ))}
            </select>
          )}

          <button
            onClick={() => fetchAssignedPatients(currentPage)}
            title="Refresh Patient List"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
          <button onClick={() => fetchAssignedPatients(currentPage)} className="ml-auto underline font-bold">Retry</button>
        </div>
      )}

      {/* 2. Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

        {/* Left Column: Patient List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col max-h-[850px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-700 text-sm">clinical_notes</span>
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Assigned Patients ({totalPatients})
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Page {currentPage} of {totalPages}</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl animate-spin text-teal-600 mb-2">sync</span>
                <p className="text-xs font-semibold">Loading assigned patients from MongoDB...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
                <p className="text-xs font-bold text-slate-600">
                  {searchQuery ? 'No matching patients found.' : 'No patients are currently assigned to your ward/shift.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {searchQuery ? 'Try clearing your search query.' : 'Admitted inpatients and active assignments will appear here automatically.'}
                </p>
              </div>
            ) : (
              patients.map((patient) => {
                const isSelected = selectedPatient?._id === patient._id || selectedPatient?.patientId === patient.patientId;
                const pid = patient.patientId || `P-${patient._id?.toString().slice(-4)}`;
                const pname = patient.fullName || patient.name || 'Unnamed Patient';
                const status = patient.status || patient.admissionStatus || 'Active';
                const ward = patient.admissionSetup?.wardType || patient.ward || patient.department || 'General';
                const bedNum = patient.bedId?.bedNumber || patient.bedNumber || (status === 'Admitted' ? 'Bed Allocated' : 'No Bed Assigned');
                const doctorName = patient.assignedDoctor || patient.admissionSetup?.assignedDoctor || 'Dr. Attending';
                const diagnosis = patient.latestDiagnosis || patient.clinicalInfo?.chiefComplaint || 'Clinical Evaluation';
                const admissionDate = patient.admissionDate || patient.registrationDate || (patient.createdAt ? new Date(patient.createdAt).toISOString().split('T')[0] : 'N/A');
                const bloodGroup = patient.clinicalInfo?.bloodGroup || 'N/A';
                const vitals = patient.latestVital;
                const hasAppt = Boolean(patient.bookedAppointment || patient.hasBookedAppointment);
                const appt = patient.bookedAppointment;
                const isSearchMatch = searchQuery && searchQuery.trim() && (
                  pname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  pid.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  String(bedNum).toLowerCase().includes(searchQuery.toLowerCase()) ||
                  String(diagnosis).toLowerCase().includes(searchQuery.toLowerCase())
                );

                return (
                  <div
                    key={patient._id || patient.patientId}
                    onClick={() => openPatientProfile(patient)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border relative ${isSelected
                      ? 'bg-teal-50/90 border-teal-600 ring-2 ring-teal-600 shadow-md'
                      : isSearchMatch
                        ? 'bg-amber-50/50 hover:bg-amber-50/80 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                        : hasAppt
                          ? 'bg-amber-50/40 hover:bg-amber-50/80 border-amber-400 ring-1 ring-amber-300 shadow-xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                  >
                    {/* Search Match Highlight Tag */}
                    {isSearchMatch && (
                      <div className="mb-2 -mt-1 -mx-1 px-2.5 py-0.5 rounded-md bg-amber-500 text-white flex items-center justify-between text-[10px] font-bold shadow-xs">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">search_check</span>
                          MATCHED SEARCH
                        </span>
                        <span className="font-mono text-[9px] bg-amber-700/60 px-1 py-0.2 rounded">"{searchQuery}"</span>
                      </div>
                    )}

                    {/* Booked Appointment Highlight Ribbon */}
                    {hasAppt && !isSearchMatch && (
                      <div className="mb-2 -mt-1 -mx-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between text-[11px] font-bold shadow-xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="material-symbols-outlined text-sm animate-bounce">event_available</span>
                          <span className="tracking-wide">APPOINTMENT BOOKED</span>
                          {appt?.appointmentDate && (
                            <span className="font-normal opacity-90 truncate">• {appt.appointmentDate} {appt.appointmentTime ? `at ${appt.appointmentTime}` : ''}</span>
                          )}
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-amber-700/60 text-[9px] uppercase tracking-wider font-extrabold shrink-0">
                          {appt?.status || 'Scheduled'}
                        </span>
                      </div>
                    )}

                    {/* Header Row: ID, Name, Status, Blood Group */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs shrink-0 ${isSelected
                          ? 'bg-teal-700 ring-2 ring-teal-300'
                          : isSearchMatch
                            ? 'bg-amber-600 ring-2 ring-amber-300'
                            : hasAppt
                              ? 'bg-amber-600 ring-2 ring-amber-200'
                              : status.toLowerCase() === 'emergency'
                                ? 'bg-rose-600'
                                : 'bg-slate-700'
                          }`}>
                          {pname.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs font-extrabold text-slate-900 truncate">
                              <HighlightText text={pname} highlight={searchQuery} />
                            </h3>
                            {hasAppt && (
                              <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-300 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-[11px]">star</span> Booked
                              </span>
                            )}
                            {bloodGroup !== 'N/A' && (
                              <span className="text-[10px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                                {bloodGroup}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                            <span className="font-bold text-teal-700">
                              <HighlightText text={pid} highlight={searchQuery} />
                            </span>
                            <span>•</span>
                            <span className="font-sans">{patient.age ? `${patient.age} yrs` : 'Age N/A'} ({patient.gender || 'M'})</span>
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border shrink-0 ${getStatusBadge(status)}`}>
                        {status}
                      </span>
                    </div>

                    {/* Details Grid: Ward, Bed, Diagnosis, Doctor, Admission Date */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Ward & Bed</span>
                        <span className="font-bold text-teal-800 truncate block">
                          <HighlightText text={ward} highlight={searchQuery} /> • <span className="text-slate-700 font-bold"><HighlightText text={bedNum} highlight={searchQuery} /></span>
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Admitted Date</span>
                        <span className="font-medium text-slate-700 truncate block">
                          {admissionDate}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Diagnosis</span>
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          <HighlightText text={diagnosis} highlight={searchQuery} />
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-50">
                        <span><strong>Doctor:</strong> <HighlightText text={doctorName} highlight={searchQuery} /></span>
                        <span><strong>Phone:</strong> <HighlightText text={patient.contactNumber || patient.phoneNumber || 'N/A'} highlight={searchQuery} /></span>
                      </div>

                      {/* Latest Vitals Strip */}
                      {vitals ? (
                        <div className="col-span-2 mt-1 p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-rose-500 text-xs">favorite</span>
                            <span className="font-bold text-slate-700">
                              BP: {vitals.bloodPressure || '120/80'} | HR: {vitals.pulseRate || 72} bpm | SpO2: {vitals.oxygenSaturation || 98}% | Temp: {vitals.temperature || 98.6}°F
                            </span>
                          </div>
                          {vitals.isCritical && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 font-black animate-pulse text-[9px]">CRITICAL</span>
                          )}
                        </div>
                      ) : (
                        <div className="col-span-2 mt-0.5 text-[10px] text-slate-400 italic">
                          No recent vital readings logged
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <button
                disabled={!hasPreviousPage && currentPage <= 1}
                onClick={() => fetchAssignedPatients(currentPage - 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="font-semibold text-slate-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={!hasNextPage && currentPage >= totalPages}
                onClick={() => fetchAssignedPatients(currentPage + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Complete Patient Dossier Profile (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[600px] max-h-[850px] overflow-hidden">
          {!selectedPatient ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">folder_shared</span>
              <h3 className="text-sm font-extrabold text-slate-700">Select a Patient</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose any assigned patient from the roster on the left to inspect their complete clinical profile, admission setup, vitals, prescriptions, doctor instructions, nursing observations, medications, transfer, and discharge details.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">

              {/* Patient Top Dossier Header */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-900 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                    {(selectedPatient.fullName || selectedPatient.name || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">
                        <HighlightText text={selectedPatient.fullName || selectedPatient.name} highlight={searchQuery} />
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 font-mono">
                        <HighlightText text={selectedPatient.patientId || selectedPatient._id} highlight={searchQuery} />
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getStatusBadge(selectedPatient.status)}`}>
                        {selectedPatient.status || selectedPatient.admissionStatus || 'Active'}
                      </span>
                      {searchQuery && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Active Search Filter
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs text-slate-500 mt-1">
                      <span><strong>Age:</strong> {selectedPatient.age || 'N/A'} yrs</span>
                      <span>•</span>
                      <span><strong>Gender:</strong> {selectedPatient.gender || 'Male'}</span>
                      <span>•</span>
                      <span><strong>Blood:</strong> <b className="text-rose-600">{selectedPatient.clinicalInfo?.bloodGroup || 'O+'}</b></span>
                      <span>•</span>
                      <span><strong>Ward:</strong> <HighlightText text={selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General'} highlight={searchQuery} /></span>
                      <span>•</span>
                      <span><strong>Bed:</strong> <b className="text-teal-700"><HighlightText text={selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'No Bed Assigned'} highlight={searchQuery} /></b></span>
                    </div>
                  </div>
                </div>

                {isDoctor ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab('condition')}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">edit_note</span>
                      <span>Write Condition</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('bed-change')}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">swap_horiz</span>
                      <span>Change Bed</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('nurse-vitals')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-sm">favorite</span>
                      <span>Nurse Vitals</span>
                    </button>
                  </div>
                ) : !isAdmin ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab(isNurse ? 'nursing' : 'instructions')}
                      className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">{isNurse ? 'edit_note' : 'post_add'}</span>
                      <span>{isNurse ? 'Log Observation' : 'Add Note'}</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('vitals')}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">favorite</span>
                      <span>{isNurse ? 'Chart Vitals' : 'View Vitals'}</span>
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Dossier Tabs Navigation - Streamlined 4 Tabs for Doctor, 11 for Admin/Nurse */}
              <div className="flex items-center px-3 bg-white border-b border-slate-200 overflow-x-auto text-xs font-bold gap-1 custom-scrollbar">
                {(isDoctor ? [
                  { id: 'condition', label: '1. Patient Condition & Instructions', icon: 'medical_information' },
                  { id: 'bed-change', label: '2. Change Bed & Transfer Request', icon: 'swap_horiz' },
                  { id: 'nurse-vitals', label: '3. Nurse Vitals & Care Records', icon: 'favorite' },
                  { id: 'profile', label: '4. Patient Profile', icon: 'person' },
                ] : [
                  { id: 'profile', label: '1. Profile & Admission', icon: 'person' },
                  { id: 'history', label: '2. Medical History', icon: 'history_edu' },
                  { id: 'instructions', label: '3. Consultations & Instructions', icon: 'assignment' },
                  { id: 'vitals', label: '4. Vitals', icon: 'ecg_heart' },
                  { id: 'nursing', label: '5. Nursing Observations', icon: 'edit_note' },
                  { id: 'prescriptions', label: '6. Prescriptions', icon: 'pill' },
                  { id: 'resource-request', label: '7. Resource Requisitions', icon: 'medical_services' },
                  { id: 'bed-request', label: '8. Bed Requests', icon: 'single_bed' },
                  { id: 'transfer', label: '9. Transfers', icon: 'swap_horiz' },
                  { id: 'billing', label: '10. Billing & Invoices', icon: 'payments' },
                  { id: 'discharge', label: '11. Discharge Details', icon: 'home_health' }
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                      ? 'border-teal-600 text-teal-700 font-extrabold bg-teal-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    <span className="material-symbols-outlined text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>


              {/* Dossier Content Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/40">
                {dossierLoading ? (
                  <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <span className="material-symbols-outlined text-3xl animate-spin text-teal-600 mb-2">sync</span>
                    <p className="text-xs font-semibold">Loading complete patient dossier from MongoDB...</p>
                  </div>
                ) : (
                  <>
                    {/* Doctor Bed Transfer Directives Banner for Nurse & Ward Staff */}
                    {patientDossier?.transferDischarges && patientDossier.transferDischarges.filter(td => td.requestType === 'Transfer').length > 0 && (
                      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-700 p-4 rounded-xl text-white shadow-md border border-amber-400 animate-fadeIn">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                              <span className="material-symbols-outlined text-2xl">swap_horiz</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                                  🔄 Doctor Bed Transfer Directive
                                </span>
                                <span className="text-[11px] font-bold bg-black/30 px-2 py-0.5 rounded-md uppercase">
                                  Status: {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.status || 'Doctor Approved'}
                                </span>
                                <span className="text-[11px] font-black bg-rose-950/60 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.priority || 'Routine'} Priority
                                </span>
                              </div>
                              <h3 className="text-sm font-black mt-1 text-white">
                                Doctor Order: Transfer to <span className="underline font-black text-amber-200">{patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.targetWard || patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.recommendedWard || 'Target Ward'}</span> ({patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.requiredBedType || 'Standard Bed'})
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-100 mt-1">
                                <span>👨‍⚕️ <strong>Prescribed By:</strong> {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.doctorName || 'Attending Doctor'}</span>
                                <span>❤️ <strong>Condition:</strong> {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.clinicalCondition || 'Stable'}</span>
                                <span>📋 <strong>Reason:</strong> {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.reasonForTransfer || patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.medicalReason || 'Ward Escalation'}</span>
                              </div>
                              {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.doctorNotes && (
                                <p className="text-xs text-white/95 mt-2 bg-black/20 p-2.5 rounded-lg border border-white/20 font-medium">
                                  <strong>🩺 Doctor Instructions for Nurse:</strong> "{patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.doctorNotes}"
                                </p>
                              )}

                              {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.allocatedBedNumber && (
                                <div className="mt-2 p-2 bg-emerald-950/50 border border-emerald-300/50 rounded-lg text-xs text-emerald-100 flex items-center justify-between">
                                  <span>
                                    ✅ <strong>Nurse Allocated Bed:</strong> <span className="font-extrabold text-white">{patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.allocatedWard} • {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.transferDetails?.allocatedBedNumber}</span>
                                    {patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.nursingAssistance?.transferConfirmedBy && ` (Handover by Nurse ${patientDossier.transferDischarges.find(td => td.requestType === 'Transfer')?.nursingAssistance?.transferConfirmedBy})`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          {isNurse && (
                            <button
                              onClick={() => setActiveTab('transfer')}
                              className="px-3.5 py-2 bg-white text-orange-900 hover:bg-orange-50 rounded-xl text-xs font-black shadow-sm whitespace-nowrap self-start sm:self-center transition-colors flex items-center gap-1.5 shrink-0"
                            >
                              <span className="material-symbols-outlined text-sm">swap_horiz</span>
                              <span>Execute Handover</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* DOCTOR TAB 1: Patient Condition & Clinical Directives (Doctor Primary Action) */}
                    {(activeTab === 'condition' || (isDoctor && activeTab === 'instructions')) && (
                      <div className="space-y-4">
                        {/* Current Patient Clinical Snapshot */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-teal-600 text-base">vital_signs</span>
                              Current Clinical Status & Location
                            </h4>
                            <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              MongoDB Live Sync
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Ward & Bed</span>
                              <span className="font-extrabold text-teal-800">
                                {selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General'} • {selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'No Bed Assigned'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Primary Diagnosis</span>
                              <span className="font-extrabold text-slate-800">
                                {selectedPatient.clinicalInfo?.chiefComplaint || selectedPatient.latestDiagnosis || 'General Clinical Review'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Status</span>
                              <span className="font-extrabold text-slate-800">{selectedPatient.status || selectedPatient.admissionStatus || 'Active'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Latest Nurse Vitals</span>
                              <span className="font-extrabold text-rose-600">
                                {patientDossier?.vitalLogs?.[0] ? `${patientDossier.vitalLogs[0].bloodPressure || '120/80'} | ${patientDossier.vitalLogs[0].pulseRate || 75} bpm` : 'Normal / Charted'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Form: Write Patient Condition & Clinical Instructions */}
                        <form onSubmit={handleSaveDoctorCondition} className="bg-white p-4 rounded-xl border border-teal-200 shadow-xs space-y-3.5 bg-gradient-to-br from-white via-teal-50/10 to-slate-50">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-teal-700 text-base">edit_note</span>
                              Write Patient Condition & Clinical Orders for Nurse
                            </h4>
                            <span className="text-[10px] font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                              Dispatches Directly to Nurse Module
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Patient Condition *
                              </label>
                              <select
                                value={doctorConditionForm.condition}
                                onChange={(e) => setDoctorConditionForm({ ...doctorConditionForm, condition: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                              >
                                <option value="Stable">Stable</option>
                                <option value="Improving">Improving / Ambulatory</option>
                                <option value="Guarded">Guarded / Close Monitoring</option>
                                <option value="Critical / Unstable">Critical / Unstable (STAT)</option>
                                <option value="Post-Operative Recovery">Post-Operative Recovery</option>
                                <option value="Requires ICU Transfer">Requires ICU Escalation</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Directive Category *
                              </label>
                              <select
                                value={doctorConditionForm.category}
                                onChange={(e) => setDoctorConditionForm({ ...doctorConditionForm, category: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                              >
                                <option value="Vital Monitoring">Vital Monitoring & Telemetry</option>
                                <option value="Medication & IV Fluid">Medication & IV Fluid Orders</option>
                                <option value="Wound & Post-Op Care">Wound & Post-Op Care</option>
                                <option value="Diet & Nutrition">Diet, Fluid & Nutrition</option>
                                <option value="Bed Rest / Positioning">Bed Rest & Positioning</option>
                                <option value="Clinical Directive">General Clinical Directive</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Priority Level *
                              </label>
                              <select
                                value={doctorConditionForm.priority}
                                onChange={(e) => setDoctorConditionForm({ ...doctorConditionForm, priority: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 font-bold text-slate-800"
                              >
                                <option value="Routine">Routine Care</option>
                                <option value="High">High Priority</option>
                                <option value="STAT / Critical">STAT / Critical (Urgent Nurse Action)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                              Clinical Assessment / Diagnosis
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Acute exacerbation of COPD, post-procedure observation..."
                              value={doctorConditionForm.diagnosis}
                              onChange={(e) => setDoctorConditionForm({ ...doctorConditionForm, diagnosis: e.target.value })}
                              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600 font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                              Doctor Condition Notes & Clinical Instructions for Nurse *
                            </label>
                            <textarea
                              rows={3}
                              required
                              placeholder="Describe the patient's condition, required nursing checks (e.g. SpO2 q2h, strict I/O chart), IV fluid rates, positioning, or notification triggers for on-call doctor..."
                              value={doctorConditionForm.instructions}
                              onChange={(e) => setDoctorConditionForm({ ...doctorConditionForm, instructions: e.target.value })}
                              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-teal-600"
                            ></textarea>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <p className="text-[11px] text-slate-500 italic">
                              💡 Submitting immediately notifies the assigned nurse station and appears in the Nurse Care portal.
                            </p>
                            <button
                              type="submit"
                              className="px-5 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-sm">send</span>
                              Save Condition & Send to Nurse
                            </button>
                          </div>
                        </form>

                        {/* Live List: Doctor Instructions & Condition Updates */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                Doctor Condition Updates & Directives Sent to Nurse ({patientDossier?.doctorInstructions?.length || 0})
                              </h4>
                              <p className="text-[10px] text-slate-500">Live MongoDB updates displayed in Nurse module</p>
                            </div>
                            <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              Nurse Live Feed
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100">
                            {patientDossier?.doctorInstructions && patientDossier.doctorInstructions.length > 0 ? (
                              patientDossier.doctorInstructions.map((inst) => (
                                <div key={inst._id} className="p-3.5 space-y-2 text-xs hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${inst.priority === 'STAT / Critical' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                                          inst.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {inst.priority}
                                      </span>
                                      <span className="font-bold text-teal-900">{inst.instructionCategory || 'Clinical Directive'}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(inst.issuedAt || inst.createdAt).toLocaleString()}
                                    </span>
                                  </div>

                                  <p className="text-slate-800 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    "{inst.instruction}"
                                  </p>

                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                    <span className="text-teal-700 font-bold">Issued by: {inst.doctorName}</span>
                                    <span className={`px-2 py-0.5 rounded font-bold ${inst.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                                        inst.status === 'Acknowledged' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                      Nurse Status: {inst.status}
                                    </span>
                                  </div>

                                  {inst.nursingRemarks && (
                                    <p className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                                      <strong>Nurse Action Remarks:</strong> {inst.nursingRemarks}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="p-8 text-center text-slate-400 text-xs">
                                <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">post_add</span>
                                No doctor condition notes or clinical directives recorded yet. Use the form above to post instructions for the nurse.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DOCTOR TAB 2: Change Bed & Transfer Request (Doctor Primary Action) */}
                    {(activeTab === 'bed-change' || (isDoctor && activeTab === 'transfer') || (isDoctor && activeTab === 'bed-request')) && (
                      <div className="space-y-4">
                        {/* Current Bed Allocation Card */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-indigo-600 text-base">hotel</span>
                              Current Patient Bed Allocation
                            </h4>
                            <span className="text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Live Status
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Ward</span>
                              <span className="font-extrabold text-indigo-900">
                                {selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General Ward'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Bed Number</span>
                              <span className="font-extrabold text-slate-900">
                                {selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'No Bed Assigned'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Status</span>
                              <span className="font-extrabold text-slate-800">
                                {selectedPatient.status || selectedPatient.admissionStatus || 'Active'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Attending Doctor</span>
                              <span className="font-extrabold text-teal-800">
                                {selectedPatient.assignedDoctor || displayName}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Active / Latest Nurse Allocated Bed & Handover Details Card */}
                        {(() => {
                          const latestNurseAllocation = (patientDossier?.transferDischarges || []).find(
                            td => td.requestType === 'Transfer' && (td.status === 'Transferred' || td.transferDetails?.allocatedBedNumber)
                          );
                          if (!latestNurseAllocation) return null;
                          return (
                            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-xl shadow-xs space-y-2.5 animate-fadeIn">
                              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-emerald-700 text-base">check_circle</span>
                                  Nurse Bed Allocation & Handover Status
                                </h4>
                                <span className="text-[10px] font-black bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full uppercase">
                                  {latestNurseAllocation.status === 'Transferred' ? 'Bed Allocated & Handover Complete' : latestNurseAllocation.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Allocated Bed</span>
                                  <span className="font-extrabold text-emerald-800 text-sm">
                                    {latestNurseAllocation.transferDetails?.allocatedBedNumber || selectedPatient.bedNumber || 'Bed Assigned'}
                                  </span>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Allocated Ward</span>
                                  <span className="font-extrabold text-slate-900">
                                    {latestNurseAllocation.transferDetails?.allocatedWard || selectedPatient.ward || 'General Ward'}
                                  </span>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Allocated By Nurse</span>
                                  <span className="font-bold text-teal-800">
                                    {latestNurseAllocation.nursingAssistance?.transferConfirmedBy || latestNurseAllocation.nursingAssistance?.handoverStaffName || 'Staff Nurse'}
                                  </span>
                                </div>
                                <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                                  <span className="text-[10px] text-slate-400 block font-bold uppercase">Handover Time</span>
                                  <span className="font-bold text-slate-700">
                                    {latestNurseAllocation.nursingAssistance?.transferConfirmedAt ? new Date(latestNurseAllocation.nursingAssistance.transferConfirmedAt).toLocaleString() : new Date(latestNurseAllocation.updatedAt || latestNurseAllocation.createdAt).toLocaleString()}
                                  </span>
                                </div>
                              </div>

                              {latestNurseAllocation.nursingAssistance?.transferNursingNotes && (
                                <p className="text-xs text-emerald-900 bg-white p-2.5 rounded-lg border border-emerald-200 font-medium">
                                  <strong>🩺 Nurse Action Remarks:</strong> "{latestNurseAllocation.nursingAssistance.transferNursingNotes}"
                                </p>
                              )}

                              {latestNurseAllocation.nursingAssistance?.vitalsAtTransfer && Object.keys(latestNurseAllocation.nursingAssistance.vitalsAtTransfer).length > 0 && (
                                <div className="flex items-center gap-3 text-[11px] text-emerald-900 bg-emerald-100/60 px-3 py-1.5 rounded-lg font-mono">
                                  <span><strong>Vitals at Handover:</strong></span>
                                  <span>BP: {latestNurseAllocation.nursingAssistance.vitalsAtTransfer.bloodPressure || '120/80'}</span>
                                  <span>• HR: {latestNurseAllocation.nursingAssistance.vitalsAtTransfer.heartRate || 75} bpm</span>
                                  <span>• SpO2: {latestNurseAllocation.nursingAssistance.vitalsAtTransfer.spo2 || 98}%</span>
                                  <span>• Temp: {latestNurseAllocation.nursingAssistance.vitalsAtTransfer.temperature || '98.6'}°F</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Form: Request Change of Bed / Ward Transfer */}
                        <form onSubmit={handleSubmitTransfer} className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs space-y-3.5 bg-gradient-to-br from-white via-indigo-50/10 to-slate-50">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                            <h4 className="text-xs font-black text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-indigo-700 text-base">swap_horiz</span>
                              Request Change of Bed / Inpatient Ward Transfer
                            </h4>
                            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                              Forwards Directly to Nurse & Bed Management
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Target Destination Ward *
                              </label>
                              <select
                                value={transferForm.targetWard}
                                onChange={(e) => setTransferForm({ ...transferForm, targetWard: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 font-bold text-slate-800"
                              >
                                <option value="ICU">ICU (Intensive Care Unit)</option>
                                <option value="CCU">CCU (Coronary Care Unit)</option>
                                <option value="Emergency">Emergency Critical Care</option>
                                <option value="Special Ward">Special Ward</option>
                                <option value="General Ward">General Ward</option>
                                <option value="Step-Down Unit">Step-Down Unit</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Required Bed Type *
                              </label>
                              <select
                                value={transferForm.bedType}
                                onChange={(e) => setTransferForm({ ...transferForm, bedType: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 font-semibold text-slate-800"
                              >
                                <option value="ICU Bed">ICU Bed</option>
                                <option value="Cardiac Monitor Bed">Cardiac Monitor Bed</option>
                                <option value="Ventilator Bed">Ventilator Bed</option>
                                <option value="Standard Bed">Standard Bed</option>
                                <option value="Isolation Bed">Isolation Bed</option>
                                <option value="Deluxe Room">Deluxe Room</option>
                              </select>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Transfer Priority *
                              </label>
                              <select
                                value={transferForm.priority}
                                onChange={(e) => setTransferForm({ ...transferForm, priority: e.target.value })}
                                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 font-bold text-slate-800"
                              >
                                <option value="Routine">Routine / Step-Down</option>
                                <option value="Urgent">Urgent Transfer</option>
                                <option value="Emergency">Emergency ICU Escalation (STAT)</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                              Reason for Bed Transfer & Clinical Instructions for Nurse *
                            </label>
                            <textarea
                              rows={3}
                              required
                              placeholder="Enter reason for transfer (e.g. Requires ICU telemetry monitoring, post-op step down, continuous respiratory care) and special instructions for the receiving nurse..."
                              value={transferForm.clinicalReason}
                              onChange={(e) => setTransferForm({ ...transferForm, clinicalReason: e.target.value, doctorNotes: e.target.value })}
                              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-600 font-medium"
                            ></textarea>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <p className="text-[11px] text-slate-500 italic">
                              🔄 Forwarding bed change sets status to Doctor Approved and alerts the nursing station for bed handover.
                            </p>
                            <button
                              type="submit"
                              className="px-5 py-2.5 bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-800 hover:to-indigo-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-sm">swap_horiz</span>
                              Forward Bed Change to Nurse
                            </button>
                          </div>
                        </form>

                        {/* Live Feed: Bed Change & Transfer History */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                                Bed Change & Transfer Directives ({((patientDossier?.transferDischarges || []).filter(td => td.requestType === 'Transfer').length) || (patientDossier?.transfers?.length || 0)})
                              </h4>
                              <p className="text-[10px] text-slate-500">Live MongoDB Transfer Orders & Nurse Bed Allocations</p>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              Doctor Directives
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {(!patientDossier?.transferDischarges?.some(td => td.requestType === 'Transfer') && (!patientDossier?.transfers || patientDossier.transfers.length === 0)) ? (
                              <div className="p-8 text-center text-slate-400 text-xs">
                                <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">single_bed</span>
                                No previous bed changes or transfer requests logged for this patient.
                              </div>
                            ) : (
                              (patientDossier?.transferDischarges || [])
                                .filter(td => td.requestType === 'Transfer')
                                .map((td) => {
                                  const isTransferred = td.status === 'Transferred' || td.transferDetails?.allocatedBedNumber;
                                  return (
                                    <div key={td._id} className="p-4 space-y-2 hover:bg-slate-50 transition-colors">
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-extrabold text-slate-900 text-xs">
                                              Target: <strong className="text-indigo-800">{td.transferDetails?.targetWard || td.transferDetails?.recommendedWard || 'Ward'}</strong> ({td.transferDetails?.requiredBedType || 'Standard Bed'})
                                            </span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${td.transferDetails?.priority === 'Emergency' || td.transferDetails?.priority === 'Critical' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                                                td.transferDetails?.priority === 'Urgent' || td.transferDetails?.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                              }`}>
                                              {td.transferDetails?.priority || 'Routine'} Priority
                                            </span>
                                          </div>
                                          <p className="text-slate-600 text-xs">
                                            Reason: {td.transferDetails?.reasonForTransfer || td.transferDetails?.medicalReason || td.reason || 'Ward Transfer'} • Condition: <strong>{td.transferDetails?.clinicalCondition || 'Stable'}</strong>
                                          </p>
                                          {td.transferDetails?.doctorNotes && (
                                            <p className="text-[11px] text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-100 font-medium">
                                              <strong>Doctor Notes for Nurse:</strong> "{td.transferDetails.doctorNotes}"
                                            </p>
                                          )}
                                          {isTransferred && (
                                            <div className="mt-1 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-950 flex items-center justify-between">
                                              <span>
                                                ✅ <strong>Allocated Bed:</strong> <span className="font-black text-emerald-800">{td.transferDetails?.allocatedWard} • {td.transferDetails?.allocatedBedNumber}</span> by Nurse {td.nursingAssistance?.transferConfirmedBy || 'Staff'}
                                              </span>
                                              {td.nursingAssistance?.transferConfirmedAt && (
                                                <span className="text-[10px] text-emerald-700 font-semibold">
                                                  {new Date(td.nursingAssistance.transferConfirmedAt).toLocaleString()}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <div className="text-right shrink-0">
                                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${isTransferred ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                              td.status === 'Doctor Approved' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                                'bg-purple-100 text-purple-800 border-purple-200'
                                            }`}>
                                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                            {isTransferred ? 'Bed Allocated' : (td.status || 'Doctor Approved')}
                                          </span>
                                          <p className="text-[10px] text-slate-400 mt-1">
                                            {new Date(td.createdAt).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* DOCTOR TAB 3: Nurse Vitals & Care Records (Physician View) */}
                    {(activeTab === 'nurse-vitals' || (isDoctor && activeTab === 'vitals') || (isDoctor && activeTab === 'nursing')) && (
                      <div className="space-y-4">
                        {/* Physician Notice Banner */}
                        <div className="p-3 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-teal-700 text-lg">ecg_heart</span>
                            <div>
                              <span className="font-bold text-teal-950 block">Physician View: Nurse-Charted Telemetry & Care Records</span>
                              <span className="text-[11px] text-teal-800">Bedside vitals, pain scores, and observations recorded by nursing staff.</span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-white text-teal-800 font-bold rounded border border-teal-200 text-[10px]">
                            Nurse Logged
                          </span>
                        </div>

                        {/* Latest Vitals Summary Cards */}
                        {patientDossier?.vitalLogs?.[0] ? (
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Pressure</span>
                              <span className="text-base font-black text-slate-900 block mt-0.5">
                                {patientDossier.vitalLogs[0].bloodPressure || `${patientDossier.vitalLogs[0].bloodPressureSys || 120}/${patientDossier.vitalLogs[0].bloodPressureDia || 80}`}
                              </span>
                              <span className="text-[10px] text-slate-400">mmHg</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Heart Rate</span>
                              <span className="text-base font-black text-rose-600 block mt-0.5">
                                {patientDossier.vitalLogs[0].pulseRate || patientDossier.vitalLogs[0].heartRate || 75}
                              </span>
                              <span className="text-[10px] text-slate-400">bpm</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Oxygen SpO2</span>
                              <span className="text-base font-black text-teal-700 block mt-0.5">
                                {patientDossier.vitalLogs[0].oxygenSaturation || patientDossier.vitalLogs[0].spo2 || 98}%
                              </span>
                              <span className="text-[10px] text-slate-400">Saturation</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-center">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Temperature</span>
                              <span className="text-base font-black text-amber-600 block mt-0.5">
                                {patientDossier.vitalLogs[0].temperature || 98.6}°F
                              </span>
                              <span className="text-[10px] text-slate-400">Body Temp</span>
                            </div>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs text-center col-span-2 sm:col-span-1">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Respiratory</span>
                              <span className="text-base font-black text-blue-600 block mt-0.5">
                                {patientDossier.vitalLogs[0].respiratoryRate || 16}
                              </span>
                              <span className="text-[10px] text-slate-400">breaths/min</span>
                            </div>
                          </div>
                        ) : null}

                        {/* Vitals History Table */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Vitals Telemetry Feed ({patientDossier?.vitalLogs?.length || 0})
                            </h4>
                            <span className="text-[10px] text-slate-500 font-semibold">Nurse Bedside Logging</span>
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {(!patientDossier?.vitalLogs || patientDossier.vitalLogs.length === 0) ? (
                              <div className="p-8 text-center text-slate-400 text-xs">
                                No vitals entries logged yet by nursing staff.
                              </div>
                            ) : (
                              patientDossier.vitalLogs.map((v, i) => (
                                <div key={v._id || i} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                                      <span className="material-symbols-outlined text-sm">favorite</span>
                                    </div>
                                    <div>
                                      <div className="font-bold text-slate-900">
                                        BP: {v.bloodPressure || `${v.bloodPressureSys || 120}/${v.bloodPressureDia || 80}`} • HR: {v.pulseRate || v.heartRate || 75} bpm • SpO2: {v.oxygenSaturation || 98}% • Temp: {v.temperature || 98.6}°F
                                      </div>
                                      <p className="text-[10px] text-slate-400">
                                        {new Date(v.createdAt).toLocaleString()} • Logged by: {v.recordedBy?.name || v.notes || 'Bedside Nurse'}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Nursing Observations */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Bedside Nursing Assessments ({patientDossier?.nursingObservations?.length || 0})
                            </h4>
                            <span className="text-[10px] text-slate-500 font-semibold">Clinical Nursing Feed</span>
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {(!patientDossier?.nursingObservations || patientDossier.nursingObservations.length === 0) ? (
                              <div className="p-8 text-center text-slate-400 text-xs">
                                No nursing observation entries logged yet.
                              </div>
                            ) : (
                              patientDossier.nursingObservations.map((obs) => (
                                <div key={obs._id} className="p-3.5 space-y-2 hover:bg-slate-50">
                                  <div className="flex items-center justify-between">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${obs.generalCondition === 'Critical' ? 'bg-rose-100 text-rose-800' :
                                        obs.generalCondition === 'Guarded' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                      Condition: {obs.generalCondition}
                                    </span>
                                    <span className="text-[10px] text-slate-400">{obs.observationDate} at {obs.observationTime} • Nurse: {obs.nurseName}</span>
                                  </div>
                                  <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    {obs.nursingAssessment}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 1: Complete Patient Profile & Admission */}
                    {activeTab === 'profile' && (
                      <div className="space-y-3.5">

                        {/* Booked Appointment Spotlight Banner */}
                        {(selectedPatient.bookedAppointment || selectedPatient.hasBookedAppointment) && (
                          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-4 rounded-xl text-white shadow-sm border border-amber-400">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-2xl">event_available</span>
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                                      Receptionist Booked Appointment
                                    </span>
                                    <span className="text-[11px] font-bold bg-amber-900/40 px-2 py-0.5 rounded-md uppercase">
                                      {selectedPatient.bookedAppointment?.status || 'Scheduled'}
                                    </span>
                                  </div>
                                  <h3 className="text-sm font-black mt-1">
                                    Appointment for {selectedPatient.bookedAppointment?.doctorName || 'Doctor'}
                                  </h3>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-amber-100 mt-1">
                                    <span>📅 <strong>Date:</strong> {selectedPatient.bookedAppointment?.appointmentDate || 'Today'}</span>
                                    <span>⏰ <strong>Time:</strong> {selectedPatient.bookedAppointment?.appointmentTime || 'Scheduled Slot'}</span>
                                    <span>🏥 <strong>Dept:</strong> {selectedPatient.bookedAppointment?.department || 'Outpatient'}</span>
                                  </div>
                                  {selectedPatient.bookedAppointment?.reason && (
                                    <p className="text-xs text-white/90 mt-1.5 bg-black/10 p-2 rounded-lg">
                                      <strong>Chief Reason:</strong> {selectedPatient.bookedAppointment.reason}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => setActiveTab('instructions')}
                                className="px-3 py-1.5 bg-white text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-black shadow-xs whitespace-nowrap self-start sm:self-center transition-colors"
                              >
                                View Consultation Plan
                              </button>
                            </div>
                          </div>
                        )}

                        {/* 1. Admission & Bed Assignment Summary */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                          <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base">hotel</span> Admission & Bed Assignment
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient Status</span>
                              <span className="font-extrabold text-slate-800">{selectedPatient.status || selectedPatient.admissionStatus || 'Active'}</span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Ward</span>
                              <span className="font-extrabold text-teal-800">
                                <HighlightText text={selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General Ward'} highlight={searchQuery} />
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Bed</span>
                              <span className="font-extrabold text-slate-900">
                                <HighlightText text={selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'No Bed Assigned'} highlight={searchQuery} />
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Admission Date</span>
                              <span className="font-extrabold text-slate-800">
                                {selectedPatient.admissionDate || selectedPatient.registrationDate || new Date(selectedPatient.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 2. Personal Information & Emergency Contact */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-teal-600 text-base">badge</span> Personal Information
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="text-slate-500">Full Name:</span>
                                <span className="font-bold text-slate-800">
                                  <HighlightText text={selectedPatient.fullName || selectedPatient.name} highlight={searchQuery} />
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="text-slate-500">Patient ID:</span>
                                <span className="font-mono font-bold text-teal-700">
                                  <HighlightText text={selectedPatient.patientId} highlight={searchQuery} />
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="text-slate-500">Age & Gender:</span>
                                <span className="font-bold text-slate-800">{selectedPatient.age || 'N/A'} yrs • {selectedPatient.gender}</span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="text-slate-500">Phone:</span>
                                <span className="font-bold text-slate-800">
                                  <HighlightText text={selectedPatient.contactNumber || selectedPatient.phoneNumber || 'N/A'} highlight={searchQuery} />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Email:</span>
                                <span className="font-medium text-slate-700">{selectedPatient.email || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-rose-600 text-base">contact_emergency</span> Emergency Contact
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="text-slate-500">Contact Person:</span>
                                <span className="font-bold text-slate-800">
                                  <HighlightText text={selectedPatient.emergencyContactName || selectedPatient.emergencyContact?.name || selectedPatient.attendantName || 'Family Member'} highlight={searchQuery} />
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="text-slate-500">Relationship:</span>
                                <span className="font-bold text-slate-800">
                                  {selectedPatient.emergencyContactRelationship || selectedPatient.emergencyContact?.relationship || 'Spouse / Parent'}
                                </span>
                              </div>
                              <div className="flex justify-between border-b border-slate-100 pb-1">
                                <span className="text-slate-500">Emergency Phone:</span>
                                <span className="font-bold text-rose-700">
                                  <HighlightText text={selectedPatient.emergencyContactPhone || selectedPatient.emergencyContact?.phone || selectedPatient.attendantContact || selectedPatient.contactNumber || 'N/A'} highlight={searchQuery} />
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Assigned Doctor:</span>
                                <span className="font-medium text-teal-800">
                                  <HighlightText text={selectedPatient.assignedDoctor || selectedPatient.admissionSetup?.assignedDoctor || 'Dr. Attending'} highlight={searchQuery} />
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 3. Clinical Profile & Allergies */}
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-teal-600 text-base">medical_information</span> Clinical Overview
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 sm:col-span-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Chief Complaint / Diagnosis</span>
                              <span className="font-bold text-slate-800">
                                {selectedPatient.clinicalInfo?.chiefComplaint || selectedPatient.latestDiagnosis || 'General Clinical Review'}
                              </span>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Group</span>
                              <span className="font-black text-rose-600">{selectedPatient.clinicalInfo?.bloodGroup || 'O+'}</span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Recorded Drug Allergies</span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedPatient.clinicalInfo?.allergies?.length > 0 ? (
                                selectedPatient.clinicalInfo.allergies.map((allg, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    ⚠️ {allg}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic">No known drug allergies reported.</span>
                              )}
                            </div>
                          </div>
                        </div>

                      </div>
                    )}

                    {/* TAB 2: Medical History & Past Records */}
                    {!isDoctor && activeTab === 'history' && (
                      <div className="space-y-4">
                        {!isNurse && !isAdmin && (
                          <form onSubmit={handleSaveConsultation} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">edit_note</span> Record Clinical Assessment
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <input
                                type="text"
                                required
                                placeholder="Clinical Diagnosis (e.g. Acute STEMI / Hypertensive Crisis)"
                                value={newConsultation.diagnosis}
                                onChange={(e) => setNewConsultation({ ...newConsultation, diagnosis: e.target.value })}
                                className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              />
                              <input
                                type="text"
                                required
                                placeholder="Treatment Plan / Medical Orders"
                                value={newConsultation.treatment}
                                onChange={(e) => setNewConsultation({ ...newConsultation, treatment: e.target.value })}
                                className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              />
                            </div>
                            <textarea
                              rows={2}
                              placeholder="Consultation notes, clinical observations, or special instructions..."
                              value={newConsultation.notes}
                              onChange={(e) => setNewConsultation({ ...newConsultation, notes: e.target.value })}
                              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                            ></textarea>
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">save</span> Save Assessment
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="space-y-2.5">
                          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                            Medical History & Recorded Consultations ({patientDossier?.medicalRecords?.length || 0})
                          </h4>

                          {patientDossier?.medicalRecords?.length === 0 ? (
                            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
                              No prior medical history records in database for this patient.
                            </div>
                          ) : (
                            patientDossier?.medicalRecords?.map((rec) => (
                              <div key={rec._id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <h5 className="font-black text-slate-900 text-xs">
                                      {rec.diagnosis || 'Clinical Medical Review'}
                                    </h5>
                                    <p className="text-[11px] text-slate-500">
                                      Physician: {rec.recordedBy?.name || rec.doctorName || selectedPatient.assignedDoctor || 'Attending Physician'} • {new Date(rec.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                {rec.treatment && (
                                  <div className="bg-teal-50/50 p-2 rounded-lg border border-teal-100 text-xs">
                                    <span className="text-[10px] font-bold text-teal-800 uppercase block">Treatment & Orders:</span>
                                    <span className="font-semibold text-slate-800">{rec.treatment}</span>
                                  </div>
                                )}
                                {rec.notes && (
                                  <p className="text-xs text-slate-600">{rec.notes}</p>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 3: Doctor Instructions */}
                    {!isDoctor && activeTab === 'instructions' && (
                      <div className="space-y-4">
                        {!isNurse && !isAdmin && (
                          <form onSubmit={handleSaveDoctorNote} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">post_add</span> Issue Doctor Clinical Instruction
                            </h4>
                            <textarea
                              rows={3}
                              required
                              placeholder="Type nursing directives, monitoring frequency, fluid orders, or clinical care instructions..."
                              value={doctorNoteText}
                              onChange={(e) => setDoctorNoteText(e.target.value)}
                              className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                            ></textarea>
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">send</span> Post Doctor Instruction
                              </button>
                            </div>
                          </form>
                        )}

                        {/* DOCTOR BED TRANSFER DIRECTIVES & WARD ESCALATION ORDERS */}
                        {patientDossier?.transferDischarges && patientDossier.transferDischarges.filter(td => td.requestType === 'Transfer').length > 0 && (
                          <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
                            <div className="p-3 bg-amber-50/90 border-b border-amber-200 flex justify-between items-center">
                              <div>
                                <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-base text-amber-700">swap_horiz</span>
                                  Doctor Bed Transfer & Escalation Directives ({patientDossier.transferDischarges.filter(td => td.requestType === 'Transfer').length})
                                </h4>
                                <p className="text-[10px] text-amber-800 mt-0.5">
                                  Clinical bed relocation orders issued by attending doctor for this patient
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                                Doctor Authorized
                              </span>
                            </div>
                            <div className="divide-y divide-amber-100 text-xs">
                              {patientDossier.transferDischarges.filter(td => td.requestType === 'Transfer').map((td) => (
                                <div key={td._id} className="p-4 space-y-2.5 bg-amber-50/20 hover:bg-amber-50/50 transition-colors">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-extrabold text-slate-900 text-xs">
                                          Transfer to: <span className="text-teal-800 font-black">{td.transferDetails?.targetWard || td.transferDetails?.recommendedWard || 'General Ward'}</span>
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800">
                                          {td.transferDetails?.requiredBedType || 'Standard Bed'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                                          Condition: {td.transferDetails?.clinicalCondition || 'Stable'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${td.transferDetails?.priority === 'Emergency' || td.transferDetails?.priority === 'Critical' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                                            td.transferDetails?.priority === 'Urgent' || td.transferDetails?.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                          }`}>
                                          {td.transferDetails?.priority || 'Routine'} Priority
                                        </span>
                                      </div>
                                      <p className="text-slate-700 font-semibold mt-1">
                                        Reason: {td.transferDetails?.reasonForTransfer || td.transferDetails?.medicalReason || td.reason || 'Ward Transfer'}
                                      </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${td.status === 'Completed' || td.status === 'Transferred' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                          td.status === 'Doctor Approved' ? 'bg-blue-100 text-blue-800 border-blue-200' : 'bg-amber-100 text-amber-800 border-amber-200'
                                        }`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                        {td.status}
                                      </span>
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        {new Date(td.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>

                                  {td.transferDetails?.doctorNotes && (
                                    <div className="bg-white p-3 rounded-xl border border-amber-200 text-slate-800">
                                      <span className="text-[10px] font-bold text-amber-800 uppercase block mb-0.5">🩺 Doctor Clinical Instructions for Nurse:</span>
                                      <p className="font-medium text-xs">"{td.transferDetails.doctorNotes}"</p>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-amber-100">
                                    <span>Prescribed by: <strong className="text-teal-800">{td.doctorName || 'Attending Doctor'}</strong></span>
                                    {isNurse && (
                                      <button
                                        onClick={() => setActiveTab('transfer')}
                                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs transition-colors"
                                      >
                                        Execute Handover & Bed Assignment →
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Doctor Instructions & Clinical Directives ({patientDossier?.doctorInstructions?.length || patientDossier?.medicalRecords?.length || 0})
                            </h4>
                            <span className="text-[11px] text-teal-800 font-bold">MongoDB Live Directives</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {patientDossier?.doctorInstructions && patientDossier.doctorInstructions.length > 0 ? (
                              patientDossier.doctorInstructions.map((inst) => (
                                <div key={inst._id} className="p-3.5 space-y-2 text-xs hover:bg-slate-50">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${inst.priority === 'STAT / Critical' ? 'bg-rose-100 text-rose-800 animate-pulse' : inst.priority === 'High' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                        {inst.priority}
                                      </span>
                                      <span className="font-bold text-teal-900">{inst.instructionCategory || 'Clinical Directive'}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(inst.issuedAt || inst.createdAt).toLocaleString()}
                                    </span>
                                  </div>

                                  <p className="text-slate-800 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    "{inst.instruction}"
                                  </p>

                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                    <span className="text-teal-700 font-bold">Prescribed by: {inst.doctorName}</span>
                                    <span className={`px-2 py-0.5 rounded font-bold ${inst.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : inst.status === 'Acknowledged' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                      Status: {inst.status}
                                    </span>
                                  </div>

                                  {inst.nursingRemarks && (
                                    <p className="text-[11px] text-emerald-800 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                                      <strong>Nurse Action Remarks:</strong> {inst.nursingRemarks}
                                    </p>
                                  )}
                                </div>
                              ))
                            ) : (!patientDossier?.medicalRecords || patientDossier.medicalRecords.length === 0) ? (
                              <div className="p-6 text-center text-slate-400 text-xs">
                                No specific doctor instructions recorded. Follow standard ward protocols.
                              </div>
                            ) : (
                              patientDossier.medicalRecords.map((rec, idx) => (
                                <div key={rec._id || idx} className="p-3.5 space-y-1.5 text-xs hover:bg-slate-50">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-800">
                                      {rec.treatment || rec.diagnosis || 'Clinical Directive'}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(rec.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  {rec.notes && (
                                    <p className="text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                      {rec.notes}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-teal-700 font-semibold">
                                    Order from: {rec.recordedBy?.name || rec.doctorName || selectedPatient.assignedDoctor || 'Attending Physician'}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 4: Patient Vitals & Logs */}
                    {!isDoctor && activeTab === 'vitals' && (
                      <div className="space-y-4">
                        {/* Only Nurses can log and chart new vitals */}
                        {isNurse ? (
                          <form onSubmit={handleSaveVitals} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">favorite</span> Log Current Patient Vitals (Nurse Bedside Entry)
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Temp (°F)</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="98.6"
                                  value={newVitals.temperature}
                                  onChange={(e) => setNewVitals({ ...newVitals, temperature: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">BP Sys (mmHg)</label>
                                <input
                                  type="number"
                                  placeholder="120"
                                  value={newVitals.systolic}
                                  onChange={(e) => setNewVitals({ ...newVitals, systolic: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">BP Dia (mmHg)</label>
                                <input
                                  type="number"
                                  placeholder="80"
                                  value={newVitals.diastolic}
                                  onChange={(e) => setNewVitals({ ...newVitals, diastolic: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Heart Rate (bpm)</label>
                                <input
                                  type="number"
                                  placeholder="72"
                                  value={newVitals.heartRate}
                                  onChange={(e) => setNewVitals({ ...newVitals, heartRate: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">SpO2 (%)</label>
                                <input
                                  type="number"
                                  placeholder="98"
                                  value={newVitals.spo2}
                                  onChange={(e) => setNewVitals({ ...newVitals, spo2: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Resp Rate (/min)</label>
                                <input
                                  type="number"
                                  placeholder="16"
                                  value={newVitals.respiratoryRate}
                                  onChange={(e) => setNewVitals({ ...newVitals, respiratoryRate: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">save</span> Chart Vitals
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="bg-gradient-to-r from-teal-900 to-slate-900 p-4 rounded-xl text-white shadow-xs flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-white/10 rounded-xl">
                                <span className="material-symbols-outlined text-teal-300 text-xl">medical_services</span>
                              </div>
                              <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-200">
                                  Nursing Vitals Telemetry & Clinical Feed
                                </h4>
                                <p className="text-[11px] text-slate-300 mt-0.5">
                                  Patient vitals are recorded at bedside by assigned nursing staff and updated in real-time for attending physicians.
                                </p>
                              </div>
                            </div>
                            <span className="px-2.5 py-1 bg-teal-500/20 text-teal-300 border border-teal-400/30 rounded-lg text-[10px] font-bold uppercase">
                              Read Only • Physician View
                            </span>
                          </div>
                        )}

                        {/* Historical Vital Logs */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Vital History & SpO2 Chart ({patientDossier?.vitalLogs?.length || 0})
                            </h4>
                            <span className="text-[11px] text-teal-800 font-bold">MongoDB Live Logs</span>
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {patientDossier?.vitalLogs?.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-xs">
                                No previous vital logs recorded for this patient. Vitals will appear here once recorded by the assigned nurse.
                              </div>
                            ) : (
                              patientDossier?.vitalLogs?.map((vl) => (
                                <div key={vl._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <span className="font-bold text-slate-800">
                                      HR: {vl.pulseRate} bpm • BP: {vl.bloodPressure || `${vl.bloodPressureSys}/${vl.bloodPressureDia}`} • Temp: {vl.temperature}°F • SpO2: {vl.oxygenSaturation}% • RR: {vl.respiratoryRate || 16}/min
                                    </span>
                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                      Recorded by: {vl.recordedBy?.name || 'Duty Staff'} at {new Date(vl.recordedAt || vl.createdAt).toLocaleString()}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${vl.isCritical || vl.status === 'Critical' ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse' : 'bg-teal-50 text-teal-700'
                                    }`}>
                                    {vl.isCritical ? 'CRITICAL ALERT' : 'Normal'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 5: Nursing Observations & Care Logs */}
                    {!isDoctor && activeTab === 'nursing' && (
                      <div className="space-y-4">
                        {/* Header Banner & Quick Action */}
                        <div className="bg-gradient-to-r from-teal-800 to-slate-900 p-4 rounded-xl text-white flex items-center justify-between shadow-xs">
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base text-teal-300">clinical_notes</span>
                              Continuous Nursing Observations & Clinical Condition
                            </h4>
                            <p className="text-[11px] text-teal-100 mt-0.5">
                              Logged for <strong className="text-teal-200">{selectedPatient.fullName || selectedPatient.name}</strong> ({selectedPatient.patientId}): general condition, pain score, assessment & vitals.
                            </p>
                          </div>
                          {isNurse && (
                            <button
                              onClick={() => {
                                const targetId = selectedPatient.patientId || selectedPatient._id;
                                window.location.hash = `#/nursing-observations?patientId=${targetId}&openModal=true`;
                              }}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">open_in_new</span>
                              Open Full Charting Form
                            </button>
                          )}
                        </div>

                        {/* Direct Bedside Quick Observation Logging Form */}
                        {isNurse && (
                          <form onSubmit={handleRecordQuickObservation} className="bg-white p-4 rounded-xl border border-teal-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base text-teal-700">edit_note</span>
                                Log Nursing Observation for {selectedPatient.fullName || selectedPatient.name}
                              </h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                                Bed: {selectedPatient.bedId?.bedNumber || selectedPatient.bedNumber || 'Assigned'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Condition Status</label>
                                <select
                                  value={quickObservation.generalCondition}
                                  onChange={(e) => setQuickObservation({ ...quickObservation, generalCondition: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold"
                                >
                                  <option value="Stable">Stable</option>
                                  <option value="Improving / Ambulatory">Improving / Ambulatory</option>
                                  <option value="Guarded">Guarded</option>
                                  <option value="Deteriorating">Deteriorating</option>
                                  <option value="Critical">Critical</option>
                                </select>
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                  Pain Level (0 - 10): <span className="text-teal-700 font-bold">{quickObservation.painLevel}</span>
                                </label>
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  value={quickObservation.painLevel}
                                  onChange={(e) => setQuickObservation({ ...quickObservation, painLevel: e.target.value })}
                                  className="w-full accent-teal-600"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Shift</label>
                                <select
                                  value={quickObservation.shift}
                                  onChange={(e) => setQuickObservation({ ...quickObservation, shift: e.target.value })}
                                  className="w-full p-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-bold"
                                >
                                  <option value="Morning Shift (07:00 AM - 03:00 PM)">Morning Shift</option>
                                  <option value="Evening Shift (03:00 PM - 11:00 PM)">Evening Shift</option>
                                  <option value="Night Shift (11:00 PM - 07:00 AM)">Night Shift</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                                Clinical Nursing Assessment *
                              </label>
                              <textarea
                                required
                                rows="2"
                                placeholder={`Enter clinical observations, symptoms, response to care for ${selectedPatient.fullName || selectedPatient.name}...`}
                                value={quickObservation.nursingAssessment}
                                onChange={(e) => setQuickObservation({ ...quickObservation, nursingAssessment: e.target.value })}
                                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              />
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">save</span>
                                Save Observation for {selectedPatient.fullName || selectedPatient.name}
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Chronological Nursing Observations */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Chronological Nursing Observations ({patientDossier?.nursingObservations?.length || 0})
                            </h4>
                            <span className="text-[11px] text-teal-800 font-bold">MongoDB Clinical Feed</span>
                          </div>

                          {(!patientDossier?.nursingObservations || patientDossier.nursingObservations.length === 0) ? (
                            <div className="p-6 text-center text-slate-400 text-xs">
                              No formal nursing observation records logged yet for this patient.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {patientDossier.nursingObservations.map((obs) => (
                                <div key={obs._id} className="p-4 space-y-2 hover:bg-slate-50 text-xs transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${obs.isCriticalAlert || obs.generalCondition === 'Critical'
                                        ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                                        : obs.generalCondition === 'Guarded'
                                          ? 'bg-amber-100 text-amber-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                        }`}>
                                        {obs.generalCondition}
                                      </span>
                                      <span className="font-bold text-slate-900">
                                        Shift: {obs.shift}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {obs.observationDate} at {obs.observationTime}
                                    </span>
                                  </div>

                                  <p className="text-slate-800 font-medium bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <span className="text-[10px] font-bold text-teal-800 uppercase block mb-0.5">Nursing Assessment:</span>
                                    {obs.nursingAssessment}
                                  </p>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Pain Level</span>
                                      <span className="font-bold text-slate-800">{obs.painComfort?.level ?? 0}/10 ({obs.painComfort?.comfortStatus})</span>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Consciousness</span>
                                      <span className="font-bold text-slate-800">{obs.consciousness}</span>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Fluid I/O Net</span>
                                      <span className="font-bold text-slate-800">
                                        {(obs.fluidBalance?.oralFluidMl || 0) + (obs.fluidBalance?.ivFluidMl || 0) - ((obs.fluidBalance?.urineOutputMl || 0) + (obs.fluidBalance?.drainOutputMl || 0))} mL
                                      </span>
                                    </div>
                                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                                      <span className="text-[9px] text-slate-400 font-bold uppercase block">Oxygen Support</span>
                                      <span className="font-bold text-slate-800">{obs.breathingCondition?.oxygenSupport || 'Room Air'}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                    <span className="text-teal-700 font-semibold">Nurse: {obs.nurseName}</span>
                                    {obs.woundCondition?.hasWounds && (
                                      <span className="text-purple-700 font-bold">Wound Care: {obs.woundCondition.dressingStatus}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Nursing Shift Tasks & Action Items */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Ward Nursing Care Tasks ({patientDossier?.nursingTasks?.length || 0})
                            </h4>
                            <span className="text-[11px] text-slate-500 font-semibold">Ward: {selectedPatient.admissionSetup?.wardType || selectedPatient.ward || 'General'}</span>
                          </div>

                          {(!patientDossier?.nursingTasks || patientDossier.nursingTasks.length === 0) ? (
                            <div className="p-6 text-center text-slate-400 text-xs">
                              No routine ward tasks flagged.
                            </div>
                          ) : (
                            <div className="divide-y divide-slate-100">
                              {patientDossier.nursingTasks.map((nt) => (
                                <div key={nt._id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                                  <div className="flex items-center gap-2.5">
                                    <span className={`material-symbols-outlined text-lg ${nt.status === 'Completed' ? 'text-emerald-600' : 'text-amber-500'}`}>
                                      {nt.status === 'Completed' ? 'check_circle' : 'pending_actions'}
                                    </span>
                                    <div>
                                      <p className="font-bold text-slate-800">{nt.description}</p>
                                      <p className="text-[10px] text-slate-400">
                                        Type: {nt.taskType} • Nurse: {nt.assignedTo?.name || 'Staff Nurse'} • {new Date(nt.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${nt.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                      }`}>
                                      {nt.status}
                                    </span>
                                    {nt.status !== 'Completed' && (
                                      <button
                                        onClick={() => handleCompleteNursingTask(nt._id)}
                                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-colors"
                                      >
                                        Mark Done
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 6: Medications & Prescriptions */}
                    {!isDoctor && activeTab === 'prescriptions' && (
                      <div className="space-y-4">
                        {!isNurse && !isAdmin && (
                          <form onSubmit={handleSavePrescription} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">pill</span> Add Medication Prescription
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                              <input
                                type="text"
                                required
                                placeholder="Medicine Name (e.g. Atorvastatin)"
                                value={newPrescription.medication}
                                onChange={(e) => setNewPrescription({ ...newPrescription, medication: e.target.value })}
                                className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              />
                              <input
                                type="text"
                                required
                                placeholder="Dosage (e.g. 20mg)"
                                value={newPrescription.dosage}
                                onChange={(e) => setNewPrescription({ ...newPrescription, dosage: e.target.value })}
                                className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              />
                              <input
                                type="text"
                                required
                                placeholder="Frequency (e.g. OD, BD, TDS)"
                                value={newPrescription.frequency}
                                onChange={(e) => setNewPrescription({ ...newPrescription, frequency: e.target.value })}
                                className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              />
                              <input
                                type="text"
                                required
                                placeholder="Duration (e.g. 7 Days)"
                                value={newPrescription.duration}
                                onChange={(e) => setNewPrescription({ ...newPrescription, duration: e.target.value })}
                                className="p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              />
                            </div>
                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">medication</span> Prescribe Medicine
                              </button>
                            </div>
                          </form>
                        )}

                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Active Patient Medications & MAR History</h4>
                            <span className="text-[11px] text-teal-800 font-bold">Prescriptions & Admin Logs</span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {patientDossier?.prescriptions?.flatMap(p => p.medications || []).map((med, idx) => (
                              <div key={`pr-${idx}`} className="p-3.5 flex items-center justify-between hover:bg-slate-50 gap-2 text-xs">
                                <div>
                                  <h5 className="font-bold text-slate-800">{med.medicineName} • {med.dosage}</h5>
                                  <p className="text-[11px] text-slate-500">Route: {med.route || 'Oral'} • Freq: {med.frequency} • Timing: {med.timing || 'After Food'} • Duration: {med.duration}</p>
                                  {med.instructions && (
                                    <p className="text-[10px] text-slate-400 italic">Dr. Instructions: {med.instructions}</p>
                                  )}
                                </div>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Prescribed</span>
                              </div>
                            ))}

                            {patientDossier?.medicationAdministrations && patientDossier.medicationAdministrations.length > 0 && (
                              <div className="p-3 bg-slate-50/90 border-t border-slate-200">
                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider block mb-2">Recent Nurse Administration Records (eMAR):</span>
                                <div className="space-y-1.5">
                                  {patientDossier.medicationAdministrations.slice(0, 5).map(adm => (
                                    <div key={adm._id} className="p-2 bg-white rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                                      <div>
                                        <span className="font-bold text-slate-800">{adm.medicineName} ({adm.administeredDose || adm.prescribedDosage})</span>
                                        <span className="text-[10px] text-slate-400 block">Given by {adm.nurseName} at {adm.administeredTime} ({adm.administeredDate})</span>
                                        {adm.remarks && <span className="text-[10px] text-slate-500 italic block">{adm.remarks}</span>}
                                        {adm.reasonNotAdministered && <span className="text-[10px] text-rose-600 font-semibold block">{adm.reasonNotAdministered}</span>}
                                      </div>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${adm.status === 'Administered' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {adm.status}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(!patientDossier?.prescriptions?.some(p => p.medications?.length > 0) && (!patientDossier?.medicationAdministrations || patientDossier.medicationAdministrations.length === 0)) && (
                              <div className="p-6 text-center text-slate-400 text-xs">
                                No active medications or administration records for this patient.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 7: Resource Requisitions */}
                    {!isDoctor && activeTab === 'resource-request' && (
                      <div className="space-y-4">
                        {/* Only Nurse can create new equipment/resource requisitions */}
                        {isNurse && !isAdmin && (
                          <form onSubmit={handleSubmitResourceRequest} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">medical_services</span> Request Medical Equipment & Resources
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Equipment / Resource *</label>
                                <select
                                  value={resRequest.resourceType}
                                  onChange={(e) => setResRequest({ ...resRequest, resourceType: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="Mechanical Ventilator">Mechanical Ventilator</option>
                                  <option value="Oxygen Cylinder">Medical Oxygen Cylinder</option>
                                  <option value="Cardiac Monitor">Cardiac Bedside Monitor</option>
                                  <option value="Infusion Pump">Infusion / Syringe Pump</option>
                                  <option value="Wheelchair">Transport Wheelchair</option>
                                  <option value="Defibrillator">Defibrillator & Pacing Unit</option>
                                  <option value="Dialysis Machine">Hemodialysis Machine</option>
                                  <option value="Suction Machine">Clinical Suction Machine</option>
                                  <option value="Medical Equipment">General Medical Equipment</option>
                                  <option value="Other">Other Specialized Device</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Quantity *</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={resRequest.quantity}
                                  onChange={(e) => setResRequest({ ...resRequest, quantity: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Priority Level *</label>
                                <select
                                  value={resRequest.priority}
                                  onChange={(e) => setResRequest({ ...resRequest, priority: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="High">High Priority</option>
                                  <option value="Critical">Critical / Life Support (STAT)</option>
                                  <option value="Routine">Routine Care</option>
                                </select>
                              </div>
                            </div>

                            <textarea
                              rows={2}
                              required
                              placeholder="Clinical justification, target delivery ward/bed, and instructions for BioMed staff..."
                              value={resRequest.clinicalReason}
                              onChange={(e) => setResRequest({ ...resRequest, clinicalReason: e.target.value })}
                              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                            ></textarea>

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">send</span> Submit Requisition to BioMed
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Resource Requisitions History - Live List for Nurse & Doctor */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex justify-between items-center">
                            <div>
                              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base text-teal-700">inventory</span>
                                Resource Requisitions ({patientDossier?.resourceRequests?.length || 0})
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                Real-time status of biomedical equipment requested for {selectedPatient.fullName || selectedPatient.name}
                              </p>
                            </div>
                            {isDoctor && (
                              <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                Doctor Clinical Review
                              </span>
                            )}
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {(!patientDossier?.resourceRequests || patientDossier.resourceRequests.length === 0) ? (
                              <div className="p-8 text-center text-slate-400 text-xs">
                                <span className="material-symbols-outlined text-3xl text-slate-300 block mb-1">inventory_2</span>
                                No equipment or resource requisitions logged for this patient.
                              </div>
                            ) : (
                              patientDossier.resourceRequests.map((rr) => {
                                const status = rr.status || 'Pending';
                                const isCritical = rr.priority === 'Critical' || rr.priority === 'Emergency' || rr.priority === 'High';
                                return (
                                  <div key={rr._id} className="p-3.5 space-y-2 hover:bg-slate-50/80 transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-slate-900 text-xs">
                                            {rr.resourceType || rr.itemRequested?.itemName || 'Medical Equipment'}
                                          </span>
                                          <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-700">
                                            Qty: {rr.quantity || 1}
                                          </span>
                                          <span className={`px-2 py-0.2 rounded text-[10px] font-black uppercase tracking-wider ${isCritical ? 'bg-rose-100 text-rose-800 animate-pulse' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                            {rr.priority || 'Routine'}
                                          </span>
                                        </div>
                                        <p className="text-slate-600 text-xs">
                                          {rr.clinicalReason || rr.reason || 'Clinical Care Requirement'}
                                        </p>
                                        {rr.allocatedResourceDetails?.assetTag && (
                                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 border border-purple-200 rounded text-[10px] font-mono text-purple-700 font-bold">
                                            <span className="material-symbols-outlined text-xs">qr_code</span>
                                            Asset Tag: {rr.allocatedResourceDetails.assetTag}
                                            {rr.allocatedResourceDetails.deviceModel && ` (${rr.allocatedResourceDetails.deviceModel})`}
                                          </div>
                                        )}
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 border ${status === 'Approved' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                                            status === 'Allocated' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                              status === 'In Use' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                                                status === 'Released' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                  status === 'Rejected' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                                                    'bg-amber-100 text-amber-800 border-amber-200 animate-pulse'
                                          }`}>
                                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                          {status}
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                          {new Date(rr.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} • {new Date(rr.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                                      <span>Requested by: <strong className="text-slate-600">{rr.doctorName || (rr.requestedByModel ? `${rr.requestedByModel} Staff` : 'Clinical Staff')}</strong></span>
                                      {rr.approvedBy && (
                                        <span>Approved by: <strong className="text-blue-700">{rr.approvedBy}</strong></span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 8: Admission & Bed Request */}
                    {!isDoctor && activeTab === 'bed-request' && (
                      <div className="space-y-4">
                        {!isAdmin && (
                          <form onSubmit={handleSubmitBedRequest} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">single_bed</span> Request Hospital Bed / Inpatient Admission
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Required Ward</label>
                                <select
                                  value={bedRequest.wardType}
                                  onChange={(e) => setBedRequest({ ...bedRequest, wardType: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="General Ward">General Ward</option>
                                  <option value="Special Ward">Special Ward</option>
                                  <option value="ICU">ICU (Intensive Care Unit)</option>
                                  <option value="Emergency">Emergency</option>
                                  <option value="CCU">CCU (Coronary Care)</option>
                                  <option value="Pediatric">Pediatric Ward</option>
                                  <option value="Maternity">Maternity Ward</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Bed Type</label>
                                <select
                                  value={bedRequest.bedType}
                                  onChange={(e) => setBedRequest({ ...bedRequest, bedType: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="Standard Bed">Standard Bed</option>
                                  <option value="ICU Bed">ICU Bed</option>
                                  <option value="Cardiac Monitor Bed">Cardiac Monitor Bed</option>
                                  <option value="Ventilator Bed">Ventilator Bed</option>
                                  <option value="Isolation Bed">Isolation Bed</option>
                                  <option value="Deluxe Room">Deluxe Room</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Priority</label>
                                <select
                                  value={bedRequest.priority}
                                  onChange={(e) => setBedRequest({ ...bedRequest, priority: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="Normal">Normal / Routine</option>
                                  <option value="Urgent">Urgent</option>
                                  <option value="Emergency">Emergency / High Priority</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Admission Reason & Clinical Notes *
                              </label>
                              <textarea
                                rows={3}
                                required
                                placeholder="Admission reason (e.g. Unstable Angina / Post-PCI observation), provisional diagnosis, and special requirements..."
                                value={bedRequest.admissionReason}
                                onChange={(e) => setBedRequest({ ...bedRequest, admissionReason: e.target.value, clinicalReason: e.target.value, doctorNotes: e.target.value })}
                                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              ></textarea>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">send</span> Forward to Bed Management
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}

                    {/* TAB 9: Transfer Information & Recommendations */}
                    {!isDoctor && activeTab === 'transfer' && (
                      <div className="space-y-4">
                        {!isAdmin && (
                          <form onSubmit={handleSubmitTransfer} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">swap_horiz</span> Create Inpatient Bed Transfer Recommendation
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Recommended Destination Ward</label>
                                <select
                                  value={transferForm.targetWard}
                                  onChange={(e) => setTransferForm({ ...transferForm, targetWard: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="Special Ward">Special Ward</option>
                                  <option value="General Ward">General Ward</option>
                                  <option value="ICU">ICU (Intensive Care Unit)</option>
                                  <option value="CCU">CCU (Coronary Care)</option>
                                  <option value="Step-Down Unit">Step-Down Unit</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Required Bed Type</label>
                                <select
                                  value={transferForm.bedType}
                                  onChange={(e) => setTransferForm({ ...transferForm, bedType: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="Standard Bed">Standard Bed</option>
                                  <option value="ICU Bed">ICU Bed</option>
                                  <option value="Cardiac Monitor Bed">Cardiac Monitor Bed</option>
                                  <option value="Deluxe Room">Deluxe Room</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Transfer Priority</label>
                                <select
                                  value={transferForm.priority}
                                  onChange={(e) => setTransferForm({ ...transferForm, priority: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="Routine">Routine / Step-Down</option>
                                  <option value="Urgent">Urgent Transfer</option>
                                  <option value="Emergency">Emergency ICU Escalation</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Reason for Transfer & Clinical Notes *
                              </label>
                              <textarea
                                rows={3}
                                required
                                placeholder="Enter reason for bed transfer (e.g. Clinical step-down / step-up, post-procedure monitoring) and instructions for receiving team..."
                                value={transferForm.clinicalReason}
                                onChange={(e) => setTransferForm({ ...transferForm, clinicalReason: e.target.value, doctorNotes: e.target.value })}
                                className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              ></textarea>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">send</span> Submit Transfer Recommendation
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Doctor Authorized Transfer Orders */}
                        {patientDossier?.transferDischarges && patientDossier.transferDischarges.filter(td => td.requestType === 'Transfer').length > 0 && (
                          <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
                            <div className="p-3 bg-amber-50/90 border-b border-amber-200 flex justify-between items-center">
                              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-base text-amber-700">clinical_notes</span>
                                Doctor Authorized Bed Transfer Directives ({patientDossier.transferDischarges.filter(td => td.requestType === 'Transfer').length})
                              </h4>
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                Official Order
                              </span>
                            </div>
                            <div className="divide-y divide-amber-100 text-xs">
                              {patientDossier.transferDischarges.filter(td => td.requestType === 'Transfer').map((td) => (
                                <div key={td._id} className="p-3.5 space-y-2 bg-amber-50/20 hover:bg-amber-50/50 transition-colors">
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <p className="font-black text-slate-900 text-xs">
                                        Target: <span className="text-teal-800 font-extrabold">{td.transferDetails?.targetWard || td.transferDetails?.recommendedWard}</span> • {td.transferDetails?.requiredBedType || 'Bed'}
                                      </p>
                                      <p className="text-slate-600 text-xs mt-0.5">
                                        Reason: {td.transferDetails?.reasonForTransfer || td.transferDetails?.medicalReason || 'Ward Transfer'} • Condition: <strong className="text-slate-800">{td.transferDetails?.clinicalCondition || 'Stable'}</strong>
                                      </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${td.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}>
                                      {td.status}
                                    </span>
                                  </div>
                                  {td.transferDetails?.doctorNotes && (
                                    <p className="text-[11px] text-amber-900 bg-white p-2 rounded-lg border border-amber-200 font-medium">
                                      <strong>Doctor Notes for Nurse:</strong> "{td.transferDetails.doctorNotes}"
                                    </p>
                                  )}
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                                    <span>Prescribed by: <strong className="text-slate-700">{td.doctorName || 'Doctor'}</strong></span>
                                    <span>{new Date(td.createdAt).toLocaleString()}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Physical Bed Moves History */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/70 border-b border-slate-200">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Executed Bed Moves & History ({patientDossier?.transfers?.length || 0})
                            </h4>
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {patientDossier?.transfers?.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-xs">
                                No previous executed bed moves logged.
                              </div>
                            ) : (
                              patientDossier?.transfers?.map((tr) => (
                                <div key={tr._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <p className="font-bold text-slate-800">
                                      From: {tr.fromBed?.wardType || 'Ward'} ({tr.fromBed?.bedNumber || 'Bed'}) ➔ To: {tr.toBed?.wardType || 'Target Ward'} ({tr.toBed?.bedNumber || 'New Bed'})
                                    </p>
                                    <p className="text-[10px] text-slate-400">Reason: {tr.reason || 'Clinical Care'} • {new Date(tr.createdAt).toLocaleString()}</p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                    {tr.status || 'Completed'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* TAB 10: Billing & Invoices */}
                    {!isDoctor && activeTab === 'billing' && (
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-teal-600 text-base">receipt_long</span> Patient Invoices & Billing Summary
                            </h4>
                            <span className="text-[11px] font-bold text-slate-500 font-mono">
                              Patient ID: {selectedPatient.patientId}
                            </span>
                          </div>

                          {(!patientDossier?.billingRecords || patientDossier.billingRecords.length === 0) ? (
                            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                              <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">payments</span>
                              <p className="text-xs font-bold text-slate-600">No Final Discharge Invoice Generated</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                Discharge invoices and settlement bills processed by the Receptionist/Billing department will appear here.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {patientDossier.billingRecords.map((bill) => (
                                <div key={bill._id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className="text-xs font-black text-slate-900">Invoice #{bill.billNumber || bill._id.toString().slice(-6).toUpperCase()}</p>
                                      <p className="text-[10px] text-slate-500">Date: {new Date(bill.createdAt).toLocaleDateString()}</p>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${bill.paymentStatus === 'Paid'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                      }`}>
                                      {bill.paymentStatus || 'Paid'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                      <span className="text-[10px] text-slate-400 block font-bold">Room & Bed Charges</span>
                                      <span className="font-bold text-slate-800">${bill.bedCharges || bill.roomCharges || 0}</span>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                      <span className="text-[10px] text-slate-400 block font-bold">Doctor Consultations</span>
                                      <span className="font-bold text-slate-800">${bill.doctorFees || bill.consultationFees || 0}</span>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                                      <span className="text-[10px] text-slate-400 block font-bold">Medications & Pharmacy</span>
                                      <span className="font-bold text-slate-800">${bill.pharmacyCharges || bill.medicineCharges || 0}</span>
                                    </div>
                                    <div className="p-2 bg-white rounded-lg border border-teal-200 bg-teal-50/30">
                                      <span className="text-[10px] text-teal-800 block font-black">Total Paid Amount</span>
                                      <span className="font-black text-teal-700 text-sm">${bill.totalAmount || bill.grandTotal || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TAB 11: Discharge Information & Recommendations */}
                    {!isDoctor && activeTab === 'discharge' && (
                      <div className="space-y-4">
                        {!isAdmin && (
                          <form onSubmit={handleSubmitDischarge} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base">home_health</span> Final Discharge Recommendation
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Final Discharge Diagnosis</label>
                                <input
                                  type="text"
                                  required
                                  value={dischargeForm.dischargeDiagnosis}
                                  onChange={(e) => setDischargeForm({ ...dischargeForm, dischargeDiagnosis: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Condition at Discharge</label>
                                <select
                                  value={dischargeForm.conditionAtDischarge}
                                  onChange={(e) => setDischargeForm({ ...dischargeForm, conditionAtDischarge: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-semibold text-slate-800"
                                >
                                  <option value="Stable / Recovered">Stable / Recovered</option>
                                  <option value="Improved / Ambulatory">Improved / Ambulatory</option>
                                  <option value="Discharged on Request (DOR)">Discharged on Request (DOR)</option>
                                  <option value="Against Medical Advice (LAMA)">Left Against Medical Advice (LAMA)</option>
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Treatment & Clinical Course Summary</label>
                              <textarea
                                rows={2}
                                value={dischargeForm.treatmentSummary}
                                onChange={(e) => setDischargeForm({ ...dischargeForm, treatmentSummary: e.target.value })}
                                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                              ></textarea>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Follow-up Instructions & Date</label>
                                <input
                                  type="text"
                                  placeholder="e.g. OPD Visit in 7 days with ECG"
                                  value={dischargeForm.followUpInstructions}
                                  onChange={(e) => setDischargeForm({ ...dischargeForm, followUpInstructions: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Warning Signs to Watch</label>
                                <input
                                  type="text"
                                  value={dischargeForm.warningSignsToWatch}
                                  onChange={(e) => setDischargeForm({ ...dischargeForm, warningSignsToWatch: e.target.value })}
                                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-teal-800 uppercase block mb-1">Specific Instructions for Receptionist Desk (Billing & Departure Clearance)</label>
                              <textarea
                                rows={2}
                                placeholder="e.g. Settle itemized inpatient bill, include post-op meds, verify attendant ID, issue official discharge gate pass..."
                                value={dischargeForm.instructionsForReceptionist || ''}
                                onChange={(e) => setDischargeForm({ ...dischargeForm, instructionsForReceptionist: e.target.value })}
                                className="w-full p-2.5 text-xs rounded-xl border border-teal-200 bg-teal-50/20 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                              ></textarea>
                            </div>

                            {/* Doctor Digital Signature Preview */}
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-teal-700 text-lg">draw</span>
                                <div>
                                  <span className="text-[11px] font-bold text-slate-800 block">Doctor's Digital Authorization Signature</span>
                                  <span className="text-[10px] text-slate-500">
                                    Dr. {rawUserName.replace(/^Dr\.\s*/i, '')} • Reg: MCI-884920 • Timestamp: {new Date().toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Verified Medical License
                              </span>
                            </div>

                            <div className="flex justify-end">
                              <button
                                type="submit"
                                className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-base">draw</span> Sign & Authorize Medical Discharge for Receptionist
                              </button>
                            </div>
                          </form>
                        )}

                        {/* Discharge Records */}
                        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                          <div className="p-3 bg-slate-50/70 border-b border-slate-200">
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                              Discharge Records & Summaries ({patientDossier?.transferDischarges?.filter(td => td.requestType === 'Discharge')?.length || 0})
                            </h4>
                          </div>
                          <div className="divide-y divide-slate-100 text-xs">
                            {patientDossier?.transferDischarges?.filter(td => td.requestType === 'Discharge')?.length === 0 ? (
                              <div className="p-6 text-center text-slate-400 text-xs">
                                No discharge summaries generated yet. Patient is currently in active care.
                              </div>
                            ) : (
                              patientDossier?.transferDischarges?.filter(td => td.requestType === 'Discharge')?.map((dc) => (
                                <div key={dc._id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                                  <div>
                                    <p className="font-bold text-slate-800">Discharge Summary • {dc.dischargeDetails?.conditionAtDischarge || 'Stable'}</p>
                                    <p className="text-[10px] text-slate-400">Diagnosis: {dc.dischargeDetails?.dischargeDiagnosis || 'Clinical Review'} • {new Date(dc.createdAt).toLocaleString()}</p>
                                  </div>
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    {dc.status || 'Approved'}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  </>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
