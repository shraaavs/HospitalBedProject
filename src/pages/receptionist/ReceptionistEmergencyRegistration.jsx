import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

const REGISTERED_HOSPITAL_DOCTORS = [
  { doctorId: 'DOC-003', name: 'Dr. Priya Sharma', department: 'Emergency Care', specialization: 'Trauma Resuscitation & Acute Critical Care' },
  { doctorId: 'DOC-001', name: 'Dr. Sarah Chen', department: 'Cardiology', specialization: 'Interventional Cardiology & Electrophysiology' },
  { doctorId: 'DOC-002', name: 'Dr. Smith', department: 'General Medicine', specialization: 'Internal Medicine, Diabetes & Chronic Disease Care' },
  { doctorId: 'DOC-004', name: 'Dr. Vikram Rao', department: 'Orthopedics', specialization: 'Joint Replacement & Arthroscopic Trauma Surgery' },
  { doctorId: 'DOC-005', name: 'Dr. Ananya Reddy', department: 'Pediatrics', specialization: 'Pediatric Critical Care & Child Development' },
  { doctorId: 'DOC-006', name: 'Dr. Rajesh Patel', department: 'Surgery', specialization: 'Minimally Invasive & Laparoscopic Surgery' }
];

export default function ReceptionistEmergencyRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState(REGISTERED_HOSPITAL_DOCTORS);
  const [selectedExistingId, setSelectedExistingId] = useState('');

  const [form, setForm] = useState({
    patientId: '',
    patientCustomId: '',
    patientName: '',
    age: '',
    gender: 'Male',
    contactNumber: '',
    attendantName: '',
    attendantContact: '',
    arrivalMode: 'Ambulance (108/EMS)',
    arrivalTime: new Date().toISOString().substring(0, 16),
    arrivalNotes: '',
    triagePriority: 'Red - Immediate / Resuscitation',
    emergencyCode: 'Code Trauma (Major Multiple Trauma / MVA)',
    customEmergencyCode: '',
    assignedDoctorName: 'Dr. Priya Sharma',
    department: 'Emergency Care',
    chiefComplaint: ''
  });

  useEffect(() => {
    fetchRegisteredPatients();
    fetchRegisteredDoctors();
  }, []);

  const fetchRegisteredDoctors = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      let docList = [];
      const res = await fetch('/api/users/staff/doctors', { headers });
      if (res.ok) {
        docList = await res.json();
      } else {
        const fallbackRes = await fetch('/api/doctors', { headers });
        if (fallbackRes.ok) {
          docList = await fallbackRes.json();
        }
      }

      if (Array.isArray(docList) && docList.length > 0) {
        // Deduplicate and combine with registered defaults
        const seen = new Set();
        const combined = [...docList, ...REGISTERED_HOSPITAL_DOCTORS].filter(d => {
          const key = (d.name || '').trim().toLowerCase();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setDoctors(combined);
      }
    } catch (err) {
      console.error('Error fetching registered doctors:', err);
    }
  };

  const fetchRegisteredPatients = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
    }
  };

  const handleSelectExistingPatient = (pId) => {
    setSelectedExistingId(pId);
    if (!pId) {
      setForm(prev => ({
        ...prev,
        patientId: '',
        patientCustomId: '',
        patientName: '',
        age: '',
        contactNumber: '',
        attendantName: '',
        attendantContact: ''
      }));
      return;
    }

    const p = patients.find(pat => pat._id === pId);
    if (p) {
      setForm(prev => ({
        ...prev,
        patientId: p._id,
        patientCustomId: p.patientId,
        patientName: p.fullName || p.name || '',
        age: p.age || '',
        gender: p.gender || 'Male',
        contactNumber: p.contactNumber || p.phoneNumber || p.phone || '',
        attendantName: p.emergencyContact?.name || p.emergencyContactName || p.attendantName || '',
        attendantContact: p.emergencyContact?.phone || p.emergencyContactPhone || p.attendantContact || p.contactNumber || p.phoneNumber || p.phone || ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/emergency', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: form.patientId || null,
          patientCustomId: form.patientCustomId || null,
          patientName: form.patientName,
          age: Number(form.age) || 40,
          gender: form.gender,
          attendantName: form.attendantName,
          attendantContact: form.attendantContact || form.contactNumber,
          arrivalMode: form.arrivalMode,
          arrivalTime: form.arrivalTime,
          arrivalNotes: form.arrivalNotes,
          triagePriority: form.triagePriority,
          emergencyCode: form.emergencyCode,
          customEmergencyCode: form.customEmergencyCode,
          assignedDoctorName: form.assignedDoctorName,
          department: form.department,
          chiefComplaint: form.chiefComplaint || form.arrivalNotes || 'Emergency arrival'
        })
      });

      const data = await res.json();

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Emergency Intake Registered!',
          html: `Emergency Record <b>${data.emergencyId || 'EMG-NEW'}</b> generated for <b>${form.patientName}</b>.<br/>Assigned to <b>${form.assignedDoctorName}</b>.<br/>High-priority notification dispatched to the medical team.`,
          confirmButtonColor: '#e11d48'
        }).then(() => {
          navigate('/receptionist/dashboard');
        });
      } else {
        Swal.fire('Registration Error', data.message || 'Registration failed', 'error');
      }
    } catch (err) {
      console.error('Emergency registration error:', err);
      Swal.fire('Error', err.message || 'Server connection error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Banner */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 text-white p-6 rounded-2xl shadow-md flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-3xl">emergency</span>
            <h1 className="text-2xl font-bold">Front-Desk Emergency Registration</h1>
          </div>
          <p className="text-rose-100 text-xs mt-1">
            Zero-delay rapid patient intake, arrival log capture, and immediate medical team notification dispatch
          </p>
        </div>

        <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-300 animate-ping"></span> Priority ER Intake
        </span>
      </div>

      {/* Protocol Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-center gap-2.5">
        <span className="material-symbols-outlined text-amber-600 text-xl flex-shrink-0">info</span>
        <span>
          <strong>Front-Desk Protocol Note:</strong> Reception records administrative identity, arrival time, and attendant details. Clinical diagnosis, triage scoring, and treatment orders are handled by attending Doctors and ER Nurses upon intake.
        </span>
      </div>

      {/* Registration Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm max-w-4xl mx-auto w-full">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Lookup Existing Patient */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Search Existing Hospital Patient (Optional)
            </label>
            <select
              value={selectedExistingId}
              onChange={(e) => handleSelectExistingPatient(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- New Unregistered / Fast Entry Patient --</option>
              {patients.map(p => (
                <option key={p._id} value={p._id}>
                  {p.fullName} ({p.patientId}) - Phone: {p.phone}
                </option>
              ))}
            </select>
          </div>

          {/* Section 1: Patient Demographics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Patient Identification</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">Patient Full Name / Unknown Alias *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar or Unknown Male #1"
                  value={form.patientName}
                  onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Age *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45"
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Gender *</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Attendant / Relative Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sunita Kumar (Spouse)"
                  value={form.attendantName}
                  onChange={(e) => setForm({ ...form, attendantName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Attendant Contact Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98765 43210"
                  value={form.attendantContact}
                  onChange={(e) => setForm({ ...form, attendantContact: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Arrival Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Arrival Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Arrival Mode *</label>
                <select
                  value={form.arrivalMode}
                  onChange={(e) => setForm({ ...form, arrivalMode: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                >
                  <option value="Ambulance (108/EMS)">Ambulance (108/EMS)</option>
                  <option value="Walk-in / Private Vehicle">Walk-in / Private Vehicle</option>
                  <option value="Inter-Hospital Transfer">Inter-Hospital Transfer</option>
                  <option value="Police Escort">Police Escort</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Arrival Timestamp *</label>
                <input
                  type="datetime-local"
                  required
                  value={form.arrivalTime}
                  onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Assigned ER Doctor <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={form.assignedDoctorName}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const matchedDoc = doctors.find(
                      (d) => (d.name.startsWith('Dr.') ? d.name : `Dr. ${d.name}`) === selectedName || d.name === selectedName
                    );
                    setForm({
                      ...form,
                      assignedDoctorName: selectedName,
                      department: matchedDoc?.department || form.department
                    });
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 bg-white focus:ring-2 focus:ring-rose-500 font-medium cursor-pointer"
                >
                  <option value="">-- Select Registered Doctor --</option>
                  {doctors.map((doc) => {
                    const formattedDocName = doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`;
                    return (
                      <option key={doc._id || doc.doctorId || doc.name} value={formattedDocName}>
                        {formattedDocName} ({doc.department || 'Consultant'}{doc.specialization ? ` - ${doc.specialization}` : ''})
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Emergency Arrival Observations / Presenting Complaint *</label>
              <textarea
                rows={2}
                required
                placeholder="e.g. Unresponsive post-MVA collision, acute respiratory distress, severe bleeding..."
                value={form.chiefComplaint}
                onChange={(e) => setForm({ ...form, chiefComplaint: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-rose-500"
              ></textarea>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/receptionist/dashboard')}
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">emergency</span>
              {loading ? 'Registering...' : 'Register & Dispatch Medical Team Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

