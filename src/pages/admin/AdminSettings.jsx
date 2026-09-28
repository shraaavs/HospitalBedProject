import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('profile'); // profile, departments, wards, bedTypes, resources, appointments, preferences
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Global settings state
  const [settings, setSettings] = useState({
    hospitalName: 'MediFlow Multi-Specialty Hospital',
    facilityCode: 'HOSP-IN-9082',
    tagline: 'NABH & JCI Accredited Tertiary Care Center',
    address: '42 Healthcare Boulevard, Medical Enclave, New Delhi, 110029',
    adminContactEmail: 'admin@mediflow.health',
    emergencyHelpline: '+91 1800 425 9999',
    ambulanceHotline: '108',
    currency: 'INR (₹)',
    taxPercentage: 5,
    departments: [],
    wards: [],
    bedTypes: [],
    resourceCategories: [],
    appointmentSettings: {
      slotDurationMinutes: 15,
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      allowWalkIns: true,
      maxDailyConsultationsPerDoctor: 40,
      standardConsultationFee: 800
    },
    notificationPreferences: {
      enableRealTimeNotifications: true,
      criticalVitalAlertThresholdSpO2: 90,
      notifyOnEmergencyArrival: true,
      notifyOnBedShortage: true,
      notifyOnResourceShortage: true,
      requireDoctorDischargeSignoff: true,
      autoReleaseBedOnDischarge: true
    }
  });

  // Modal states for new additions
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', code: '', headOfDepartment: '', description: '' });

  const [showWardModal, setShowWardModal] = useState(false);
  const [wardForm, setWardForm] = useState({ name: '', code: '', floor: '', wardType: 'General Ward', totalCapacity: 20, dailyRate: 2500 });

  const [showBedTypeModal, setShowBedTypeModal] = useState(false);
  const [bedTypeForm, setBedTypeForm] = useState({ name: '', code: '', description: '', dailyRate: 2500 });

  const [showResourceCatModal, setShowResourceCatModal] = useState(false);
  const [resourceCatForm, setResourceCatForm] = useState({ name: '', code: '', dailyRentalRate: 1000, description: '' });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/hospital');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveGlobal = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings/hospital', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Settings Saved',
          text: 'Hospital operational configuration updated successfully in MongoDB.',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        throw new Error('Failed to save');
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error Saving Settings',
        text: err.message
      });
    } finally {
      setSaving(false);
    }
  };

  // Add Department
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings/departments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(deptForm)
      });
      if (res.ok) {
        setShowDeptModal(false);
        setDeptForm({ name: '', code: '', headOfDepartment: '', description: '' });
        fetchSettings();
        Swal.fire({ icon: 'success', title: 'Department Created', timer: 1500, showConfirmButton: false });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Ward
  const handleAddWard = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings/wards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(wardForm)
      });
      if (res.ok) {
        setShowWardModal(false);
        setWardForm({ name: '', code: '', floor: '', wardType: 'General Ward', totalCapacity: 20, dailyRate: 2500 });
        fetchSettings();
        Swal.fire({ icon: 'success', title: 'Ward Unit Created', timer: 1500, showConfirmButton: false });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Bed Type
  const handleAddBedType = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings/bed-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bedTypeForm)
      });
      if (res.ok) {
        setShowBedTypeModal(false);
        setBedTypeForm({ name: '', code: '', description: '', dailyRate: 2500 });
        fetchSettings();
        Swal.fire({ icon: 'success', title: 'Bed Type Configured', timer: 1500, showConfirmButton: false });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add Resource Category
  const handleAddResourceCat = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/settings/resource-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(resourceCatForm)
      });
      if (res.ok) {
        setShowResourceCatModal(false);
        setResourceCatForm({ name: '', code: '', dailyRentalRate: 1000, description: '' });
        fetchSettings();
        Swal.fire({ icon: 'success', title: 'Resource Category Configured', timer: 1500, showConfirmButton: false });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full pb-16">
      {/* Header Banner */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-900 text-white">
              <span className="material-symbols-outlined text-[26px]">tune</span>
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">Admin & Hospital Operational Settings</h1>
              <p className="text-sm text-on-surface-variant">Global facility configuration, departments, wards, bed tariffs, resources, and clinical governance.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveGlobal}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow hover:bg-primary/95 transition-all disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">{saving ? 'sync' : 'save'}</span>
            <span>{saving ? 'Saving...' : 'Save All Settings'}</span>
          </button>
        </div>
      </section>

      {/* Settings Navigation Tabs */}
      <div className="flex border-b border-outline-variant/60 mb-6 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'profile', label: 'Hospital Profile', icon: 'domain' },
          { id: 'departments', label: 'Clinical Departments', icon: 'local_hospital' },
          { id: 'wards', label: 'Wards & Care Units', icon: 'apartment' },
          { id: 'bedTypes', label: 'Bed Types & Tariffs', icon: 'single_bed' },
          { id: 'resources', label: 'Resource Categories', icon: 'medical_services' },
          { id: 'appointments', label: 'Appointments & Consultations', icon: 'calendar_month' },
          { id: 'preferences', label: 'Governance & Notifications', icon: 'policy' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-surface-container-lowest text-primary border-t-2 border-primary border-x border-outline-variant shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-16 text-center bg-surface-container-lowest rounded-2xl border border-outline-variant">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-bold text-on-surface">Loading hospital operational configuration...</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm p-6">
          {/* TAB 1: HOSPITAL PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-6 text-xs">
              <h3 className="text-base font-bold text-on-surface border-b border-outline-variant pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">domain</span>
                Hospital Facility Identification & Branding
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Hospital / Medical Center Name *</label>
                  <input
                    type="text"
                    value={settings.hospitalName || ''}
                    onChange={(e) => setSettings({ ...settings, hospitalName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none font-semibold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Facility Registration Code *</label>
                  <input
                    type="text"
                    value={settings.facilityCode || ''}
                    onChange={(e) => setSettings({ ...settings, facilityCode: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none font-mono text-sm"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-on-surface mb-1">Accreditation Tagline & Subtitle</label>
                  <input
                    type="text"
                    value={settings.tagline || ''}
                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block font-bold text-on-surface mb-1">Physical Address & Location</label>
                  <textarea
                    rows={2}
                    value={settings.address || ''}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Admin Operations Email</label>
                  <input
                    type="email"
                    value={settings.adminContactEmail || ''}
                    onChange={(e) => setSettings({ ...settings, adminContactEmail: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Emergency Helpline</label>
                  <input
                    type="text"
                    value={settings.emergencyHelpline || ''}
                    onChange={(e) => setSettings({ ...settings, emergencyHelpline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Ambulance Rapid Hotline</label>
                  <input
                    type="text"
                    value={settings.ambulanceHotline || ''}
                    onChange={(e) => setSettings({ ...settings, ambulanceHotline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Applicable GST / Billing Tax (%)</label>
                  <input
                    type="number"
                    value={settings.taxPercentage || 5}
                    onChange={(e) => setSettings({ ...settings, taxPercentage: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CLINICAL DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                <div>
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">local_hospital</span>
                    Hospital Medical Departments
                  </h3>
                  <p className="text-xs text-on-surface-variant">Departments configured here are dynamically available across Staff, Appointments, and Admissions.</p>
                </div>
                <button
                  onClick={() => setShowDeptModal(true)}
                  className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg shadow hover:bg-primary/95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Department
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(settings.departments || []).map((dep, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-outline-variant bg-surface-container-low/40 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-on-surface">{dep.name}</span>
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] font-bold">{dep.code}</span>
                      </div>
                      <p className="text-xs text-primary font-semibold mb-1">Head: {dep.headOfDepartment || 'To be assigned'}</p>
                      <p className="text-[11px] text-on-surface-variant line-clamp-2">{dep.description || 'Clinical specialty unit'}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-outline-variant/40 flex justify-between items-center text-[10px]">
                      <span className="text-green-600 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: WARDS & CARE UNITS */}
          {activeTab === 'wards' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                <div>
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">apartment</span>
                    Hospital Wards & Specialized Units
                  </h3>
                  <p className="text-xs text-on-surface-variant">Configures ward floors, default capacities, and baseline bed tariffs synced with Bed Management.</p>
                </div>
                <button
                  onClick={() => setShowWardModal(true)}
                  className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg shadow hover:bg-primary/95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Ward Unit
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant">
                    <tr>
                      <th className="p-3">Ward Name</th>
                      <th className="p-3">Code</th>
                      <th className="p-3">Floor</th>
                      <th className="p-3">Ward Type</th>
                      <th className="p-3 text-center">Bed Capacity</th>
                      <th className="p-3 text-right">Daily Tariff (INR)</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                    {(settings.wards || []).map((w, idx) => (
                      <tr key={idx} className="hover:bg-primary/5 transition-colors">
                        <td className="p-3 font-bold">{w.name}</td>
                        <td className="p-3 font-mono text-primary font-bold">{w.code}</td>
                        <td className="p-3">{w.floor}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-surface-container text-[10px] font-bold">
                            {w.wardType}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold">{w.totalCapacity} Beds</td>
                        <td className="p-3 text-right font-black text-primary">₹{Number(w.dailyRate || 0).toLocaleString('en-IN')}</td>
                        <td className="p-3 text-center">
                          <span className="text-green-600 font-bold text-[11px]">Active</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: BED TYPES & TARIFFS */}
          {activeTab === 'bedTypes' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                <div>
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">single_bed</span>
                    Bed Types & Standard Tariffs
                  </h3>
                  <p className="text-xs text-on-surface-variant">Manage classifications (Fowler, ICU motorized, Cribs) and billing calculation rates.</p>
                </div>
                <button
                  onClick={() => setShowBedTypeModal(true)}
                  className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg shadow hover:bg-primary/95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Bed Type
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(settings.bedTypes || []).map((bt, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-outline-variant bg-surface-container-low/40 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-on-surface">{bt.name}</span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-mono text-[10px] font-bold">{bt.code}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">{bt.description || 'Hospital bed category'}</p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-outline-variant/40 flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Daily Tariff:</span>
                      <span className="text-sm font-black text-primary">₹{Number(bt.dailyRate || 0).toLocaleString('en-IN')} / day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: RESOURCE CATEGORIES */}
          {activeTab === 'resources' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-outline-variant pb-3">
                <div>
                  <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">medical_services</span>
                    Medical Resource & Equipment Categories
                  </h3>
                  <p className="text-xs text-on-surface-variant">Categories synced with the Resource Allocation and Requisitions workflow.</p>
                </div>
                <button
                  onClick={() => setShowResourceCatModal(true)}
                  className="px-3 py-1.5 bg-primary text-on-primary text-xs font-bold rounded-lg shadow hover:bg-primary/95 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Add Category
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(settings.resourceCategories || []).map((rc, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-outline-variant bg-surface-container-low/40 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-bold text-sm text-on-surface">{rc.name}</span>
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold">{rc.code}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">{rc.description || 'Medical hardware category'}</p>
                    </div>
                    <div className="mt-4 pt-2 border-t border-outline-variant/40 flex justify-between items-center">
                      <span className="text-xs text-on-surface-variant">Standard Rate:</span>
                      <span className="text-sm font-black text-purple-700">₹{Number(rc.dailyRentalRate || 0).toLocaleString('en-IN')} / day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: APPOINTMENTS & CONSULTATIONS */}
          {activeTab === 'appointments' && (
            <div className="space-y-6 text-xs">
              <h3 className="text-base font-bold text-on-surface border-b border-outline-variant pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">calendar_month</span>
                Outpatient Scheduling & Consultation Rules
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-on-surface mb-1">Consultation Slot Duration (Minutes)</label>
                  <input
                    type="number"
                    value={settings.appointmentSettings?.slotDurationMinutes || 15}
                    onChange={(e) => setSettings({
                      ...settings,
                      appointmentSettings: { ...settings.appointmentSettings, slotDurationMinutes: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Standard OPD Consultation Fee (INR)</label>
                  <input
                    type="number"
                    value={settings.appointmentSettings?.standardConsultationFee || 800}
                    onChange={(e) => setSettings({
                      ...settings,
                      appointmentSettings: { ...settings.appointmentSettings, standardConsultationFee: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">OPD Working Hours Start</label>
                  <input
                    type="time"
                    value={settings.appointmentSettings?.workingHoursStart || '09:00'}
                    onChange={(e) => setSettings({
                      ...settings,
                      appointmentSettings: { ...settings.appointmentSettings, workingHoursStart: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">OPD Working Hours End</label>
                  <input
                    type="time"
                    value={settings.appointmentSettings?.workingHoursEnd || '18:00'}
                    onChange={(e) => setSettings({
                      ...settings,
                      appointmentSettings: { ...settings.appointmentSettings, workingHoursEnd: e.target.value }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-on-surface mb-1">Max Daily Consultations Per Doctor</label>
                  <input
                    type="number"
                    value={settings.appointmentSettings?.maxDailyConsultationsPerDoctor || 40}
                    onChange={(e) => setSettings({
                      ...settings,
                      appointmentSettings: { ...settings.appointmentSettings, maxDailyConsultationsPerDoctor: Number(e.target.value) }
                    })}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: GOVERNANCE & NOTIFICATIONS */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 text-xs">
              <h3 className="text-base font-bold text-on-surface border-b border-outline-variant pb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">policy</span>
                Clinical Governance & Alert Threshold Preferences
              </h3>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-low/40 cursor-pointer">
                  <div>
                    <p className="font-bold text-on-surface text-sm">Require Doctor Discharge Sign-Off Before Billing</p>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">Enforces mandatory clinical clearance from attending physician prior to generating discharge invoices.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationPreferences?.requireDoctorDischargeSignoff ?? true}
                    onChange={(e) => setSettings({
                      ...settings,
                      notificationPreferences: { ...settings.notificationPreferences, requireDoctorDischargeSignoff: e.target.checked }
                    })}
                    className="w-5 h-5 text-primary rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-low/40 cursor-pointer">
                  <div>
                    <p className="font-bold text-on-surface text-sm">Automatic Bed & Resource Release Upon Final Bill Settlement</p>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">Immediately releases allocated hospital beds and returns equipment back to available stock upon discharge completion.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationPreferences?.autoReleaseBedOnDischarge ?? true}
                    onChange={(e) => setSettings({
                      ...settings,
                      notificationPreferences: { ...settings.notificationPreferences, autoReleaseBedOnDischarge: e.target.checked }
                    })}
                    className="w-5 h-5 text-primary rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-low/40 cursor-pointer">
                  <div>
                    <p className="font-bold text-on-surface text-sm">Real-Time Hospital Notification Dispatch</p>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">Sends automated WebSocket / MongoDB notifications for critical vitals, code blues, emergency arrivals, and bed transfers.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notificationPreferences?.enableRealTimeNotifications ?? true}
                    onChange={(e) => setSettings({
                      ...settings,
                      notificationPreferences: { ...settings.notificationPreferences, enableRealTimeNotifications: e.target.checked }
                    })}
                    className="w-5 h-5 text-primary rounded"
                  />
                </label>

                <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low/40">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-on-surface">Critical Hypoxia Alert Threshold (SpO₂ %)</span>
                    <span className="font-bold text-error font-mono">{settings.notificationPreferences?.criticalVitalAlertThresholdSpO2 || 90}%</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="95"
                    value={settings.notificationPreferences?.criticalVitalAlertThresholdSpO2 || 90}
                    onChange={(e) => setSettings({
                      ...settings,
                      notificationPreferences: { ...settings.notificationPreferences, criticalVitalAlertThresholdSpO2: Number(e.target.value) }
                    })}
                    className="w-full accent-error cursor-pointer"
                  />
                  <p className="text-[11px] text-on-surface-variant mt-1">Triggers emergency code alert across nursing roster when oxygen saturation falls below this value.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD DEPARTMENT */}
      {showDeptModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto"
            style={{ width: '100%', maxWidth: '480px' }}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">domain</span>
                <h3 className="text-sm font-bold text-white">Add Medical Department</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDeptModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleAddDepartment} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Orthopedics or Dermatology"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Department Code</label>
                <input
                  type="text"
                  placeholder="e.g. ORTH"
                  value={deptForm.code}
                  onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Head of Department (HOD)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Vikram Sethi"
                  value={deptForm.headOfDepartment}
                  onChange={(e) => setDeptForm({ ...deptForm, headOfDepartment: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={deptForm.description}
                  onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowDeptModal(false)} 
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                  Create Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD WARD */}
      {showWardModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto"
            style={{ width: '100%', maxWidth: '480px' }}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">single_bed</span>
                <h3 className="text-sm font-bold text-white">Add Hospital Ward Unit</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWardModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleAddWard} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Ward Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pediatric ICU or Orthopedic Ward"
                  value={wardForm.name}
                  onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Ward Code</label>
                  <input
                    type="text"
                    placeholder="e.g. PICU"
                    value={wardForm.code}
                    onChange={(e) => setWardForm({ ...wardForm, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Floor</label>
                  <input
                    type="text"
                    placeholder="e.g. 3rd Floor"
                    value={wardForm.floor}
                    onChange={(e) => setWardForm({ ...wardForm, floor: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Ward Classification</label>
                  <select
                    value={wardForm.wardType}
                    onChange={(e) => setWardForm({ ...wardForm, wardType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-800 font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  >
                    <option value="General Ward">General Ward</option>
                    <option value="ICU">Intensive Care (ICU)</option>
                    <option value="NICU">Neonatal ICU (NICU)</option>
                    <option value="Pediatric Ward">Pediatric Ward</option>
                    <option value="Emergency Ward">Emergency Ward</option>
                    <option value="Private Ward">Private Ward</option>
                    <option value="Semi-Private">Semi-Private</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Bed Capacity</label>
                  <input
                    type="number"
                    value={wardForm.totalCapacity}
                    onChange={(e) => setWardForm({ ...wardForm, totalCapacity: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Daily Bed Rate (INR)</label>
                <input
                  type="number"
                  value={wardForm.dailyRate}
                  onChange={(e) => setWardForm({ ...wardForm, dailyRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowWardModal(false)} 
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                  Create Ward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD BED TYPE */}
      {showBedTypeModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto"
            style={{ width: '100%', maxWidth: '480px' }}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">hotel</span>
                <h3 className="text-sm font-bold text-white">Add Bed Type & Tariff</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBedTypeModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleAddBedType} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Bed Type Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bariatric Motorized Bed"
                  value={bedTypeForm.name}
                  onChange={(e) => setBedTypeForm({ ...bedTypeForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Daily Tariff (INR) *</label>
                <input
                  type="number"
                  required
                  value={bedTypeForm.dailyRate}
                  onChange={(e) => setBedTypeForm({ ...bedTypeForm, dailyRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={bedTypeForm.description}
                  onChange={(e) => setBedTypeForm({ ...bedTypeForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowBedTypeModal(false)} 
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                  Save Bed Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD RESOURCE CATEGORY */}
      {showResourceCatModal && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto"
            style={{ width: '100%', maxWidth: '480px' }}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">category</span>
                <h3 className="text-sm font-bold text-white">Add Medical Resource Category</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowResourceCatModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <form onSubmit={handleAddResourceCat} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dialysis Machine or BiPAP"
                  value={resourceCatForm.name}
                  onChange={(e) => setResourceCatForm({ ...resourceCatForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Standard Daily Rental Rate (INR)</label>
                <input
                  type="number"
                  value={resourceCatForm.dailyRentalRate}
                  onChange={(e) => setResourceCatForm({ ...resourceCatForm, dailyRentalRate: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={resourceCatForm.description}
                  onChange={(e) => setResourceCatForm({ ...resourceCatForm, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowResourceCatModal(false)} 
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold transition-all hover:scale-[1.02] active:scale-95"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
