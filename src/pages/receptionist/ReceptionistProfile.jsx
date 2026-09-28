import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function ReceptionistProfile() {
  const [profile, setProfile] = useState({
    name: 'Smitha',
    receptionistId: 'REC-1022',
    email: 'smitha.reception@mediflow.health',
    phone: '+91 98765 11223',
    department: 'Central Reception & OPD',
    deskLocation: 'Ground Floor, Front Desk A',
    shiftHours: '08:00 AM - 04:00 PM',
    role: 'Receptionist',
    status: 'Active'
  });

  const [formData, setFormData] = useState({ ...profile });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

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
        setFormData(data);
      }
    } catch (err) {
      console.error('Failed to load receptionist profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
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
          department: formData.department,
          deskLocation: formData.deskLocation,
          shiftHours: formData.shiftHours
        })
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile || formData);
        localStorage.setItem('userName', formData.name);
        setIsEditing(false);
        Swal.fire('Saved', 'Profile updated successfully in MongoDB.', 'success');
      } else {
        Swal.fire('Error', 'Failed to update profile', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-[#0066cc] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {profile.name?.charAt(0) || 'S'}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{profile.name}</h1>
            <p className="text-xs font-semibold text-[#0066cc] mt-0.5">
              {profile.role} • {profile.department || 'Central Reception'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              ID: <strong>{profile.receptionistId || 'REC-1022'}</strong> • Shift: {profile.shiftHours || '08:00 AM - 04:00 PM'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsEditing(!isEditing)}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
            isEditing ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-[#0066cc] text-white hover:bg-[#0055b3]'
          }`}
        >
          <span className="material-symbols-outlined text-base">{isEditing ? 'close' : 'edit'}</span>
          {isEditing ? 'Cancel Edit' : 'Edit Profile'}
        </button>
      </div>

      {/* Profile Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Full Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Receptionist ID (System Protected)</label>
              <input
                type="text"
                disabled
                value={profile.receptionistId || 'REC-1022'}
                className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Official Email</label>
              <input
                type="email"
                disabled={!isEditing}
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Contact Phone</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Department</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Desk Location</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.deskLocation || ''}
                onChange={(e) => setFormData({ ...formData, deskLocation: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Assigned Shift Hours</label>
              <input
                type="text"
                disabled={!isEditing}
                value={formData.shiftHours || ''}
                onChange={(e) => setFormData({ ...formData, shiftHours: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 disabled:opacity-75 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
              />
            </div>
          </div>

          {/* Role Guard Notice */}
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-start gap-2 mt-4">
            <span className="material-symbols-outlined text-base text-[#0066cc]">security</span>
            <div>
              <strong>Security & Role Governance:</strong> Role assignments, hospital permissions, and administrator access can only be modified by a Hospital Administrator.
            </div>
          </div>

          {isEditing && (
            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-[#0066cc] text-white rounded-lg text-xs font-bold hover:bg-[#0055b3] transition-colors shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
