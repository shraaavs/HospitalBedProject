import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function ReceptionistPatientSearch() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedPatient, setSelectedPatient] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
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

  const navigate = useNavigate();

  useEffect(() => {
    fetchPatients();
    fetchDoctors();
  }, [genderFilter, statusFilter]);

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/users/staff/doctors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDoctorsList(data);
        }
      }
    } catch (err) {
      console.error('Error fetching doctors list:', err);
    }
  };

  const fetchPatients = async (query = searchQuery) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      if (genderFilter !== 'All') params.append('gender', genderFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);

      const res = await fetch(`/api/patients/receptionist-search?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
        if (data.length > 0) {
          if (selectedPatient) {
            const updated = data.find(p => p._id === selectedPatient._id || p.patientId === selectedPatient.patientId);
            setSelectedPatient(updated || data[0]);
          } else {
            setSelectedPatient(data[0]);
          }
        } else {
          setSelectedPatient(null);
        }
      }
    } catch (err) {
      console.error('Error fetching patients for receptionist search:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPatients(searchQuery);
  };

  const openEditModal = (patientToEdit = selectedPatient) => {
    if (!patientToEdit) return;
    setEditingPatient(patientToEdit);
    setEditFormData({
      fullName: patientToEdit.fullName || '',
      gender: patientToEdit.gender || 'Male',
      age: patientToEdit.age || (patientToEdit.dob ? String(new Date().getFullYear() - new Date(patientToEdit.dob).getFullYear()) : ''),
      contactNumber: patientToEdit.contactNumber || patientToEdit.phoneNumber || '',
      email: patientToEdit.email || '',
      address: patientToEdit.address || '',
      emergencyName: patientToEdit.emergencyContact?.name || patientToEdit.emergencyContactName || '',
      emergencyRelationship: patientToEdit.emergencyContact?.relationship || patientToEdit.emergencyContactRelationship || '',
      emergencyPhone: patientToEdit.emergencyContact?.phone || patientToEdit.emergencyContactPhone || '',
      status: patientToEdit.status || patientToEdit.admissionStatus || 'Registered',
      ward: patientToEdit.admissionSetup?.wardType || patientToEdit.ward || 'General',
      assignedDoctor: patientToEdit.admissionSetup?.assignedDoctor || patientToEdit.assignedDoctor || ''
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingPatient) return;
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
      const targetId = editingPatient.patientId || editingPatient._id;
      
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

      const res = await fetch(`/api/patients/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const resData = await res.json();

      if (res.ok && resData.success) {
        Swal.fire({
          icon: 'success',
          title: 'Patient Record Updated',
          text: `Patient ${editFormData.fullName} (ID: ${editingPatient.patientId}) has been successfully updated.`,
          timer: 2000,
          showConfirmButton: false
        });
        setIsEditModalOpen(false);
        // Refresh patient list
        await fetchPatients();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: resData.message || 'Could not update patient information.',
          confirmButtonColor: '#0066cc'
        });
      }
    } catch (err) {
      console.error('Error updating patient:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Network or server error while updating patient details.',
        confirmButtonColor: '#0066cc'
      });
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0066cc] text-3xl">person_search</span>
            <h1 className="text-2xl font-bold text-slate-800">Patient Directory & Search</h1>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Search patient records by Patient ID, full name, or phone number. Review permitted administrative, appointment, and admission status.
          </p>
        </div>

        <Link
          to="/receptionist/register-patient"
          className="px-4 py-2.5 bg-[#0066cc] text-white text-xs font-bold rounded-xl hover:bg-[#0055b3] transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-center"
        >
          <span className="material-symbols-outlined text-base">person_add</span> Register New Patient
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96 flex gap-2">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient ID, Name, Phone..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0066cc] focus:ring-2 focus:ring-[#0066cc]/10"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-[#0066cc] text-white text-xs font-bold rounded-xl hover:bg-[#0055b3] transition-colors shadow-xs"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="All">All Admission Statuses</option>
            <option value="Admitted">Admitted (Inpatient)</option>
            <option value="Registered">Registered (Outpatient)</option>
            <option value="Discharged">Discharged</option>
          </select>

          <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
            {patients.length} records retrieved
          </span>
        </div>
      </div>

      {/* Split View: Patient list on left, Permitted Details on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* List */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-slate-600 uppercase tracking-wider flex justify-between items-center">
            <span>Matching Patient Records</span>
            <span className="text-[10px] text-slate-400 font-normal">Live MongoDB Index</span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[620px] overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-slate-400">Searching MongoDB patient records...</div>
            ) : patients.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-1 text-slate-300">search_off</span>
                <p className="text-xs font-medium">No matching patient record found.</p>
                <p className="text-[11px] text-slate-400 mt-1">Try searching by full phone number or Patient ID.</p>
              </div>
            ) : (
              patients.map((p) => (
                <div
                  key={p._id}
                  onClick={() => setSelectedPatient(p)}
                  className={`p-4 cursor-pointer transition-all flex items-center justify-between ${
                    selectedPatient?._id === p._id ? 'bg-[#e0edff]/60 border-l-4 border-[#0066cc]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-[#0066cc] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs">
                      {p.fullName?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">{p.fullName}</h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-[#0066cc] border border-blue-200">
                          {p.patientId}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {p.gender} • {p.age ? `${p.age} yrs` : (p.dob ? `${new Date().getFullYear() - new Date(p.dob).getFullYear()} yrs` : '')} • Contact: {p.contactNumber || 'N/A'}
                      </p>
                      {p.bedId && (
                        <p className="text-[11px] text-emerald-700 font-semibold mt-0.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px]">single_bed</span> Bed: {p.bedId.bedNumber} ({p.bedId.wardType || 'Ward'})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                      p.status === 'Admitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      p.status === 'Discharged' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {p.status || 'Registered'}
                    </span>
                    {p.latestAppointment && (
                      <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-medium">
                        Appt: {p.latestAppointment.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Permitted Information Details Dossier */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          {!selectedPatient ? (
            <div className="text-center py-16 text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-2">badge</span>
              <p className="text-xs font-medium">Select a patient record to view permitted front-desk details.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-[#0066cc] text-white flex items-center justify-center text-xl font-bold flex-shrink-0 shadow-xs">
                    {selectedPatient.fullName?.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedPatient.fullName}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-[#0066cc] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        ID: {selectedPatient.patientId}
                      </span>
                      <span className="text-xs text-slate-500">
                        {selectedPatient.gender} • {selectedPatient.age ? `${selectedPatient.age} yrs` : (selectedPatient.dob ? `${new Date().getFullYear() - new Date(selectedPatient.dob).getFullYear()} yrs` : '')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prominent Edit Button */}
                <button
                  onClick={() => openEditModal(selectedPatient)}
                  className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-[#0066cc] hover:from-blue-700 hover:to-[#0055b3] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-all hover:shadow-md cursor-pointer flex-shrink-0"
                  title="Edit Patient Information"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  <span>Edit Info</span>
                </button>
              </div>

              {/* Permitted Administrative & Contact Details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Phone Number:</span>
                  <span className="font-bold text-slate-800">{selectedPatient.contactNumber || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Email Address:</span>
                  <span className="font-bold text-slate-800">{selectedPatient.email || 'None Provided'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Residential Address:</span>
                  <span className="font-semibold text-slate-800 text-right max-w-[200px] truncate">{selectedPatient.address || 'Standard Residence'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Emergency Contact:</span>
                  <span className="font-bold text-slate-800 text-right">
                    {selectedPatient.emergencyContact?.name ? `${selectedPatient.emergencyContact.name} (${selectedPatient.emergencyContact.relationship || 'Kin'} - ${selectedPatient.emergencyContact.phone || ''})` : (selectedPatient.emergencyContactName ? `${selectedPatient.emergencyContactName} (${selectedPatient.emergencyContactRelationship || 'Kin'} - ${selectedPatient.emergencyContactPhone || ''})` : 'None Provided')}
                  </span>
                </div>

                {/* Admission & Bed Info */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Admission Status:</span>
                    <span className={`font-bold px-2 py-0.2 rounded-full text-[11px] ${
                      selectedPatient.status === 'Admitted' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {selectedPatient.status || 'Registered'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Assigned Ward / Bed:</span>
                    <span className="font-bold text-slate-800">
                      {selectedPatient.bedId ? `Bed ${selectedPatient.bedId.bedNumber} (${selectedPatient.bedId.wardType || 'Ward'})` : 'No Inpatient Bed Assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[10px]">Attending Doctor:</span>
                    <span className="font-medium text-slate-800">
                      {selectedPatient.admissionSetup?.assignedDoctor || selectedPatient.assignedDoctor || 'Dr. Priya Sharma'}
                    </span>
                  </div>
                </div>

                {/* Latest Appointment Status */}
                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-200 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-800 font-bold uppercase text-[10px]">Appointment Status:</span>
                    <span className="font-bold text-purple-700">
                      {selectedPatient.latestAppointment ? selectedPatient.latestAppointment.status : 'No Upcoming Visit'}
                    </span>
                  </div>
                  {selectedPatient.latestAppointment && (
                    <p className="text-[11px] text-purple-900">
                      Scheduled on {selectedPatient.latestAppointment.date} at {selectedPatient.latestAppointment.time} ({selectedPatient.latestAppointment.type})
                    </p>
                  )}
                </div>

                {/* Clinical Confidentiality Guard Alert */}
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-amber-600 flex-shrink-0">lock</span>
                  <div>
                    <strong>Confidential Clinical Records Guard:</strong> Detailed diagnostic summaries, prescription history, lab reports, and doctor clinical orders remain strictly restricted to authorized medical staff.
                  </div>
                </div>
              </div>

              {/* Front Desk Permitted Quick Actions */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[11px] font-bold text-slate-600 uppercase">Permitted Front Desk Actions</h4>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => openEditModal(selectedPatient)}
                      className="text-xs font-bold text-[#0066cc] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      <span>Edit Info</span>
                    </button>
                    <Link
                      to={`/patients/${selectedPatient.patientId}`}
                      className="text-xs font-bold text-[#0066cc] hover:underline flex items-center gap-0.5"
                    >
                      <span>Full Record</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to={`/receptionist/appointments`}
                    className="p-2.5 bg-blue-50 text-[#0066cc] hover:bg-blue-100 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">calendar_month</span> Book Appointment
                  </Link>
                  <Link
                    to={`/receptionist/check-in`}
                    className="p-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">how_to_reg</span> Check In Visit
                  </Link>
                  <Link
                    to={`/receptionist/admissions`}
                    className="p-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">single_bed</span> Assign Bed
                  </Link>
                  <Link
                    to={`/receptionist/discharge?patientId=${selectedPatient.patientId || selectedPatient._id}`}
                    className="p-2.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">sync</span> Discharge Desk
                  </Link>
                </div>
              </div>
            </div>
          )}
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
                    Update details for <span className="font-semibold text-white">{editingPatient?.fullName}</span> (ID: <span className="text-sky-300 font-mono">{editingPatient?.patientId}</span>)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
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


