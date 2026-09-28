import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function StaffManagementDutyRoster() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');
  const [shiftFilter, setShiftFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);

  // Form State
  const initialFormData = {
    role: 'Doctor',
    name: '',
    email: '',
    username: '',
    password: '',
    phone: '',
    department: 'Cardiology',
    specialization: '',
    qualification: '',
    assignedWard: '',
    deskLocation: '',
    cabinNumber: '',
    assignedShift: 'Morning Shift (08:00 AM - 04:00 PM)',
    shiftHours: '08:00 AM - 04:00 PM',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availabilityStatus: 'Available',
    status: 'Active'
  };

  const [formData, setFormData] = useState(initialFormData);

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setStaffList(data);
    } catch (err) {
      console.error('Error fetching staff list:', err);
      Swal.fire('Error', 'Failed to fetch staff directory from database', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleOpenAddModal = () => {
    setFormData(initialFormData);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (staff) => {
    setSelectedStaff(staff);
    const staffRole = staff.role || (staff.doctorId ? 'Doctor' : staff.nurseId ? 'Nurse' : staff.receptionistId ? 'Receptionist' : 'Admin');
    setFormData({
      role: staffRole,
      name: staff.name || '',
      email: staff.email || '',
      username: staff.username || '',
      password: '',
      phone: staff.phone || '',
      department: staff.department || 'Cardiology',
      specialization: staff.specialization || '',
      qualification: staff.qualification || staff.qualifications || '',
      assignedWard: staff.assignedWard || '',
      deskLocation: staff.deskLocation || '',
      cabinNumber: staff.cabinNumber || '',
      assignedShift: staff.assignedShift || staff.shift || 'Morning Shift (08:00 AM - 04:00 PM)',
      shiftHours: staff.availability?.shiftHours || staff.shiftHours || '08:00 AM - 04:00 PM',
      workingDays: staff.availability?.days || staff.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availabilityStatus: staff.availability?.status || 'Available',
      status: staff.status || 'Active'
    });
    setIsEditModalOpen(true);
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/users/staff', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Staff Profile Created',
        text: `Successfully added ${formData.name} to the hospital staff registry.`,
        timer: 1600,
        showConfirmButton: false
      });

      setIsAddModalOpen(false);
      fetchStaff();
    } catch (err) {
      console.error('Error creating staff:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to create staff member', 'error');
    }
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaff?._id) return;

    try {
      await axios.put(`/api/users/staff/${selectedStaff._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Swal.fire({
        icon: 'success',
        title: 'Staff Record Updated',
        text: `Updated roster and profile settings for ${formData.name}.`,
        timer: 1600,
        showConfirmButton: false
      });

      setIsEditModalOpen(false);
      fetchStaff();
    } catch (err) {
      console.error('Error updating staff:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to update staff record', 'error');
    }
  };

  const handleDeleteStaff = async (staff) => {
    const confirm = await Swal.fire({
      title: `Delete ${staff.name}?`,
      text: `Are you sure you want to remove ${staff.name} (${staff.role || 'Staff'}) from the hospital registry?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      confirmButtonText: 'Yes, Delete Staff'
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`/api/users/${staff._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire('Deleted', `${staff.name} has been removed.`, 'success');
        fetchStaff();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to delete staff member', 'error');
      }
    }
  };

  const toggleDay = (day) => {
    setFormData(prev => {
      const days = prev.workingDays || [];
      if (days.includes(day)) {
        return { ...prev, workingDays: days.filter(d => d !== day) };
      } else {
        return { ...prev, workingDays: [...days, day] };
      }
    });
  };

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Filters
  const filteredStaff = staffList.filter(staff => {
    const q = searchQuery.toLowerCase().trim();
    const staffRole = staff.role || (staff.doctorId ? 'Doctor' : staff.nurseId ? 'Nurse' : staff.receptionistId ? 'Receptionist' : 'Admin');
    const staffId = staff.doctorId || staff.nurseId || staff.receptionistId || staff.adminId || staff._id;
    const availStatus = staff.availability?.status || 'Available';

    const matchesSearch = !q ||
      (staff.name || '').toLowerCase().includes(q) ||
      (staff.email || '').toLowerCase().includes(q) ||
      (staff.phone || '').toLowerCase().includes(q) ||
      (staff.department || '').toLowerCase().includes(q) ||
      (staff.specialization || '').toLowerCase().includes(q) ||
      (staffId || '').toLowerCase().includes(q);

    const matchesRole = roleFilter === 'All' || staffRole === roleFilter;
    const matchesDept = deptFilter === 'All' || (staff.department || '').toLowerCase() === deptFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || staff.status === statusFilter || availStatus === statusFilter;

    return matchesSearch && matchesRole && matchesDept && matchesStatus;
  });

  // KPI Calculations
  const totalDoctors = staffList.filter(s => (s.role === 'Doctor' || s.doctorId)).length;
  const totalNurses = staffList.filter(s => (s.role === 'Nurse' || s.nurseId)).length;
  const totalReceptionists = staffList.filter(s => (s.role === 'Receptionist' || s.receptionistId)).length;
  const totalAvailable = staffList.filter(s => (s.availability?.status === 'Available' || s.availability?.status === 'On Duty' || s.availability?.isAvailable)).length;

  const departments = Array.from(new Set(staffList.map(s => s.department).filter(Boolean))).sort();

  return (
    <div className="w-full flex flex-col space-y-5 pb-12">
      
      {/* 1. Header Banner & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-2xl shadow-xs">
            👨‍⚕️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-800">Staff Management & Duty Roster</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                {staffList.length} Active Staff
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure Doctor, Nurse, & Receptionist Profiles, Department Allocations, Shift Rotations & Real-Time Availability
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchStaff}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition-colors"
            title="Refresh Directory"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-95"
          >
            <span className="material-symbols-outlined text-base">person_add</span> Add New Staff Member
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xl">
            🩺
          </div>
          <div>
            <span className="text-xl font-black text-slate-800 block">{totalDoctors}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Doctors</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-xl">
            👩‍⚕️
          </div>
          <div>
            <span className="text-xl font-black text-slate-800 block">{totalNurses}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Nurses</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xl">
            🛎️
          </div>
          <div>
            <span className="text-xl font-black text-slate-800 block">{totalReceptionists}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Registered Receptionists</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xl">
            ✅
          </div>
          <div>
            <span className="text-xl font-black text-emerald-700 block">{totalAvailable}</span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">On-Duty / Available</span>
          </div>
        </div>
      </div>

      {/* 3. Filters & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Staff by Name, Staff ID, Dept, Specialization..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-600 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="All">All Roles</option>
            <option value="Doctor">👨‍⚕️ Doctors</option>
            <option value="Nurse">👩‍⚕️ Nurses</option>
            <option value="Receptionist">🛎️ Receptionists</option>
            <option value="Admin">🛡️ Admins</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="All">🏥 All Departments</option>
            {departments.map((dept, i) => (
              <option key={i} value={dept}>{dept}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 focus:outline-none focus:border-teal-600"
          >
            <option value="All">🔄 All Statuses</option>
            <option value="Available">Available / On Duty</option>
            <option value="In Consultation">In Consultation</option>
            <option value="In Emergency / OT">In Emergency / OT</option>
            <option value="On Leave">On Leave</option>
            <option value="Off Duty">Off Duty</option>
          </select>

          {(roleFilter !== 'All' || deptFilter !== 'All' || statusFilter !== 'All' || searchQuery) && (
            <button
              onClick={() => {
                setRoleFilter('All');
                setDeptFilter('All');
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="text-rose-600 font-bold text-xs hover:underline ml-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 4. Staff Directory Table & Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-700 text-sm">badge</span>
            <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Staff Directory ({filteredStaff.length} Members)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">Click Edit to reassign departments or modify shifts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Staff Profile</th>
                <th className="px-4 py-3">Role & ID</th>
                <th className="px-4 py-3">Department & Ward</th>
                <th className="px-4 py-3">Shift & Schedule</th>
                <th className="px-4 py-3">Working Days</th>
                <th className="px-4 py-3">Live Availability</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl animate-spin text-teal-600 mb-2">sync</span>
                    <p className="text-xs font-bold">Loading staff directory from MongoDB...</p>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">group_off</span>
                    <p className="text-xs font-bold text-slate-700">No staff members found</p>
                    <p className="text-[11px] text-slate-400 mt-1">Adjust your filters or add a new staff member.</p>
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const staffRole = staff.role || (staff.doctorId ? 'Doctor' : staff.nurseId ? 'Nurse' : staff.receptionistId ? 'Receptionist' : 'Admin');
                  const staffId = staff.doctorId || staff.nurseId || staff.receptionistId || staff.adminId || `STF-${staff._id.substring(18)}`;
                  const availStatus = staff.availability?.status || (staff.status === 'Active' ? 'Available' : 'Inactive');
                  const days = staff.availability?.days || staff.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
                  const shiftText = staff.assignedShift || staff.shift || staff.shiftHours || staff.availability?.shiftHours || '08:00 AM - 04:00 PM';

                  const getRoleBadge = (r) => {
                    switch (r) {
                      case 'Doctor':
                        return 'bg-blue-50 text-blue-700 border-blue-200';
                      case 'Nurse':
                        return 'bg-purple-50 text-purple-700 border-purple-200';
                      case 'Receptionist':
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                      case 'Admin':
                        return 'bg-rose-50 text-rose-700 border-rose-200';
                      default:
                        return 'bg-slate-50 text-slate-700 border-slate-200';
                    }
                  };

                  const getAvailBadge = (st) => {
                    switch (st) {
                      case 'Available':
                      case 'On Duty':
                        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      case 'In Consultation':
                        return 'bg-teal-50 text-teal-700 border-teal-200 animate-pulse';
                      case 'In Emergency / OT':
                        return 'bg-rose-50 text-rose-700 border-rose-200 font-black';
                      case 'On Leave':
                        return 'bg-slate-100 text-slate-600 border-slate-200';
                      case 'Off Duty':
                        return 'bg-amber-50 text-amber-700 border-amber-200';
                      default:
                        return 'bg-slate-50 text-slate-700 border-slate-200';
                    }
                  };

                  return (
                    <tr key={staff._id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Contact */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{staff.name}</span>
                            <span className="text-[11px] text-slate-500 block">{staff.email}</span>
                            <span className="text-[10px] text-slate-400 block">{staff.phone || 'No phone'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role & ID */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getRoleBadge(staffRole)} block w-fit mb-1`}>
                          {staffRole}
                        </span>
                        <span className="font-mono text-[11px] font-bold text-slate-700">{staffId}</span>
                      </td>

                      {/* Department & Specialization */}
                      <td className="px-4 py-3">
                        <span className="font-bold text-slate-800 block">{staff.department || 'General Medicine'}</span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                          {staff.specialization || staff.assignedWard || staff.qualification || staff.deskLocation || 'Standard Staff'}
                        </span>
                      </td>

                      {/* Shift */}
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-800 block text-[11px]">{shiftText}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {staff.cabinNumber || staff.deskLocation || 'Floor Assigned'}
                        </span>
                      </td>

                      {/* Working Days */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {days.map((d, di) => (
                            <span key={di} className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                              {d.substring(0, 3)}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Availability */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getAvailBadge(availStatus)}`}>
                          ● {availStatus}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(staff)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            title="Edit Roster & Profile"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Staff"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">person_add</span>
                <h3 className="text-sm font-black text-white">Create New Staff Profile</h3>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-white/70 hover:text-white p-1">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* Role Selector */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="block text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2">Select Staff Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Doctor', 'Nurse', 'Receptionist'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setFormData({ ...formData, role: r })}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold border transition-all text-center ${
                        formData.role === r
                          ? 'bg-teal-700 text-white border-teal-700 shadow-xs ring-2 ring-teal-200'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r === 'Doctor' ? '👨‍⚕️ Doctor' : r === 'Nurse' ? '👩‍⚕️ Nurse' : '🛎️ Receptionist'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dr. Ramesh Gupta or Anita Roy"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@mediflow.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Username (Login ID) *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="username123"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Min. 6 characters"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Department & Specialization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-semibold text-slate-700"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="ICU / Critical Care">ICU / Critical Care</option>
                    <option value="Emergency & Trauma">Emergency & Trauma</option>
                    <option value="Central Reception & OPD">Central Reception & OPD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                {formData.role === 'Doctor' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Specialization</label>
                      <input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                        placeholder="e.g. Interventional Cardiology"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Qualifications</label>
                      <input
                        type="text"
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        placeholder="e.g. MBBS, MD, DM (Cardio)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </>
                )}
                {formData.role === 'Nurse' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Assigned Ward</label>
                      <input
                        type="text"
                        value={formData.assignedWard}
                        onChange={(e) => setFormData({ ...formData, assignedWard: e.target.value })}
                        placeholder="e.g. ICU Ward 4 or HDU East"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Nursing Qualification</label>
                      <input
                        type="text"
                        value={formData.qualification}
                        onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                        placeholder="e.g. B.Sc. Nursing, RN (Critical Care)"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Shift & Duty Hours */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Duty Roster & Shift Cycles</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Shift Cycle</label>
                    <select
                      value={formData.assignedShift}
                      onChange={(e) => setFormData({ ...formData, assignedShift: e.target.value, shift: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-semibold"
                    >
                      <option value="Morning Shift (07:00 AM - 03:00 PM)">Morning Shift (07:00 AM - 03:00 PM)</option>
                      <option value="General Shift (09:00 AM - 05:00 PM)">General Shift (09:00 AM - 05:00 PM)</option>
                      <option value="Evening Shift (03:00 PM - 11:00 PM)">Evening Shift (03:00 PM - 11:00 PM)</option>
                      <option value="Night Shift (11:00 PM - 07:00 AM)">Night Shift (11:00 PM - 07:00 AM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Live Availability Status</label>
                    <select
                      value={formData.availabilityStatus}
                      onChange={(e) => setFormData({ ...formData, availabilityStatus: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-semibold"
                    >
                      <option value="Available">Available</option>
                      <option value="On Duty">On Duty</option>
                      <option value="In Consultation">In Consultation</option>
                      <option value="In Emergency / OT">In Emergency / OT</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </div>
                </div>

                {/* Working Days Selector */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Scheduled Working Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {daysOfWeek.map((day) => {
                      const isSelected = (formData.workingDays || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">save</span> Create Staff Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* EDIT STAFF MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">edit_calendar</span>
                <h3 className="text-sm font-black text-white">Edit Staff Record & Shift Rosters: {formData.name}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-white/70 hover:text-white p-1">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateStaff} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar">
              
              {/* Role & ID Indicator */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Staff Role & Database ID</span>
                  <span className="font-mono font-bold text-teal-800 text-xs">
                    {formData.role} • {selectedStaff?.doctorId || selectedStaff?.nurseId || selectedStaff?.receptionistId || selectedStaff?._id}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Account Status</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="text-xs font-bold bg-white border border-slate-200 rounded-lg px-2 py-0.5"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep unchanged"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Department Assignment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Assigned Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-semibold text-slate-700"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="ICU / Critical Care">ICU / Critical Care</option>
                    <option value="Emergency & Trauma">Emergency & Trauma</option>
                    <option value="Central Reception & OPD">Central Reception & OPD</option>
                  </select>
                </div>
                {formData.role === 'Doctor' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Specialization</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                )}
                {formData.role === 'Nurse' && (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Assigned Ward</label>
                    <input
                      type="text"
                      value={formData.assignedWard}
                      onChange={(e) => setFormData({ ...formData, assignedWard: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Qualifications</label>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              {/* Duty Schedules & Shifts */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider">Duty Schedule & Availability</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Shift</label>
                    <select
                      value={formData.assignedShift}
                      onChange={(e) => setFormData({ ...formData, assignedShift: e.target.value, shift: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-semibold"
                    >
                      <option value="Morning Shift (07:00 AM - 03:00 PM)">Morning Shift (07:00 AM - 03:00 PM)</option>
                      <option value="General Shift (09:00 AM - 05:00 PM)">General Shift (09:00 AM - 05:00 PM)</option>
                      <option value="Evening Shift (03:00 PM - 11:00 PM)">Evening Shift (03:00 PM - 11:00 PM)</option>
                      <option value="Night Shift (11:00 PM - 07:00 AM)">Night Shift (11:00 PM - 07:00 AM)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Live Availability Status</label>
                    <select
                      value={formData.availabilityStatus}
                      onChange={(e) => setFormData({ ...formData, availabilityStatus: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-600 font-semibold"
                    >
                      <option value="Available">Available</option>
                      <option value="On Duty">On Duty</option>
                      <option value="In Consultation">In Consultation</option>
                      <option value="In Emergency / OT">In Emergency / OT</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Off Duty">Off Duty</option>
                    </select>
                  </div>
                </div>

                {/* Working Days */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">Scheduled Working Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {daysOfWeek.map((day) => {
                      const isSelected = (formData.workingDays || []).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleDay(day)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-teal-700 text-white border-teal-700 shadow-2xs'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span> Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
