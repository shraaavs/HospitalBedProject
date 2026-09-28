import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function ReceptionistBedAvailability() {
  const navigate = useNavigate();
  const [beds, setBeds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wardFilter, setWardFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBed, setSelectedBed] = useState(null);

  useEffect(() => {
    fetchBeds();
  }, [wardFilter, statusFilter]);

  const fetchBeds = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const queryParams = new URLSearchParams();
      if (wardFilter !== 'All') queryParams.append('ward', wardFilter);
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);

      const [bedsRes, statsRes] = await Promise.all([
        fetch(`/api/beds?${queryParams.toString()}`, { headers }),
        fetch('/api/beds/stats', { headers })
      ]);

      if (bedsRes.ok) {
        const data = await bedsRes.json();
        setBeds(data);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (err) {
      console.error('Error fetching bed availability:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBeds = beds
    .filter(b => {
      const matchesSearch =
        b.bedNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.wardType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.patientId?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      // 1. Prioritize beds with allocated patient / notes at the very beginning
      const aHasPatient = Boolean(a.patientName || a.notes || a.status === 'Occupied' || a.status === 'Reserved');
      const bHasPatient = Boolean(b.patientName || b.notes || b.status === 'Occupied' || b.status === 'Reserved');
      if (aHasPatient && !bHasPatient) return -1;
      if (!aHasPatient && bHasPatient) return 1;

      // 2. Prioritize Special Ward / Private Suite beds
      const aIsSpecial = (a.wardType || a.type || '').toLowerCase().includes('special');
      const bIsSpecial = (b.wardType || b.type || '').toLowerCase().includes('special');
      if (aIsSpecial && !bIsSpecial) return -1;
      if (!aIsSpecial && bIsSpecial) return 1;

      return (a.bedNumber || '').localeCompare(b.bedNumber || '', undefined, { numeric: true, sensitivity: 'base' });
    });

  const getWardBadge = (ward) => {
    const w = (ward || '').toLowerCase();
    if (w.includes('icu')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (w.includes('emergency') || w.includes('trauma')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (w.includes('special') || w.includes('private')) return 'bg-purple-50 text-purple-700 border-purple-200';
    return 'bg-blue-50 text-[#0066cc] border-blue-200';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'Occupied':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Reserved':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Maintenance':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      case 'Cleaning':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  // Group counts by category
  const generalVacant = beds.filter(b => ((b.wardType || '').toLowerCase().includes('general') || (b.type || '').toLowerCase().includes('general')) && b.status === 'Available').length;
  const specialVacant = beds.filter(b => ((b.wardType || '').toLowerCase().includes('special') || (b.type || '').toLowerCase().includes('special') || (b.department || '').toLowerCase().includes('suite')) && b.status === 'Available').length;
  const icuVacant = beds.filter(b => ((b.wardType || '').toLowerCase().includes('icu') || (b.type || '').toLowerCase().includes('icu')) && b.status === 'Available').length;
  const emergencyVacant = beds.filter(b => ((b.wardType || '').toLowerCase().includes('emergency') || (b.type || '').toLowerCase().includes('emergency')) && b.status === 'Available').length;

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">single_bed</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Hospital Bed Availability Desk</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Real-time read-only hospital bed availability across wards to assist patients and attendants
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200">
            <span className="material-symbols-outlined text-sm text-slate-500">lock</span> Read-Only Front-Desk View
          </span>
          <button
            onClick={fetchBeds}
            className="p-2 text-slate-500 hover:text-[#0066cc] bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
            title="Refresh availability"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {/* Ward Category Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* General Ward */}
        <div 
          onClick={() => setWardFilter(wardFilter === 'General' ? 'All' : 'General')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            wardFilter === 'General'
              ? 'bg-blue-50/80 border-[#0066cc] shadow-sm'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">General Ward</span>
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-[#0066cc] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-base">domain</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{generalVacant}</span>
            <span className="text-xs font-medium text-emerald-600">Vacant Beds</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Standard inpatient admissions & observation</p>
        </div>

        {/* Special Ward */}
        <div 
          onClick={() => setWardFilter(wardFilter === 'Special' ? 'All' : 'Special')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            wardFilter === 'Special'
              ? 'bg-purple-50/80 border-purple-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Special Ward / Private</span>
            <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-base">hotel_class</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{specialVacant}</span>
            <span className="text-xs font-medium text-emerald-600">Vacant Beds</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Private & deluxe patient suites</p>
        </div>

        {/* ICU */}
        <div 
          onClick={() => setWardFilter(wardFilter === 'ICU' ? 'All' : 'ICU')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            wardFilter === 'ICU'
              ? 'bg-rose-50/80 border-rose-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">ICU (Intensive Care)</span>
            <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-base">monitor_heart</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{icuVacant}</span>
            <span className="text-xs font-medium text-emerald-600">Vacant Beds</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Critical care with ventilator support</p>
        </div>

        {/* Emergency Ward */}
        <div 
          onClick={() => setWardFilter(wardFilter === 'Emergency' ? 'All' : 'Emergency')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            wardFilter === 'Emergency'
              ? 'bg-amber-50/80 border-amber-500 shadow-sm'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Emergency / Trauma</span>
            <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-base">emergency</span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{emergencyVacant}</span>
            <span className="text-xs font-medium text-emerald-600">Vacant Beds</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Immediate resuscitation & triage stabilization</p>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0066cc] text-lg">info</span>
          <span>
            <strong>Front-Desk Policy:</strong> Bed allocation, patient reservations, transfers, and bed releases are managed exclusively by authorized Bed Management and Hospital Admin.
          </span>
        </div>
        <span className="text-[11px] text-[#0066cc] font-bold whitespace-nowrap">
          Total Beds: {beds.length}
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 mr-1">Status:</span>
          {['All', 'Available', 'Occupied', 'Reserved'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-[#0066cc] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search bed number, ward, or dept..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0066cc]"
          />
        </div>
      </div>

      {/* Bed Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#0066cc] mb-2">sync</span>
            <p className="text-xs">Fetching real-time hospital bed status...</p>
          </div>
        ) : filteredBeds.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">single_bed</span>
            <p className="text-sm font-semibold text-slate-600">No beds found matching filter.</p>
          </div>
        ) : (
          filteredBeds.map(bed => {
            const isAvailable = bed.status === 'Available';
            const isOccupied = bed.status === 'Occupied';
            const isReserved = bed.status === 'Reserved';

            return (
              <div
                key={bed._id}
                onClick={() => setSelectedBed(bed)}
                className={`bg-white rounded-2xl border p-4.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isAvailable ? 'hover:border-emerald-400' :
                  isOccupied ? 'hover:border-rose-400' :
                  'hover:border-amber-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-lg text-slate-400">single_bed</span>
                      <span className="font-mono font-bold text-sm text-slate-800">{bed.bedNumber}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(bed.status)}`}>
                      {bed.status}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Ward Category:</span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getWardBadge(bed.wardType || bed.type)}`}>
                        {bed.wardType || bed.type || 'General'}
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span className="text-slate-400">Department:</span>
                      <span className="font-medium text-slate-700">{bed.department || 'General Medicine'}</span>
                    </div>

                    {(bed.patientName || bed.status === 'Occupied' || bed.status === 'Reserved') && (
                      <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <div className="flex justify-between text-slate-700">
                          <span className="text-slate-400 font-medium">Patient:</span>
                          <span className="font-bold text-slate-900 truncate max-w-[130px]">{bed.patientName || 'Admitted Inpatient'}</span>
                        </div>
                        {bed.patientId && (
                          <div className="flex justify-between text-slate-600 text-[10px]">
                            <span className="text-slate-400">Patient ID:</span>
                            <span className="font-mono font-semibold text-purple-700">{bed.patientId}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                          <span className="text-slate-400">Doctor:</span>
                          <span className="font-semibold text-[#0066cc] truncate max-w-[130px]">{bed.assignedDoctor || 'Dr. Assigned Specialist'}</span>
                        </div>
                      </div>
                    )}

                    {bed.notes && (
                      <div className="text-[11px] text-amber-800 bg-amber-50/70 px-2 py-1 rounded-md border border-amber-200/60 line-clamp-1">
                        <strong>Info:</strong> {bed.notes}
                      </div>
                    )}

                    {bed.dailyRate && (
                      <div className="flex justify-between text-slate-600">
                        <span className="text-slate-400">Daily Tariff:</span>
                        <span className="font-semibold text-slate-800">₹{bed.dailyRate} / day</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[150px]">
                    {isAvailable ? 'Ready for Admission' : isOccupied ? `Occupied: ${bed.patientName || 'Inpatient'}` : bed.notes || 'Reserved'}
                  </span>
                  <span className="text-[#0066cc] font-bold flex items-center gap-0.5">
                    Details <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bed Details Read-Only Inspection Modal */}
      {selectedBed && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setSelectedBed(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '38rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-[#0066cc] to-blue-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-2xl">single_bed</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Bed Information: {selectedBed.bedNumber}</h3>
                  <p className="text-blue-100 text-xs font-medium">{selectedBed.wardType || selectedBed.type || 'General'} • {selectedBed.department || 'General Medicine'}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedBed(null)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Bed Status Card */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Current Status:</span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadge(selectedBed.status)}`}>
                    {selectedBed.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Ward Category</span>
                    <strong className="text-slate-800 font-semibold">{selectedBed.wardType || selectedBed.type || 'General'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Department</span>
                    <strong className="text-slate-800 font-semibold">{selectedBed.department || 'General Medicine'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Daily Tariff</span>
                    <strong className="text-emerald-700 font-bold">₹{selectedBed.dailyRate || (selectedBed.wardType === 'Special' ? 4500 : 1500)} / day</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Location / Wing</span>
                    <span className="text-slate-700 font-medium">Floor {selectedBed.floor || '2'}, Room {selectedBed.room || '204'}</span>
                  </div>
                </div>
              </div>

              {/* Patient & Clinical Information (Only displayed if bed has assigned patient or specific reservation) */}
              {(selectedBed.patientName || selectedBed.patientId || selectedBed.status === 'Occupied' || selectedBed.status === 'Reserved') ? (
                <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-purple-200/60">
                    <span className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-purple-700">person</span> Patient & Clinical Information
                    </span>
                    <span className="text-[10px] font-bold bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full">
                      {selectedBed.status === 'Occupied' ? 'Current Inpatient' : 'Reserved Inpatient'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Patient Name</span>
                      <strong className="text-slate-900 text-sm font-bold">{selectedBed.patientName || 'Admitted Inpatient'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Patient ID</span>
                      <span className="font-mono font-bold text-purple-800">{selectedBed.patientId || 'Pending Allocation'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Assigned Attending Doctor</span>
                      <strong className="text-[#0066cc] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">stethoscope</span>
                        {selectedBed.assignedDoctor || 'Assigned Attending Doctor'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold uppercase">Admission / Booking Date</span>
                      <span className="text-slate-700 font-medium">
                        {selectedBed.admissionDate ? new Date(selectedBed.admissionDate).toLocaleDateString() : new Date().toLocaleDateString()}
                      </span>
                    </div>
                    {selectedBed.notes && (
                      <div className="col-span-full bg-white p-2.5 rounded-lg border border-purple-100 mt-1">
                        <span className="text-slate-400 block text-[10px] font-bold uppercase mb-0.5">Clinical Indication / Diagnosis</span>
                        <span className="font-semibold text-slate-800">{selectedBed.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedBed.notes ? (
                <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs">
                  <span className="text-amber-800 font-bold uppercase text-[10px] block mb-1">Reservation / Bed Note:</span>
                  <span className="text-slate-800 font-medium">{selectedBed.notes}</span>
                </div>
              ) : null}

              {/* Equipment / Amenities */}
              <div className="space-y-1.5">
                <span className="font-bold text-slate-700 block">Bed Amenities & Support</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Motorized Backrest', 'Central Oxygen Supply', 'Nurse Call Button', 'IV Stand Support', 'Emergency Power Backup'].map((feat, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-blue-50 text-[#0066cc] rounded-lg font-medium text-[11px] border border-blue-100">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>

              {/* Front-Desk Policy Note */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2">
                <span className="material-symbols-outlined text-base text-amber-700 shrink-0">info</span>
                <span>
                  <strong>Front-Desk Policy:</strong> Patient transfers, bed allocations, and discharges are performed through the <em>Admission Processing</em> desk and Bed Management console.
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {selectedBed.patientId ? (
                  <Link
                    to={`/receptionist/patients/${selectedBed.patientId}`}
                    className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 border border-purple-200"
                  >
                    <span className="material-symbols-outlined text-sm">assignment_ind</span>
                    View Full Patient Dossier
                  </Link>
                ) : (
                  <div></div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedBed(null)}
                  className="px-6 py-2 bg-[#0066cc] hover:bg-[#0055b3] text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
