import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function BedManagementRealTimeStatus() {
  const [searchParams] = useSearchParams();
  const [beds, setBeds] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [wardFilter, setWardFilter] = useState('All Wards');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || searchParams.get('bedNumber') || '');
  
  const [userRole, setUserRole] = useState('Staff');

  useEffect(() => {
    const s = searchParams.get('search') || searchParams.get('bedNumber') || '';
    if (s && s !== searchQuery) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  // Modal States
  const [allocateModal, setAllocateModal] = useState({ isOpen: false, bedId: null, bedNumber: '' });
  const [reserveModal, setReserveModal] = useState({ isOpen: false, bedId: null, bedNumber: '' });
  const [transferModal, setTransferModal] = useState({ isOpen: false, fromBedId: null, fromBedNumber: '' });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, bedId: null });

  // Form States
  const [allocateData, setAllocateData] = useState({ patientName: '', patientId: '', notes: '' });
  const [reserveData, setReserveData] = useState({ patientId: '', expectedAdmission: '', reason: '' });
  const [transferData, setTransferData] = useState({ toBedId: '', reason: '' });
  
  const [mainTab, setMainTab] = useState('all'); // 'all' | 'pending-transfers' | 'available' | 'occupied' | 'history'
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [transfersLoading, setTransfersLoading] = useState(false);
  
  const [bedDetails, setBedDetails] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter beds based on main tab
  const displayedBeds = beds.filter(b => {
    if (mainTab === 'available') return b.status === 'Available';
    if (mainTab === 'occupied') return b.status === 'Occupied';
    return true;
  });

  // Compute pagination
  const totalPages = Math.ceil(displayedBeds.length / itemsPerPage) || 1;
  const paginatedBeds = displayedBeds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role) setUserRole(role);
    fetchData();
    fetchTransfersData();
  }, [wardFilter, statusFilter, searchQuery, mainTab]);

  const fetchTransfersData = async () => {
    try {
      setTransfersLoading(true);
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` };
      const [pendingRes, allOrdersRes] = await Promise.all([
        fetch('/api/transfer-discharge?type=Transfer&status=Doctor Approved', { headers }).catch(() => ({ ok: false })),
        fetch('/api/transfer-discharge?type=Transfer', { headers }).catch(() => ({ ok: false }))
      ]);

      if (pendingRes.ok) {
        const pData = await pendingRes.json();
        setPendingTransfers(pData.discharges || pData.records || []);
      }
      if (allOrdersRes.ok) {
        const aData = await allOrdersRes.json();
        const records = aData.discharges || aData.records || [];
        setTransferHistory(records.filter(r => r.status === 'Completed' || r.status === 'Transferred'));
      }
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setTransfersLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${localStorage.getItem('userToken')}` };
      
      const queryParams = new URLSearchParams();
      if (wardFilter !== 'All Wards') queryParams.append('ward', wardFilter);
      if (statusFilter !== 'All') queryParams.append('status', statusFilter);
      if (searchQuery) queryParams.append('search', searchQuery);

      const [bedsRes, statsRes] = await Promise.all([
        fetch(`/api/beds?${queryParams.toString()}`, { headers }),
        fetch(`/api/beds/stats`, { headers })
      ]);

      if (bedsRes.ok) setBeds(await bedsRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/beds/allocate', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bedId: allocateModal.bedId, ...allocateData })
      });
      if (res.ok) {
        Swal.fire('Success', 'Bed allocated successfully', 'success');
        setAllocateModal({ isOpen: false, bedId: null, bedNumber: '' });
        setAllocateData({ patientName: '', patientId: '', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'Allocation failed', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Server error', 'error');
    }
  };

  const handleReserve = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/beds/reserve', {
        method: 'POST',
        headers,
        body: JSON.stringify({ bedId: reserveModal.bedId, ...reserveData })
      });
      if (res.ok) {
        Swal.fire('Success', 'Bed reserved successfully', 'success');
        setReserveModal({ isOpen: false, bedId: null, bedNumber: '' });
        setReserveData({ patientId: '', expectedAdmission: '', reason: '' });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'Reservation failed', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Server error', 'error');
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/beds/transfer', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromBedId: transferModal.fromBedId, ...transferData })
      });
      if (res.ok) {
        Swal.fire({
          title: 'Transfer Complete',
          text: 'Patient transferred successfully. Automated notifications have been dispatched to the assigned nurses and ward staff.',
          icon: 'success',
          confirmButtonText: 'Understood'
        });
        setTransferModal({ isOpen: false, fromBedId: null, fromBedNumber: '' });
        setTransferData({ toBedId: '', reason: '' });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'Transfer failed', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Server error', 'error');
    }
  };

  const updateSimpleStatus = async (id, status, notes = '') => {
    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: `Change bed status to ${status}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, change it!'
    });

    if (confirm.isConfirmed) {
      try {
        const res = await fetch(`/api/beds/${id}/status`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ status, notes })
        });
        if (res.ok) {
          Swal.fire('Updated!', `Status changed to ${status}.`, 'success');
          fetchData();
          if (detailsModal.isOpen && detailsModal.bedId === id) {
            openDetails(id);
          }
        }
      } catch (err) {
        Swal.fire('Error', 'Failed to update status', 'error');
      }
    }
  };

  const openDetails = async (id) => {
    try {
      const res = await fetch(`/api/beds/${id}/details`, { headers: { 'Authorization': headers.Authorization } });
      if (res.ok) {
        const data = await res.json();
        setBedDetails(data);
        setDetailsModal({ isOpen: true, bedId: id });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const hasAccess = (allowedRoles) => allowedRoles.includes(userRole);

  return (
    <div className="w-full relative">
      {/* Dashboard Header & Quick Stats */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-xl gap-md">
        <div>
          <p className="text-label-md font-label-md text-primary tracking-widest uppercase mb-1">Facility Overview</p>
          <h3 className="text-headline-lg font-headline-lg">Bed Management Dashboard</h3>
        </div>
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 w-full">
            <div className="glass-card border border-outline-variant px-3 py-2 rounded-xl flex flex-col justify-center bg-white shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
              <span className="text-xl font-black text-slate-900 leading-tight">{stats.total}</span>
            </div>
            <div className="glass-card border border-outline-variant px-3 py-2 rounded-xl flex flex-col justify-center bg-white shadow-xs border-l-4 border-l-emerald-500">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Available</span>
              <span className="text-xl font-black text-emerald-600 leading-tight">{stats.available}</span>
            </div>
            <div className="glass-card border border-outline-variant px-3 py-2 rounded-xl flex flex-col justify-center bg-white shadow-xs border-l-4 border-l-rose-500">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Occupied</span>
              <span className="text-xl font-black text-rose-600 leading-tight">{stats.occupied}</span>
            </div>
            <div className="glass-card border border-outline-variant px-3 py-2 rounded-xl flex flex-col justify-center bg-white shadow-xs border-l-4 border-l-amber-500">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Reserved</span>
              <span className="text-xl font-black text-amber-600 leading-tight">{stats.reserved}</span>
            </div>
            <div className="glass-card border border-outline-variant px-3 py-2 rounded-xl flex flex-col justify-center bg-white shadow-xs border-l-4 border-l-teal-500">
              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Cleaning</span>
              <span className="text-xl font-black text-teal-600 leading-tight">{stats.cleaning}</span>
            </div>
            <div className="glass-card border border-outline-variant px-3 py-2 rounded-xl flex flex-col justify-center bg-white shadow-xs border-l-4 border-l-slate-400">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Maintenance</span>
              <span className="text-xl font-black text-slate-700 leading-tight">{stats.maintenance}</span>
            </div>
            <div className="glass-card border border-outline-variant px-3 py-2 rounded-xl flex flex-col justify-center bg-white shadow-xs border-l-4 border-l-purple-500">
              <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Blocked</span>
              <span className="text-xl font-black text-purple-600 leading-tight">{stats.blocked || 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Section Sub-Tabs: All Beds, Pending Transfers, Available Beds, Occupied Beds, Transfer History */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Beds', icon: 'single_bed', count: beds.length },
          { id: 'pending-transfers', label: 'Pending Transfer Requests', icon: 'transfer_within_a_station', count: pendingTransfers.length, badgeColor: 'bg-amber-100 text-amber-800' },
          { id: 'available', label: 'Available Beds', icon: 'check_circle', count: stats?.available || beds.filter(b => b.status === 'Available').length, badgeColor: 'bg-emerald-100 text-emerald-800' },
          { id: 'occupied', label: 'Current Occupied Beds', icon: 'hotel', count: stats?.occupied || beds.filter(b => b.status === 'Occupied').length, badgeColor: 'bg-rose-100 text-rose-800' },
          { id: 'history', label: 'Transfer History', icon: 'history', count: transferHistory.length, badgeColor: 'bg-blue-100 text-blue-800' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setMainTab(tab.id); setCurrentPage(1); }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
              mainTab === tab.id
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <span className="material-symbols-outlined text-base">{tab.icon}</span>
            <span>{tab.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
              mainTab === tab.id ? 'bg-white/20 text-white' : (tab.badgeColor || 'bg-slate-100 text-slate-700')
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filter Bar & View Toggle */}
      <div className="bg-white border border-slate-200 p-3 rounded-xl mb-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 shadow-xs">
        <div className="flex-1 w-full relative">
           <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
           <input 
             type="text" 
             placeholder="Search bed number, patient name, room or floor..." 
             className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-teal-500 focus:border-teal-500 transition-all font-medium"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-between lg:justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Ward:</span>
            <select 
              value={wardFilter} 
              onChange={(e) => { setWardFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold py-1.5 px-2.5 text-slate-700"
            >
              {['All Wards', 'ICU', 'General', 'Surgery', 'Pediatric', 'Emergency', 'Isolation', 'Maternity', 'HDU', 'Special'].map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold py-1.5 px-2.5 text-slate-700"
            >
              {['All', 'Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance', 'Blocked'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table List View"
            >
              <span className="material-symbols-outlined text-sm">table_rows</span>
              <span>Table List</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid Card View"
            >
              <span className="material-symbols-outlined text-sm">grid_view</span>
              <span>Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* TABLE LIST VIEW WITH PAGINATION */}
      {viewMode === 'table' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Bed Info</th>
                  <th className="py-3 px-4">Ward & Room</th>
                  <th className="py-3 px-4">Bed Status</th>
                  <th className="py-3 px-4">Patient Details</th>
                  <th className="py-3 px-4">Patient ID</th>
                  <th className="py-3 px-4">Assigned Doctor</th>
                  <th className="py-3 px-4">Admission Date</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBeds.map((bed) => (
                  <tr key={bed._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-teal-600 text-base">single_bed</span>
                        <div>
                          <span className="font-black text-sm text-slate-900">{bed.bedNumber}</span>
                          <span className="block text-[10px] text-slate-400">{bed.bedType || 'Standard'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{bed.wardType || bed.type || 'General'} Ward</div>
                      <div className="text-[11px] text-slate-500 font-mono">Floor {bed.floor || '1'} • Room {bed.room || 'A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black tracking-wide border ${
                        bed.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        bed.status === 'Occupied' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        bed.status === 'Reserved' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        bed.status === 'Cleaning' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                        bed.status === 'Blocked' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {bed.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {bed.patientName ? (
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                            <span>{bed.patientName}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{bed.notes || 'Inpatient Stay'}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No patient assigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">
                      {bed.patientId ? (
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">{bed.patientId}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {bed.assignedDoctor || (bed.status === 'Occupied' ? 'Dr. Assigned Specialist' : '—')}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {bed.admissionDate ? new Date(bed.admissionDate).toLocaleDateString() : (bed.status === 'Occupied' ? 'Active' : '—')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openDetails(bed._id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-colors inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                        <span>View Details</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {paginatedBeds.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-3xl mb-1 block">search_off</span>
                      <span>No beds match the selected filters.</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Bar */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-slate-600">
              <div>
                Showing <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 font-black">{Math.min(currentPage * itemsPerPage, beds.length)}</span> of <span className="text-slate-900 font-black">{beds.length}</span> beds
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-md border text-xs font-black transition-all ${
                      currentPage === p
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BED GRID VIEW WITH PAGINATION */}
      {viewMode === 'grid' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 animate-fade-in animation-delay-200 mb-6">
            {paginatedBeds.map(bed => (
              <div key={bed._id} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col">
                
                <div className={`p-3.5 flex justify-between items-start cursor-pointer border-b border-slate-100 ${
                  bed.status === 'Available' ? 'bg-emerald-50/40' : 
                  bed.status === 'Occupied' ? 'bg-rose-50/40' : 
                  bed.status === 'Cleaning' ? 'bg-teal-50/40' : 
                  bed.status === 'Reserved' ? 'bg-amber-50/40' :
                  bed.status === 'Blocked' ? 'bg-purple-50/40' : 'bg-slate-100/40'
                }`} onClick={() => openDetails(bed._id)}>
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] text-slate-700 block uppercase font-black">{bed.wardType || bed.type || 'General'} WARD</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white rounded text-slate-600 border border-slate-200">{bed.bedType || 'Standard'}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900 hover:text-teal-700 transition-colors flex items-center gap-1.5">
                      <span>{bed.bedNumber}</span>
                      <span className="text-[11px] font-mono text-slate-400 font-normal">({bed.floor ? `Fl ${bed.floor}` : 'Fl 1'}, {bed.room ? `Rm ${bed.room}` : 'Rm A'})</span>
                    </h4>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-tighter flex items-center gap-1 border ${
                    bed.status === 'Available' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 
                    bed.status === 'Occupied' ? 'bg-rose-100 text-rose-800 border-rose-200' : 
                    bed.status === 'Cleaning' ? 'bg-teal-100 text-teal-800 border-teal-200' : 
                    bed.status === 'Reserved' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                    bed.status === 'Blocked' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-200 text-slate-800 border-slate-300'
                  }`}>
                    {bed.status === 'Cleaning' && <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>}
                    {bed.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  {bed.status === 'Occupied' && (
                    <>
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                          <span className="material-symbols-outlined text-slate-500 text-base">person</span>
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">{bed.patientName || 'Unknown Patient'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">ID: {bed.patientId || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-auto flex justify-between items-center pt-2 border-t border-slate-100">
                        <span>Admitted: <b className="font-semibold text-slate-800">{bed.admissionDate ? new Date(bed.admissionDate).toLocaleDateString() : 'Today'}</b></span>
                        <span className="text-[10px] text-teal-700 font-bold">{bed.bedType || 'Standard Bed'}</span>
                      </div>
                    </>
                  )}

                  {bed.status === 'Available' && (
                    <div className="flex-1 flex flex-col justify-center items-center text-center py-2">
                      <span className="material-symbols-outlined text-2xl text-emerald-500 mb-1">check_circle</span>
                      <p className="text-xs text-slate-500 font-medium">Ready for patient assignment</p>
                      <p className="text-[10px] text-slate-400">{bed.bedType || 'Standard'} Bed</p>
                    </div>
                  )}

                  {bed.status === 'Cleaning' && (
                    <div className="flex-1 flex flex-col justify-center text-center py-2">
                      <span className="material-symbols-outlined text-2xl text-teal-500 mb-1 animate-pulse">cleaning_services</span>
                      <p className="text-xs text-slate-600 font-medium">{bed.notes || 'Routine Sanitization in progress'}</p>
                    </div>
                  )}

                  {bed.status === 'Reserved' && (
                    <div className="flex-1 flex flex-col justify-center items-center text-center py-2">
                      <span className="material-symbols-outlined text-2xl text-amber-500 mb-1">event_available</span>
                      <p className="text-xs text-slate-600 font-medium line-clamp-2">{bed.notes || 'Reserved for incoming patient'}</p>
                    </div>
                  )}

                  {bed.status === 'Maintenance' && (
                    <div className="flex-1 flex flex-col justify-center items-center text-center py-2">
                      <span className="material-symbols-outlined text-2xl text-slate-400 mb-1">build</span>
                      <p className="text-xs text-slate-600 font-medium line-clamp-2">{bed.notes || 'Under engineering maintenance'}</p>
                    </div>
                  )}

                  {bed.status === 'Blocked' && (
                    <div className="flex-1 flex flex-col justify-center items-center text-center py-2">
                      <span className="material-symbols-outlined text-2xl text-purple-500 mb-1">block</span>
                      <p className="text-xs text-slate-600 font-medium line-clamp-2">{bed.notes || 'Bed blocked by Administration'}</p>
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 flex items-center justify-between border-t border-slate-100">
                  <button
                    onClick={() => openDetails(bed._id)}
                    className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table Pagination Bar for Grid */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-slate-600">
              <div>
                Showing <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 font-black">{Math.min(currentPage * itemsPerPage, beds.length)}</span> of <span className="text-slate-900 font-black">{beds.length}</span> beds
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-md border text-xs font-black transition-all ${
                      currentPage === p
                        ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* PENDING TRANSFERS TABLE VIEW */}
      {mainTab === 'pending-transfers' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-6">
          <div className="p-4 bg-amber-50/70 border-b border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700">transfer_within_a_station</span>
              <h3 className="font-extrabold text-sm text-slate-800">Doctor-Approved Pending Transfer Requisitions ({pendingTransfers.length})</h3>
            </div>
            <span className="text-xs text-amber-800 font-bold">Select destination bed & execute transfer</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Patient Name & ID</th>
                  <th className="py-3 px-4">Current Ward / Bed</th>
                  <th className="py-3 px-4">Destination Ward</th>
                  <th className="py-3 px-4">Required Bed Type</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Transfer Reason</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingTransfers.map((req) => (
                  <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900">{req.patientName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{req.patientCustomId || 'PID-N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        {req.currentWard} • {req.currentBedNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {req.transferDetails?.recommendedWard || req.transferDetails?.targetWard || 'Target Ward'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {req.transferDetails?.requiredBedType || 'Standard Bed'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        req.transferDetails?.priority === 'Emergency' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                        req.transferDetails?.priority === 'Urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {req.transferDetails?.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={req.transferDetails?.reasonForTransfer || req.reason}>
                      {req.transferDetails?.reasonForTransfer || req.reason || 'Clinical transfer required'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {req.doctorName || 'Dr. Attending'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => {
                          const matchingCurrentBed = beds.find(b => b.bedNumber === req.currentBedNumber);
                          setTransferModal({
                            isOpen: true,
                            fromBedId: matchingCurrentBed?._id || req.currentBedNumber,
                            fromBedNumber: req.currentBedNumber
                          });
                          setTransferData({
                            toBedId: '',
                            reason: req.transferDetails?.reasonForTransfer || req.reason || 'Doctor-Approved Ward Transfer'
                          });
                        }}
                        className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">swap_horiz</span>
                        <span>Assign & Transfer</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingTransfers.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl mb-1 text-emerald-500 block">check_circle</span>
                      <p className="font-bold text-sm text-slate-700">No pending transfer requests</p>
                      <p className="text-xs text-slate-400 mt-0.5">All inpatient bed transfer requests have been processed.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSFER HISTORY VIEW */}
      {mainTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mb-6">
          <div className="p-4 bg-blue-50/70 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-700">history</span>
              <h3 className="font-extrabold text-sm text-slate-800">Permanent Hospital Inpatient Transfer Log ({transferHistory.length})</h3>
            </div>
            <span className="text-xs text-blue-800 font-bold">Audit-compliant transfer records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Patient ID & Name</th>
                  <th className="py-3 px-4">From Ward / Bed</th>
                  <th className="py-3 px-4 text-center">Transfer Path</th>
                  <th className="py-3 px-4">To Ward / Bed</th>
                  <th className="py-3 px-4">Requested By</th>
                  <th className="py-3 px-4">Clinical Reason</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transferHistory.map((hist) => (
                  <tr key={hist._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-black text-slate-900">{hist.patientName}</div>
                      <div className="text-[10px] font-mono text-teal-700 font-bold">{hist.patientCustomId || 'PID-RECORD'}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">
                      {hist.currentWard} • {hist.currentBedNumber}
                    </td>
                    <td className="py-3 px-4 text-center text-teal-700 font-black">
                      ➔
                    </td>
                    <td className="py-3 px-4 font-black text-emerald-800">
                      {hist.transferDetails?.allocatedWard || hist.transferDetails?.recommendedWard || 'General'} • {hist.transferDetails?.allocatedBedNumber || hist.transferDetails?.targetWard || 'Bed Allocated'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {hist.doctorName || hist.authorizedBy || 'Attending Physician'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={hist.transferDetails?.reasonForTransfer || hist.reason}>
                      {hist.transferDetails?.reasonForTransfer || hist.reason || 'Clinical Step-down / Up transfer'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(hist.updatedAt || hist.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                        COMPLETED
                      </span>
                    </td>
                  </tr>
                ))}
                {transferHistory.length === 0 && (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl opacity-50 mb-1 block">history</span>
                      <p className="font-bold text-sm">No transfer history records logged yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ALLOCATE MODAL */}
      {allocateModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl w-[90vw] md:w-[450px] shadow-xl overflow-hidden animate-fade-in">
            <div className="p-lg bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
               <h3 className="text-title-lg font-bold">Allocate Bed {allocateModal.bedNumber}</h3>
               <button onClick={() => setAllocateModal({ isOpen: false })} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleAllocate} className="p-lg space-y-md">
              <div>
                <label className="block text-label-md font-bold mb-xs">Patient ID (Optional)</label>
                <input type="text" className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2" 
                       value={allocateData.patientId} onChange={e => setAllocateData({...allocateData, patientId: e.target.value})} placeholder="e.g. PT-1234" />
              </div>
              <div>
                <label className="block text-label-md font-bold mb-xs">Patient Full Name *</label>
                <input type="text" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2" 
                       value={allocateData.patientName} onChange={e => setAllocateData({...allocateData, patientName: e.target.value})} placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-label-md font-bold mb-xs">Admission Notes</label>
                <textarea className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2" rows="2"
                       value={allocateData.notes} onChange={e => setAllocateData({...allocateData, notes: e.target.value})} placeholder="Initial observations..."></textarea>
              </div>
              <div className="pt-sm flex justify-end gap-sm">
                <button type="button" onClick={() => setAllocateModal({ isOpen: false })} className="px-md py-2 rounded-lg font-bold text-on-surface hover:bg-surface-container">Cancel</button>
                <button type="submit" className="px-md py-2 bg-primary text-on-primary rounded-lg font-bold shadow-sm hover:brightness-110">Confirm Allocation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESERVE MODAL */}
      {reserveModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl w-[90vw] md:w-[450px] shadow-xl overflow-hidden animate-fade-in">
            <div className="p-lg bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
               <h3 className="text-title-lg font-bold">Reserve Bed {reserveModal.bedNumber}</h3>
               <button onClick={() => setReserveModal({ isOpen: false })} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleReserve} className="p-lg space-y-md">
              <div>
                <label className="block text-label-md font-bold mb-xs">Patient ID *</label>
                <input type="text" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2" 
                       value={reserveData.patientId} onChange={e => setReserveData({...reserveData, patientId: e.target.value})} placeholder="e.g. PT-1234" />
              </div>
              <div>
                <label className="block text-label-md font-bold mb-xs">Expected Admission Time *</label>
                <input type="datetime-local" required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2" 
                       value={reserveData.expectedAdmission} onChange={e => setReserveData({...reserveData, expectedAdmission: e.target.value})} />
              </div>
              <div>
                <label className="block text-label-md font-bold mb-xs">Reason / Notes *</label>
                <textarea required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2" rows="2"
                       value={reserveData.reason} onChange={e => setReserveData({...reserveData, reason: e.target.value})} placeholder="e.g. Surgery recovery"></textarea>
              </div>
              <div className="pt-sm flex justify-end gap-sm">
                <button type="button" onClick={() => setReserveModal({ isOpen: false })} className="px-md py-2 rounded-lg font-bold text-on-surface hover:bg-surface-container">Cancel</button>
                <button type="submit" className="px-md py-2 bg-amber-600 text-white rounded-lg font-bold shadow-sm hover:brightness-110">Confirm Reservation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {transferModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl w-[90vw] md:w-[450px] shadow-xl overflow-hidden animate-fade-in">
            <div className="p-lg bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
               <h3 className="text-title-lg font-bold">Transfer from {transferModal.fromBedNumber}</h3>
               <button onClick={() => setTransferModal({ isOpen: false })} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined">close</span></button>
            </div>
            <form onSubmit={handleTransfer} className="p-lg space-y-md">
              <div>
                <label className="block text-label-md font-bold mb-xs">Destination Bed *</label>
                <select required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2"
                        value={transferData.toBedId} onChange={e => setTransferData({...transferData, toBedId: e.target.value})}>
                    <option value="">-- Select Available Bed --</option>
                    {beds.filter(b => b.status === 'Available').map(b => (
                        <option key={b._id} value={b._id}>{b.bedNumber} ({b.wardType || b.type || 'General'} Ward)</option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-label-md font-bold mb-xs">Transfer Reason *</label>
                <textarea required className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2" rows="2"
                       value={transferData.reason} onChange={e => setTransferData({...transferData, reason: e.target.value})} placeholder="Reason for transfer..."></textarea>
              </div>
              <div className="pt-sm flex justify-end gap-sm">
                <button type="button" onClick={() => setTransferModal({ isOpen: false })} className="px-md py-2 rounded-lg font-bold text-on-surface hover:bg-surface-container">Cancel</button>
                <button type="submit" className="px-md py-2 bg-primary text-on-primary rounded-lg font-bold shadow-sm hover:brightness-110">Confirm Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BED DETAILS MODAL */}
      {detailsModal.isOpen && bedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface border border-outline-variant rounded-2xl w-full max-w-2xl shadow-xl overflow-hidden animate-fade-in max-h-[90vh] flex flex-col">
            <div className="p-lg bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
               <div>
                  <h3 className="text-headline-sm font-bold flex items-center gap-sm">
                      Bed {bedDetails.bed.bedNumber}
                      <span className="px-2 py-1 text-label-sm rounded bg-surface-container-highest border border-outline-variant uppercase">{bedDetails.bed.status}</span>
                  </h3>
                  <p className="text-body-sm text-on-surface-variant">{bedDetails.bed.wardType || bedDetails.bed.type || 'General'} Ward • Room: {bedDetails.bed.room || 'N/A'} • Floor: {bedDetails.bed.floor || 'N/A'}</p>
               </div>
               <button onClick={() => setDetailsModal({ isOpen: false })} className="text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[28px]">close</span></button>
            </div>
            
            <div className="overflow-y-auto p-lg space-y-xl">
               
               {/* Current Status Info */}
               <section>
                   <h4 className="text-title-md font-bold mb-md text-primary border-b border-outline-variant/30 pb-2">Current Status</h4>
                   {bedDetails.bed.status === 'Occupied' ? (
                       <div className="grid grid-cols-2 gap-4 bg-surface-container p-4 rounded-xl border border-outline-variant">
                           <div>
                               <p className="text-label-sm text-on-surface-variant uppercase">Patient Name</p>
                               <p className="text-body-lg font-bold">{bedDetails.bed.patientName}</p>
                           </div>
                           <div>
                               <p className="text-label-sm text-on-surface-variant uppercase">Patient ID</p>
                               <p className="text-body-lg font-bold">{bedDetails.bed.patientId}</p>
                           </div>
                           <div>
                               <p className="text-label-sm text-on-surface-variant uppercase">Admission Date</p>
                               <p className="text-body-md">{new Date(bedDetails.bed.admissionDate).toLocaleString()}</p>
                           </div>
                           {bedDetails.activeAllocation && (
                               <div>
                                   <p className="text-label-sm text-on-surface-variant uppercase">Allocation Since</p>
                                   <p className="text-body-md">{new Date(bedDetails.activeAllocation.startTime).toLocaleString()}</p>
                               </div>
                           )}
                       </div>
                   ) : bedDetails.bed.status === 'Reserved' && bedDetails.activeReservation ? (
                        <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                           <p className="text-label-sm text-amber-800 uppercase mb-1">Reservation Details</p>
                           <p className="text-body-md"><strong>Patient ID:</strong> {bedDetails.activeReservation.patient?.patientId || bedDetails.bed.notes}</p>
                           <p className="text-body-md"><strong>Expected:</strong> {new Date(bedDetails.activeReservation.expectedAdmission).toLocaleString()}</p>
                           <p className="text-body-md"><strong>Reason:</strong> {bedDetails.activeReservation.reason}</p>
                       </div>
                   ) : (
                       <p className="text-body-md text-on-surface-variant italic">Bed is currently {bedDetails.bed.status.toLowerCase()}. {bedDetails.bed.notes}</p>
                   )}
               </section>

               {/* History Log */}
               <section>
                   <h4 className="text-title-md font-bold mb-md text-primary border-b border-outline-variant/30 pb-2 flex items-center gap-xs">
                       <span className="material-symbols-outlined">history</span> Activity Log
                   </h4>
                   {bedDetails.history.length > 0 ? (
                       <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant before:to-transparent">
                           {bedDetails.history.map((log, i) => (
                               <div key={log._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                   <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-surface-container-high text-on-surface shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                                       <span className="material-symbols-outlined text-[16px]">
                                           {log.action === 'Allocated' ? 'person_add' : 
                                            log.action === 'Transferred' ? 'transfer_within_a_station' : 
                                            log.action === 'Cleaned' ? 'cleaning_services' : 
                                            log.action === 'Available' ? 'check_circle' : 'event_note'}
                                       </span>
                                   </div>
                                   <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
                                       <div className="flex justify-between items-start mb-1">
                                           <span className="text-label-md font-bold text-primary">{log.action}</span>
                                           <span className="text-label-sm text-on-surface-variant">{new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                       </div>
                                       <p className="text-body-sm text-on-surface">{log.details}</p>
                                       {log.user && <p className="text-[10px] text-on-surface-variant mt-2 uppercase tracking-wide">By: {log.user.name} ({log.user.role})</p>}
                                   </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <p className="text-body-md text-on-surface-variant italic">No recent history available for this bed.</p>
                   )}
               </section>
            </div>
            <div className="p-md bg-surface-container-lowest border-t border-outline-variant text-right">
                <button onClick={() => setDetailsModal({ isOpen: false })} className="px-md py-2 rounded-lg font-bold border border-outline-variant hover:bg-surface-container transition-colors">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
