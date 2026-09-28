import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardMediFlowDesktop() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    stats: {
      totalRegisteredPatients: 0,
      admittedPatients: 0,
      dischargedPatients: 0,
      totalBeds: 450,
      occupiedBeds: 0,
      availableBeds: 0,
      cleaningBeds: 0,
      occupancyRate: 0,
      icuTotalBeds: 40,
      icuOccupiedBeds: 0,
      icuAvailableBeds: 0,
      icuOccupancyRate: 0,
      todayAppointments: 0,
      activeEmergencyCases: 0,
      pendingAdmissionRequests: 0,
      pendingResourceRequests: 0,
      lowStockResourcesCount: 0,
      pendingTransfers: 0,
      pendingDischarges: 0,
      completedDischargesToday: 0,
      activeAlertsCount: 0,
    },
    bedStatsByWard: [],
    criticalInventory: [],
    recentAdmissions: [],
    recentEmergencies: [],
    recentPatientsList: [],
    upcomingAppointments: [],
    importantAlerts: []
  });

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const res = await fetch('/api/dashboard/admin', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Failed to load admin dashboard data');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error('Error loading admin dashboard:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000); // 10s live polling
    return () => clearInterval(interval);
  }, []);

  const { stats = {}, bedStatsByWard = [], criticalInventory = [], recentAdmissions = [], recentEmergencies = [], importantAlerts = [], upcomingAppointments = [] } = data || {};

  const handleRequestReplenishment = () => {
    navigate('/allocation');
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-slate-800">Hospital Central Command</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Synced
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1">Real-time overview across patients, beds, resources, queues & emergency services.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboardData()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh Data
          </button>
          <button
            onClick={() => navigate('/emergency')}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">emergency</span>
            Emergency Hub
          </button>
        </div>
      </header>

      {/* Top Interactive Metric Banner Grid - Click to Navigate directly to modules */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-fade-in">
        {/* 1. Registered Patients -> /my-patients */}
        <div
          onClick={() => navigate('/my-patients')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">groups</span>
            </div>
            <span className="text-[11px] font-bold text-blue-600 group-hover:underline">View &rarr;</span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered</p>
          <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.totalRegisteredPatients}</h3>
          <p className="text-[11px] text-slate-400 mt-1">All hospital records</p>
        </div>

        {/* 2. Admitted Patients -> /my-patients */}
        <div
          onClick={() => navigate('/my-patients')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">airline_seat_flat</span>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 group-hover:underline">View &rarr;</span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admitted</p>
          <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.admittedPatients}</h3>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Inpatient care</p>
        </div>

        {/* 3. Available & Occupied Beds -> /beds */}
        <div
          onClick={() => navigate('/beds')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">single_bed</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 group-hover:underline">Manage &rarr;</span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Beds</p>
          <h3 className="text-xl font-black text-emerald-600 mt-0.5">{stats.availableBeds} <span className="text-xs font-normal text-slate-500">/ {stats.totalBeds}</span></h3>
          <p className="text-[11px] text-slate-400 mt-1">{stats.occupiedBeds} occupied</p>
        </div>

        {/* 4. ICU Beds -> /beds */}
        <div
          onClick={() => navigate('/beds')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">monitor_heart</span>
            </div>
            <span className="text-[11px] font-bold text-rose-600 group-hover:underline">ICU &rarr;</span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ICU Beds</p>
          <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.icuAvailableBeds} <span className="text-xs font-normal text-slate-500">/ {stats.icuTotalBeds}</span></h3>
          <p className="text-[11px] text-rose-600 font-bold mt-1">{stats.icuOccupiedBeds} in critical care</p>
        </div>

        {/* 5. Today's Appointments -> /appointments */}
        <div
          onClick={() => navigate('/appointments')}
          className="bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            </div>
            <span className="text-[11px] font-bold text-amber-600 group-hover:underline">Queue &rarr;</span>
          </div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Appointments</p>
          <h3 className="text-xl font-black text-slate-800 mt-0.5">{stats.todayAppointments}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Scheduled today</p>
        </div>

        {/* 6. Emergency Cases -> /emergency */}
        <div
          onClick={() => navigate('/emergency')}
          className={`p-4 rounded-xl border transition-all cursor-pointer group ${stats.activeEmergencyCases > 0 ? 'bg-rose-50 border-rose-300 hover:shadow-md animate-pulse' : 'bg-white border-slate-200 hover:border-slate-300'}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[20px]">e911_emergency</span>
            </div>
            <span className="text-[11px] font-bold text-rose-700 group-hover:underline">Trauma &rarr;</span>
          </div>
          <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Emergency Cases</p>
          <h3 className="text-xl font-black text-rose-700 mt-0.5">{stats.activeEmergencyCases} Active</h3>
          <p className="text-[11px] text-rose-600 font-semibold mt-1">Immediate response</p>
        </div>
      </div>

      {/* Secondary Quick-Action Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div
          onClick={() => navigate('/beds')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Pending Admissions</p>
              <p className="text-base font-bold text-slate-800">{stats.pendingAdmissionRequests} Requests</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
        </div>

        <div
          onClick={() => navigate('/allocation')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">medical_services</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Resource Requests</p>
              <p className="text-base font-bold text-slate-800">{stats.pendingResourceRequests} Pending</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
        </div>

        <div
          onClick={() => navigate('/admin/billing')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">sync_alt</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Transfers & Discharges</p>
              <p className="text-base font-bold text-slate-800">{stats.pendingTransfers + stats.pendingDischarges} Active</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
        </div>

        <div
          onClick={() => navigate('/notifications')}
          className="p-3.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between cursor-pointer hover:border-blue-400 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">System Alerts</p>
              <p className="text-base font-bold text-slate-800">{stats.activeAlertsCount} Broadcasts</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 text-lg">chevron_right</span>
        </div>
      </div>

      {/* Main Command Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left 8 Cols: Real-Time Bed Ward Matrix + Critical Alerts */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Bed Ward Capacity Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Bed Capacity & Ward Distribution</h2>
                <p className="text-xs text-slate-500">Live floor-by-floor occupancy status across hospital units</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                  <span className="text-slate-600">Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  <span className="text-slate-600">Turnover</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600">Available</span>
                </div>
                <button
                  onClick={() => navigate('/beds')}
                  className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-bold"
                >
                  Bed Matrix &rarr;
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {bedStatsByWard && bedStatsByWard.length > 0 ? (
                bedStatsByWard.map((w, idx) => {
                  const total = w.total || 1;
                  const occPct = Math.round(((w.occupied || 0) / total) * 100);
                  const cleanPct = Math.round(((w.cleaning || 0) / total) * 100);
                  const availPct = Math.max(0, 100 - occPct - cleanPct);
                  return (
                    <div key={idx} className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                        <span className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-blue-600">apartment</span>
                          {w._id || 'General Care Ward'}
                        </span>
                        <span>{w.occupied || 0} Occupied / {w.available || 0} Avail ({total} Total)</span>
                      </div>
                      <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-200">
                        <div style={{ width: `${occPct}%` }} className="bg-rose-500 transition-all duration-500" title={`Occupied: ${occPct}%`}></div>
                        <div style={{ width: `${cleanPct}%` }} className="bg-amber-400 transition-all duration-500" title={`Turnover/Clean: ${cleanPct}%`}></div>
                        <div style={{ width: `${availPct}%` }} className="bg-emerald-500 transition-all duration-500" title={`Available: ${availPct}%`}></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                      <span>Intensive Care Unit (ICU)</span>
                      <span>{stats.icuOccupiedBeds} Occupied / {stats.icuAvailableBeds} Avail ({stats.icuTotalBeds} Total)</span>
                    </div>
                    <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-200">
                      <div style={{ width: `${stats.icuOccupancyRate}%` }} className="bg-rose-500"></div>
                      <div style={{ width: `${100 - stats.icuOccupancyRate}%` }} className="bg-emerald-500"></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                      <span>General Wards</span>
                      <span>{stats.occupiedBeds} Occupied / {stats.availableBeds} Avail ({stats.totalBeds} Total)</span>
                    </div>
                    <div className="flex h-3.5 rounded-full overflow-hidden bg-slate-200">
                      <div style={{ width: `${stats.occupancyRate}%` }} className="bg-rose-500"></div>
                      <div style={{ width: `${100 - stats.occupancyRate}%` }} className="bg-emerald-500"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Metrics Bar */}
            <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4 text-center">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xl font-black text-slate-800">{stats.occupancyRate}%</p>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hospital Occupancy</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xl font-black text-emerald-600">{stats.completedDischargesToday}</p>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Discharges Today</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xl font-black text-amber-600">{stats.cleaningBeds}</p>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Turnover / Cleaning</p>
              </div>
            </div>
          </div>

          {/* Important System Alerts & Broadcasts */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-600">notifications_active</span>
                <h2 className="text-lg font-bold text-slate-800">Critical Alerts & System Broadcasts</h2>
              </div>
              <button
                onClick={() => navigate('/notifications')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Notification Center &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {importantAlerts && importantAlerts.length > 0 ? (
                importantAlerts.slice(0, 4).map((alert, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/notifications')}
                    className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 transition cursor-pointer flex items-start gap-3"
                  >
                    <span className="material-symbols-outlined text-rose-600 text-[20px] flex-shrink-0 mt-0.5">warning</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold text-rose-900">{alert.title || alert.type || 'Clinical Notification'}</p>
                        <span className="text-[10px] text-rose-600 font-medium">{new Date(alert.timestamp || alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-rose-800/90 mt-0.5 line-clamp-1">{alert.message}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <p className="text-xs font-semibold text-slate-500">All emergency services and ward telemetry operating normally.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Medical Inventory + Live Patient Inflow */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Critical Medical Resources */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Medical Resources</h2>
                <p className="text-xs text-slate-500">Essential clinical devices</p>
              </div>
              <button
                onClick={() => navigate('/allocation')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Allocations &rarr;
              </button>
            </div>

            <div className="space-y-3.5">
              {criticalInventory && criticalInventory.length > 0 ? (
                criticalInventory.slice(0, 4).map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                      <span>{item.itemName}</span>
                      <span className={item.quantity <= (item.lowStockThreshold || 5) ? 'text-rose-600 font-black' : 'text-slate-800'}>
                        {item.quantity} {item.unit || 'units'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        style={{ width: `${Math.min(100, Math.max(15, (item.quantity / 50) * 100))}%` }}
                        className={`h-2 rounded-full ${item.quantity <= (item.lowStockThreshold || 5) ? 'bg-rose-500' : 'bg-blue-600'}`}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                      <span>Oxygen Cylinders (H-Type)</span>
                      <span className="text-slate-800">142 Available</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div style={{ width: '71%' }} className="bg-blue-600 h-2 rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                      <span>Ventilators (ICU Portable)</span>
                      <span className="text-rose-600 font-bold">12 Available</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div style={{ width: '30%' }} className="bg-rose-500 h-2 rounded-full"></div>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1">
                      <span>Defibrillators</span>
                      <span className="text-slate-800">18 Available</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div style={{ width: '90%' }} className="bg-emerald-500 h-2 rounded-full"></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleRequestReplenishment}
              className="w-full mt-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">swap_horiz</span>
              Manage Stock & Allocation
            </button>
          </div>

          {/* Recent Inpatients & Admissions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Inpatient Intake</h2>
                <p className="text-xs text-slate-500">Live admission pipeline</p>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
              >
                All Admissions &rarr;
              </button>
            </div>

            <div className="space-y-3">
              {recentAdmissions && recentAdmissions.length > 0 ? (
                recentAdmissions.slice(0, 3).map((adm, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/my-patients')}
                    className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-100 transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{adm.patientId?.fullName || adm.patientName || 'Inpatient Admission'}</p>
                        <p className="text-[10px] text-slate-500 font-medium">ID: {adm.patientCustomId || adm.patientId?.patientId || 'PX-REC'}</p>
                      </div>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-md">
                        {adm.recommendedWard || adm.wardType || 'General'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-1">{adm.diagnosis || adm.reasonForAdmission || 'Clinical admission'}</p>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 font-medium">No pending admissions awaiting processing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
