import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function PatientRegistrationMediFlow() {
  const navigate = useNavigate();
  
  // Controlled States
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('Male');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  
  const [purpose, setPurpose] = useState('');
  const [bloodGroup, setBloodGroup] = useState('A+');
  const [allergies, setAllergies] = useState(['Penicillin', 'Latex']);
  const [allergyInput, setAllergyInput] = useState('');
  
  // Phone uniqueness live checking (Primary Contact)
  const [phoneChecking, setPhoneChecking] = useState(false);
  const [existingPatientFound, setExistingPatientFound] = useState(null);

  // Phone uniqueness live checking (Emergency Contact)
  const [emergencyPhoneChecking, setEmergencyPhoneChecking] = useState(false);
  const [emergencyPatientFound, setEmergencyPatientFound] = useState(null);
  
  // Registration Pathway: 'APPOINTMENT_OPD', 'EMERGENCY', 'WALK_IN'
  const [registrationPathway, setRegistrationPathway] = useState('APPOINTMENT_OPD'); 
  const [ward, setWard] = useState('General');
  const [doctor, setDoctor] = useState('');
  const [doctorsList, setDoctorsList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [registeredSuccessInfo, setRegisteredSuccessInfo] = useState(null);

  // Book Appointment Modal State (triggered after registration)
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState({
    patientId: '',
    patientName: '',
    patientCustomId: '',
    doctorName: '',
    department: '',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '10:00 AM',
    type: 'Consultation',
    reason: '',
    priority: 'Routine'
  });

  // Fetch doctors from backend
  React.useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        const res = await axios.get('/api/users/staff/doctors', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (Array.isArray(res.data) && res.data.length > 0) {
          setDoctorsList(res.data);
          const firstDoc = res.data[0];
          setDoctor(`${firstDoc.name} (${firstDoc.department || 'Consultant'})`);
          setAppointmentDetails(prev => ({
            ...prev,
            doctorName: firstDoc.name,
            department: firstDoc.department || 'General Medicine'
          }));
        }
      } catch (err) {
        console.error('Error fetching doctors:', err);
      }
    };
    fetchDoctors();
  }, []);

  // Debounced phone uniqueness live check for primary phone
  React.useEffect(() => {
    const cleanPhone = contact.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');

    if (cleanDigits.length < 7) {
      setExistingPatientFound(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPhoneChecking(true);
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        const res = await axios.get(`/api/patients/check-phone?phone=${encodeURIComponent(cleanPhone)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.exists) {
          setExistingPatientFound(res.data);
        } else {
          setExistingPatientFound(null);
        }
      } catch (err) {
        console.error('Error verifying phone uniqueness:', err);
      } finally {
        setPhoneChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [contact]);

  // Debounced phone uniqueness live check for emergency phone
  React.useEffect(() => {
    const cleanPhone = emergencyPhone.trim();
    const cleanDigits = cleanPhone.replace(/\D/g, '');

    if (cleanDigits.length < 7) {
      setEmergencyPatientFound(null);
      return;
    }

    // Check if emergency phone is identical to primary phone
    if (contact.trim() && cleanPhone === contact.trim()) {
      setEmergencyPatientFound({
        isSameAsPrimary: true,
        message: 'Emergency phone cannot be the exact same as Patient primary phone number.'
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setEmergencyPhoneChecking(true);
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        const res = await axios.get(`/api/patients/check-phone?phone=${encodeURIComponent(cleanPhone)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.exists) {
          setEmergencyPatientFound(res.data);
        } else {
          setEmergencyPatientFound(null);
        }
      } catch (err) {
        console.error('Error verifying emergency phone uniqueness:', err);
      } finally {
        setEmergencyPhoneChecking(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [emergencyPhone, contact]);

  const handleAddAllergy = (e) => {
    if (e.key === 'Enter' && allergyInput.trim() !== '') {
      e.preventDefault();
      if (!allergies.includes(allergyInput.trim())) {
        setAllergies([...allergies, allergyInput.trim()]);
      }
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (indexToRemove) => {
    setAllergies(allergies.filter((_, index) => index !== indexToRemove));
  };

  const resetForm = () => {
    setFullName('');
    setAge('');
    setDob('');
    setGender('Male');
    setContact('');
    setEmail('');
    setAddress('');
    setEmergencyName('');
    setEmergencyRelationship('Spouse');
    setEmergencyPhone('');
    setPurpose('');
    setBloodGroup('A+');
    setAllergies(['Penicillin', 'Latex']);
    setRegistrationPathway('APPOINTMENT_OPD');
    setWard('General');
    setExistingPatientFound(null);
    if (doctorsList.length > 0) {
      setDoctor(`${doctorsList[0].name} (${doctorsList[0].department || 'Consultant'})`);
    }
  };

  // Helper to get selected doctor object
  const getSelectedDoctorObj = () => {
    const docCleanName = doctor.split('(')[0].trim();
    return doctorsList.find(d => d.name === docCleanName) || null;
  };

  // Helper to format doctor availability status
  const getDoctorAvailabilityInfo = (doc) => {
    const rawStatus = doc?.availability?.status || (doc?.status === 'Inactive' ? 'Not Available' : 'Available');
    const normalized = rawStatus.trim().toLowerCase();

    if (normalized === 'available' || normalized === 'active' || normalized === 'on duty') {
      return { 
        label: 'Available', 
        color: 'emerald', 
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
        dot: 'bg-emerald-500', 
        icon: '🟢',
        isAvailable: true 
      };
    } else if (normalized === 'in consultation') {
      return { 
        label: 'In Consultation', 
        color: 'amber', 
        bg: 'bg-amber-50 text-amber-700 border-amber-200', 
        dot: 'bg-amber-500', 
        icon: '🟡',
        isAvailable: false 
      };
    } else if (
      normalized === 'not available' || 
      normalized === 'unavailable' || 
      normalized === 'on leave' || 
      normalized === 'off duty' || 
      normalized === 'in emergency / ot' ||
      normalized === 'inactive'
    ) {
      return { 
        label: rawStatus === 'Inactive' ? 'Not Available' : (rawStatus || 'Not Available'), 
        color: 'rose', 
        bg: 'bg-rose-50 text-rose-700 border-rose-200', 
        dot: 'bg-rose-500', 
        icon: '🔴',
        isAvailable: false 
      };
    } else {
      return { 
        label: rawStatus || 'Not Available', 
        color: 'rose', 
        bg: 'bg-rose-50 text-rose-700 border-rose-200', 
        dot: 'bg-rose-500', 
        icon: '🔴',
        isAvailable: false 
      };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (existingPatientFound) {
      Swal.fire({
        icon: 'error',
        title: 'Duplicate Phone Number',
        html: `
          <div style="text-align: left; font-size: 13px; color: #1e293b;">
            <p>This phone number <strong>${contact}</strong> is already registered to <strong>${existingPatientFound.fullName}</strong> (ID: <strong>${existingPatientFound.patientId}</strong>).</p>
            <p style="margin-top: 8px; color: #dc2626; font-weight: bold;">Reusing the same phone number for a new patient registration is not allowed.</p>
          </div>
        `,
        confirmButtonColor: '#0066cc',
        confirmButtonText: 'OK, I will use a different number'
      });
      return;
    }

    if (emergencyPatientFound) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Emergency Phone Number',
        html: `
          <div style="text-align: left; font-size: 13px; color: #1e293b;">
            <p>${emergencyPatientFound.isSameAsPrimary ? emergencyPatientFound.message : `Emergency contact phone <strong>${emergencyPhone}</strong> is already registered to <strong>${emergencyPatientFound.fullName}</strong> (ID: <strong>${emergencyPatientFound.patientId}</strong>).`}</p>
            <p style="margin-top: 8px; color: #dc2626; font-weight: bold;">Please provide a unique, valid emergency contact number.</p>
          </div>
        `,
        confirmButtonColor: '#0066cc',
        confirmButtonText: 'OK, I will update emergency contact'
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const docNameClean = registrationPathway === 'APPOINTMENT_OPD' ? doctor.split('(')[0].trim() : '';
      const docDeptClean = registrationPathway === 'APPOINTMENT_OPD' && doctor.includes('(') ? doctor.split('(')[1].replace(')', '').trim() : (registrationPathway === 'WALK_IN' ? 'General' : 'Emergency');

      const payload = {
        fullName,
        age: age ? Number(age) : undefined,
        dob: dob || undefined,
        dateOfBirth: dob || undefined,
        gender,
        phoneNumber: contact,
        contactNumber: contact,
        contact,
        email,
        address,
        emergencyName,
        emergencyContactName: emergencyName,
        emergencyRelationship,
        emergencyContactRelationship: emergencyRelationship,
        emergencyPhone,
        emergencyContactPhone: emergencyPhone,
        purpose,
        chiefComplaint: purpose,
        complaint: purpose,
        bloodGroup,
        allergies,
        registrationPathway, // 'APPOINTMENT_OPD', 'EMERGENCY', 'WALK_IN'
        registrationType: registrationPathway === 'APPOINTMENT_OPD' ? 'opd' : (registrationPathway === 'WALK_IN' ? 'walk_in' : 'emergency'),
        status: 'Registered',
        ward: 'Outpatient',
        wardType: 'Outpatient',
        doctor: docNameClean,
        assignedDoctor: docNameClean
      };

      const response = await axios.post('/api/patients', payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = response.data;

      if (response.status === 201 || data.success) {
        const generatedId = data.patientId || data.patient?.patientId;
        const mongoId = data.patient?._id || data._id;
        const savedPatientName = fullName;
        const savedContact = contact;

        // Set persistent success info on the registration page
        setRegisteredSuccessInfo({
          patientId: generatedId,
          mongoId: mongoId,
          fullName: savedPatientName,
          contact: savedContact,
          bedNumber: null,
          registrationPathway: registrationPathway
        });

        // Pre-fill Appointment Details for OPD pathway
        if (registrationPathway === 'APPOINTMENT_OPD') {
          setAppointmentDetails({
            patientId: mongoId,
            patientName: savedPatientName,
            patientCustomId: generatedId,
            doctorName: docNameClean || (doctorsList[0]?.name || 'Dr. Sarah Chen'),
            department: docDeptClean || (doctorsList[0]?.department || 'General Medicine'),
            appointmentDate: new Date().toISOString().split('T')[0],
            appointmentTime: '10:00 AM',
            type: 'Consultation',
            reason: purpose || 'Initial consultation & assessment',
            priority: 'Routine'
          });
        }

        const pathwayLabel = registrationPathway === 'APPOINTMENT_OPD' 
          ? 'Appointment / OPD' 
          : (registrationPathway === 'WALK_IN' ? 'Walk-in / Registration Only' : 'Emergency');

        // Clear form after verified database save
        resetForm();

        const htmlMsg = `
          <div style="text-align: left; font-size: 14px; line-height: 1.6; color: #1e293b;">
            <div style="background: #e0edff; padding: 14px; border-radius: 10px; margin-bottom: 12px; border: 1.5px solid #0066cc;">
              <span style="font-size: 11px; color: #0066cc; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Generated Patient ID:</span>
              <div style="font-size: 24px; font-weight: 800; color: #0055b3; letter-spacing: 0.5px; margin-top: 2px;">${generatedId}</div>
            </div>
            <p style="margin: 4px 0;"><strong>Patient Name:</strong> ${savedPatientName}</p>
            <p style="margin: 4px 0;"><strong>Registration Pathway:</strong> <span style="font-weight: bold; color: #0284c7;">${pathwayLabel}</span></p>
            <p style="margin: 4px 0;"><strong>Phone Number:</strong> ${savedContact}</p>
            <p style="margin-top: 10px; font-size: 12px; color: #64748b;">This record is saved in MongoDB. ${registrationPathway === 'APPOINTMENT_OPD' ? 'You can now book an appointment or view the patient record.' : 'Patient registered without initial appointment or bed allocation.'}</p>
          </div>
        `;

        if (registrationPathway === 'APPOINTMENT_OPD') {
          Swal.fire({
            icon: 'success',
            title: 'Patient Registered Successfully!',
            html: htmlMsg,
            showDenyButton: true,
            showCancelButton: true,
            confirmButtonColor: '#0d9488', // teal for book appointment
            denyButtonColor: '#0066cc',   // blue for view patient
            cancelButtonColor: '#64748b',
            confirmButtonText: '📅 Book Appointment',
            denyButtonText: '👤 View Patient Record',
            cancelButtonText: 'Stay on Page'
          }).then((result) => {
            if (result.isConfirmed) {
              setBookModalOpen(true);
            } else if (result.isDenied) {
              navigate(`/patients/${generatedId}`);
            }
          });
        } else {
          // Walk-in / Registration Only
          Swal.fire({
            icon: 'success',
            title: 'Patient Registered Successfully!',
            html: htmlMsg,
            showCancelButton: true,
            confirmButtonColor: '#0066cc', // blue for view patient
            cancelButtonColor: '#64748b',
            confirmButtonText: '👤 View Patient Record',
            cancelButtonText: 'Register Another Patient'
          }).then((result) => {
            if (result.isConfirmed) {
              navigate(`/patients/${generatedId}`);
            }
          });
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: data.message || 'Could not save patient to MongoDB. Please verify required fields.'
        });
      }
    } catch (error) {
      console.error('Error during patient registration:', error);
      if (error.response?.status === 401) {
        Swal.fire({
          icon: 'warning',
          title: 'Session Expired or Not Logged In',
          text: error.response?.data?.message || 'Your login session is missing or expired. Please log in as Receptionist or Admin.',
          showCancelButton: true,
          confirmButtonColor: '#0066cc',
          cancelButtonColor: '#64748b',
          confirmButtonText: 'Go to Receptionist Login',
          cancelButtonText: 'Cancel'
        }).then((result) => {
          if (result.isConfirmed) {
            navigate('/receptionist/login');
          }
        });
      } else if (error.response?.status === 409) {
        Swal.fire({
          icon: 'warning',
          title: 'Duplicate Patient Found!',
          html: `
            <div style="text-align: left; font-size: 13px; color: #1e293b;">
              <p>${error.response.data.message}</p>
              <div style="background: #fef3c7; padding: 10px; border-radius: 8px; margin-top: 10px; border: 1px solid #f59e0b;">
                <strong>Existing Patient ID:</strong> <span style="font-size: 16px; font-weight: bold; color: #b45309;">${error.response.data.patientId}</span>
              </div>
            </div>
          `,
          confirmButtonColor: '#f59e0b',
          confirmButtonText: 'View Existing Patient'
        }).then((res) => {
          if (res.isConfirmed && error.response.data.patientId) {
            navigate(`/patients/${error.response.data.patientId}`);
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Registration Failed',
          text: error.response?.data?.message || error.message || 'Failed to connect to the server or database.'
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
        {/* Header Section */}
        <div className="mb-lg flex items-center justify-between flex-wrap gap-md">
          <div>
            <h1 className="text-headline-lg font-headline-lg text-on-surface mb-xs">New Patient Registration</h1>
            <p className="text-body-md text-on-surface-variant">Enter patient details to generate a unique digital ID and assign clinical resources.</p>
          </div>
          <div className="flex gap-sm">
            <Link 
              to="/receptionist/search-patients"
              className="px-lg py-sm rounded-lg border border-outline text-primary font-bold hover:bg-surface-container-high transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-base">search</span> Patient Search
            </Link>
            <button 
              type="submit"
              disabled={submitting}
              className="px-lg py-sm rounded-lg bg-primary text-on-primary font-bold shadow-sm hover:opacity-90 transition-opacity cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">person_add</span> {submitting ? 'Saving to MongoDB...' : 'Save Patient'}
            </button>
          </div>
        </div>

        {/* Success Alert Banner (Displayed when receptionist stays on page) */}
        {registeredSuccessInfo && (
          <div className="mb-lg p-lg bg-emerald-50 border-2 border-emerald-500 rounded-xl shadow-sm text-slate-800 animate-fade-in">
            <div className="flex items-start justify-between flex-wrap gap-md">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-3xl mt-0.5">check_circle</span>
                <div>
                  <h3 className="text-base font-bold text-emerald-900">Patient Registered Successfully in MongoDB!</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-emerald-800 font-semibold">Generated Patient ID:</span>
                    <span className="px-2.5 py-0.5 bg-white text-[#0066cc] font-extrabold text-sm rounded-md border border-blue-300 shadow-2xs">
                      {registeredSuccessInfo.patientId}
                    </span>
                    <span className="text-xs text-slate-600">• {registeredSuccessInfo.fullName} ({registeredSuccessInfo.contact})</span>
                  </div>
                  {registeredSuccessInfo.bedNumber && (
                    <p className="text-xs text-emerald-700 font-bold mt-1">
                      Allocated Inpatient Bed: {registeredSuccessInfo.bedNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  to={`/patients/${registeredSuccessInfo.patientId}`}
                  className="px-md py-sm bg-[#0066cc] hover:bg-[#0055b3] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base">visibility</span> View Patient
                </Link>
                <Link
                  to="/receptionist/search-patients"
                  className="px-md py-sm bg-white hover:bg-slate-50 text-[#0066cc] border border-blue-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">person_search</span> Go to Patient Search
                </Link>
                <Link
                  to="/receptionist/dashboard"
                  className="px-md py-sm bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-base">dashboard</span> Go to Dashboard
                </Link>
                <button
                  type="button"
                  onClick={() => setRegisteredSuccessInfo(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  title="Dismiss message"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bento Grid Layout for Form Sections */}
        <div className="grid grid-cols-12 gap-lg animate-fade-in animation-delay-100">
          {/* Section 1: Personal Information (Large Bento Card) */}
          <section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Personal Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-lg">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Full Name *</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="e.g. Johnathan Doe" 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-xs">Age</label>
                  <input 
                    className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                    placeholder="e.g. 45" 
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-label-md text-on-surface-variant mb-xs">Date of Birth</label>
                  <input 
                    className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Gender</label>
                <div className="flex gap-sm">
                  {['Male', 'Female', 'Other'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      className={`flex-1 py-sm px-md border rounded-lg text-label-md font-bold transition-all cursor-pointer ${
                        gender === g
                          ? 'border-primary bg-primary-container/10 text-primary'
                          : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="flex items-center justify-between mb-xs">
                  <label className="block text-label-md text-on-surface-variant font-bold">
                    Phone Number *
                  </label>
                  {phoneChecking && (
                    <span className="text-[11px] text-primary flex items-center gap-1 font-medium animate-pulse">
                      <span className="material-symbols-outlined text-[14px]">sync</span>
                      Checking uniqueness...
                    </span>
                  )}
                  {!phoneChecking && existingPatientFound && (
                    <span className="text-[11px] text-rose-600 flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      Already Registered
                    </span>
                  )}
                  {!phoneChecking && !existingPatientFound && contact.trim().length >= 10 && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Number Available
                    </span>
                  )}
                </div>
                <input 
                  className={`w-full p-sm bg-surface-container-low border rounded-lg text-body-md focus:ring-2 outline-none transition-all ${
                    existingPatientFound 
                      ? 'border-rose-500 focus:ring-rose-400 bg-rose-50/40 text-rose-950 font-medium' 
                      : 'border-outline-variant focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="+91 98765 43210" 
                  type="tel" 
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                />
                {existingPatientFound && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5 animate-fade-in">
                    <span className="material-symbols-outlined text-rose-600 text-sm mt-0.5">warning</span>
                    <div>
                      <p className="font-bold">Cannot use this phone number!</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Already belongs to <strong>{existingPatientFound.fullName}</strong> (Patient ID: <strong>{existingPatientFound.patientId}</strong>). Please enter a unique number.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Primary Email (Optional)</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="patient@example.com" 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Residential Address</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="e.g. 124 Green Park, New Delhi" 
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Emergency Contact (Smaller Bento Card) */}
          <section className="col-span-12 lg:col-span-4 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>e911_emergency</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Emergency Contact</h3>
            </div>
            <div className="space-y-lg">
              <div>
                <label className="block text-label-md text-on-surface-variant mb-xs">Contact Name</label>
                <input 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="Full Name" 
                  type="text"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-label-md text-on-surface-variant mb-xs">Relationship</label>
                <select 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer"
                  value={emergencyRelationship}
                  onChange={(e) => setEmergencyRelationship(e.target.value)}
                >
                  <option>Spouse</option>
                  <option>Parent</option>
                  <option>Sibling</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-xs">
                  <label className="block text-label-md text-on-surface-variant font-bold">
                    Emergency Phone
                  </label>
                  {emergencyPhoneChecking && (
                    <span className="text-[11px] text-primary flex items-center gap-1 font-medium animate-pulse">
                      <span className="material-symbols-outlined text-[14px]">sync</span>
                      Checking...
                    </span>
                  )}
                  {!emergencyPhoneChecking && emergencyPatientFound && (
                    <span className="text-[11px] text-rose-600 flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[14px]">cancel</span>
                      {emergencyPatientFound.isSameAsPrimary ? 'Matches Patient Phone' : 'Already Registered'}
                    </span>
                  )}
                  {!emergencyPhoneChecking && !emergencyPatientFound && emergencyPhone.trim().length >= 10 && (
                    <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      Valid Contact
                    </span>
                  )}
                </div>
                <input 
                  className={`w-full p-sm bg-surface-container-low border rounded-lg text-body-md focus:ring-2 outline-none transition-all ${
                    emergencyPatientFound 
                      ? 'border-rose-500 focus:ring-rose-400 bg-rose-50/40 text-rose-950 font-medium' 
                      : 'border-outline-variant focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="Phone Number" 
                  type="tel"
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                />
                {emergencyPatientFound && (
                  <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-1.5 animate-fade-in">
                    <span className="material-symbols-outlined text-rose-600 text-sm mt-0.5">warning</span>
                    <div>
                      <p className="font-bold">Invalid Emergency Phone!</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        {emergencyPatientFound.isSameAsPrimary 
                          ? emergencyPatientFound.message
                          : `Already belongs to patient ${emergencyPatientFound.fullName} (ID: ${emergencyPatientFound.patientId}). Please provide a distinct contact number.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Section 3: Clinical Info (Full Width / Grid) */}
          <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>clinical_notes</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Clinical Info</h3>
            </div>
            <div className="grid grid-cols-2 gap-lg">
              <div className="col-span-2">
                <label className="block text-label-md text-on-surface-variant mb-xs font-bold">Purpose / Reason of Visit</label>
                <textarea 
                  className="w-full p-sm bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                  placeholder="Describe the purpose of visit, symptoms, or primary reason for admission..." 
                  rows="3"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                ></textarea>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Blood Group</label>
                <div className="grid grid-cols-4 gap-xs">
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBloodGroup(bg)}
                      className={`py-2 border rounded-lg text-label-md transition-all cursor-pointer ${
                        bloodGroup === bg
                          ? 'border-primary bg-primary-container/20 text-primary font-bold'
                          : 'border-outline-variant text-on-surface-variant hover:bg-primary-container/10'
                      }`}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-label-md text-on-surface-variant mb-xs">Allergy History</label>
                <div className="p-sm border border-outline-variant rounded-lg bg-surface-container-low min-h-[80px]">
                  <div className="flex flex-wrap gap-xs mb-sm">
                    {allergies.map((allergy, index) => (
                      <span key={index} className="px-2 py-1 bg-error-container text-on-error-container text-[11px] font-bold rounded flex items-center gap-1">
                        {allergy}
                        <span 
                          onClick={() => handleRemoveAllergy(index)} 
                          className="material-symbols-outlined text-[14px] cursor-pointer hover:opacity-80"
                        >
                          close
                        </span>
                      </span>
                    ))}
                  </div>
                  <input 
                    className="w-full bg-transparent border-none focus:ring-0 text-body-sm p-0 outline-none" 
                    placeholder="Type allergy and press Enter..." 
                    type="text"
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={handleAddAllergy}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Care & Service Pathway */}
          <section className="col-span-12 lg:col-span-5 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-lg">
            <div className="flex items-center gap-sm mb-lg border-b border-surface-container-high pb-md">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>domain</span>
              <h3 className="text-headline-md font-headline-md text-on-surface">Registration Pathway</h3>
            </div>
            
            <div className="space-y-lg">
              {/* Selectable Options */}
              <div>
                <label className="block text-label-md text-on-surface-variant mb-xs font-bold">
                  Select Patient Service Type *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Option 1: Appointment / OPD */}
                  <div
                    onClick={() => setRegistrationPathway('APPOINTMENT_OPD')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      registrationPathway === 'APPOINTMENT_OPD'
                        ? 'border-2 border-teal-600 bg-teal-50/70 shadow-xs ring-1 ring-teal-600/30'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      registrationPathway === 'APPOINTMENT_OPD' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className="material-symbols-outlined text-xl">calendar_month</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-900">Appointment / OPD</p>
                        {registrationPathway === 'APPOINTMENT_OPD' && (
                          <span className="material-symbols-outlined text-teal-600 text-base">check_circle</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">Doctor consultation & outpatient registration</p>
                    </div>
                  </div>

                  {/* Option 2: Emergency (Navigates directly to Emergency Registration) */}
                  <div
                    onClick={() => {
                      navigate('/receptionist/emergency');
                    }}
                    className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 hover:bg-rose-50 cursor-pointer transition-all flex items-start gap-3 hover:border-rose-400 group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                      <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>emergency</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                          Emergency
                          <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-sm border border-rose-200">Redirect</span>
                        </p>
                        <span className="material-symbols-outlined text-rose-500 text-base group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">Emergency assessment & immediate care</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Doctor Assignment with Availability Indicators */}
              <div>
                <div className="flex items-center justify-between mb-xs">
                  <label className="block text-label-md text-on-surface-variant font-bold">
                    Assign Consulting Doctor
                  </label>
                  {(() => {
                    const selectedDocObj = getSelectedDoctorObj();
                    if (!selectedDocObj) return null;
                    const avail = getDoctorAvailabilityInfo(selectedDocObj);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${avail.bg}`}>
                        <span className={`w-2 h-2 rounded-full ${avail.dot}`}></span>
                        {avail.label}
                      </span>
                    );
                  })()}
                </div>
                <div className="relative">
                  <select 
                    className="w-full p-sm pl-10 pr-10 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer font-medium text-slate-800"
                    value={doctor}
                    onChange={(e) => setDoctor(e.target.value)}
                  >
                    {doctorsList.length > 0 ? (
                      doctorsList.map((doc) => {
                        const avail = getDoctorAvailabilityInfo(doc);
                        const statusIcon = avail.isAvailable ? '🟢' : (doc?.availability?.status === 'In Consultation' ? '🟡' : '🔴');
                        return (
                          <option key={doc._id} value={`${doc.name} (${doc.department || 'Consultant'})`}>
                            {statusIcon} {doc.name} — {doc.department || 'General Medicine'} [{avail.label}]
                          </option>
                        );
                      })
                    ) : (
                      <option value="">No doctors registered yet</option>
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary">person</span>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline">expand_more</span>
                </div>

                {/* Doctor Availability Detail Card */}
                {(() => {
                  const selectedDocObj = getSelectedDoctorObj();
                  if (!selectedDocObj) return null;
                  const avail = getDoctorAvailabilityInfo(selectedDocObj);
                  return (
                    <div className="mt-2 p-2.5 bg-slate-50/80 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${avail.dot} animate-pulse`}></span>
                        <div>
                          <p className="font-bold text-slate-800">{selectedDocObj.name}</p>
                          <p className="text-[11px] text-slate-500">{selectedDocObj.department || 'General Medicine'} • {selectedDocObj.cabinNumber || 'OPD Cabin'}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wider border ${avail.bg}`}>
                        {avail.label}
                      </span>
                    </div>
                  );
                })()}
              </div>
              
              <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-200">
                <div className="flex items-start gap-2 text-xs text-teal-900">
                  <span className="material-symbols-outlined text-teal-700 text-base mt-0.5">verified_user</span>
                  <p className="leading-relaxed">
                    Patient will be registered for <strong>Doctor Appointment & OPD Consultation</strong>. You can book a time slot immediately after saving. No bed will be allocated.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer Action Bar */}
        <div className="mt-xl p-lg bg-surface-container-lowest rounded-xl border border-outline-variant shadow-md flex items-center justify-between flex-wrap gap-md">
          <div className="flex items-center gap-md">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container-high flex items-center justify-center">
                <span className="text-[10px] font-bold">SM</span>
              </div>
              <div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-primary-container text-on-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-[14px]">verified</span>
              </div>
            </div>
            <p className="text-label-md text-on-surface-variant">Registration verified by <span className="font-bold">Staff SM-01</span></p>
          </div>
          <div className="flex gap-md">
            <button 
              type="button" 
              onClick={() => navigate('/dashboard')}
              className="px-xl py-sm rounded-lg text-on-surface-variant font-bold hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-xl py-sm bg-primary text-on-primary rounded-lg font-bold flex items-center gap-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Save & Register Patient</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </form>

      {/* Book Appointment Modal Triggered After Registration */}
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
                  <h3 className="font-bold text-base">Book Appointment for Registered Patient</h3>
                  <p className="text-white/80 text-xs mt-0.5">Pre-filled with {appointmentDetails.patientName} ({appointmentDetails.patientCustomId})</p>
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
            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  setBookingLoading(true);
                  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
                  await axios.post('/api/appointments', appointmentDetails, {
                    headers: { Authorization: `Bearer ${token}` }
                  });

                  Swal.fire({
                    icon: 'success',
                    title: 'Appointment Booked Successfully!',
                    html: `
                      <div style="text-align: left; font-size: 13px; color: #1e293b;">
                        <p>Appointment confirmed for <strong>${appointmentDetails.patientName}</strong> (${appointmentDetails.patientCustomId}) with <strong>${appointmentDetails.doctorName}</strong>.</p>
                        <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Date: ${appointmentDetails.appointmentDate} • Time: ${appointmentDetails.appointmentTime}</p>
                      </div>
                    `,
                    showCancelButton: true,
                    confirmButtonColor: '#0d9488',
                    cancelButtonColor: '#64748b',
                    confirmButtonText: '📅 View in Appointments Queue',
                    cancelButtonText: 'Stay Here'
                  }).then((res) => {
                    if (res.isConfirmed) {
                      navigate('/receptionist/appointments');
                    }
                  });

                  setBookModalOpen(false);
                } catch (err) {
                  Swal.fire('Booking Error', err.response?.data?.message || 'Failed to schedule appointment.', 'error');
                } finally {
                  setBookingLoading(false);
                }
              }} 
              className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar"
            >
              {/* Patient Badge */}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-teal-800 tracking-wider">Registered Patient</span>
                  <p className="text-sm font-black text-teal-950">{appointmentDetails.patientName}</p>
                </div>
                <span className="px-2.5 py-1 bg-white text-teal-800 font-mono font-bold text-xs rounded-lg border border-teal-200">
                  {appointmentDetails.patientCustomId}
                </span>
              </div>

              {/* Doctor & Department */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Consulting Doctor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={appointmentDetails.doctorName}
                    onChange={(e) => {
                      const selectedDoc = doctorsList.find(d => d.name === e.target.value);
                      setAppointmentDetails({
                        ...appointmentDetails,
                        doctorName: e.target.value,
                        department: selectedDoc?.department || appointmentDetails.department
                      });
                    }}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600 font-medium"
                  >
                    {doctorsList.length > 0 ? (
                      doctorsList.map(doc => (
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
                    value={appointmentDetails.department}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, department: e.target.value })}
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
                    value={appointmentDetails.appointmentDate}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, appointmentDate: e.target.value })}
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
                    value={appointmentDetails.appointmentTime}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, appointmentTime: e.target.value })}
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
                    value={appointmentDetails.type}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, type: e.target.value })}
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
                    value={appointmentDetails.priority}
                    onChange={(e) => setAppointmentDetails({ ...appointmentDetails, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Consultation / Symptoms
                </label>
                <textarea
                  rows="2"
                  value={appointmentDetails.reason}
                  onChange={(e) => setAppointmentDetails({ ...appointmentDetails, reason: e.target.value })}
                  placeholder="Primary complaints..."
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
                      <span>Confirm Appointment</span>
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
