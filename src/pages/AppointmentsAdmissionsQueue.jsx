import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function AppointmentsAdmissionsQueue() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  // Patient Profile Modal State
  const [patientDossier, setPatientDossier] = useState(null);
  const [dossierModalOpen, setDossierModalOpen] = useState(false);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Filter & Search States
  const [timeTab, setTimeTab] = useState('all'); // 'today' | 'upcoming' | 'all' | 'custom'
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Scheduled' | 'Checked In' | 'Waiting' | 'In Consultation' | 'Completed'
  const [doctorFilter, setDoctorFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Consultation Drawer / Modal state
  const [consultationModal, setConsultationModal] = useState({
    isOpen: false,
    appointmentId: null,
    patientName: '',
    diagnosis: '',
    treatment: '',
    notes: '',
    prescriptions: ''
  });

  // Book New Appointment Modal state
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [patientsList, setPatientsList] = useState([]);
  const [allDoctorsList, setAllDoctorsList] = useState([]);
  const [newBooking, setNewBooking] = useState({
    patientId: '',
    patientName: '',
    patientCustomId: '',
    doctorName: '',
    department: 'General Medicine',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '10:00 AM',
    type: 'Consultation',
    reason: '',
    priority: 'Routine'
  });

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole') || 'Doctor';
  const rawUserName = localStorage.getItem('userName') || (userRole === 'Receptionist' ? 'Front Desk Receptionist' : 'Dr. Physician');
  const doctorDisplayName = rawUserName.startsWith('Dr.') ? rawUserName : `Dr. ${rawUserName}`;
  const cleanDoctorName = rawUserName.replace(/^Dr\.\s*/i, '').trim();

  const formatDateStr = (d) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const todayStr = formatDateStr(new Date());

  // Fetch Appointments from MongoDB
  const fetchAppointments = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const res = await axios.get('/api/appointments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setAppointments(data);

      if (data.length > 0) {
        setSelectedAppointment(prev => {
          if (!prev) return data[0];
          const refreshed = data.find(a => a._id === prev._id);
          return refreshed || data[0];
        });
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      if (!silent) {
        setError(err.response?.data?.message || 'Failed to load appointments from MongoDB.');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Doctor Details Dossier Modal State
  const [selectedDoctorProfile, setSelectedDoctorProfile] = useState(null);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);

  // Fetch Doctors List from MongoDB
  const fetchDoctorsList = async () => {
    try {
      const res = await axios.get('/api/users/staff/doctors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const docs = Array.isArray(res.data) ? res.data : [];
      setAllDoctorsList(docs);
    } catch (err) {
      console.error('Error fetching doctors list:', err);
    }
  };

  useEffect(() => {
    fetchAppointments();
    fetchDoctorsList();

    // Auto-sync polling every 5 seconds so Doctor completions reflect in Reception in real-time
    const interval = setInterval(() => {
      fetchAppointments(true);
    }, 5000);

    const handleFocus = () => {
      fetchAppointments(true);
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Fetch doctors and patients for Booking Modal
  const loadBookingPrerequisites = async () => {
    try {
      const [patRes, docRes] = await Promise.all([
        axios.get('/api/patients', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/users/staff/doctors', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setPatientsList(Array.isArray(patRes.data) ? patRes.data : []);
      const docs = Array.isArray(docRes.data) ? docRes.data : [];
      setAllDoctorsList(docs);

      if (docs.length > 0 && !newBooking.doctorName) {
        setNewBooking(prev => ({
          ...prev,
          doctorName: docs[0].name,
          department: docs[0].department || 'General Medicine'
        }));
      }
    } catch (err) {
      console.error('Error fetching booking prerequisites:', err);
    }
  };

  const handleOpenBookModal = () => {
    loadBookingPrerequisites();
    setBookModalOpen(true);
  };

  const handleSelectPatientForBooking = (patientId) => {
    const selected = patientsList.find(p => p._id === patientId || p.patientId === patientId);
    if (selected) {
      setNewBooking(prev => ({
        ...prev,
        patientId: selected._id,
        patientName: selected.fullName || selected.name,
        patientCustomId: selected.patientId || ''
      }));
    }
  };

  const handleDoctorChange = (doctorName) => {
    const docObj = allDoctorsList.find(d => d.name === doctorName);
    setNewBooking(prev => ({
      ...prev,
      doctorName,
      department: docObj?.department || prev.department
    }));
  };

  const handleCreateAppointmentSubmit = async (e) => {
    e.preventDefault();
    if (!newBooking.patientName || !newBooking.appointmentDate || !newBooking.appointmentTime) {
      Swal.fire('Missing Details', 'Please fill in Patient Name, Date, and Time Slot.', 'warning');
      return;
    }

    try {
      setBookingLoading(true);
      const res = await axios.post('/api/appointments', newBooking, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Appointment Booked!',
        text: `Appointment for ${newBooking.patientName} with ${newBooking.doctorName} successfully created.`,
        confirmButtonColor: '#0066cc'
      });

      setBookModalOpen(false);
      setNewBooking({
        patientId: '',
        patientName: '',
        patientCustomId: '',
        doctorName: allDoctorsList[0]?.name || '',
        department: allDoctorsList[0]?.department || 'General Medicine',
        appointmentDate: new Date().toISOString().split('T')[0],
        appointmentTime: '10:00 AM',
        type: 'Consultation',
        reason: '',
        priority: 'Routine'
      });
      fetchAppointments();
    } catch (err) {
      Swal.fire('Booking Error', err.response?.data?.message || 'Failed to book appointment.', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  // Unique doctors and departments for filtering
  const availableDoctors = Array.from(new Set(appointments.map(a => a.doctorName).filter(Boolean))).sort();
  const availableDepartments = Array.from(new Set(appointments.map(a => a.department).filter(Boolean))).sort();

  // Update Status in Workflow: Scheduled -> Checked In -> Waiting -> In Consultation -> Completed
  const handleUpdateStatus = async (appointmentId, newStatus) => {
    const appointment = appointments.find(a => a._id === appointmentId) || selectedAppointment;
    if (!appointment) return;

    // If updating to In Consultation
    if (newStatus === 'In Consultation') {
      try {
        await axios.put(`/api/appointments/${appointmentId}/status`, {
          status: 'In Consultation'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        Swal.fire({
          icon: 'success',
          title: 'Consultation Started',
          text: `Patient ${appointment.patientName} is now In Consultation with ${appointment.doctorName || doctorDisplayName}.`,
          timer: 1600,
          showConfirmButton: false
        });

        fetchAppointments();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to start consultation.', 'error');
      }
      return;
    }

    // If updating to Completed, check if Doctor or Receptionist
    if (newStatus === 'Completed') {
      if (userRole === 'Receptionist') {
        Swal.fire({
          icon: 'info',
          title: 'Clinical Consultation Required',
          text: 'Clinical consultations and prescriptions must be completed by the attending Doctor.',
          confirmButtonColor: '#0f766e'
        });
        return;
      }
      setConsultationModal({
        isOpen: true,
        appointmentId,
        patientName: appointment.patientName,
        diagnosis: appointment.consultationNotes?.diagnosis || '',
        treatment: appointment.consultationNotes?.treatment || '',
        notes: appointment.consultationNotes?.notes || '',
        prescriptions: appointment.consultationNotes?.prescriptions?.join(', ') || ''
      });
      return;
    }

    // Standard status update
    try {
      await axios.put(`/api/appointments/${appointmentId}/status`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Appointment moved to "${newStatus}".`,
        timer: 1400,
        showConfirmButton: false
      });

      fetchAppointments();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to update status.', 'error');
    }
  };

  // Complete Consultation Submit Handler
  const handleFinalizeConsultation = async (e) => {
    e.preventDefault();
    if (!consultationModal.appointmentId) return;

    try {
      const rxArray = consultationModal.prescriptions
        ? consultationModal.prescriptions.split(',').map(s => s.trim()).filter(Boolean)
        : [];

      // 1. Update Appointment to Completed with Consultation Notes
      await axios.put(`/api/appointments/${consultationModal.appointmentId}/status`, {
        status: 'Completed',
        consultationNotes: {
          diagnosis: consultationModal.diagnosis,
          treatment: consultationModal.treatment,
          notes: consultationModal.notes,
          prescriptions: rxArray
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Also save to MedicalRecord if patientId exists
      if (selectedAppointment?.patientId?._id || selectedAppointment?.patientId) {
        const pId = selectedAppointment.patientId._id || selectedAppointment.patientId;
        await axios.post('/api/medical-records', {
          patientId: pId,
          diagnosis: consultationModal.diagnosis,
          treatment: consultationModal.treatment,
          notes: consultationModal.notes,
          prescriptions: rxArray.map(m => ({ medication: m, dosage: 'Standard', frequency: 'Per Doctor Advice', duration: 'As Prescribed' }))
        }, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => null);
      }

      Swal.fire({
        icon: 'success',
        title: 'Consultation Completed',
        text: `Clinical evaluation for ${consultationModal.patientName} saved and appointment completed.`,
        confirmButtonColor: '#0066cc'
      });

      setConsultationModal({ isOpen: false, appointmentId: null, patientName: '', diagnosis: '', treatment: '', notes: '', prescriptions: '' });
      fetchAppointments();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to complete consultation.', 'error');
    }
  };

  // Open Full Patient Profile Dossier
  const handleOpenPatientRecord = async (appointment) => {
    try {
      setDossierModalOpen(true);
      setDossierLoading(true);
      const pid = appointment.patientId?._id || appointment.patientCustomId || appointment.patientName;
      const res = await axios.get(`/api/patients/${pid}/full-details`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPatientDossier(res.data);
    } catch (err) {
      console.error('Error opening patient record:', err);
      // Fallback
      setPatientDossier({
        patient: {
          fullName: appointment.patientName,
          patientId: appointment.patientCustomId,
          status: 'Outpatient'
        },
        medicalRecords: [],
        appointments: [appointment]
      });
    } finally {
      setDossierLoading(false);
    }
  };

  // Filtered Appointments
  const filteredAppointments = appointments.filter(app => {
    // Search query match
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (app.patientName || '').toLowerCase().includes(q) ||
      (app.patientCustomId || '').toLowerCase().includes(q) ||
      (app.doctorName || '').toLowerCase().includes(q) ||
      (app.department || '').toLowerCase().includes(q) ||
      (app._id || '').toLowerCase().includes(q) ||
      (app.reason || '').toLowerCase().includes(q);

    // Status filter
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;

    // Doctor filter (for Admin / Receptionist)
    const matchesDoc = doctorFilter === 'All' || app.doctorName === doctorFilter;

    // Department filter
    const matchesDept = departmentFilter === 'All' || (app.department || '').toLowerCase() === departmentFilter.toLowerCase();

    // Time / Date filter
    let matchesTime = true;
    if (timeTab === 'today') {
      matchesTime = app.appointmentDate === todayStr;
    } else if (timeTab === 'upcoming') {
      matchesTime = app.appointmentDate >= todayStr;
    } else if (timeTab === 'custom' && selectedDate) {
      matchesTime = app.appointmentDate === selectedDate;
    }

    return matchesSearch && matchesStatus && matchesDoc && matchesDept && matchesTime;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Scheduled':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Checked In':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Waiting':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'In Consultation':
        return 'bg-teal-50 text-teal-700 border-teal-300 font-extrabold animate-pulse';
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // Counters
  const todayCount = appointments.filter(a => a.appointmentDate === todayStr).length;
  const waitingCount = appointments.filter(a => a.status === 'Waiting' || a.status === 'Checked In').length;
  const inConsultCount = appointments.filter(a => a.status === 'In Consultation').length;
  const completedCount = appointments.filter(a => a.status === 'Completed').length;

  return (
    <div className="w-full flex flex-col space-y-4 pb-12">
      
      {/* 1. Header Banner & Status Summary */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-lg">
              📅
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800">
                  {userRole === 'Admin' || userRole === 'Receptionist' ? 'Appointments & Queue Management' : 'Doctor Appointments'}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                  {appointments.length} Total
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {userRole === 'Admin' || userRole === 'Receptionist'
                  ? 'Real-Time Hospital Consultation Pipeline & Waiting Queue Monitor' 
                  : `Appointments Assigned to ${doctorDisplayName} • Real-time Consultation Workflow Lifecycle`}
              </p>
            </div>
          </div>

          {/* Quick Search & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Patient, ID, Doctor, Dept..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 w-56 md:w-64"
              />
            </div>

            <button
              onClick={handleOpenBookModal}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-colors flex items-center gap-1.5 text-xs font-bold shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add_circle</span> Book Appointment
            </button>

            <button
              onClick={fetchAppointments}
              title="Refresh Appointments"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors flex items-center gap-1 text-xs font-bold px-3 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">refresh</span> Refresh
            </button>
          </div>
        </div>

        {/* Multi-Filter Bar: Date, Doctor, Department, Status */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2.5 text-xs">
          {/* Time Tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {[
              { id: 'today', label: "Today's" },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'all', label: 'All Dates' },
              { id: 'custom', label: 'By Date' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeTab(tab.id)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  timeTab === tab.id
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Custom Date Input */}
          {timeTab === 'custom' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-teal-600"
            />
          )}

          {/* Doctor Filter (Visible for Admin and staff) */}
          {userRole !== 'Doctor' && availableDoctors.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={doctorFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setDoctorFilter(val);
                  if (val !== 'All') {
                    const foundDoc = allDoctorsList.find(d => d.name === val || d.name === `Dr. ${val}` || d.name?.replace(/^Dr\.\s*/i, '') === val.replace(/^Dr\.\s*/i, ''));
                    if (foundDoc) setSelectedDoctorProfile(foundDoc);
                  } else {
                    setSelectedDoctorProfile(null);
                  }
                }}
                className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 font-bold focus:outline-none focus:border-teal-600 cursor-pointer"
              >
                <option value="All">👨‍⚕️ All Doctors ({availableDoctors.length})</option>
                {availableDoctors.map((doc, idx) => (
                  <option key={idx} value={doc}>{doc}</option>
                ))}
              </select>

              {doctorFilter !== 'All' && (
                <button
                  type="button"
                  onClick={() => {
                    const foundDoc = allDoctorsList.find(d => d.name === doctorFilter || d.name === `Dr. ${doctorFilter}` || d.name?.replace(/^Dr\.\s*/i, '') === doctorFilter.replace(/^Dr\.\s*/i, ''));
                    if (foundDoc) {
                      setSelectedDoctorProfile(foundDoc);
                      setDoctorModalOpen(true);
                    } else {
                      setSelectedDoctorProfile({
                        name: doctorFilter,
                        department: departmentFilter !== 'All' ? departmentFilter : 'Specialist Consultant',
                        specialization: 'Clinical Consultation Specialist',
                        assignedShift: 'Regular OPD Shift (09:00 AM - 05:00 PM)',
                        cabinNumber: 'Consultation Suite OPD',
                        phone: '+91 98765 43210',
                        email: 'doctor@mediflow.health',
                        availability: { status: 'Available', shiftHours: '09:00 AM - 05:00 PM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }
                      });
                      setDoctorModalOpen(true);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  title="View full doctor profile & schedule details"
                >
                  <span className="material-symbols-outlined text-sm">badge</span>
                  <span>View Doctor Profile</span>
                </button>
              )}
            </div>
          )}

          {/* Department Filter */}
          {availableDepartments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-teal-600"
            >
              <option value="All">🏥 All Departments</option>
              {availableDepartments.map((dept, idx) => (
                <option key={idx} value={dept}>{dept}</option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:border-teal-600"
          >
            <option value="All">🔄 All Statuses</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Checked In">Checked In</option>
            <option value="Waiting">Waiting in Queue</option>
            <option value="In Consultation">In Consultation</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>

          {(statusFilter !== 'All' || doctorFilter !== 'All' || departmentFilter !== 'All' || timeTab !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('All');
                setDoctorFilter('All');
                setSelectedDoctorProfile(null);
                setDepartmentFilter('All');
                setTimeTab('all');
                setSelectedDate('');
                setSearchQuery('');
              }}
              className="text-rose-600 hover:text-rose-700 font-bold text-[11px] underline ml-auto cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Selected Doctor Highlights Banner */}
        {doctorFilter !== 'All' && selectedDoctorProfile && (
          <div className="mt-1 p-3.5 bg-gradient-to-r from-teal-50 via-teal-50/60 to-slate-50 border border-teal-200 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-teal-800 text-white font-black flex items-center justify-center text-base shadow-xs shrink-0">
                👨‍⚕️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-teal-950">{selectedDoctorProfile.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                    {selectedDoctorProfile.department || 'Consultant'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedDoctorProfile.availability?.status || 'Available'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  <span className="font-semibold text-slate-700">Specialty:</span> {selectedDoctorProfile.specialization || selectedDoctorProfile.qualification || 'Clinical Specialist'} • <span className="font-semibold text-slate-700">Cabin:</span> {selectedDoctorProfile.cabinNumber || 'OPD Suite'} • <span className="font-semibold text-slate-700">Shift:</span> {selectedDoctorProfile.assignedShift || selectedDoctorProfile.availability?.shiftHours || '09:00 AM - 05:00 PM'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setDoctorModalOpen(true)}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">visibility</span>
                <span>Full Doctor Dossier</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* 2. Pipeline KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-lg">
            📅
          </div>
          <div>
            <span className="text-lg font-black text-slate-800 block">{todayCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Today's Total</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-lg">
            ⏳
          </div>
          <div>
            <span className="text-lg font-black text-amber-700 block">{waitingCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Waiting / Checked-In</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-lg">
            🩺
          </div>
          <div>
            <span className="text-lg font-black text-teal-700 block">{inConsultCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">In Consultation</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-lg">
            ✅
          </div>
          <div>
            <span className="text-lg font-black text-emerald-700 block">{completedCount}</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase">Completed</span>
          </div>
        </div>
      </div>

      {/* 3. Main Dual-Pane Appointments & Consultation Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Appointments List (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col max-h-[820px] overflow-hidden">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-700 text-sm">event_note</span>
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Appointments ({filteredAppointments.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Select to manage</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl animate-spin text-teal-600 mb-2">sync</span>
                <p className="text-xs font-semibold">Loading doctor appointments...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">event_busy</span>
                <p className="text-xs font-bold text-slate-600">No appointments found</p>
                <p className="text-[11px] text-slate-400 mt-1">No appointments match the chosen filter.</p>
              </div>
            ) : (
              filteredAppointments.map((app) => {
                const isSelected = selectedAppointment?._id === app._id;
                const status = app.status || 'Scheduled';
                const isDoctorOwner = (app.doctorName || '').toLowerCase().includes(cleanDoctorName.toLowerCase());

                return (
                  <div
                    key={app._id}
                    onClick={() => setSelectedAppointment(app)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-teal-50/70 border-teal-600 ring-1 ring-teal-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {/* Top Row: Patient Name & Status */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {app.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">{app.patientName}</h4>
                          <span className="text-[10px] font-mono text-slate-500">ID: {app.patientCustomId || 'P-Record'}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${getStatusBadge(status)}`}>
                        {status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-1 font-medium mt-1">
                      {app.reason || 'General clinical consultation'}
                    </p>

                    {/* Metadata Grid */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-teal-600">schedule</span>
                          {app.appointmentDate} • {app.appointmentTime}
                        </span>
                        {userRole !== 'Doctor' && app.doctorName && (
                          <span className="text-[10px] text-slate-500 font-medium truncate">
                            👨‍⚕️ {app.doctorName} • {app.department || 'Cardiology'}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded shrink-0">
                        {app.type || 'Consultation'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Selected Appointment & Clinical Consultation Desk (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[600px] max-h-[820px] overflow-hidden">
          {!selectedAppointment ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">clinical_notes</span>
              <h3 className="text-sm font-extrabold text-slate-700">Select an Appointment</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose an appointment from the queue on the left to start a consultation, review full patient records, and update status.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              
              {/* Patient Banner */}
              <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-700 to-teal-900 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                    {selectedAppointment.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{selectedAppointment.patientName}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800 font-mono">
                        {selectedAppointment.patientCustomId || 'PID-N/A'}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(selectedAppointment.status)}`}>
                        {selectedAppointment.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedAppointment.type || 'Consultation'} • {selectedAppointment.department || 'Cardiology'} • Time: <strong className="text-slate-800">{selectedAppointment.appointmentTime}</strong>
                    </p>
                  </div>
                </div>

                {/* Patient Profile Open Button */}
                <button
                  type="button"
                  onClick={() => handleOpenPatientRecord(selectedAppointment)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">person</span> Open Patient Record
                </button>
              </div>

              {/* 5-Step Workflow Progression */}
              <div className="p-4 bg-white border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    Appointment Workflow: Scheduled → Checked-In → Waiting → In Consultation → Completed
                  </h4>
                  <span className="text-[11px] font-bold text-teal-800">
                    Current Stage: {selectedAppointment.status}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { key: 'Scheduled', label: '1. Scheduled', icon: 'event' },
                    { key: 'Checked In', label: '2. Checked In', icon: 'login' },
                    { key: 'Waiting', label: '3. Waiting', icon: 'hourglass_empty' },
                    { key: 'In Consultation', label: '4. In Consult', icon: 'stethoscope' },
                    { key: 'Completed', label: '5. Completed', icon: 'check_circle' },
                  ].map((step) => {
                    const statusOrder = ['Scheduled', 'Checked In', 'Waiting', 'In Consultation', 'Completed'];
                    const currentIdx = statusOrder.indexOf(selectedAppointment.status);
                    const stepIdx = statusOrder.indexOf(step.key);
                    const isPassed = currentIdx >= stepIdx;
                    const isCurrent = currentIdx === stepIdx;

                    return (
                      <button
                        key={step.key}
                        type="button"
                        onClick={() => handleUpdateStatus(selectedAppointment._id, step.key)}
                        className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 border transition-all ${
                          isCurrent
                            ? 'bg-teal-700 text-white border-teal-700 shadow-xs font-extrabold ring-2 ring-teal-200'
                            : isPassed
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold'
                            : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">{step.icon}</span>
                        <span className="text-[10px] truncate max-w-full">{step.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Comprehensive Details Section */}
              <div className="p-5 space-y-4">
                
                {/* 1. Appointment Specifications */}
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base">info</span> Appointment Details
                  </h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Appointment ID</span>
                      <span className="font-mono font-bold text-slate-800">{selectedAppointment._id}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient ID</span>
                      <span className="font-mono font-bold text-teal-700">{selectedAppointment.patientCustomId || 'N/A'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient Name</span>
                      <span className="font-bold text-slate-800">{selectedAppointment.patientName}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Date & Time</span>
                      <span className="font-bold text-slate-800">{selectedAppointment.appointmentDate} at {selectedAppointment.appointmentTime}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Department</span>
                      <span className="font-bold text-slate-800">{selectedAppointment.department || 'Cardiology'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Appointment Type</span>
                      <span className="font-bold text-teal-800">{selectedAppointment.type || 'Consultation'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Attending Doctor</span>
                      <span className="font-bold text-slate-800">{selectedAppointment.doctorName}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Previous Visit</span>
                      <span className="font-bold text-indigo-700">{selectedAppointment.previousVisit || 'First Visit'}</span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Current Status</span>
                      <span className={`font-black ${selectedAppointment.status === 'Completed' ? 'text-emerald-700' : 'text-teal-700'}`}>
                        {selectedAppointment.status}
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-100 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Reason for Visit / Chief Complaint</span>
                    <p className="font-semibold text-slate-800">{selectedAppointment.reason || 'Clinical evaluation requested.'}</p>
                  </div>
                </div>

                {/* 2. Doctor Action Bar - Only for Doctors / Admins */}
                {userRole !== 'Receptionist' && (
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                      <span>Clinical Actions for {selectedAppointment.patientName}</span>
                    </h4>

                    <div className="flex flex-wrap items-center gap-2.5">
                      {/* Start Consultation Button */}
                      {selectedAppointment.status !== 'In Consultation' && selectedAppointment.status !== 'Completed' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedAppointment._id, 'In Consultation')}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">stethoscope</span>
                          Start Consultation (Patient Ready)
                        </button>
                      )}

                      {/* Finalize Consultation Button */}
                      {selectedAppointment.status === 'In Consultation' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(selectedAppointment._id, 'Completed')}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-base">verified</span>
                          Finalize & Complete Consultation
                        </button>
                      )}

                      {/* Open Full Clinical Consultation Suite */}
                      <button
                        type="button"
                        onClick={() => navigate('/consultations', { 
                          state: { 
                            patientId: selectedAppointment.patientId?._id || selectedAppointment.patientId,
                            appointmentId: selectedAppointment._id 
                          } 
                        })}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">clinical_notes</span>
                        Open Clinical Consultation Suite
                      </button>

                      {/* Open Patient Record Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenPatientRecord(selectedAppointment)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base">folder_shared</span>
                        Inspect Full Medical History
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Completed Consultation Record View */}
                {selectedAppointment.status === 'Completed' && selectedAppointment.consultationNotes && (
                  <div className="bg-emerald-50/40 p-4 rounded-xl border border-emerald-200 space-y-2.5 text-xs">
                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">verified</span> Completed Consultation Summary
                    </h4>
                    <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-1.5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Diagnosis</span>
                        <span className="font-bold text-slate-800">{selectedAppointment.consultationNotes.diagnosis || 'Cardiology Assessment'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Treatment & Orders</span>
                        <span className="font-semibold text-slate-800">{selectedAppointment.consultationNotes.treatment || 'Standard treatment followed'}</span>
                      </div>
                      {selectedAppointment.consultationNotes.prescriptions?.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Prescribed Medicines</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {selectedAppointment.consultationNotes.prescriptions.map((rx, i) => (
                              <span key={i} className="px-2 py-0.5 bg-teal-50 text-teal-800 rounded font-bold border border-teal-200 text-[11px]">
                                {rx}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedAppointment.consultationNotes.notes && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">Doctor Notes</span>
                          <p className="text-slate-600">{selectedAppointment.consultationNotes.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

      </div>

      {/* Complete Consultation Modal */}
      {consultationModal.isOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setConsultationModal({ ...consultationModal, isOpen: false })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '34rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-teal-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-xl">stethoscope</span>
                <h3 className="font-bold text-white text-sm">
                  Complete Consultation: {consultationModal.patientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConsultationModal({ ...consultationModal, isOpen: false })}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleFinalizeConsultation} className="p-5 space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Clinical Diagnosis *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mild Hypertension / Acute Sinusitis"
                  value={consultationModal.diagnosis}
                  onChange={(e) => setConsultationModal({ ...consultationModal, diagnosis: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Treatment Plan & Medical Orders *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Low sodium diet, maintain daily BP log, follow-up in 2 weeks"
                  value={consultationModal.treatment}
                  onChange={(e) => setConsultationModal({ ...consultationModal, treatment: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Prescribed Medicines (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Amlodipine 5mg OD, Paracetamol 650mg SOS"
                  value={consultationModal.prescriptions}
                  onChange={(e) => setConsultationModal({ ...consultationModal, prescriptions: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1">Clinical Progress & Doctor Notes</label>
                <textarea
                  rows={3}
                  placeholder="Clinical progress, observations, or review directives..."
                  value={consultationModal.notes}
                  onChange={(e) => setConsultationModal({ ...consultationModal, notes: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setConsultationModal({ ...consultationModal, isOpen: false })}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">verified</span> Complete Consultation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Patient Dossier Inspect Modal */}
      {dossierModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setDossierModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '42rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-slate-800 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-xl">folder_shared</span>
                <h3 className="font-bold text-white text-sm">
                  Patient Medical Dossier: {patientDossier?.patient?.fullName || selectedAppointment?.patientName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDossierModalOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {dossierLoading ? (
                <div className="p-10 text-center text-slate-400">
                  <span className="material-symbols-outlined text-3xl animate-spin text-teal-600 mb-2">sync</span>
                  <p className="text-xs font-semibold">Loading dossier from database...</p>
                </div>
              ) : (
                <>
                  {/* Basic Profile */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Patient ID</span>
                      <span className="font-mono font-bold text-teal-800">{patientDossier?.patient?.patientId || selectedAppointment?.patientCustomId}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Age / Gender</span>
                      <span className="font-bold text-slate-800">{patientDossier?.patient?.age || 'N/A'} yrs • {patientDossier?.patient?.gender || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Blood Group</span>
                      <span className="font-bold text-rose-600">{patientDossier?.patient?.clinicalInfo?.bloodGroup || 'O+'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                      <span className="font-bold text-slate-800">{patientDossier?.patient?.status || 'Active'}</span>
                    </div>
                  </div>

                  {/* Past Consultations */}
                  <div>
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2">Past Consultations & Diagnoses</h5>
                    {patientDossier?.medicalRecords?.length === 0 ? (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 text-xs text-center">
                        No prior medical consultations recorded.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {patientDossier?.medicalRecords?.map((rec) => (
                          <div key={rec._id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                            <div className="flex justify-between font-bold text-slate-800">
                              <span>{rec.diagnosis || 'Clinical Consultation'}</span>
                              <span className="text-[10px] text-slate-400">{new Date(rec.createdAt).toLocaleDateString()}</span>
                            </div>
                            {rec.treatment && <p className="text-slate-600"><strong>Treatment:</strong> {rec.treatment}</p>}
                            {rec.notes && <p className="text-slate-500 text-[11px]">{rec.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setDossierModalOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Book New Appointment Modal */}
      {bookModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setBookModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '36rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-teal-700 to-teal-900 text-white">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">event_available</span>
                </span>
                <div>
                  <h3 className="font-bold text-base">Book New Appointment</h3>
                  <p className="text-white/80 text-xs mt-0.5">Schedule clinical consultation & register OPD queue slot</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBookModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateAppointmentSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* Select Existing Patient or Type Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Registered Patient (Optional)
                </label>
                <select
                  onChange={(e) => handleSelectPatientForBooking(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
                >
                  <option value="">-- Choose from registered patients or type below --</option>
                  {patientsList.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.fullName || p.name} ({p.patientId || 'ID: Pending'}) • {p.gender || ''}, {p.age ? `${p.age}y` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient Name & Patient Custom ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Patient Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBooking.patientName}
                    onChange={(e) => setNewBooking({ ...newBooking, patientName: e.target.value })}
                    placeholder="e.g. Priya Iyer"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={newBooking.patientCustomId}
                    onChange={(e) => setNewBooking({ ...newBooking, patientCustomId: e.target.value })}
                    placeholder="e.g. P10001 or PM-445901"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600 font-mono"
                  />
                </div>
              </div>

              {/* Assigned Doctor & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consulting Doctor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={newBooking.doctorName}
                    onChange={(e) => handleDoctorChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600 font-medium"
                  >
                    {allDoctorsList.length > 0 ? (
                      allDoctorsList.map(doc => (
                        <option key={doc._id} value={doc.name}>
                          {doc.name} ({doc.department || 'Consultant'})
                        </option>
                      ))
                    ) : (
                      <option value="">No doctors registered yet</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={newBooking.department}
                    onChange={(e) => setNewBooking({ ...newBooking, department: e.target.value })}
                    placeholder="e.g. Cardiology"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Appointment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newBooking.appointmentDate}
                    onChange={(e) => setNewBooking({ ...newBooking, appointmentDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Time Slot <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newBooking.appointmentTime}
                    onChange={(e) => setNewBooking({ ...newBooking, appointmentTime: e.target.value })}
                    placeholder="e.g. 10:30 AM"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Type & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Appointment Type
                  </label>
                  <select
                    value={newBooking.type}
                    onChange={(e) => setNewBooking({ ...newBooking, type: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Routine Checkup">Routine Checkup</option>
                    <option value="Specialist Review">Specialist Review</option>
                    <option value="Pre-Op Evaluation">Pre-Op Evaluation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newBooking.priority}
                    onChange={(e) => setNewBooking({ ...newBooking, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Chief Reason / Symptoms */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Visit / Chief Symptoms
                </label>
                <textarea
                  rows="2"
                  value={newBooking.reason}
                  onChange={(e) => setNewBooking({ ...newBooking, reason: e.target.value })}
                  placeholder="e.g. Routine blood pressure evaluation and ECG checkup..."
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setBookModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingLoading}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                >
                  {bookingLoading ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      <span>Booking...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">calendar_month</span>
                      <span>Confirm Booking</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: FULL DOCTOR PROFILE & CONSULTATION SCHEDULE DOSSIER */}
      {doctorModalOpen && selectedDoctorProfile && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setDoctorModalOpen(false)}
        >
          <div 
            className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto w-full max-w-lg"
            style={{ width: '100%', maxWidth: '34rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-teal-800 to-teal-950 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-xl shadow-xs">
                  👨‍⚕️
                </div>
                <div>
                  <h3 className="text-base font-black">{selectedDoctorProfile.name}</h3>
                  <p className="text-xs text-teal-200">
                    {selectedDoctorProfile.department || 'Clinical Specialist'} • {selectedDoctorProfile.doctorId || 'DOC-REG'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDoctorModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Specialization & Qualification Banner */}
              <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-teal-800 tracking-wider block">Clinical Specialization & Qualifications</span>
                <p className="font-bold text-slate-800 text-xs">
                  {selectedDoctorProfile.specialization || 'Internal Medicine & Diagnostic Consultations'}
                </p>
                <p className="text-[11px] text-slate-600">
                  {selectedDoctorProfile.qualification || selectedDoctorProfile.qualifications || 'MBBS, MD (Specialist Care), Fellow Clinical Medicine'}
                </p>
              </div>

              {/* Consultation Duty & Schedule Info */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Consultation Suite / Cabin</span>
                  <span className="font-bold text-slate-800 text-xs block mt-0.5">{selectedDoctorProfile.cabinNumber || 'OPD Suite 105, Block A'}</span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Duty Shift & Hours</span>
                  <span className="font-bold text-slate-800 text-xs block mt-0.5">{selectedDoctorProfile.assignedShift || selectedDoctorProfile.availability?.shiftHours || '09:00 AM - 05:00 PM'}</span>
                </div>
              </div>

              {/* Contact & Availability Details */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Contact & Operational Status</span>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Official Phone</span>
                    <span className="font-semibold text-slate-900">{selectedDoctorProfile.phone || '+91 98765 43210'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Official Email</span>
                    <span className="font-semibold text-slate-900 truncate block">{selectedDoctorProfile.email || 'doctor@mediflow.health'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Availability Status:</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {selectedDoctorProfile.availability?.status || 'Active & On Duty'}
                  </span>
                </div>
              </div>

              {/* Bio Summary */}
              {selectedDoctorProfile.bio && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Doctor Biography</span>
                  <p className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium leading-relaxed">
                    {selectedDoctorProfile.bio}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDoctorModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
