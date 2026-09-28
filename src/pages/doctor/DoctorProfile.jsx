import React, { useState, useEffect } from 'react';

export default function DoctorProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [notification, setNotification] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({});

  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const defaultAvatar = "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=256&h=256";

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const res = await fetch('/api/users/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          profilePhoto: data.profilePhoto || '',
          specialization: data.specialization || '',
          qualification: data.qualification || data.qualifications || '',
          cabinNumber: data.cabinNumber || '',
          bio: data.bio || '',
          availability: {
            status: data.availability?.status || 'Available',
            days: data.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            shiftHours: data.availability?.shiftHours || '09:00 AM - 05:00 PM',
            emergencyOnCall: data.availability?.emergencyOnCall ?? true
          }
        });
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Failed to fetch doctor profile');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setErrorMessage('Network error fetching profile from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleToggleDay = (day) => {
    const currentDays = formData.availability?.days || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];

    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        days: newDays
      }
    });
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setNotification('');

    // Client-side validations
    if (!formData.phone || formData.phone.trim().length < 8) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }
    if (!formData.email || !formData.email.includes('@')) {
      setErrorMessage('Please enter a valid official email address.');
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('userToken');
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          profilePhoto: formData.profilePhoto,
          specialization: formData.specialization,
          qualification: formData.qualification,
          qualifications: formData.qualification,
          cabinNumber: formData.cabinNumber,
          bio: formData.bio,
          availability: formData.availability
        })
      });

      if (res.ok) {
        const result = await res.json();
        const updatedProfile = result.profile;
        setProfile(updatedProfile);
        setFormData({
          name: updatedProfile.name || '',
          email: updatedProfile.email || '',
          phone: updatedProfile.phone || '',
          profilePhoto: updatedProfile.profilePhoto || '',
          specialization: updatedProfile.specialization || '',
          qualification: updatedProfile.qualification || updatedProfile.qualifications || '',
          cabinNumber: updatedProfile.cabinNumber || '',
          bio: updatedProfile.bio || '',
          availability: {
            status: updatedProfile.availability?.status || 'Available',
            days: updatedProfile.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
            shiftHours: updatedProfile.availability?.shiftHours || '09:00 AM - 05:00 PM',
            emergencyOnCall: updatedProfile.availability?.emergencyOnCall ?? true
          }
        });
        localStorage.setItem('userName', updatedProfile.name);
        setIsEditing(false);
        setNotification('Doctor profile and contact details updated successfully in MongoDB!');
        setTimeout(() => setNotification(''), 4500);
      } else {
        const err = await res.json();
        setErrorMessage(err.message || 'Error updating profile');
      }
    } catch (err) {
      console.error('Failed to update profile:', err);
      setErrorMessage('Server connection error while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <span className="material-symbols-outlined animate-spin text-4xl text-teal-600 mb-2">sync</span>
        <p className="text-sm font-semibold">Retrieving professional profile from MongoDB...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <span className="material-symbols-outlined text-5xl text-rose-500 mb-3">error</span>
        <h2 className="text-lg font-bold text-slate-900">Profile Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{errorMessage || 'Unable to load doctor profile record.'}</p>
        <button
          onClick={fetchProfile}
          className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-semibold"
        >
          Try Again
        </button>
      </div>
    );
  }

  const currentPhoto = (isEditing ? formData.profilePhoto : profile.profilePhoto) || defaultAvatar;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Notifications */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-emerald-600 text-2xl">verified</span>
            <span className="text-sm font-bold text-emerald-900">{notification}</span>
          </div>
          <button onClick={() => setNotification('')} className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-600 text-2xl">warning</span>
            <span className="text-sm font-bold text-rose-900">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-700 hover:text-rose-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Header Profile Hero Card */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={currentPhoto}
                alt={profile.name}
                onError={(e) => { e.target.src = defaultAvatar; }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-white/40 shadow-inner bg-teal-950"
              />
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[12px]">check</span>
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight">{profile.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-white/20 border border-white/30 text-teal-100">
                  {profile.doctorId || 'DOC-8821'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/40 border border-teal-300/40 text-white uppercase">
                  {profile.role || 'Doctor'}
                </span>
              </div>
              
              <p className="text-teal-100 text-sm mt-1 font-semibold">
                {profile.specialization || 'Interventional Cardiology'} • <span className="text-teal-200">{profile.department}</span>
              </p>
              
              <div className="flex flex-wrap items-center gap-4 text-xs text-teal-200 mt-2 font-medium">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">badge</span>
                  Reg: {profile.registrationNumber || 'MCI-2015-88491'}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  {profile.email}
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">call</span>
                  {profile.phone || '+91 98765 43210'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2.5 text-sm font-bold text-teal-950 bg-white hover:bg-teal-50 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit Contact Info
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setFormData({
                      name: profile.name || '',
                      email: profile.email || '',
                      phone: profile.phone || '',
                      profilePhoto: profile.profilePhoto || '',
                      specialization: profile.specialization || '',
                      qualification: profile.qualification || profile.qualifications || '',
                      cabinNumber: profile.cabinNumber || '',
                      bio: profile.bio || '',
                      availability: {
                        status: profile.availability?.status || 'Available',
                        days: profile.availability?.days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                        shiftHours: profile.availability?.shiftHours || '09:00 AM - 05:00 PM',
                        emergencyOnCall: profile.availability?.emergencyOnCall ?? true
                      }
                    });
                    setIsEditing(false);
                    setErrorMessage('');
                  }}
                  className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-white/90 hover:bg-white/10 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-teal-950 bg-white hover:bg-teal-50 rounded-xl shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-base">sync</span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base">save</span>
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security & Access Boundary Notice */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
        <span className="material-symbols-outlined text-teal-700 text-xl mt-0.5">verified_user</span>
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="font-bold text-slate-800">RBAC Security Policy:</strong> Doctors can update personal contact information, profile avatar URL, qualifications summary, and clinical availability. Administrative fields (<span className="font-semibold text-slate-800">Doctor ID, Role, Department Assignment, Medical License #, Admin-Assigned Shift</span>) are locked and maintained exclusively by Hospital Administration.
        </div>
      </div>

      {/* Main Form Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personal & Contact Information */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">person</span>
                Personal & Professional Information
              </h3>
              {isEditing && (
                <span className="text-xs text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Editing Enabled
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Doctor Name */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Doctor Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="text-sm font-bold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    {profile.name}
                  </p>
                )}
              </div>

              {/* Doctor ID (Strictly Read-Only) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Doctor ID <span className="text-[10px] text-slate-400 font-normal">(System Unique)</span>
                </label>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-sm font-mono font-bold text-slate-700">{profile.doctorId}</span>
                  <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
                </div>
              </div>

              {/* Department (Strictly Read-Only) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Department <span className="text-[10px] text-slate-400 font-normal">(Admin Assigned)</span>
                </label>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-sm font-bold text-slate-700">{profile.department}</span>
                  <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
                </div>
              </div>

              {/* Medical Registration / License # (Read-Only) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Registration Number <span className="text-[10px] text-slate-400 font-normal">(MCI / State Board)</span>
                </label>
                <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 border border-slate-200">
                  <span className="text-sm font-mono font-bold text-slate-700">{profile.registrationNumber || 'MCI-2015-88491'}</span>
                  <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
                </div>
              </div>

              {/* Email (Authorized update) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    {profile.email}
                  </p>
                )}
              </div>

              {/* Phone (Authorized update) */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    {profile.phone || '+91 98765 43210'}
                  </p>
                )}
              </div>

              {/* Consultation Cabin Number */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Consultation Cabin / Suite</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.cabinNumber}
                    onChange={(e) => setFormData({ ...formData, cabinNumber: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="text-sm text-slate-800 font-medium bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                    {profile.cabinNumber || 'Consultation Suite 304, Block B'}
                  </p>
                )}
              </div>

              {/* Profile Photo URL */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Profile Photo (Image URL)</label>
                {isEditing ? (
                  <input
                    type="url"
                    placeholder="https://..."
                    value={formData.profilePhoto}
                    onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                  />
                ) : (
                  <p className="text-xs text-slate-500 font-mono truncate bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100">
                    {profile.profilePhoto ? 'Custom URL Connected' : 'Default Medical Avatar Active'}
                  </p>
                )}
              </div>
            </div>

            {/* Specialization */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Clinical Specialization</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="text-sm font-semibold text-teal-900 bg-teal-50/70 px-3 py-2 rounded-lg border border-teal-100">
                  {profile.specialization}
                </p>
              )}
            </div>

            {/* Qualification */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Academic & Clinical Qualifications</label>
              {isEditing ? (
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                />
              ) : (
                <p className="text-xs font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  {profile.qualification || profile.qualifications}
                </p>
              )}
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Professional Clinical Bio</label>
              {isEditing ? (
                <textarea
                  rows="3"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-teal-500"
                ></textarea>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Availability, Working Days & Admin Assigned Shift */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="material-symbols-outlined text-teal-600">schedule</span>
              Availability & Shift Rostering
            </h3>

            {/* Live Availability Status */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Live Clinical Status</label>
              {isEditing ? (
                <select
                  value={formData.availability?.status || 'Available'}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: { ...formData.availability, status: e.target.value }
                  })}
                  className="w-full px-3 py-2 text-sm font-bold text-teal-800 border rounded-lg focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Available">🟢 Available (Accepting Consultations)</option>
                  <option value="In Consultation">🟡 In Consultation</option>
                  <option value="In Emergency / OT">🔴 In Emergency / OT Surgery</option>
                  <option value="On Leave">⚪ On Leave</option>
                  <option value="Off Duty">⚫ Off Duty</option>
                </select>
              ) : (
                <div className="flex items-center gap-2.5 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-sm font-bold text-emerald-950">
                    {profile.availability?.status || 'Available'}
                  </span>
                </div>
              )}
            </div>

            {/* Admin Assigned Shift (Strictly Read-Only) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Assigned Shift <span className="text-[10px] text-slate-400 font-normal">(Admin Rostered)</span>
              </label>
              <div className="flex items-center justify-between p-3 bg-slate-100 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {profile.assignedShift || 'Morning Shift (09:00 AM - 05:00 PM)'}
                  </span>
                  <span className="text-[10px] text-slate-500">Rostered by Admin Roster Management</span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-sm">lock</span>
              </div>
            </div>

            {/* Working Days */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                Active Consultation Days
              </label>
              <div className="flex flex-wrap gap-1.5">
                {weekDays.map(day => {
                  const isSelected = (isEditing ? formData.availability?.days : profile.availability?.days)?.includes(day);
                  return (
                    <button
                      type="button"
                      key={day}
                      disabled={!isEditing}
                      onClick={() => handleToggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-teal-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      } ${!isEditing ? 'cursor-default' : 'cursor-pointer active:scale-95'}`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Emergency On-Call Duty */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center justify-between p-3 bg-rose-50/50 rounded-xl border border-rose-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-rose-900 uppercase block">Emergency On-Call Coverage</span>
                  <span className="text-[11px] text-rose-700">Available for after-hours acute trauma response</span>
                </div>
                <input
                  type="checkbox"
                  disabled={!isEditing}
                  checked={isEditing ? !!formData.availability?.emergencyOnCall : !!profile.availability?.emergencyOnCall}
                  onChange={(e) => setFormData({
                    ...formData,
                    availability: { ...formData.availability, emergencyOnCall: e.target.checked }
                  })}
                  className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
