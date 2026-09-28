import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function NurseProfile() {
  const [profile, setProfile] = useState({
    name: 'Nurse Sharanya',
    nurseId: 'NUR-1002',
    email: 'sharanya.nurse@mediflow.health',
    phone: '+91 98765 43219',
    department: 'General Medicine',
    assignedWard: 'General Medicine & Step-Down Unit',
    qualification: 'B.Sc. Nursing, RN (Critical Care Certified)',
    shift: 'Morning Shift (07:00 AM - 03:00 PM)',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    availability: {
      status: 'On Duty',
      isAvailable: true,
      shiftHours: '07:00 AM - 03:00 PM'
    },
    role: 'Nurse',
    profilePicture: '👩‍⚕️',
    status: 'Active'
  });

  const [formData, setFormData] = useState({ ...profile });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const availableAvatars = ['👩‍⚕️', '👨‍⚕️', '🩺', '🏥', '💉', '🥼', '❤️‍🩹', '🩹'];
  const allWeekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mergedData = {
          ...data,
          profilePicture: data.profilePicture || '👩‍⚕️',
          phone: data.phone || '+91 98765 43219',
          nurseId: data.nurseId || 'NUR-1002',
          qualification: data.qualification || 'B.Sc. Nursing, RN (Critical Care Certified)',
          shift: data.shift || 'Morning Shift (07:00 AM - 03:00 PM)',
          workingDays: Array.isArray(data.workingDays) && data.workingDays.length > 0
            ? data.workingDays
            : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          availability: {
            status: data.availability?.status || 'On Duty',
            isAvailable: data.availability?.isAvailable !== undefined ? data.availability.isAvailable : true,
            shiftHours: data.availability?.shiftHours || '07:00 AM - 03:00 PM'
          },
          department: data.department || 'General Medicine',
          assignedWard: data.assignedWard || 'General Medicine & Step-Down Unit'
        };
        setProfile(mergedData);
        setFormData(mergedData);
      }
    } catch (err) {
      console.error('Failed to load nurse profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleWorkingDayToggle = (day) => {
    const current = formData.workingDays || [];
    if (current.includes(day)) {
      if (current.length === 1) {
        Swal.fire('Notice', 'At least one working day must remain selected', 'info');
        return;
      }
      setFormData({ ...formData, workingDays: current.filter(d => d !== day) });
    } else {
      setFormData({ ...formData, workingDays: [...current, day] });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        profilePicture: formData.profilePicture,
        qualification: formData.qualification,
        workingDays: formData.workingDays,
        availability: formData.availability,
        password: formData.newPassword || undefined
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        const updatedProfile = result.profile || result;
        setProfile(prev => ({ ...prev, ...updatedProfile }));
        setFormData(prev => ({ ...prev, ...updatedProfile, newPassword: '' }));
        setIsEditing(false);

        if (updatedProfile?.name) {
          localStorage.setItem('userName', updatedProfile.name);
        }

        Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Permitted professional information and availability validated & saved in MongoDB.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        const errData = await res.json();
        Swal.fire('Update Failed', errData.message || 'Error saving changes', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0066cc] via-[#0055b3] to-[#004080] rounded-3xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/15 border-2 border-white/30 flex items-center justify-center text-4xl shadow-inner backdrop-blur-md flex-shrink-0">
            {formData.profilePicture || profile.profilePicture || '👩‍⚕️'}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{profile.name || 'Nurse Sharanya'}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                profile.availability?.status === 'On Duty'
                  ? 'bg-emerald-400/20 text-emerald-200 border-emerald-400/40'
                  : 'bg-amber-400/20 text-amber-200 border-amber-400/40'
              }`}>
                ● {profile.availability?.status || 'On Duty'}
              </span>
            </div>
            <p className="text-white/80 text-xs sm:text-sm mt-1">
              Nurse ID: <strong className="text-white font-mono">{profile.nurseId || 'NUR-1002'}</strong> • Role: <strong className="text-white">Registered Staff Nurse</strong>
            </p>
            <p className="text-white/70 text-xs mt-0.5">
              Department: {profile.department || 'General Medicine'} • Ward: {profile.assignedWard || 'General Ward'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsEditing(!isEditing);
            setFormData({ ...profile, newPassword: '' });
          }}
          className="px-5 py-2.5 bg-white text-[#0066cc] rounded-xl text-xs font-bold hover:bg-slate-100 transition-all shadow-md flex items-center gap-2 relative z-10 active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">{isEditing ? 'close' : 'edit'}</span>
          <span>{isEditing ? 'Cancel Edit' : 'Edit Permitted Details'}</span>
        </button>
      </div>

      {/* Security Scope Notice */}
      <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex items-start gap-3 text-xs text-blue-900 shadow-sm">
        <span className="material-symbols-outlined text-blue-600 text-[22px] shrink-0 mt-0.5">shield_person</span>
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900">Hospital Authorization & Profile Policy</p>
          <p className="text-slate-600 leading-relaxed">
            The nurse is permitted to manage personal contact details, qualifications, working days, and real-time duty availability.
            Role designation (Registered Nurse), hospital access levels, department assignment, admin-controlled shifts, other staff accounts, and hospital infrastructure settings are <strong>strictly protected</strong> by backend authorization and can only be altered by Hospital Administration.
          </p>
        </div>
      </div>

      {/* Main Form Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form onSubmit={handleSave} className="space-y-8">
          {/* Avatar Selector */}
          {isEditing && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 animate-in fade-in duration-200">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Choose Profile Avatar
              </label>
              <div className="flex items-center gap-3 flex-wrap">
                {availableAvatars.map(av => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setFormData({ ...formData, profilePicture: av })}
                    className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center border-2 transition-all ${
                      formData.profilePicture === av
                        ? 'border-[#0066cc] bg-blue-50 scale-110 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Professional & Contact Details (Permitted Edits) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">contact_page</span>
                <span>Professional & Contact Information</span>
              </h3>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                ✓ Nurse Permitted Updates
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    isEditing
                      ? 'border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  disabled={!isEditing}
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    isEditing
                      ? 'border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={!isEditing}
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    isEditing
                      ? 'border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Clinical Qualifications & Certifications
                </label>
                <input
                  type="text"
                  disabled={!isEditing}
                  value={formData.qualification || ''}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="e.g. B.Sc. Nursing, RN (Critical Care Certified)"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    isEditing
                      ? 'border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Availability & Working Days */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">calendar_month</span>
                <span>Working Days & Clinical Availability</span>
              </h3>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                Live Status Config
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Current Availability Status
                </label>
                <select
                  disabled={!isEditing}
                  value={formData.availability?.status || 'On Duty'}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: {
                      ...formData.availability,
                      status: e.target.value,
                      isAvailable: e.target.value === 'On Duty' || e.target.value === 'On Call'
                    }
                  })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    isEditing
                      ? 'border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'border-slate-200 bg-slate-50 text-slate-800'
                  }`}
                >
                  <option value="On Duty">On Duty (Active Ward Care)</option>
                  <option value="On Break">On Break (Temporary Away)</option>
                  <option value="On Call">On Call (Available for Emergencies)</option>
                  <option value="Off Duty">Off Duty (Shift Ended)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  Active Shift Schedule
                </label>
                <input
                  type="text"
                  disabled
                  value={profile.shift || 'Morning Shift (07:00 AM - 03:00 PM)'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-semibold"
                />
              </div>
            </div>

            {/* Working Days Badges */}
            <div className="space-y-2">
              <label className="block font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Configured Working Days
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {allWeekDays.map(day => {
                  const isSelected = (formData.workingDays || []).includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      disabled={!isEditing}
                      onClick={() => handleWorkingDayToggle(day)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#0066cc] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      } ${!isEditing ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3: Protected Administrative Duty & Security Assignment (Strictly Read-Only) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-500">lock</span>
                <span>Protected Role & Hospital Governance (Read-Only)</span>
              </h3>
              <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">lock</span> Hospital Admin Controlled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 font-medium">Assigned Nurse ID</p>
                <p className="text-sm font-bold font-mono text-slate-800 mt-1">{profile.nurseId || 'NUR-1002'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 font-medium">Department Assignment</p>
                <p className="text-sm font-bold text-slate-800 mt-1">{profile.department || 'General Medicine'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 font-medium">Assigned Ward Scope</p>
                <p className="text-sm font-bold text-blue-700 mt-1">{profile.assignedWard || 'General Ward'}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-slate-400 font-medium">Role & Permissions</p>
                <p className="text-sm font-bold text-emerald-700 mt-1">Staff Registered Nurse</p>
              </div>
            </div>
          </div>

          {/* Section 4: Security / Password Change */}
          {isEditing && (
            <div className="space-y-4 pt-2">
              <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600">key</span>
                <span>Account Password Security</span>
              </h3>
              <div className="max-w-md text-xs">
                <label className="block font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[11px]">
                  New Password (Optional, Minimum 6 Characters)
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to maintain existing password"
                  value={formData.newPassword || ''}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          {isEditing && (
            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ ...profile, newPassword: '' });
                }}
                className="px-5 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-[#0066cc] hover:bg-[#0052a3] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25 flex items-center gap-2 disabled:opacity-50 active:scale-95"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving to MongoDB...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span> Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
