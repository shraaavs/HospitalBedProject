import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function AdminProfile() {
  const [profile, setProfile] = useState({
    name: 'Pooja',
    adminId: 'ADM-1001',
    email: 'pooja.admin@mediflow.health',
    username: 'pooja_admin',
    designation: 'Hospital Administrator & Operations Director',
    department: 'Hospital Administration & Clinical Operations',
    phone: '+91 98765 00001',
    qualification: 'MHA (Hospital Administration), MBBS',
    officeLocation: 'Admin Block, Level 4, Room 401',
    role: 'Admin',
    status: 'Active',
    profilePhoto: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256&h=256'
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
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const merged = {
          ...data,
          adminId: data.adminId || 'ADM-1001',
          designation: data.designation || 'Hospital Administrator & Operations Director',
          department: data.department || 'Hospital Administration & Clinical Operations',
          qualification: data.qualification || 'MHA (Hospital Administration), MBBS',
          officeLocation: data.officeLocation || 'Admin Block, Level 4, Room 401',
          phone: data.phone || '+91 98765 00001',
          profilePhoto: data.profilePhoto || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=256&h=256'
        };
        setProfile(merged);
        setFormData(merged);
      }
    } catch (err) {
      console.error('Failed to load admin profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          designation: formData.designation,
          department: formData.department,
          qualification: formData.qualification,
          officeLocation: formData.officeLocation,
          profilePhoto: formData.profilePhoto,
          password: formData.newPassword || undefined
        })
      });

      if (res.ok) {
        const result = await res.json();
        const updated = result.profile || result;
        setProfile(prev => ({ ...prev, ...updated }));
        setFormData(prev => ({ ...prev, ...updated, newPassword: '' }));
        setIsEditing(false);

        if (updated?.name) {
          localStorage.setItem('userName', updated.name);
        }

        Swal.fire({
          icon: 'success',
          title: 'Profile Updated',
          text: 'Admin details saved successfully to MongoDB.',
          timer: 1800,
          showConfirmButton: false
        });
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'Failed to update profile', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Network error updating profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header Profile Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <img
            src={profile.profilePhoto}
            alt={profile.name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
          />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">{profile.name || 'Pooja'}</h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/20 text-blue-200 border border-primary/30">
                Super Administrator
              </span>
            </div>
            <p className="text-slate-300 text-xs sm:text-sm mt-1">
              Admin ID: <strong className="text-white font-mono">{profile.adminId || 'ADM-1001'}</strong> • Department: <strong className="text-white">{profile.department}</strong>
            </p>
            <p className="text-slate-400 text-xs mt-0.5">
              {profile.designation}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsEditing(!isEditing);
            setFormData({ ...profile, newPassword: '' });
          }}
          className="px-5 py-2.5 bg-white text-slate-900 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all shadow-md flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[18px]">{isEditing ? 'close' : 'edit'}</span>
          <span>{isEditing ? 'Cancel Edit' : 'Edit Profile'}</span>
        </button>
      </div>

      {/* Main Form Dossier */}
      <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant shadow-sm p-6 sm:p-8">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-xs font-semibold text-on-surface-variant">Loading admin profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6 text-xs">
            {/* Section 1: Personal & Contact Information */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-on-surface pb-3 border-b border-outline-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">person</span>
                <span>Personal & Contact Details (Permitted Updates)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Full Legal Name *</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    required
                    disabled={!isEditing}
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Direct Phone / Mobile</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Professional Qualifications</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.qualification || ''}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Administrative Designation</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.designation || ''}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Assigned Department</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.department || ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-on-surface mb-1">Office Location / Cabin</label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.officeLocation || ''}
                    onChange={(e) => setFormData({ ...formData, officeLocation: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-on-surface mb-1">Profile Photo URL</label>
                  <input
                    type="url"
                    disabled={!isEditing}
                    value={formData.profilePhoto || ''}
                    onChange={(e) => setFormData({ ...formData, profilePhoto: e.target.value })}
                    placeholder="https://..."
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold ${
                      isEditing ? 'border-primary/40 bg-surface' : 'border-outline-variant/60 bg-surface-container-low text-on-surface'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Protected System Privileges (Read Only) */}
            <div className="space-y-4 pt-2">
              <h3 className="text-base font-bold text-on-surface pb-3 border-b border-outline-variant flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600">lock</span>
                <span>System Security & Access Boundary (Protected)</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-on-surface-variant block uppercase">Admin ID</span>
                  <span className="text-sm font-mono font-bold text-primary">{profile.adminId}</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-on-surface-variant block uppercase">Assigned System Role</span>
                  <span className="text-sm font-bold text-on-surface">Super Administrator</span>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">Role cannot be altered from self-profile</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/40">
                  <span className="text-[11px] font-bold text-on-surface-variant block uppercase">Account Security Status</span>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full inline-block mt-1">
                    Active & Authenticated
                  </span>
                </div>
              </div>
            </div>

            {/* Password Change */}
            {isEditing && (
              <div className="space-y-4 pt-2">
                <h3 className="text-base font-bold text-on-surface pb-3 border-b border-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">key</span>
                  <span>Security & Password Update</span>
                </h3>
                <div className="max-w-md">
                  <label className="block font-bold text-on-surface mb-1">New Password (Min 6 chars)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current password"
                    value={formData.newPassword || ''}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-primary/40 bg-surface text-sm"
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {isEditing && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-outline-variant rounded-xl text-on-surface hover:bg-surface-container font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">{saving ? 'sync' : 'save'}</span>
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
