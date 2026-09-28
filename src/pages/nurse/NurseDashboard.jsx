import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function NurseDashboard() {
  const [data, setData] = useState({
    nurseInfo: {
      name: '',
      nurseId: '',
      ward: 'General Medicine',
      shift: 'Morning Shift (07:00 AM - 03:00 PM)',
      role: 'Registered Staff Nurse'
    },
    stats: {
      totalAssignedPatients: 0,
      assignedPatients: 0,
      admittedPatients: 0,
      criticalPatients: 0,
      pendingVitalChecks: 0,
      vitalsPendingCount: 0,
      medicationsDue: 0,
      medicationsDueCount: 0,
      newDoctorInstructions: 0,
      pendingResourceRequests: 0,
      pendingResourceRequestsCount: 0,
      transferDischargeTasks: 0,
      emergencyAlerts: 0,
      occupiedBeds: 0,
      availableBeds: 0,
      pendingTasksCount: 0,
      criticalAlertsCount: 0
    },
    assignedPatientsList: [],
    pendingTasks: [],
    medicationSchedules: [],
    criticalAlerts: [],
    doctorInstructions: [],
    wardOccupiedBeds: []
  });

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNurseDashboard = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/dashboard/nurse', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error fetching nurse dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNurseDashboard();
    // Real-time live polling every 10 seconds to keep values updated with MongoDB changes
    const interval = setInterval(fetchNurseDashboard, 10000);
    return () => clearInterval(interval);
  }, []);

  const loggedInNurseName = localStorage.getItem('userName') || data.nurseInfo?.name || 'Staff Nurse';
  const nurseWard = localStorage.getItem('userDepartment') || data.nurseInfo?.ward || 'General Medicine';

  // 9 Primary Required KPI Cards (all strictly calculated from MongoDB & clickable)
  const kpiCards = [
    {
      title: 'Patients',
      value: data.stats?.totalAssignedPatients || data.stats?.assignedPatients || 0,
      subtitle: 'In ward care roster',
      icon: 'groups',
      color: 'blue',
      route: '/my-patients',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-100'
    },
    {
      title: 'Admitted Patients',
      value: data.stats?.admittedPatients || 0,
      subtitle: 'Bed occupants',
      icon: 'single_bed',
      color: 'indigo',
      route: '/beds',
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700',
      borderColor: 'border-indigo-100'
    },
    {
      title: 'Critical Patients',
      value: data.stats?.criticalPatients || 0,
      subtitle: 'ICU / High acuity',
      icon: 'ecg_heart',
      color: 'rose',
      route: '/emergency',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      borderColor: 'border-rose-100',
      pulse: (data.stats?.criticalPatients || 0) > 0
    },
    {
      title: 'Pending Vital Checks',
      value: data.stats?.pendingVitalChecks || data.stats?.vitalsPendingCount || 0,
      subtitle: 'Awaiting recording',
      icon: 'monitor_heart',
      color: 'emerald',
      route: '/vitals',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      borderColor: 'border-emerald-100'
    },
    {
      title: 'Medications Due',
      value: data.stats?.medicationsDue || data.stats?.medicationsDueCount || 0,
      subtitle: 'Active MAR doses',
      icon: 'medication',
      color: 'purple',
      route: '/prescriptions',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700',
      borderColor: 'border-purple-100'
    },
    {
      title: 'Doctor Instructions',
      value: data.stats?.newDoctorInstructions || 0,
      subtitle: 'Clinical orders',
      icon: 'assignment',
      color: 'sky',
      route: '/appointments',
      bgColor: 'bg-sky-50',
      textColor: 'text-sky-700',
      borderColor: 'border-sky-100'
    },
    {
      title: 'Pending Resource Requests',
      value: data.stats?.pendingResourceRequests || data.stats?.pendingResourceRequestsCount || 0,
      subtitle: 'Equipment & Supplies',
      icon: 'medical_services',
      color: 'amber',
      route: '/resource-requests',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-100'
    },
    {
      title: 'Transfer & Discharge Tasks',
      value: data.stats?.transferDischargeTasks || 0,
      subtitle: 'Pending authorizations',
      icon: 'sync_alt',
      color: 'teal',
      route: '/transfer-discharge',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700',
      borderColor: 'border-teal-100'
    },
    {
      title: 'Emergency Alerts',
      value: data.stats?.emergencyAlerts || data.stats?.criticalAlertsCount || 0,
      subtitle: 'Rapid response active',
      icon: 'notifications_active',
      color: 'red',
      route: '/emergency',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
      pulse: (data.stats?.emergencyAlerts || data.stats?.criticalAlertsCount || 0) > 0
    }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Logged-in Nurse Duty Banner */}
      <div className="bg-gradient-to-r from-[#0066cc] via-[#0055b3] to-[#004080] rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 flex items-center justify-center text-white text-3xl font-bold backdrop-blur-md shadow-inner">
            👩‍⚕️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{loggedInNurseName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-ping"></span>
                Active Duty
              </span>
            </div>
            <p className="text-white/80 text-sm mt-0.5">
              Nurse ID: <span className="font-semibold text-white">{data.nurseInfo?.nurseId || 'NUR-1002'}</span> • Assigned Ward: <span className="font-semibold text-white">{nurseWard}</span>
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-white/90 bg-white/10 px-3 py-1 rounded-lg w-fit border border-white/10">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>{data.nurseInfo?.shift || 'Morning Shift (07:00 AM - 03:00 PM)'}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchNurseDashboard()}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition-all flex items-center gap-1.5 border border-white/20 cursor-pointer"
            title="Refresh MongoDB Data"
          >
            <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>Refresh</span>
          </button>
          <Link
            to="/my-patients"
            className="px-4 py-2.5 bg-white text-[#0066cc] font-bold text-sm rounded-xl shadow hover:bg-slate-100 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">groups</span>
            Patients
          </Link>
          <Link
            to="/vitals"
            className="px-4 py-2.5 bg-white/20 text-white font-bold text-sm rounded-xl hover:bg-white/30 backdrop-blur-md transition-all flex items-center gap-2 border border-white/20"
          >
            <span className="material-symbols-outlined text-[18px]">monitor_heart</span>
            Record Vitals
          </Link>
        </div>
      </div>

      {/* 2. Clickable Real-Time MongoDB KPI Cards Grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">dashboard</span>
            Real-Time Clinical Status (Click card to open module)
          </h2>
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live MongoDB Sync
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiCards.map((card, idx) => (
            <div
              key={idx}
              onClick={() => navigate(card.route)}
              className={`p-5 rounded-2xl bg-white border ${card.borderColor} shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[12px] font-bold text-slate-600 uppercase tracking-wider block">
                    {card.title}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{card.subtitle}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${card.bgColor} ${card.textColor} flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs`}>
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {card.icon}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-baseline justify-between">
                <div className="flex items-baseline gap-2">
                  <h3 className={`text-3xl font-extrabold ${card.textColor} tracking-tight`}>
                    {card.value}
                  </h3>
                  {card.pulse && (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-slate-400 group-hover:text-primary flex items-center gap-0.5 transition-colors">
                  Open Module
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Core Operational Feeds: Doctor Instructions, Medication Schedules, Critical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Important Doctor Instructions */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0066cc]">assignment</span>
              <h2 className="font-bold text-slate-800 text-base">Doctor Instructions</h2>
            </div>
            <Link to="/appointments" className="text-xs font-semibold text-[#0066cc] hover:underline">
              View All
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[340px] pr-1">
            {data.doctorInstructions && data.doctorInstructions.length > 0 ? (
              data.doctorInstructions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('/appointments')}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-blue-50/50 hover:border-blue-200 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-xs text-slate-800">{item.patientName}</span>
                    <span className="text-[10px] font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{item.patientId}</span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 italic mt-1">"{item.instruction}"</p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                    <span className="text-[#0066cc] font-semibold">👨‍⚕️ {item.doctorName}</span>
                    <span>{item.date ? new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                <span className="material-symbols-outlined text-4xl mb-1 text-slate-300">task_alt</span>
                <p className="mt-1">No pending doctor instructions for this shift</p>
              </div>
            )}
          </div>
        </div>

        {/* Medication Schedules (MAR) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-purple-600">medication</span>
              <h2 className="font-bold text-slate-800 text-base">Medication & Treatment</h2>
            </div>
            <Link to="/prescriptions" className="text-xs font-semibold text-purple-700 hover:underline">
              MAR Portal
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[340px] pr-1">
            {data.medicationSchedules && data.medicationSchedules.length > 0 ? (
              data.medicationSchedules.map((med, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate('/prescriptions')}
                  className="p-3.5 rounded-xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-200 transition-all flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{med.medication}</span>
                      <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-semibold">{med.dosage}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {med.patientName} ({med.patientId}) • <span className="font-medium text-slate-700">{med.frequency}</span>
                    </p>
                    <p className="text-[10px] text-purple-800 mt-0.5">By {med.prescribedBy}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold shadow-xs">
                    Administer
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                <span className="material-symbols-outlined text-4xl mb-1 text-slate-300">pill</span>
                <p className="mt-1">All shift medications currently up to date</p>
              </div>
            )}
          </div>
        </div>

        {/* Emergency & Critical Care Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">notifications_active</span>
              <h2 className="font-bold text-slate-800 text-base">Emergency & Critical Alerts</h2>
            </div>
            <Link to="/emergency" className="text-xs font-semibold text-rose-600 hover:underline">
              ER Bay
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[340px] pr-1">
            {data.criticalAlerts && data.criticalAlerts.length > 0 ? (
              data.criticalAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(alert.link || '/emergency')}
                  className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/70 transition-all flex flex-col gap-1 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                      {alert.title}
                    </span>
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-200 px-1.5 py-0.5 rounded">
                      {alert.priority || 'Critical'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-0.5">{alert.message}</p>
                  <span className="text-[10px] text-slate-400 self-end mt-1">
                    {alert.createdAt ? new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-slate-400 text-xs">
                <span className="material-symbols-outlined text-4xl mb-1 text-emerald-400">check_circle</span>
                <p className="text-emerald-700 font-semibold mt-1">No emergency alerts active</p>
                <p className="text-slate-400 text-[11px] mt-0.5">All monitored vitals within stable limits</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Assigned Patients Live Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Assigned Ward Inpatients Roster</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live clinical monitoring of patients currently in {nurseWard}</p>
          </div>
          <Link
            to="/my-patients"
            className="px-4 py-2 bg-[#0066cc] text-white rounded-xl text-xs font-bold hover:bg-[#0052a3] transition-colors flex items-center gap-1.5 shadow"
          >
            <span>Open Assigned Patients Module</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-y border-slate-200">
                <th className="py-3 px-4">Patient Name / ID</th>
                <th className="py-3 px-4">Ward & Bed</th>
                <th className="py-3 px-4">Chief Complaint / Diagnosis</th>
                <th className="py-3 px-4">Attending Doctor</th>
                <th className="py-3 px-4">Admission Status</th>
                <th className="py-3 px-4 text-right">Quick Care Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.assignedPatientsList && data.assignedPatientsList.length > 0 ? (
                data.assignedPatientsList.map((patient, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{patient.fullName || patient.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{patient.patientId}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg font-medium">
                        {patient.admissionSetup?.wardType || patient.ward || 'General Ward'} • {patient.bedId?.bedNumber || patient.bedNumber || 'Bed Assigned'}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[200px] truncate text-slate-600">
                      {patient.clinicalInfo?.chiefComplaint || patient.diagnosis || 'Under Inpatient Care'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {patient.admissionSetup?.assignedDoctor ? `Dr. ${patient.admissionSetup.assignedDoctor.replace(/^Dr\.\s*/i, '')}` : (patient.assignedDoctor || 'Dr. Priya Sharma')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        patient.status === 'Emergency' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {patient.status || 'Admitted'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to="/vitals"
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg font-semibold transition-all border border-emerald-200"
                        >
                          Vitals
                        </Link>
                        <Link
                          to="/my-patients"
                          className="px-2.5 py-1 bg-blue-50 text-[#0066cc] hover:bg-[#0066cc] hover:text-white rounded-lg font-semibold transition-all border border-blue-200"
                        >
                          Care Dossier
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No admitted patients currently found in this ward.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
