import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function PatientDetails() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    gender: 'Male',
    age: '',
    contactNumber: '',
    email: '',
    address: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
    status: 'Registered',
    ward: 'General',
    assignedDoctor: ''
  });
  const [doctorsList, setDoctorsList] = useState([]);

  useEffect(() => {
    fetchPatient();
    fetchDoctors();
  }, [patientId]);

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const response = await axios.get('/api/users/staff/doctors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (Array.isArray(response.data)) {
        setDoctorsList(response.data);
      }
    } catch (err) {
      console.error('Error fetching doctors in details page:', err);
    }
  };

  const fetchPatient = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const response = await axios.get(`/api/patients/${patientId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data && response.data.patient) {
        setPatient(response.data.patient);
      } else if (response.data) {
        setPatient(response.data);
      } else {
        setError('Patient record not found.');
      }
    } catch (err) {
      console.error('Error fetching patient details:', err);
      setError(err.response?.data?.message || 'Failed to fetch patient details from MongoDB.');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!patient) return;
    setEditFormData({
      fullName: patient.fullName || '',
      gender: patient.gender || 'Male',
      age: patient.age || (patient.dob ? String(new Date().getFullYear() - new Date(patient.dob).getFullYear()) : ''),
      contactNumber: patient.contactNumber || patient.phoneNumber || '',
      email: patient.email || '',
      address: patient.address || '',
      emergencyName: patient.emergencyContact?.name || patient.emergencyContactName || '',
      emergencyRelationship: patient.emergencyContact?.relationship || patient.emergencyContactRelationship || '',
      emergencyPhone: patient.emergencyContact?.phone || patient.emergencyContactPhone || '',
      status: patient.status || patient.admissionStatus || 'Registered',
      ward: patient.admissionSetup?.wardType || patient.ward || 'General',
      assignedDoctor: patient.doctorDetails?.name || patient.admissionSetup?.assignedDoctor || patient.assignedDoctor || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!patient) return;
    if (!editFormData.fullName.trim() || !editFormData.contactNumber.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Required Fields Missing',
        text: 'Patient full name and phone number are required.',
        confirmButtonColor: '#0066cc'
      });
      return;
    }

    try {
      setSavingEdit(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const targetId = patient.patientId || patient._id;
      
      const payload = {
        fullName: editFormData.fullName.trim(),
        gender: editFormData.gender,
        age: editFormData.age ? Number(editFormData.age) : undefined,
        contactNumber: editFormData.contactNumber.trim(),
        phoneNumber: editFormData.contactNumber.trim(),
        email: editFormData.email.trim(),
        address: editFormData.address.trim(),
        emergencyContactName: editFormData.emergencyName.trim(),
        emergencyContactRelationship: editFormData.emergencyRelationship.trim(),
        emergencyContactPhone: editFormData.emergencyPhone.trim(),
        emergencyContact: {
          name: editFormData.emergencyName.trim(),
          relationship: editFormData.emergencyRelationship.trim(),
          phone: editFormData.emergencyPhone.trim()
        },
        status: editFormData.status,
        admissionStatus: editFormData.status,
        ward: editFormData.ward,
        wardType: editFormData.ward,
        assignedDoctor: editFormData.assignedDoctor.trim()
      };

      const res = await axios.put(`/api/patients/${targetId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data && res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Patient Record Updated',
          text: `Patient ${editFormData.fullName} (ID: ${patient.patientId}) has been successfully updated.`,
          timer: 2000,
          showConfirmButton: false
        });
        setIsEditModalOpen(false);
        await fetchPatient();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: res.data?.message || 'Could not update patient information.',
          confirmButtonColor: '#0066cc'
        });
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.message || 'Network or server error while updating patient details.',
        confirmButtonColor: '#0066cc'
      });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="w-10 h-10 border-4 border-[#0066cc] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm text-slate-500 font-medium">Loading patient record from MongoDB...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <span className="material-symbols-outlined text-5xl text-rose-500 mb-3">error</span>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Patient Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">{error || 'The requested patient ID does not exist in the database.'}</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Go Back
          </button>
          <Link
            to="/receptionist/search-patients"
            className="px-4 py-2 bg-[#0066cc] hover:bg-[#0055b3] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Open Patient Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumb / Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
            title="Go Back"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{patient.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-[#0066cc] border border-blue-200">
                {patient.patientId}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                patient.status === 'Admitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                patient.status === 'Discharged' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {patient.status || 'Registered'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Registered on {patient.registrationDate || new Date(patient.createdAt).toLocaleDateString()} at {patient.registrationTime || new Date(patient.createdAt).toLocaleTimeString()} • Verified by {patient.registeredBy || 'Staff'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Prominent Edit Button */}
          <button
            onClick={openEditModal}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-[#0066cc] hover:from-blue-700 hover:to-[#0055b3] text-white text-xs font-bold rounded-xl transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">edit</span> Edit Information
          </button>
          <Link
            to="/receptionist/search-patients"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">search</span> Patient Search
          </Link>
          <Link
            to="/receptionist/dashboard"
            className="px-3.5 py-2 bg-[#0066cc] hover:bg-[#0055b3] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-base">dashboard</span> Receptionist Hub
          </Link>
        </div>
      </div>

      {/* Main Details Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Personal & Contact Dossier */}
        <div className="md:col-span-6 space-y-6">
          {/* Personal Info Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="material-symbols-outlined text-[#0066cc]">person</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Personal Information</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Full Name</span>
                <p className="text-slate-800 font-bold mt-0.5 text-sm">{patient.fullName}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Patient ID</span>
                <p className="text-[#0066cc] font-bold mt-0.5 text-sm">{patient.patientId}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Gender</span>
                <p className="text-slate-800 font-semibold mt-0.5">{patient.gender || 'Not specified'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Age / Date of Birth</span>
                <p className="text-slate-800 font-semibold mt-0.5">
                  {patient.age ? `${patient.age} years` : 'N/A'} {patient.dob || patient.dateOfBirth ? `(${new Date(patient.dob || patient.dateOfBirth).toLocaleDateString()})` : ''}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Phone / Contact</span>
                <p className="text-slate-800 font-bold mt-0.5">{patient.contactNumber || patient.phoneNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Email Address</span>
                <p className="text-slate-800 font-semibold mt-0.5 truncate">{patient.email || 'None provided'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-medium">Residential Address</span>
                <p className="text-slate-800 font-semibold mt-0.5">{patient.address || 'Standard local residence'}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="material-symbols-outlined text-rose-500">emergency</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Emergency Contact</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Contact Person</span>
                <p className="text-slate-800 font-bold mt-0.5">
                  {patient.emergencyContact?.name || patient.emergencyContactName || 'None Provided'}
                </p>
              </div>
              <div>
                <span className="text-slate-400 font-medium">Relationship</span>
                <p className="text-slate-800 font-semibold mt-0.5">
                  {patient.emergencyContact?.relationship || patient.emergencyContactRelationship || 'Spouse / Next of Kin'}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 font-medium">Emergency Phone</span>
                <p className="text-slate-800 font-bold mt-0.5">
                  {patient.emergencyContact?.phone || patient.emergencyContactPhone || 'None Provided'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Clinical & Admission Dossier */}
        <div className="md:col-span-6 space-y-6">
          {/* Admission & Bed Assignment Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="material-symbols-outlined text-emerald-600">single_bed</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Admission & Bed Setup</h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Admission Status:</span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold ${
                  patient.status === 'Admitted' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {patient.status || 'Registered'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Target Ward:</span>
                <span className="font-bold text-slate-800">{patient.admissionSetup?.wardType || patient.ward || 'General'}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-400 font-medium">Allocated Bed:</span>
                <span className="font-bold text-[#0066cc]">
                  {patient.bedId ? `Bed ${patient.bedId.bedNumber} (${patient.bedId.wardType || 'Ward'})` : 'No Inpatient Bed Assigned (Outpatient)'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 font-medium">Attending Doctor:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#0066cc]">stethoscope</span>
                  {patient.doctorDetails?.name || patient.admissionSetup?.assignedDoctor || patient.assignedDoctor || 'Dr. Assigned Doctor'}
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Doctor Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0066cc]">stethoscope</span>
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Assigned Doctor Details</h2>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                (patient.doctorDetails?.availability?.status || 'Available') === 'Available' 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                {patient.doctorDetails?.availability?.status || 'On Duty'}
              </span>
            </div>

            <div className="space-y-4 text-xs">
              {/* Doctor Head Info */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl bg-blue-50/60 border border-blue-100/80">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#0066cc] to-sky-400 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-[26px]">medical_services</span>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-extrabold text-slate-900 truncate">
                    {patient.doctorDetails?.name || patient.admissionSetup?.assignedDoctor || patient.assignedDoctor || 'Dr. Smitha'}
                  </h3>
                  <p className="text-xs font-semibold text-[#0066cc] mt-0.5">
                    {patient.doctorDetails?.department || patient.department || 'Pediatrics'}
                    {patient.doctorDetails?.specialization && patient.doctorDetails.specialization !== (patient.doctorDetails?.department || patient.department) ? ` • ${patient.doctorDetails.specialization}` : ''}
                  </p>
                  {patient.doctorDetails?.doctorId && (
                    <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                      Doctor ID: <span className="font-bold text-slate-700">{patient.doctorDetails.doctorId}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Doctor Specifications Grid */}
              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block">Department / Ward</span>
                  <p className="text-slate-800 font-bold mt-0.5">{patient.doctorDetails?.department || patient.department || 'Pediatrics'}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block">Consultation Suite / Cabin</span>
                  <p className="text-slate-800 font-bold mt-0.5">{patient.doctorDetails?.cabinNumber || 'OPD Suite 204, Block A'}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block">Doctor Contact</span>
                  <p className="text-slate-800 font-bold mt-0.5">{patient.doctorDetails?.phone || '+91 98765 43210'}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 font-medium block">Email Address</span>
                  <p className="text-slate-800 font-bold mt-0.5 truncate">{patient.doctorDetails?.email || 'doctor@mediflow.com'}</p>
                </div>
              </div>

              {(patient.doctorDetails?.qualification || patient.doctorDetails?.qualifications) && (
                <div className="pt-1">
                  <span className="text-slate-400 font-medium block">Qualifications & Credentials</span>
                  <p className="text-slate-700 font-semibold mt-0.5">{patient.doctorDetails?.qualification || patient.doctorDetails?.qualifications}</p>
                </div>
              )}

              {patient.doctorDetails?.availability?.shiftHours && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
                  <span className="font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm text-slate-400">schedule</span>
                    Shift Hours:
                  </span>
                  <span className="font-bold text-slate-800">{patient.doctorDetails.availability.shiftHours}</span>
                </div>
              )}
            </div>
          </div>

          {/* Clinical Info & Allergies */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="material-symbols-outlined text-purple-600">clinical_notes</span>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Clinical Details</h2>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <span className="text-slate-400 font-medium">Blood Group:</span>
                <span className="ml-2 font-bold px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-200">
                  {patient.clinicalInfo?.bloodGroup || 'A+'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Chief Complaint:</span>
                <p className="text-slate-800 font-semibold mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  {patient.clinicalInfo?.chiefComplaint || 'No active complaint registered during intake.'}
                </p>
              </div>

              <div>
                <span className="text-slate-400 font-medium">Known Allergies:</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {patient.clinicalInfo?.allergies && patient.clinicalInfo.allergies.length > 0 ? (
                    patient.clinicalInfo.allergies.map((alg, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200">
                        {alg}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No known allergies documented.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Patient Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-[#0066cc] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                  <span className="material-symbols-outlined text-xl text-white">edit_note</span>
                </div>
                <div>
                  <h3 className="text-base font-bold">Edit Patient Information</h3>
                  <p className="text-xs text-slate-200">
                    Update details for <span className="font-semibold text-white">{patient?.fullName}</span> (ID: <span className="text-sky-300 font-mono">{patient?.patientId}</span>)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEdit} className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
              {/* Personal Details */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#0066cc]">person</span>
                  Personal Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={editFormData.fullName}
                      onChange={handleEditChange}
                      required
                      placeholder="e.g. Ankush Patil"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10 bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="gender"
                      value={editFormData.gender}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Age (Years)</label>
                    <input
                      type="number"
                      name="age"
                      value={editFormData.age}
                      onChange={handleEditChange}
                      placeholder="e.g. 24"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="contactNumber"
                      value={editFormData.contactNumber}
                      onChange={handleEditChange}
                      required
                      placeholder="e.g. 7022981744"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={editFormData.email}
                      onChange={handleEditChange}
                      placeholder="e.g. patient@example.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                    <input
                      type="text"
                      name="address"
                      value={editFormData.address}
                      onChange={handleEditChange}
                      placeholder="e.g. Flat 302, Santekatte, Udupi"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-rose-500">emergency</span>
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Person</label>
                    <input
                      type="text"
                      name="emergencyName"
                      value={editFormData.emergencyName}
                      onChange={handleEditChange}
                      placeholder="e.g. Supriya"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship</label>
                    <input
                      type="text"
                      name="emergencyRelationship"
                      value={editFormData.emergencyRelationship}
                      onChange={handleEditChange}
                      placeholder="e.g. Parent / Spouse"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Phone</label>
                    <input
                      type="text"
                      name="emergencyPhone"
                      value={editFormData.emergencyPhone}
                      onChange={handleEditChange}
                      placeholder="e.g. 7022453210"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    />
                  </div>
                </div>
              </div>

              {/* Administrative & Admission Status */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-600">domain</span>
                  Administrative & Admission Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={editFormData.status}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    >
                      <option value="Registered">Registered (Outpatient)</option>
                      <option value="Admitted">Admitted (Inpatient)</option>
                      <option value="Discharged">Discharged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ward / Department</label>
                    <select
                      name="ward"
                      value={editFormData.ward}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50"
                    >
                      <option value="General">General Ward</option>
                      <option value="Special">Special Ward</option>
                      <option value="ICU">ICU</option>
                      <option value="Emergency">Emergency</option>
                      <option value="Pediatrics">Pediatrics</option>
                      <option value="Maternity">Maternity</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Attending Doctor</label>
                    <select
                      name="assignedDoctor"
                      value={editFormData.assignedDoctor}
                      onChange={handleEditChange}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-[#0066cc] bg-slate-50 text-slate-800 font-medium"
                    >
                      <option value="">Select Doctor...</option>
                      {doctorsList.length > 0 ? (
                        doctorsList.map((doc) => {
                          const docName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
                          return (
                            <option key={doc._id || doc.doctorId || doc.name} value={docName}>
                              {docName} ({doc.department || 'Consultant'})
                            </option>
                          );
                        })
                      ) : (
                        <>
                          <option value="Dr. Shruthika">Dr. Shruthika (General Medicine)</option>
                          <option value="Dr. Priya Sharma">Dr. Priya Sharma (Pediatrics)</option>
                          <option value="Dr. Rajesh Patel">Dr. Rajesh Patel (Cardiology)</option>
                          <option value="Dr. Ananya Reddy">Dr. Ananya Reddy (Obstetrics & Gynecology)</option>
                          <option value="Dr. Vikram Rao">Dr. Vikram Rao (Orthopedics)</option>
                          <option value="Dr. Suresh Kumar">Dr. Suresh Kumar (Emergency Care)</option>
                        </>
                      )}
                      {editFormData.assignedDoctor && 
                        !doctorsList.some(d => (d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`) === editFormData.assignedDoctor) && (
                        <option value={editFormData.assignedDoctor}>{editFormData.assignedDoctor}</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-[#0066cc] hover:bg-[#0055b3] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      <span>Update Patient</span>
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
