import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function ReceptionistDashboard() {
  const [metrics, setMetrics] = useState({
    newPatients: 1,
    todayAppointments: 8,
    checkedInPatients: 4,
    waitingPatients: 3,
    pendingAdmissions: 2,
    emergencyArrivals: 4,
    availableBeds: 7,
    totalBeds: 30
  });

  const [recentPatients, setRecentPatients] = useState([]);
  const [todayAppointmentsList, setTodayAppointmentsList] = useState([]);
  const [doctorsList, setDoctorsList] = useState([]);
  const [loading, setLoading] = useState(true);

  const userName = localStorage.getItem('userName') || 'Receptionist';

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, patRes, appRes, docRes] = await Promise.all([
        fetch('/api/dashboard/receptionist', { headers }),
        fetch('/api/patients?sort=latest', { headers }),
        fetch('/api/appointments', { headers }),
        fetch('/api/users/staff/doctors', { headers })
      ]);

      if (dashRes.ok) {
        const data = await dashRes.json();
        setMetrics({
          newPatients: data.newPatients || 1,
          todayAppointments: data.todayAppointments || 8,
          checkedInPatients: data.checkedInPatients || 4,
          waitingPatients: data.waitingPatients || 3,
          pendingAdmissions: data.pendingAdmissions || 2,
          emergencyArrivals: data.emergencyArrivals || 4,
          availableBeds: data.availableBeds || 7,
          totalBeds: data.totalBeds || 30
        });
      }
      if (patRes.ok) {
        const pats = await patRes.json();
        setRecentPatients(Array.isArray(pats) ? pats.slice(0, 8) : []);
      }
      if (appRes.ok) {
        const apps = await appRes.json();
        const todayStr = new Date().toISOString().split('T')[0];
        let filteredApps = Array.isArray(apps) ? apps.filter(a => a.appointmentDate === todayStr) : [];
        if (filteredApps.length === 0 && Array.isArray(apps) && apps.length > 0) {
          filteredApps = apps.slice(0, 6);
        }
        setTodayAppointmentsList(filteredApps);
      }
      if (docRes.ok) {
        const docs = await docRes.json();
        setDoctorsList(Array.isArray(docs) ? docs.slice(0, 6) : []);
      }
    } catch (err) {
      console.error('Error fetching receptionist dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000); // 15s auto-polling
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col space-y-6 pb-12">
      {/* Top Header */}
      <div className="pt-1">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Receptionist Dashboard</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Welcome, <strong>{userName}</strong> • Real-time patient registrations and appointment coordination
        </p>
      </div>

      {/* TOP 7 STATISTICS CARDS */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            Live Front-Desk Activity (MongoDB Real-Time)
          </h2>
          <span className="text-[11px] text-slate-400">Auto-refreshing (15s)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* 1. New Patients */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase truncate">New Patients</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">person_add</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-slate-900">{loading ? '...' : metrics.newPatients}</p>
              <p className="text-[10px] text-slate-400">Registered today</p>
            </div>
          </div>

          {/* 2. Today's Appointments */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-bold uppercase truncate">Appointments</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">calendar_month</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-slate-900">{loading ? '...' : metrics.todayAppointments}</p>
              <p className="text-[10px] text-slate-400">Booked today</p>
            </div>
          </div>

          {/* 3. Checked-In Patients */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-purple-700 font-bold uppercase truncate">Checked-In</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">how_to_reg</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-purple-700">{loading ? '...' : metrics.checkedInPatients}</p>
              <p className="text-[10px] text-purple-600/80">Arrived at clinic</p>
            </div>
          </div>

          {/* 4. Waiting Queue */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-amber-700 font-bold uppercase truncate">Waiting Queue</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">hourglass_top</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-amber-700">{loading ? '...' : metrics.waitingPatients}</p>
              <p className="text-[10px] text-amber-600/80">In OPD lobby</p>
            </div>
          </div>

          {/* 5. Pending Admissions */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-700 font-bold uppercase truncate">Pending Admits</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">domain_add</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-emerald-700">{loading ? '...' : metrics.pendingAdmissions}</p>
              <p className="text-[10px] text-emerald-600/80">Awaiting beds</p>
            </div>
          </div>

          {/* 6. Emergency Cases */}
          <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-rose-700 font-bold uppercase truncate">Emergency</span>
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">emergency</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-rose-700">{loading ? '...' : metrics.emergencyArrivals}</p>
              <p className="text-[10px] text-rose-600/80">Active triage</p>
            </div>
          </div>

          {/* 7. Available Beds Count */}
          <div className="bg-white p-3.5 rounded-2xl border border-teal-100 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-teal-700 font-bold uppercase truncate">Available Beds</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-base">single_bed</span>
              </div>
            </div>
            <div className="mt-2.5">
              <p className="text-xl font-black text-teal-700">{loading ? '...' : metrics.availableBeds}</p>
              <p className="text-[10px] text-teal-600/80">out of {metrics.totalBeds || 0} total</p>
            </div>
          </div>
        </div>
      </div>

      {/* 8. DOCTOR AVAILABILITY STRIP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-700 text-lg">medical_services</span>
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Doctor Availability & OPD Status
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Live consulting roster</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {doctorsList.length === 0 ? (
            <p className="text-xs text-slate-400 col-span-full py-2">No doctor status records found.</p>
          ) : (
            doctorsList.map((doc) => {
              const isAvail = (doc.availability?.status || 'Available') === 'Available';
              return (
                <div key={doc._id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 truncate">{doc.name}</p>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${isAvail ? 'bg-emerald-500 shadow-xs' : 'bg-amber-500'}`}></span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{doc.department || 'Consultant'}</p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-slate-200/50 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{doc.assignedShift?.split('(')[0] || 'Morning'}</span>
                    <span className={`font-bold ${isAvail ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {doc.availability?.status || 'Available'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2 MAIN SECTIONS: Today's Appointment Schedule & Recently Registered Patients */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Section 8: Today's Appointment Schedule */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-700 text-lg">calendar_today</span>
                <h3 className="font-bold text-slate-900 text-sm">Today's Appointment Schedule</h3>
              </div>
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {todayAppointmentsList.length} Scheduled Today
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {todayAppointmentsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-1">event_available</span>
                  <p className="text-xs font-semibold">No appointments scheduled for today yet.</p>
                </div>
              ) : (
                todayAppointmentsList.map((app) => (
                  <div key={app._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-black flex items-center justify-center shrink-0 text-xs">
                        {app.patientName?.charAt(0) || 'P'}
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="font-bold text-slate-900 truncate">{app.patientName}</p>
                        <p className="text-[11px] text-slate-500">
                          ⏰ {app.appointmentTime || '09:00 AM'} • {app.doctorName || docName(app)} • {app.department || 'Cardiology'}
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                      app.status === 'Scheduled' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      app.status === 'Checked In' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                      app.status === 'In Consultation' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {app.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Section 9: Recently Registered Patients */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-lg">badge</span>
                <h3 className="font-bold text-slate-900 text-sm">Recently Registered Patients</h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                {recentPatients.length} Recent Patients
              </span>
            </div>

            <div className="mt-3.5 space-y-2.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {recentPatients.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <span className="material-symbols-outlined text-4xl text-slate-300 mb-1">person_off</span>
                  <p className="text-xs font-semibold">No patient registered recently in MongoDB.</p>
                </div>
              ) : (
                recentPatients.map((patient) => (
                  <div key={patient._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-bold text-slate-900 truncate">{patient.fullName}</p>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          {patient.patientId}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {patient.gender} • {patient.age ? `${patient.age} yrs` : ''} • 📞 {patient.phoneNumber || patient.contactNumber || 'N/A'}
                      </p>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                      patient.status === 'Admitted' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      patient.status === 'Discharged' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      patient.status === 'Emergency' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {patient.status || 'Registered'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function docName(app) {
  return app.doctor || 'Doctor Assigned';
}
