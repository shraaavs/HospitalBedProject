import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function BedManagementRealTimeStatus() {
  const [beds, setBeds] = useState([]);
  const [stats, setStats] = useState(null);
  
  const [wardFilter, setWardFilter] = useState('All Wards');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [userRole, setUserRole] = useState('Staff');

  // Modal States
  const [allocateModal, setAllocateModal] = useState({ isOpen: false, bedId: null, bedNumber: '' });
  const [reserveModal, setReserveModal] = useState({ isOpen: false, bedId: null, bedNumber: '' });
  const [transferModal, setTransferModal] = useState({ isOpen: false, fromBedId: null, fromBedNumber: '' });
  const [detailsModal, setDetailsModal] = useState({ isOpen: false, bedId: null });

  // Form States
  const [allocateData, setAllocateData] = useState({ patientName: '', patientId: '', notes: '' });
  const [reserveData, setReserveData] = useState({ patientId: '', expectedAdmission: '', reason: '' });
  const [transferData, setTransferData] = useState({ toBedId: '', reason: '' });
  
  const [bedDetails, setBedDetails] = useState(null);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role) setUserRole(role);
    fetchData();
  }, [wardFilter, statusFilter, searchQuery]);

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
          <div className="flex flex-wrap gap-md">
            <div className="glass-card border border-outline-variant px-md py-sm rounded-xl flex flex-col">
              <span className="text-label-sm text-on-surface-variant uppercase">Total</span>
              <span className="text-title-lg font-bold">{stats.total}</span>
            </div>
            <div className="glass-card border border-outline-variant px-md py-sm rounded-xl flex flex-col border-l-4 border-l-green-500">
              <span className="text-label-sm text-on-surface-variant uppercase">Available</span>
              <span className="text-title-lg font-bold text-green-600">{stats.available}</span>
            </div>
            <div className="glass-card border border-outline-variant px-md py-sm rounded-xl flex flex-col border-l-4 border-l-red-500">
              <span className="text-label-sm text-on-surface-variant uppercase">Occupied</span>
              <span className="text-title-lg font-bold text-red-600">{stats.occupied}</span>
            </div>
            <div className="glass-card border border-outline-variant px-md py-sm rounded-xl flex flex-col border-l-4 border-l-amber-500">
              <span className="text-label-sm text-on-surface-variant uppercase">Reserved</span>
              <span className="text-title-lg font-bold text-amber-600">{stats.reserved}</span>
            </div>
            <div className="glass-card border border-outline-variant px-md py-sm rounded-xl flex flex-col border-l-4 border-l-teal-500">
              <span className="text-label-sm text-on-surface-variant uppercase">Cleaning</span>
              <span className="text-title-lg font-bold text-teal-600">{stats.cleaning}</span>
            </div>
            <div className="glass-card border border-outline-variant px-md py-sm rounded-xl flex flex-col border-l-4 border-l-gray-500">
              <span className="text-label-sm text-on-surface-variant uppercase">Maintenance</span>
              <span className="text-title-lg font-bold text-gray-600">{stats.maintenance}</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl mb-xl flex flex-col lg:flex-row items-start lg:items-center gap-lg animate-fade-in">
        <div className="flex-1 w-full relative">
           <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
           <input 
             type="text" 
             placeholder="Search bed number or patient name..." 
             className="w-full pl-10 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-body-md focus:ring-primary focus:border-primary transition-all"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
           />
        </div>
        
        <div className="flex items-center gap-sm flex-wrap">
          <span className="text-label-md text-on-surface-variant">Ward:</span>
          <select 
            value={wardFilter} 
            onChange={(e) => setWardFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded-lg text-body-md py-1.5 px-3"
          >
            {['All Wards', 'ICU', 'General', 'Surgery'].map(w => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-sm flex-wrap">
          <span className="text-label-md text-on-surface-variant">Status:</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded-lg text-body-md py-1.5 px-3"
          >
            {['All', 'Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Bed Grid View */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-lg animate-fade-in animation-delay-200">
        {beds.map(bed => (
          <div key={bed._id} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
            
            <div className={`p-md flex justify-between items-start cursor-pointer ${
              bed.status === 'Available' ? 'bg-green-50/50' : 
              bed.status === 'Occupied' ? 'bg-red-50/50' : 
              bed.status === 'Cleaning' ? 'bg-teal-50/50' : 
              bed.status === 'Reserved' ? 'bg-amber-50/50' : 'bg-gray-100/50'
            }`} onClick={() => openDetails(bed._id)}>
              <div>
                <span className="text-label-md text-on-surface-variant block uppercase">{bed.wardType || bed.type || 'General'} WARD</span>
                <h4 className="text-headline-md font-bold hover:text-primary transition-colors">{bed.bedNumber}</h4>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded tracking-tighter flex items-center gap-xs ${
                bed.status === 'Available' ? 'bg-green-100 text-green-800' : 
                bed.status === 'Occupied' ? 'bg-red-100 text-red-800' : 
                bed.status === 'Cleaning' ? 'bg-teal-100 text-teal-800' : 
                bed.status === 'Reserved' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-800'
              }`}>
                {bed.status === 'Cleaning' && <span className="material-symbols-outlined text-[12px] animate-spin">sync</span>}
                {bed.status.toUpperCase()}
              </span>
            </div>

            <div className="p-md border-t border-outline-variant/30 flex-1 flex flex-col">
              {bed.status === 'Occupied' && (
                <>
                  <div className="flex items-center gap-md mb-md">
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-outline">person</span>
                    </div>
                    <div>
                      <p className="text-body-md font-bold truncate">{bed.patientName || 'Unknown Patient'}</p>
                      <p className="text-body-sm text-on-surface-variant">ID: {bed.patientId || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-body-sm text-on-surface-variant mt-auto">
                    Admin: <span className="font-medium text-on-surface">{bed.admissionDate ? new Date(bed.admissionDate).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </>
              )}

              {bed.status === 'Available' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center py-sm">
                  <p className="text-body-sm text-on-surface-variant mb-md">Ready for patient assignment</p>
                  {hasAccess(['Admin', 'Doctor', 'Receptionist', 'Nurse']) && (
                    <button 
                      onClick={() => setAllocateModal({ isOpen: true, bedId: bed._id, bedNumber: bed.bedNumber })}
                      className="w-full bg-primary text-on-primary py-2 rounded-lg font-bold text-label-md shadow-sm active:scale-95 transition-transform hover:bg-primary/90 mb-2"
                    >
                      ALLOCATE BED
                    </button>
                  )}
                  {hasAccess(['Admin', 'Receptionist', 'Doctor']) && (
                    <button 
                      onClick={() => setReserveModal({ isOpen: true, bedId: bed._id, bedNumber: bed.bedNumber })}
                      className="w-full border border-primary text-primary py-2 rounded-lg font-bold text-label-md shadow-sm active:scale-95 transition-colors hover:bg-primary/10"
                    >
                      RESERVE BED
                    </button>
                  )}
                </div>
              )}

              {bed.status === 'Cleaning' && (
                <div className="flex-1 flex flex-col justify-center text-center">
                  <span className="material-symbols-outlined text-[32px] text-teal-500 mb-2 animate-pulse">cleaning_services</span>
                  <p className="text-body-sm text-on-surface-variant">{bed.notes || 'Routine Cleaning'}</p>
                </div>
              )}

              {bed.status === 'Reserved' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <span className="material-symbols-outlined text-[32px] text-amber-500 mb-2">event_available</span>
                  <p className="text-body-sm text-on-surface-variant line-clamp-2">{bed.notes || 'Reserved for incoming patient'}</p>
                </div>
              )}

              {bed.status === 'Maintenance' && (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <span className="material-symbols-outlined text-[32px] text-gray-500 mb-2">build</span>
                  <p className="text-body-sm text-on-surface-variant line-clamp-2">{bed.notes || 'Under maintenance'}</p>
                </div>
              )}
            </div>

            <div className="p-sm bg-surface-container-low flex gap-sm mt-auto border-t border-outline-variant/50">
              {bed.status === 'Occupied' && hasAccess(['Admin', 'Doctor', 'Nurse']) && (
                 <button onClick={() => setTransferModal({ isOpen: true, fromBedId: bed._id, fromBedNumber: bed.bedNumber })} className="flex-1 py-1.5 rounded-md border border-primary text-primary text-label-md font-bold hover:bg-primary hover:text-on-primary transition-colors">TRANSFER</button>
              )}
              {bed.status === 'Occupied' && hasAccess(['Admin', 'Doctor', 'Receptionist', 'Nurse']) && (
                 <button onClick={() => updateSimpleStatus(bed._id, 'Cleaning', 'Discharged')} className="flex-1 py-1.5 rounded-md border border-outline-variant text-on-surface-variant text-label-md font-bold hover:bg-surface-container-high transition-colors">DISCHARGE</button>
              )}
              {bed.status === 'Cleaning' && hasAccess(['Admin', 'Nurse', 'Inventory Manager']) && (
                <button onClick={() => updateSimpleStatus(bed._id, 'Available')} className="w-full py-1.5 rounded-md border border-teal-600 text-teal-700 text-label-md font-bold hover:bg-teal-50 transition-colors">MARK CLEANED</button>
              )}
              {bed.status === 'Reserved' && hasAccess(['Admin', 'Receptionist', 'Doctor']) && (
                <>
                  <button onClick={() => setAllocateModal({ isOpen: true, bedId: bed._id, bedNumber: bed.bedNumber })} className="flex-1 py-1.5 rounded-md border border-amber-600 text-amber-700 text-label-md font-bold hover:bg-amber-50 transition-colors">ADMIT</button>
                  <button onClick={() => updateSimpleStatus(bed._id, 'Available', 'Reservation Cancelled')} className="w-8 flex items-center justify-center rounded-md border border-outline-variant text-error hover:bg-red-50" title="Cancel">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </>
              )}
              {bed.status === 'Available' && hasAccess(['Admin', 'Inventory Manager', 'Nurse']) && (
                  <button onClick={() => updateSimpleStatus(bed._id, 'Cleaning')} className="flex-1 py-1.5 rounded-md bg-surface-container text-on-surface text-label-md font-bold hover:bg-surface-container-high transition-colors text-[10px]">CLEAN</button>
              )}
              {bed.status === 'Available' && hasAccess(['Admin', 'Inventory Manager']) && (
                  <button onClick={() => updateSimpleStatus(bed._id, 'Maintenance')} className="flex-1 py-1.5 rounded-md bg-surface-container text-on-surface text-label-md font-bold hover:bg-surface-container-high transition-colors text-[10px]">MAINTENANCE</button>
              )}
               {bed.status === 'Maintenance' && hasAccess(['Admin', 'Inventory Manager']) && (
                  <button onClick={() => updateSimpleStatus(bed._id, 'Cleaning', 'Maintenance Finished')} className="w-full py-1.5 rounded-md border border-gray-600 text-gray-700 text-label-md font-bold hover:bg-gray-100 transition-colors">FINISH REPAIRS</button>
              )}
            </div>
          </div>
        ))}
        {beds.length === 0 && (
            <div className="col-span-full py-2xl text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[48px] opacity-50 mb-md">search_off</span>
                <p>No beds found matching your filters.</p>
            </div>
        )}
      </div>

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
