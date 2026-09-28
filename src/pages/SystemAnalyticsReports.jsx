import React, { useState, useEffect } from 'react';

export default function SystemAnalyticsReports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview, patients, beds, resources, billing, emergency, appointments

  // Filter States
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    department: 'All',
    ward: 'All',
    doctor: 'All',
    patientStatus: 'All',
    resourceCategory: 'All'
  });

  const [doctorsList, setDoctorsList] = useState([]);

  // Fetch doctors for filter dropdown
  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/users/staff/doctors', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const docs = await res.json();
          setDoctorsList(docs);
        }
      } catch (err) {
        console.error('Failed to fetch doctors list:', err);
      }
    };
    fetchDoctors();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.department !== 'All') params.append('department', filters.department);
      if (filters.ward !== 'All') params.append('ward', filters.ward);
      if (filters.doctor !== 'All') params.append('doctor', filters.doctor);
      if (filters.patientStatus !== 'All') params.append('patientStatus', filters.patientStatus);
      if (filters.resourceCategory !== 'All') params.append('resourceCategory', filters.resourceCategory);

      const res = await fetch(`/api/analytics/overview?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [filters]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      department: 'All',
      ward: 'All',
      doctor: 'All',
      patientStatus: 'All',
      resourceCategory: 'All'
    });
  };

  // CSV Export for Tabular Data
  const exportToCSV = (dataType) => {
    if (!data || !data.tabularData) return;

    let headers = [];
    let rows = [];
    let filename = `MediFlow_${dataType}_Report_${new Date().toISOString().split('T')[0]}.csv`;

    if (dataType === 'patients') {
      headers = ['Patient ID', 'Full Name', 'Age', 'Gender', 'Blood Group', 'Contact', 'Department', 'Doctor', 'Ward', 'Bed', 'Status', 'Registered At'];
      rows = (data.tabularData.patients || []).map(p => [
        p.patientId || '',
        `"${p.fullName || ''}"`,
        p.age || '',
        p.gender || '',
        p.bloodGroup || '',
        p.contactNumber || '',
        p.department || p.assignedDepartment || '',
        `"${p.assignedDoctor || ''}"`,
        p.ward || '',
        p.bedId?.bedNumber || p.bedNumber || '',
        p.status || '',
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''
      ]);
    } else if (dataType === 'billing') {
      headers = ['Bill Number', 'Patient ID', 'Patient Name', 'Admission ID', 'Subtotal (INR)', 'Discount (INR)', 'Tax (INR)', 'Grand Total (INR)', 'Amount Paid (INR)', 'Balance (INR)', 'Payment Status', 'Payment Method', 'Generated At'];
      rows = (data.tabularData.billing || []).map(b => [
        b.billNumber || '',
        b.patientCustomId || '',
        `"${b.patientDetailsSnapshot?.fullName || ''}"`,
        b.admissionId || '',
        b.subtotal || 0,
        b.discount || 0,
        b.tax || 0,
        b.grandTotal || 0,
        b.amountPaid || 0,
        b.remainingAmount || 0,
        b.paymentStatus || '',
        b.paymentMethod || '',
        b.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''
      ]);
    } else if (dataType === 'admissions') {
      headers = ['Request ID', 'Patient ID', 'Patient Name', 'Doctor', 'Ward Type', 'Bed Category', 'Priority', 'Status', 'Request Date'];
      rows = (data.tabularData.admissions || []).map(a => [
        a._id || '',
        a.patientId?.patientId || a.patientCustomId || '',
        `"${a.patientId?.fullName || a.patientName || ''}"`,
        `"${a.doctorName || ''}"`,
        a.wardType || '',
        a.bedCategory || '',
        a.priority || '',
        a.status || '',
        a.requestDate ? new Date(a.requestDate).toLocaleDateString() : ''
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printReport = () => {
    window.print();
  };

  return (
    <div className="w-full pb-16">
      {/* Header & Controls */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-[26px]">analytics</span>
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-on-surface">Hospital Reports & Clinical Analytics</h1>
              <p className="text-sm text-on-surface-variant">Real-time business intelligence calculated directly from MongoDB live hospital records.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container transition-all"
            title="Refresh database metrics"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>Refresh</span>
          </button>

          <button
            onClick={printReport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            <span>Print PDF</span>
          </button>

          <div className="relative group">
            <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-bold shadow hover:bg-primary/95 transition-all">
              <span className="material-symbols-outlined text-[18px]">download</span>
              <span>Export CSV</span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl py-2 hidden group-hover:block z-30">
              <button
                onClick={() => exportToCSV('patients')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-on-surface hover:bg-primary/10 hover:text-primary flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">person</span>
                Export Patients List
              </button>
              <button
                onClick={() => exportToCSV('billing')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-on-surface hover:bg-primary/10 hover:text-primary flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Export Billing Ledger
              </button>
              <button
                onClick={() => exportToCSV('admissions')}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-on-surface hover:bg-primary/10 hover:text-primary flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px]">hotel</span>
                Export Admissions Log
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Dynamic Multi-Parameter Filter Panel */}
      <section className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3 border-b border-outline-variant/40 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-primary">tune</span>
            <span>Report Parameters & Database Filters</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">restart_alt</span>
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">From Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">To Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Department</label>
            <select
              name="department"
              value={filters.department}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="All">All Departments</option>
              <option value="Cardiology">Cardiology</option>
              <option value="Neurology">Neurology</option>
              <option value="Orthopedics">Orthopedics</option>
              <option value="Pediatrics">Pediatrics</option>
              <option value="General Medicine">General Medicine</option>
              <option value="Emergency">Emergency & Trauma</option>
              <option value="Pulmonology">Pulmonology</option>
              <option value="Oncology">Oncology</option>
            </select>
          </div>

          {/* Ward */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Ward / Care Unit</label>
            <select
              name="ward"
              value={filters.ward}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="All">All Wards</option>
              <option value="General Ward">General Ward</option>
              <option value="ICU">Intensive Care (ICU)</option>
              <option value="NICU">Neonatal ICU (NICU)</option>
              <option value="Pediatric Ward">Pediatric Ward</option>
              <option value="Emergency Ward">Emergency Ward</option>
              <option value="Private Ward">Private Ward</option>
              <option value="Semi-Private">Semi-Private</option>
            </select>
          </div>

          {/* Attending Doctor */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Doctor</label>
            <select
              name="doctor"
              value={filters.doctor}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="All">All Doctors</option>
              {doctorsList.map(doc => (
                <option key={doc._id} value={doc.name}>{doc.name} ({doc.department || 'Consultant'})</option>
              ))}
            </select>
          </div>

          {/* Patient Status */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Patient Status</label>
            <select
              name="patientStatus"
              value={filters.patientStatus}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Registered">Registered</option>
              <option value="Admitted">Admitted (Inpatient)</option>
              <option value="Emergency">Emergency</option>
              <option value="Discharged">Discharged</option>
              <option value="Transferred">Transferred</option>
            </select>
          </div>

          {/* Resource Category */}
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant mb-1">Resource Type</label>
            <select
              name="resourceCategory"
              value={filters.resourceCategory}
              onChange={handleFilterChange}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="All">All Resources</option>
              <option value="Ventilator">Ventilators</option>
              <option value="Oxygen Cylinder">Oxygen Cylinders</option>
              <option value="Cardiac Monitor">Cardiac Monitors</option>
              <option value="Infusion Pump">Infusion Pumps</option>
              <option value="Wheelchair">Wheelchairs</option>
              <option value="Defibrillator">Defibrillators</option>
            </select>
          </div>
        </div>
      </section>

      {/* Analytics Category Tabs */}
      <div className="flex border-b border-outline-variant/60 mb-6 gap-2 overflow-x-auto pb-1">
        {[
          { id: 'overview', label: 'Executive Summary', icon: 'dashboard' },
          { id: 'patients', label: 'Patient & Admissions', icon: 'people' },
          { id: 'beds', label: 'Bed & ICU Occupancy', icon: 'single_bed' },
          { id: 'resources', label: 'Equipment & Utilization', icon: 'medical_services' },
          { id: 'billing', label: 'Financials & Revenue', icon: 'account_balance_wallet' },
          { id: 'emergency', label: 'Emergency Response', icon: 'e911_emergency' },
          { id: 'appointments', label: 'Appointments & Queue', icon: 'calendar_month' }
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
        <div className="flex flex-col items-center justify-center p-16 bg-surface-container-lowest rounded-2xl border border-outline-variant">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm font-bold text-on-surface">Computing live hospital metrics from MongoDB...</p>
          <p className="text-xs text-on-surface-variant mt-1">Aggregating admissions, discharges, beds, and billing records</p>
        </div>
      ) : !data ? (
        <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-outline-variant">
          <p className="text-sm font-semibold text-error">Failed to load analytics. Please ensure the backend is running.</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE SUMMARY */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Primary KPI Bento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Total Patients */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[24px]">group</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Total Active
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Patients</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-on-surface">{data.patients?.total || 0}</span>
                    <span className="text-xs text-on-surface-variant">in database</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/40 flex justify-between text-xs text-on-surface-variant">
                    <span>Admitted: <b className="text-primary">{data.patients?.admitted || 0}</b></span>
                    <span>Discharged: <b className="text-green-600">{data.patients?.discharged || 0}</b></span>
                  </div>
                </div>

                {/* Metric 2: Bed Occupancy */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <span className="material-symbols-outlined text-[24px]">hotel</span>
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      (data.beds?.occupancyRate || 0) > 85 ? 'bg-error/10 text-error' : 'bg-green-100 text-green-700'
                    }`}>
                      {data.beds?.occupancyRate || 0}% Occupied
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Bed Occupancy</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-on-surface">{data.beds?.occupied || 0} / {data.beds?.total || 0}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/40 flex justify-between text-xs text-on-surface-variant">
                    <span>Available: <b className="text-green-600">{data.beds?.available || 0}</b></span>
                    <span>ICU Occupancy: <b className="text-error">{data.beds?.icuOccupancyRate || 0}%</b></span>
                  </div>
                </div>

                {/* Metric 3: Resource Utilization */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                      <span className="material-symbols-outlined text-[24px]">medical_services</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                      {data.resources?.utilizationRate || 0}% In Use
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Medical Equipment</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-on-surface">{data.resources?.inUseUnits || 0} / {data.resources?.totalUnits || 0}</span>
                    <span className="text-xs text-on-surface-variant">units</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/40 flex justify-between text-xs text-on-surface-variant">
                    <span>Available: <b className="text-green-600">{data.resources?.availableUnits || 0}</b></span>
                    <span>Maintenance: <b className="text-amber-600">{data.resources?.maintenanceUnits || 0}</b></span>
                  </div>
                </div>

                {/* Metric 4: Invoiced Revenue */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="p-2.5 rounded-xl bg-green-50 text-green-600">
                      <span className="material-symbols-outlined text-[24px]">payments</span>
                    </span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {data.billing?.billCount || 0} Bills Settled
                    </span>
                  </div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total Revenue Invoiced</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-green-700">₹{(data.billing?.totalInvoiced || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/40 flex justify-between text-xs text-on-surface-variant">
                    <span>Collected: <b className="text-green-600">₹{(data.billing?.totalCollected || 0).toLocaleString('en-IN')}</b></span>
                    <span>Pending: <b className="text-error">₹{(data.billing?.totalPending || 0).toLocaleString('en-IN')}</b></span>
                  </div>
                </div>
              </div>

              {/* Visual Interactive Graphs & Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. Bar Chart: Ward Capacity & Occupancy Visual Graph */}
                <div className="lg:col-span-8 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                    <div>
                      <h3 className="text-base font-black text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[20px]">bar_chart</span>
                        Ward Bed Allocation & Occupancy Graph
                      </h3>
                      <p className="text-xs text-on-surface-variant">Live comparison of Occupied vs Available vs Maintenance beds across clinical wards</p>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] font-bold">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-rose-500 inline-block shadow-2xs"></span> Occupied</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-2xs"></span> Available</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-amber-400 inline-block shadow-2xs"></span> Cleaning/Maint</span>
                    </div>
                  </div>

                  {/* SVG Bar Chart Visualization */}
                  <div className="space-y-4 pt-2">
                    {(data.beds?.wardOccupancy || []).length === 0 ? (
                      <p className="text-xs text-on-surface-variant py-4 text-center">No ward occupancy data recorded in database.</p>
                    ) : (
                      (data.beds?.wardOccupancy || []).map((w, idx) => {
                        const maxBeds = Math.max(...(data.beds?.wardOccupancy || []).map(o => o.total), 35);
                        const occPct = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
                        const occupiedWidth = (w.occupied / maxBeds) * 100;
                        const availableWidth = (w.available / maxBeds) * 100;
                        const maintWidth = (w.maintenance / maxBeds) * 100;

                        return (
                          <div key={idx} className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 hover:border-teal-400 transition-all">
                            <div className="flex justify-between items-center mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">{w._id || 'General Ward'}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                                  {w.total} Total Beds
                                </span>
                              </div>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                                occPct >= 75 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {occPct}% Occupancy
                              </span>
                            </div>

                            {/* Dual Stacked Progress Bar */}
                            <div className="w-full h-4 bg-slate-200/80 rounded-lg overflow-hidden flex shadow-inner">
                              <div
                                style={{ width: `${(w.occupied / (w.total || 1)) * 100}%` }}
                                className="bg-rose-500 hover:bg-rose-600 transition-all flex items-center justify-center text-[9px] text-white font-bold"
                                title={`Occupied: ${w.occupied}`}
                              >
                                {w.occupied > 0 && w.occupied}
                              </div>
                              <div
                                style={{ width: `${(w.maintenance / (w.total || 1)) * 100}%` }}
                                className="bg-amber-400 hover:bg-amber-500 transition-all flex items-center justify-center text-[9px] text-slate-900 font-bold"
                                title={`Maintenance: ${w.maintenance}`}
                              >
                                {w.maintenance > 0 && w.maintenance}
                              </div>
                              <div
                                style={{ width: `${(w.available / (w.total || 1)) * 100}%` }}
                                className="bg-emerald-500 hover:bg-emerald-600 transition-all flex items-center justify-center text-[9px] text-white font-bold"
                                title={`Available: ${w.available}`}
                              >
                                {w.available > 0 && w.available}
                              </div>
                            </div>

                            <div className="flex justify-between items-center mt-2.5 text-[11px] font-semibold text-slate-600">
                              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Occupied: <strong className="text-slate-900">{w.occupied}</strong></span>
                              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available: <strong className="text-slate-900">{w.available}</strong></span>
                              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span> Maintenance: <strong className="text-slate-900">{w.maintenance}</strong></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* 2. Donut / Radial Breakdown: Patient Care & Staff Analytics */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Patient Status Distribution Donut */}
                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                    <h3 className="text-base font-black text-on-surface mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">pie_chart</span>
                      Patient Status Distribution
                    </h3>

                    {/* SVG Donut Chart */}
                    <div className="flex items-center justify-center py-2">
                      <div className="relative flex items-center justify-center">
                        <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                          {/* Background Circle */}
                          <circle cx="50" cy="50" r="38" stroke="#f1f5f9" strokeWidth="14" fill="transparent" />
                          {/* Admitted Arc */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#0066cc"
                            strokeWidth="14"
                            strokeDasharray={`${((data.patients?.admitted || 0) / (data.patients?.total || 1)) * 238.76} 238.76`}
                            strokeDashoffset="0"
                            fill="transparent"
                            className="transition-all duration-500"
                          />
                          {/* Discharged Arc */}
                          <circle
                            cx="50"
                            cy="50"
                            r="38"
                            stroke="#10b981"
                            strokeWidth="14"
                            strokeDasharray={`${((data.patients?.discharged || 0) / (data.patients?.total || 1)) * 238.76} 238.76`}
                            strokeDashoffset={`-${((data.patients?.admitted || 0) / (data.patients?.total || 1)) * 238.76}`}
                            fill="transparent"
                            className="transition-all duration-500"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-black text-slate-900 leading-none">{data.patients?.total || 0}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase mt-0.5">Patients</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mt-3 pt-3 border-t border-slate-100 text-xs">
                      <div className="flex justify-between items-center p-2 rounded-xl bg-blue-50/70 border border-blue-100 font-semibold text-blue-900">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0066cc]"></span> Currently Admitted</span>
                        <b className="font-mono text-sm">{data.patients?.admitted || 0}</b>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-xl bg-emerald-50/70 border border-emerald-100 font-semibold text-emerald-900">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Discharged & Settled</span>
                        <b className="font-mono text-sm">{data.patients?.discharged || 0}</b>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-xl bg-slate-100 border border-slate-200 font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span> Outpatient / Registered</span>
                        <b className="font-mono text-sm">{data.patients?.registered || 0}</b>
                      </div>
                    </div>
                  </div>

                  {/* Hospital Staff Chart */}
                  <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                    <h3 className="text-base font-black text-on-surface mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                      Hospital Staff by Role
                    </h3>
                    <div className="space-y-2.5">
                      {(data.staff?.byRole || []).map((st, i) => {
                        const totalSt = st.total || 0;
                        const pct = Math.min(100, Math.round((totalSt / 15) * 100));
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                {st._id === 'Doctor' ? '👨‍⚕️' : st._id === 'Nurse' ? '👩‍⚕️' : st._id === 'Receptionist' ? '🛎️' : '🛡️'} {st._id}
                              </span>
                              <span className="font-bold text-slate-600 font-mono">
                                <strong>{st.active}</strong> Active / {st.total} Total
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full rounded-full ${
                                  st._id === 'Doctor' ? 'bg-blue-600' :
                                  st._id === 'Nurse' ? 'bg-purple-600' :
                                  st._id === 'Receptionist' ? 'bg-amber-500' :
                                  'bg-rose-500'
                                }`}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PATIENTS & ADMISSIONS REPORT */}
          {activeTab === 'patients' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Total Registered</p>
                  <p className="text-2xl font-black text-on-surface mt-1">{data.patients?.total || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Currently Admitted</p>
                  <p className="text-2xl font-black text-primary mt-1">{data.patients?.admitted || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Successfully Discharged</p>
                  <p className="text-2xl font-black text-green-600 mt-1">{data.patients?.discharged || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Emergency Registrations</p>
                  <p className="text-2xl font-black text-error mt-1">{data.patients?.emergency || 0}</p>
                </div>
              </div>

              {/* Patient Ledger Table */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
                  <h3 className="text-sm font-bold text-on-surface">Patient Registry Ledger ({data.tabularData?.patients?.length || 0} Records Displayed)</h3>
                  <button
                    onClick={() => exportToCSV('patients')}
                    className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">file_download</span>
                    Download CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant">
                      <tr>
                        <th className="p-3">Patient ID</th>
                        <th className="p-3">Full Name</th>
                        <th className="p-3">Age / Gender</th>
                        <th className="p-3">Blood Group</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Doctor</th>
                        <th className="p-3">Ward / Bed</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Registered Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                      {(data.tabularData?.patients || []).map((p, idx) => (
                        <tr key={idx} className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary">{p.patientId || 'N/A'}</td>
                          <td className="p-3 font-semibold">{p.fullName}</td>
                          <td className="p-3">{p.age} yrs / {p.gender}</td>
                          <td className="p-3 font-bold text-error">{p.bloodGroup || '—'}</td>
                          <td className="p-3">{p.department || p.assignedDepartment || 'General'}</td>
                          <td className="p-3">{p.assignedDoctor || 'Unassigned'}</td>
                          <td className="p-3">{p.ward || '—'} {p.bedId?.bedNumber ? `(${p.bedId.bedNumber})` : ''}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              p.status === 'Admitted' ? 'bg-blue-100 text-blue-700' :
                              p.status === 'Discharged' ? 'bg-green-100 text-green-700' :
                              p.status === 'Emergency' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {p.status || 'Active'}
                            </span>
                          </td>
                          <td className="p-3 text-on-surface-variant">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BED & ICU OCCUPANCY */}
          {activeTab === 'beds' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Hospital-Wide Bed Occupancy</p>
                  <p className="text-3xl font-black text-on-surface mt-2">{data.beds?.occupancyRate || 0}%</p>
                  <p className="text-xs text-on-surface-variant mt-1">{data.beds?.occupied} Occupied out of {data.beds?.total} Total Beds</p>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Critical Care (ICU) Capacity</p>
                  <p className="text-3xl font-black text-error mt-2">{data.beds?.icuOccupancyRate || 0}%</p>
                  <p className="text-xs text-on-surface-variant mt-1">{data.beds?.icuOccupied} Occupied / {data.beds?.icuAvailable} Available ICU Beds</p>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Under Maintenance / Blocked</p>
                  <p className="text-3xl font-black text-amber-600 mt-2">{data.beds?.maintenance || 0}</p>
                  <p className="text-xs text-on-surface-variant mt-1">Beds currently in cleaning, repair, or maintenance</p>
                </div>
              </div>

              {/* Detailed Ward Occupancy Table */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-4 border-b border-outline-variant bg-surface-container-low/30">
                  <h3 className="text-sm font-bold text-on-surface">Ward-by-Ward Capacity & Occupancy Matrix</h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant">
                    <tr>
                      <th className="p-3">Ward / Unit Name</th>
                      <th className="p-3 text-center">Total Beds</th>
                      <th className="p-3 text-center">Occupied Beds</th>
                      <th className="p-3 text-center">Available Beds</th>
                      <th className="p-3 text-center">Maintenance</th>
                      <th className="p-3 text-right">Occupancy %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                    {(data.beds?.wardOccupancy || []).map((w, idx) => {
                      const occ = w.total > 0 ? Math.round((w.occupied / w.total) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 font-bold text-primary">{w._id || 'Standard Ward'}</td>
                          <td className="p-3 text-center font-bold">{w.total}</td>
                          <td className="p-3 text-center text-error font-bold">{w.occupied}</td>
                          <td className="p-3 text-center text-green-600 font-bold">{w.available}</td>
                          <td className="p-3 text-center text-amber-600">{w.maintenance}</td>
                          <td className="p-3 text-right font-black">
                            <span className={`px-2 py-0.5 rounded-full ${occ >= 80 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {occ}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EQUIPMENT & UTILIZATION */}
          {activeTab === 'resources' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Total Medical Units</p>
                  <p className="text-2xl font-black text-on-surface mt-1">{data.resources?.totalUnits || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Allocated & In Use</p>
                  <p className="text-2xl font-black text-purple-600 mt-1">{data.resources?.inUseUnits || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Ready for Deployment</p>
                  <p className="text-2xl font-black text-green-600 mt-1">{data.resources?.availableUnits || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Under Maintenance</p>
                  <p className="text-2xl font-black text-amber-600 mt-1">{data.resources?.maintenanceUnits || 0}</p>
                </div>
              </div>

              {/* Resource Inventory Ledger */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-4 border-b border-outline-variant bg-surface-container-low/30">
                  <h3 className="text-sm font-bold text-on-surface">Medical Inventory & Allocation Tracking</h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant">
                    <tr>
                      <th className="p-3">Resource Item</th>
                      <th className="p-3">Category</th>
                      <th className="p-3 text-center">Total Qty</th>
                      <th className="p-3 text-center">In Use</th>
                      <th className="p-3 text-center">Available</th>
                      <th className="p-3 text-center">Maintenance</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                    {(data.resources?.inventory || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-primary/5 transition-colors">
                        <td className="p-3 font-bold">{item.resourceName || item.name}</td>
                        <td className="p-3 text-on-surface-variant">{item.category}</td>
                        <td className="p-3 text-center font-bold">{item.totalQuantity}</td>
                        <td className="p-3 text-center text-purple-600 font-bold">{item.allocatedQuantity}</td>
                        <td className="p-3 text-center text-green-600 font-bold">{item.availableQuantity}</td>
                        <td className="p-3 text-center text-amber-600">{item.underMaintenanceQuantity || 0}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            item.status === 'In Stock' || item.status === 'Available' ? 'bg-green-100 text-green-700' :
                            item.status === 'Low Stock' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.status || 'Available'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIALS & BILLING */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Total Invoiced (INR)</p>
                  <p className="text-2xl font-black text-on-surface mt-1">₹{(data.billing?.totalInvoiced || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Collected (INR)</p>
                  <p className="text-2xl font-black text-green-600 mt-1">₹{(data.billing?.totalCollected || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Outstanding (INR)</p>
                  <p className="text-2xl font-black text-error mt-1">₹{(data.billing?.totalPending || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Tax Collected (GST)</p>
                  <p className="text-2xl font-black text-primary mt-1">₹{(data.billing?.totalTax || 0).toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Billing Ledger Table */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
                  <h3 className="text-sm font-bold text-on-surface">Hospital Discharge & Billing Ledger ({data.tabularData?.billing?.length || 0} Bills)</h3>
                  <button
                    onClick={() => exportToCSV('billing')}
                    className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">file_download</span>
                    Download CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant">
                      <tr>
                        <th className="p-3">Bill Number</th>
                        <th className="p-3">Patient Name</th>
                        <th className="p-3">Patient ID</th>
                        <th className="p-3 text-right">Subtotal</th>
                        <th className="p-3 text-right">Tax (GST)</th>
                        <th className="p-3 text-right">Grand Total</th>
                        <th className="p-3 text-right">Amount Paid</th>
                        <th className="p-3 text-right">Balance</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Payment Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                      {(data.tabularData?.billing || []).map((b, idx) => (
                        <tr key={idx} className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary">{b.billNumber}</td>
                          <td className="p-3 font-semibold">{b.patientDetailsSnapshot?.fullName || 'Patient'}</td>
                          <td className="p-3 font-mono text-on-surface-variant">{b.patientCustomId}</td>
                          <td className="p-3 text-right">₹{Number(b.subtotal || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right">₹{Number(b.tax || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right font-black">₹{Number(b.grandTotal || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-green-600 font-bold">₹{Number(b.amountPaid || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-right text-error font-bold">₹{Number(b.remainingAmount || 0).toLocaleString('en-IN')}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              b.paymentStatus === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {b.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-on-surface-variant">{b.paymentMethod || 'Pending'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: EMERGENCY RESPONSE */}
          {activeTab === 'emergency' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Total Emergency Admissions</p>
                  <p className="text-3xl font-black text-on-surface mt-2">{data.emergency?.total || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Critical / Level 1 Triage</p>
                  <p className="text-3xl font-black text-error mt-2">{data.emergency?.critical || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">ICU / OT Escalation Rate</p>
                  <p className="text-3xl font-black text-purple-600 mt-2">
                    {data.emergency?.total > 0 ? Math.round(((data.emergency?.admitted || 0) / data.emergency.total) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-sm">
                <h3 className="text-sm font-bold text-on-surface mb-4">Emergency Cases by Triage Priority</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {(data.emergency?.byPriority || []).map((ep, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/40">
                      <p className="text-xs font-bold text-on-surface-variant">{ep._id || 'Standard'}</p>
                      <p className="text-2xl font-black text-on-surface mt-1">{ep.count}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: APPOINTMENTS & QUEUE */}
          {activeTab === 'appointments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Total Bookings</p>
                  <p className="text-2xl font-black text-on-surface mt-1">{data.appointments?.total || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Consultations Completed</p>
                  <p className="text-2xl font-black text-green-600 mt-1">{data.appointments?.completed || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">In Queue / Waiting</p>
                  <p className="text-2xl font-black text-primary mt-1">{data.appointments?.waiting || 0}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant">
                  <p className="text-xs font-bold text-on-surface-variant uppercase">Cancelled / No Show</p>
                  <p className="text-2xl font-black text-error mt-1">{data.appointments?.cancelled || 0}</p>
                </div>
              </div>

              {/* Departmental Appointment Breakdown */}
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
                <div className="p-4 border-b border-outline-variant bg-surface-container-low/30">
                  <h3 className="text-sm font-bold text-on-surface">Appointments Distribution by Medical Specialty</h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant font-bold border-b border-outline-variant">
                    <tr>
                      <th className="p-3">Specialty / Department</th>
                      <th className="p-3 text-center">Total Appointments</th>
                      <th className="p-3 text-center">Completed Consultations</th>
                      <th className="p-3 text-right">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 text-on-surface">
                    {(data.appointments?.byDepartment || []).map((dep, idx) => {
                      const rate = dep.total > 0 ? Math.round((dep.completed / dep.total) * 100) : 0;
                      return (
                        <tr key={idx} className="hover:bg-primary/5 transition-colors">
                          <td className="p-3 font-bold text-primary">{dep._id}</td>
                          <td className="p-3 text-center font-bold">{dep.total}</td>
                          <td className="p-3 text-center text-green-600 font-bold">{dep.completed}</td>
                          <td className="p-3 text-right font-black">
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary">
                              {rate}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
