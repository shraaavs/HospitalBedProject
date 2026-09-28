import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function AdminUserAccessManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'Doctor',
    department: 'Cardiology',
    phone: '',
    specialization: '',
    qualification: '',
    status: 'Active'
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    department: '',
    phone: '',
    status: 'Active',
    password: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(res.data) ? res.data : [];
      setUsers(data);
      if (data.length > 0) {
        if (!selectedUser) {
          setSelectedUser(data[0]);
        } else {
          const refreshed = data.find(u => u._id === selectedUser._id);
          if (refreshed) setSelectedUser(refreshed);
        }
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleStatus = async (user) => {
    const nextStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    const confirm = await Swal.fire({
      title: `${nextStatus === 'Active' ? 'Activate' : 'Deactivate'} Account?`,
      html: `Are you sure you want to change account status for <b>${user.name}</b> (${user.role}) to <b>${nextStatus}</b>? ${nextStatus === 'Inactive' ? 'They will no longer be able to log in to MediFlow.' : 'They will regain access immediately.'}`,
      icon: nextStatus === 'Active' ? 'question' : 'warning',
      showCancelButton: true,
      confirmButtonColor: nextStatus === 'Active' ? '#059669' : '#ea580c',
      confirmButtonText: `Yes, ${nextStatus} Account`
    });

    if (confirm.isConfirmed) {
      try {
        await axios.put(`/api/users/${user._id}/status`, { status: nextStatus }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire({
          icon: 'success',
          title: `Account ${nextStatus}`,
          text: `${user.name}'s account is now ${nextStatus}.`,
          timer: 1400,
          showConfirmButton: false
        });
        fetchUsers();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to update account status', 'error');
      }
    }
  };

  const handleDeleteUser = async (user) => {
    const result = await Swal.fire({
      title: 'Revoke Access & Delete User?',
      html: `Are you sure you want to remove <b>${user.name}</b> (${user.role}) from MediFlow? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Remove User'
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`/api/users/${user._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        Swal.fire('Deleted', `${user.name} has been removed from system access.`, 'success');
        fetchUsers();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to remove user', 'error');
      }
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await axios.post('/api/users/staff', newUser, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Account Provisioned',
        text: `New ${newUser.role} credentials created and stored in MongoDB with secure password hashing.`,
        timer: 1800,
        showConfirmButton: false
      });
      setShowAddModal(false);
      setNewUser({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'Doctor',
        department: 'Cardiology',
        phone: '',
        specialization: '',
        qualification: '',
        status: 'Active'
      });
      fetchUsers();
    } catch (err) {
      Swal.fire('Failed', err.response?.data?.message || 'Error creating account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      department: user.department || '',
      phone: user.phone || '',
      status: user.status || 'Active',
      password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (!selectedUser?._id) return;
    try {
      setSubmitting(true);
      await axios.put(`/api/users/staff/${selectedUser._id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      Swal.fire({
        icon: 'success',
        title: 'Account Updated',
        text: `User profile and credentials updated for ${editFormData.name}.`,
        timer: 1500,
        showConfirmButton: false
      });
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to update user', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(u => {
    if (roleFilter !== 'All' && u.role !== roleFilter) return false;
    if (statusFilter !== 'All' && (u.status || 'Active') !== statusFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = u.name?.toLowerCase().includes(q);
      const matchEmail = u.email?.toLowerCase().includes(q);
      const matchUsername = u.username?.toLowerCase().includes(q);
      const matchRole = u.role?.toLowerCase().includes(q);
      const matchDept = u.department?.toLowerCase().includes(q);
      const matchId = (u.adminId || u.doctorId || u.nurseId || u.receptionistId)?.toLowerCase().includes(q);
      return matchName || matchEmail || matchUsername || matchRole || matchDept || matchId;
    }
    return true;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'Admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-700 border border-purple-200">Admin</span>;
      case 'Doctor':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-100 text-blue-700 border border-blue-200">Doctor</span>;
      case 'Nurse':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-teal-100 text-teal-700 border border-teal-200">Nurse</span>;
      case 'Receptionist':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-700 border border-amber-200">Receptionist</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">{role || 'Staff'}</span>;
    }
  };

  const getStatusBadge = (status) => {
    const st = status || 'Active';
    if (st === 'Active') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span> Active</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1 w-fit"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Inactive</span>;
  };

  return (
    <div className="w-full flex flex-col space-y-5 pb-12">
      
      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-purple-500/20 text-2xl font-bold">
            👤
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">User & Access Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                JWT Auth & Role Boundaries
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Provision, activate, deactivate, and govern secure login credentials across Doctor, Nurse, Receptionist, & Admin roles
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchUsers}
            className="p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1 text-xs font-bold px-3"
          >
            <span className="material-symbols-outlined text-base">refresh</span> Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">person_add</span> Provision New User
          </button>
        </div>
      </div>

      {/* 2. KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Accounts</p>
            <h3 className="text-xl font-black text-slate-900 mt-0.5">{users.length}</h3>
            <p className="text-[10px] text-slate-500">In MongoDB</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            👥
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Doctors</p>
            <h3 className="text-xl font-black text-blue-700 mt-0.5">{users.filter(u => u.role === 'Doctor').length}</h3>
            <p className="text-[10px] text-blue-600/80">Clinical Suite</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            🩺
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Nurses</p>
            <h3 className="text-xl font-black text-teal-700 mt-0.5">{users.filter(u => u.role === 'Nurse').length}</h3>
            <p className="text-[10px] text-teal-600/80">Bedside & Vitals</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
            👩‍⚕️
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Receptionists</p>
            <h3 className="text-xl font-black text-amber-700 mt-0.5">{users.filter(u => u.role === 'Receptionist').length}</h3>
            <p className="text-[10px] text-amber-600/80">Front Desk & Intake</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
            🛎️
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Admins</p>
            <h3 className="text-xl font-black text-purple-700 mt-0.5">{users.filter(u => u.role === 'Admin').length}</h3>
            <p className="text-[10px] text-purple-600/80">Governance</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            🛡️
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Name, Staff ID, Username, Email, Dept..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-600 focus:bg-white font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            {['All', 'Doctor', 'Nurse', 'Receptionist', 'Admin'].map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1 rounded-lg transition-all ${
                  roleFilter === r
                    ? 'bg-white text-purple-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-purple-600"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* 4. Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: User Table List */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Hospital System Accounts ({filteredUsers.length})
            </h3>
            <span className="text-[11px] text-slate-400">Select an account to view security boundary</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-3xl animate-spin text-purple-600 mb-2">sync</span>
              <p className="text-xs font-semibold">Loading accounts from MongoDB...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_off</span>
              <p className="text-xs font-bold text-slate-700">No users found</p>
              <p className="text-[11px] text-slate-400 mt-1">Try adjusting your filters or provision a new account.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[640px] overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 uppercase font-bold text-[10px] text-slate-500 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">Staff Profile</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => {
                    const isSelected = selectedUser?._id === u._id;
                    const customId = u.adminId || u.doctorId || u.nurseId || u.receptionistId || `USR-${u._id.slice(-4)}`;
                    const isAccountActive = (u.status || 'Active') === 'Active';

                    return (
                      <tr
                        key={u._id}
                        onClick={() => setSelectedUser(u)}
                        className={`hover:bg-purple-50/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-purple-50/70 font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                              {u.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{u.name}</p>
                              <p className="text-[11px] text-slate-500 font-mono">ID: {customId} • @{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{getRoleBadge(u.role)}</td>
                        <td className="px-4 py-3 font-medium text-slate-600">{u.department || 'General Administration'}</td>
                        <td className="px-4 py-3">{getStatusBadge(u.status)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                isAccountActive 
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200' 
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                              title={isAccountActive ? 'Deactivate Login' : 'Activate Login'}
                            >
                              {isAccountActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(u)}
                              className="p-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Edit Credentials"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Account"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column: Selected User Security Dossier */}
        <div className="lg:col-span-4">
          {selectedUser ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sticky top-6 space-y-4">
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center text-xl font-bold border border-purple-200 shrink-0">
                  {selectedUser.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedUser.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getRoleBadge(selectedUser.role)}
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {selectedUser.adminId || selectedUser.doctorId || selectedUser.nurseId || selectedUser.receptionistId || 'ID-N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Account Status</span>
                  <div>{getStatusBadge(selectedUser.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Login Username</span>
                    <span className="font-bold text-slate-800">@{selectedUser.username}</span>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-slate-400 text-[10px] font-bold uppercase block">Department</span>
                    <span className="font-bold text-slate-800 truncate block">{selectedUser.department || 'General'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <span className="text-slate-400 text-[10px] font-bold uppercase block">Email Address</span>
                  <span className="font-bold text-slate-800 break-all">{selectedUser.email}</span>
                </div>
              </div>

              {/* Role-Based Access Control Scope Matrix */}
              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-100 text-xs space-y-2">
                <p className="font-black text-purple-900 uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  JWT Role Permissions & Boundaries
                </p>
                
                {selectedUser.role === 'Admin' && (
                  <ul className="text-slate-700 text-[11px] space-y-1">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Full Hospital System Governance</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Bed & Medical Resource Allocations</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> User & Staff Roster Management</li>
                  </ul>
                )}

                {selectedUser.role === 'Doctor' && (
                  <ul className="text-slate-700 text-[11px] space-y-1">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Clinical Consultations & Prescriptions</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Assigned Patient Records & Vitals</li>
                    <li className="flex items-center gap-1.5"><span className="text-rose-600 font-bold">✗</span> No Access to User Management or Staff Roster</li>
                  </ul>
                )}

                {selectedUser.role === 'Nurse' && (
                  <ul className="text-slate-700 text-[11px] space-y-1">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Inpatient Bed Monitoring & Observations</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Vital Loggings & Doctor Instructions</li>
                    <li className="flex items-center gap-1.5"><span className="text-rose-600 font-bold">✗</span> Cannot Modify Bed Configurations or Users</li>
                  </ul>
                )}

                {selectedUser.role === 'Receptionist' && (
                  <ul className="text-slate-700 text-[11px] space-y-1">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Patient Intake, Appointments & Check-In</li>
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 font-bold">✓</span> Queue Management & Doctor Schedules</li>
                    <li className="flex items-center gap-1.5"><span className="text-rose-600 font-bold">✗</span> No Access to Clinical Orders or Billing</li>
                  </ul>
                )}
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedUser)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
                >
                  {(selectedUser.status || 'Active') === 'Active' ? 'Deactivate Account' : 'Activate Account'}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(selectedUser)}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  Edit Profile
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400 shadow-xs">
              Select a staff member from the directory to review credentials and security boundary.
            </div>
          )}
        </div>

      </div>

      {/* PROVISION USER MODAL */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full shadow-2xl border border-slate-200 my-auto animate-scale-up overflow-hidden"
            style={{ width: '100%', maxWidth: '34rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">person_add</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">Provision New Staff Account</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Staff Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold"
                >
                  <option value="Doctor">Doctor (Physician)</option>
                  <option value="Nurse">Staff Nurse</option>
                  <option value="Receptionist">Receptionist (Front Desk)</option>
                  <option value="Admin">Hospital Administrator</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Full Name *</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Dr. Ramesh Gupta"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="staff@mediflow.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    placeholder="username123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Initial Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Min 6 characters"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Department</label>
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold"
                  >
                    <option value="Cardiology">Cardiology</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Orthopedics">Orthopedics</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="General Medicine">General Medicine</option>
                    <option value="ICU / Critical Care">ICU / Critical Care</option>
                    <option value="Central Reception & OPD">Central Reception & OPD</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-xs flex items-center gap-1"
                >
                  {submitting ? 'Creating...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto"
          onClick={() => setShowEditModal(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full shadow-2xl border border-slate-200 my-auto animate-scale-up overflow-hidden"
            style={{ width: '100%', maxWidth: '34rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">manage_accounts</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Account & Credentials</h3>
                  <p className="text-[11px] text-slate-500">{selectedUser?.name} ({selectedUser?.role})</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowEditModal(false)} 
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Full Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-purple-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-purple-600"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Department</label>
                  <input
                    type="text"
                    value={editFormData.department}
                    onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Account Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:bg-white focus:outline-none focus:border-purple-600"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Reset Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
