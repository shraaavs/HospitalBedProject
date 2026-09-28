import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function ResourceAllocationMediFlowCentral() {
  const [inventory, setInventory] = useState([]);
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Main Tab
  const [selectedTab, setSelectedTab] = useState('requests'); // 'requests' | 'in-use' | 'inventory' | 'suppliers'
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals
  const [allocateModal, setAllocateModal] = useState({ isOpen: false, req: null });
  const [allocateDetails, setAllocateDetails] = useState({
    assetTag: '',
    serialNumber: '',
    deviceModel: '',
    notes: ''
  });

  const [detailsModal, setDetailsModal] = useState({ isOpen: false, req: null });
  const [newItemModal, setNewItemModal] = useState(false);
  const [newSupplierModal, setNewSupplierModal] = useState(false);

  // New Equipment Form State
  const [newItemData, setNewItemData] = useState({
    itemName: '',
    resourceType: 'Ventilator',
    category: 'Equipment',
    quantity: 10,
    unit: 'units',
    condition: 'New',
    locationWard: 'Central Equipment Store',
    supplierName: '',
    supplierContact: '',
    lowStockThreshold: 5
  });

  // New Supplier Form State
  const [newSupplierData, setNewSupplierData] = useState({
    supplierName: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    supplyCategories: 'Ventilator, Oxygen Cylinder, Medical Equipment',
    notes: ''
  });

  const userRole = localStorage.getItem('userRole') || 'Admin';
  const token = localStorage.getItem('userToken') || localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  const fetchData = async () => {
    try {
      const [invRes, reqRes, allocRes, supRes] = await Promise.all([
        fetch('/api/inventory', { headers }),
        fetch('/api/resource-requests', { headers }),
        fetch('/api/resource-requests/allocations', { headers }),
        fetch('/api/suppliers', { headers })
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData);
      }
      if (allocRes.ok) {
        const allocData = await allocRes.json();
        setAllocations(allocData);
      }
      if (supRes.ok) {
        const supData = await supRes.json();
        setSuppliers(supData);
      }
    } catch (err) {
      console.error('Error fetching resource allocation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  // STEP 4: Admin Approve with stock verification
  const handleApprove = async (reqId, resourceType, quantity) => {
    const matchingItem = inventory.find(i => 
      (i.resourceType || '').toLowerCase() === (resourceType || '').toLowerCase() ||
      (i.itemName || '').toLowerCase().includes((resourceType || '').toLowerCase())
    );

    const availStock = matchingItem ? (matchingItem.availableQuantity !== undefined ? matchingItem.availableQuantity : matchingItem.quantity) : 0;
    
    if (availStock < (quantity || 1)) {
      Swal.fire({
        icon: 'error',
        title: 'Insufficient Stock',
        text: `Cannot approve: Available stock for "${resourceType}" is ${availStock} units (Requested: ${quantity || 1} units). Replenish inventory first.`
      });
      return;
    }

    try {
      const res = await fetch(`/api/resource-requests/${reqId}/approve`, {
        method: 'PUT',
        headers
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Request Approved',
          text: `Resource request for ${resourceType} approved. Proceed to Allocate.`,
          timer: 1600,
          showConfirmButton: false
        });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Approval Error', err.message || 'Failed to approve request', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection failure', 'error');
    }
  };

  // Reject Request
  const handleReject = async (reqId) => {
    const { value: reason } = await Swal.fire({
      title: 'Reject Resource Request',
      input: 'textarea',
      inputLabel: 'Reason for rejection (e.g. equipment out of service, alternative prescribed):',
      inputPlaceholder: 'Enter clinical or administrative justification...',
      inputAttributes: { 'aria-label': 'Reason for rejection' },
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Confirm Rejection'
    });

    if (reason === undefined) return;

    try {
      const res = await fetch(`/api/resource-requests/${reqId}/reject`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ rejectionReason: reason || 'Not approved by Hospital Administration' })
      });

      if (res.ok) {
        Swal.fire('Rejected', 'Resource request has been rejected.', 'info');
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection failure', 'error');
    }
  };

  // STEP 5: Confirm Allocation
  const handleConfirmAllocation = async (e) => {
    e.preventDefault();
    if (!allocateModal.req) return;

    try {
      const res = await fetch(`/api/resource-requests/${allocateModal.req._id}/allocate`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(allocateDetails)
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Resource Allocated!',
          text: `Asset ${allocateDetails.assetTag} successfully assigned to ${allocateModal.req.patientName}.`,
          timer: 1800,
          showConfirmButton: false
        });
        setAllocateModal({ isOpen: false, req: null });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Allocation Failed', err.message || 'Unable to allocate equipment', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    }
  };

  // STEP 6: Confirm In Use at Bedside
  const handleConfirmInUse = async (reqId, patientName) => {
    try {
      const res = await fetch(`/api/resource-requests/${reqId}/in-use`, {
        method: 'PUT',
        headers
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Marked In Use',
          text: `Equipment confirmed in active bedside use for ${patientName}.`,
          timer: 1600,
          showConfirmButton: false
        });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    }
  };

  // STEP 7: Release Resource & Restock
  const handleRelease = async (reqId, patientName) => {
    const result = await Swal.fire({
      title: 'Release Equipment Asset?',
      text: `Confirm that patient ${patientName} no longer needs this equipment. It will be returned to Available Stock for other patients.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Release & Restock'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`/api/resource-requests/${reqId}/release`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ releaseNotes: 'Clinical use completed. Asset sanitized and restocked.' })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Asset Released',
          text: 'Equipment successfully returned to available hospital inventory.',
          timer: 1800,
          showConfirmButton: false
        });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message, 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    }
  };

  // Handle Create Equipment
  const handleCreateInventoryItem = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...newItemData,
          quantity: Number(newItemData.quantity),
          lowStockThreshold: Number(newItemData.lowStockThreshold)
        })
      });

      if (res.ok) {
        Swal.fire('Created', 'New medical resource catalogued in MongoDB.', 'success');
        setNewItemModal(false);
        setNewItemData({
          itemName: '',
          resourceType: 'Ventilator',
          category: 'Equipment',
          quantity: 10,
          unit: 'units',
          condition: 'New',
          locationWard: 'Central Equipment Store',
          supplierName: '',
          supplierContact: '',
          lowStockThreshold: 5
        });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'Failed to add item', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Failed to save inventory item', 'error');
    }
  };

  // Handle Create Supplier
  const handleCreateSupplier = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...newSupplierData,
          supplyCategories: newSupplierData.supplyCategories.split(',').map(s => s.trim())
        })
      });

      if (res.ok) {
        Swal.fire('Created', 'New Supplier registered successfully.', 'success');
        setNewSupplierModal(false);
        setNewSupplierData({
          supplierName: '',
          contactPerson: '',
          contactEmail: '',
          contactPhone: '',
          address: '',
          supplyCategories: 'Ventilator, Oxygen Cylinder, Medical Equipment',
          notes: ''
        });
        fetchData();
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'Failed to register supplier', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server communication error', 'error');
    }
  };

  // Summary Metrics (Real-time computed directly from MongoDB collections)
  const totalAssets = inventory.reduce((acc, i) => acc + (i.quantity || 0), 0);
  const totalAvailable = inventory.reduce((acc, i) => acc + (i.availableQuantity !== undefined ? i.availableQuantity : i.quantity || 0), 0);
  const totalAllocated = inventory.reduce((acc, i) => acc + (i.allocatedQuantity || 0), 0);
  const totalInUse = requests.filter(r => r.status === 'In Use').reduce((acc, r) => acc + (r.quantity || 1), 0);
  const pendingRequestsCount = requests.filter(r => r.status === 'Pending' || r.status === 'Requested').length;

  // Filtered Requests
  const filteredRequests = requests.filter(r => {
    const matchesStatus = filterStatus === 'All' || r.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (r.patientName || '').toLowerCase().includes(q) ||
      (r.patientCustomId || '').toLowerCase().includes(q) ||
      (r.requestId || '').toLowerCase().includes(q) ||
      (r.resourceType || '').toLowerCase().includes(q) ||
      (r.ward || '').toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const activeDeployments = requests.filter(r => r.status === 'Allocated' || r.status === 'In Use');

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-bold text-lg">
              🧰
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-800">Resource Allocation & Equipment Control</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {pendingRequestsCount} Pending Requests
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Central management for Ventilators, Oxygen Cylinders, Monitors, Pumps, Wheelchairs & Clinical Equipment
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setNewItemModal(true)}
            className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">add_box</span>
            <span>+ Add Equipment</span>
          </button>
          <button
            onClick={() => setNewSupplierModal(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-200"
          >
            <span className="material-symbols-outlined text-sm">domain</span>
            <span>+ Add Supplier</span>
          </button>
          <button
            onClick={fetchData}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer border border-slate-200"
            title="Refresh from MongoDB"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner (Live real-time MongoDB numbers) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Total Equipment</span>
          <h3 className="text-2xl font-black text-slate-800 mt-0.5">{totalAssets}</h3>
          <p className="text-[11px] text-slate-400 mt-1">Hospital-wide inventory</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase block tracking-wider">Available Stock</span>
          <h3 className="text-2xl font-black text-emerald-600 mt-0.5">{totalAvailable}</h3>
          <p className="text-[11px] text-emerald-600/80 mt-1">Ready for allocation</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-purple-600 uppercase block tracking-wider">Allocated</span>
          <h3 className="text-2xl font-black text-purple-700 mt-0.5">{totalAllocated}</h3>
          <p className="text-[11px] text-purple-600/80 mt-1">Reserved for patients</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-blue-600 uppercase block tracking-wider">In Active Use</span>
          <h3 className="text-2xl font-black text-blue-700 mt-0.5">{totalInUse}</h3>
          <p className="text-[11px] text-blue-600/80 mt-1">At bedside / wards</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-amber-600 uppercase block tracking-wider">Pending Requisitions</span>
          <h3 className="text-2xl font-black text-amber-600 mt-0.5">{pendingRequestsCount}</h3>
          <p className="text-[11px] text-amber-600/80 mt-1">Doctor & Nurse requests</p>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex-wrap gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => { setSelectedTab('requests'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedTab === 'requests'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-sm">clinical_notes</span>
            <span>Resource Requests ({requests.length})</span>
          </button>
          <button
            onClick={() => setSelectedTab('in-use')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedTab === 'in-use'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-sm">devices_other</span>
            <span>Active Deployments ({activeDeployments.length})</span>
          </button>
          <button
            onClick={() => setSelectedTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedTab === 'inventory'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            <span>Live Stock Matrix ({inventory.length})</span>
          </button>
          <button
            onClick={() => setSelectedTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedTab === 'suppliers'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-sm">local_shipping</span>
            <span>Suppliers ({suppliers.length})</span>
          </button>
        </div>

        {selectedTab === 'requests' && (
          <div className="relative min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              placeholder="Search patient, asset, ward..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600"
            />
          </div>
        )}
      </div>

      {/* TAB 1: Resource Requests */}
      {selectedTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Status Filters Bar */}
          <div className="p-3 bg-slate-50/70 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {['All', 'Pending', 'Approved', 'Allocated', 'In Use', 'Released', 'Rejected'].map(st => (
                <button
                  key={st}
                  onClick={() => { setFilterStatus(st); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterStatus === st
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Workflow: Requested &rarr; Approved &rarr; Allocated &rarr; In Use &rarr; Released
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Request ID & Date</th>
                  <th className="p-3.5">Patient Details</th>
                  <th className="p-3.5">Equipment / Resource</th>
                  <th className="p-3.5">Quantity & Priority</th>
                  <th className="p-3.5">Clinical Reason & Duration</th>
                  <th className="p-3.5">Current Workflow Status</th>
                  <th className="p-3.5 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">
                      No resource requests found matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map(req => {
                    const reqId = req.requestId || `RR-${req._id.toString().slice(-4).toUpperCase()}`;
                    const patName = req.patientName || req.patientId?.fullName || 'Inpatient';
                    const patId = req.patientCustomId || req.patientId?.patientId || 'PX-REC';
                    const admId = req.admissionCustomId || (req.admissionId ? `ADM-${req.admissionId.toString().slice(-4)}` : 'Inpatient');
                    const ward = req.ward || req.patientId?.ward || 'General Ward';
                    const bed = req.bedNumber || req.patientId?.bedNumber || 'Bed Unassigned';
                    const durationStr = req.requiredUntil
                      ? `${new Date(req.requiredFrom).toLocaleDateString()} to ${new Date(req.requiredUntil).toLocaleDateString()}`
                      : `From ${new Date(req.requiredFrom).toLocaleDateString()}`;

                    // Check live stock for approval button pre-check
                    const stockItem = inventory.find(i => 
                      (i.resourceType || '').toLowerCase() === (req.resourceType || '').toLowerCase() ||
                      (i.itemName || '').toLowerCase().includes((req.resourceType || '').toLowerCase())
                    );
                    const currentAvail = stockItem ? (stockItem.availableQuantity !== undefined ? stockItem.availableQuantity : stockItem.quantity) : 0;
                    const hasEnoughStock = currentAvail >= (req.quantity || 1);

                    return (
                      <tr key={req._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3.5 font-mono">
                          <button
                            onClick={() => setDetailsModal({ isOpen: true, req })}
                            className="font-bold text-purple-700 hover:underline cursor-pointer block text-left"
                            title="Click to view full request details"
                          >
                            {reqId}
                          </button>
                          <span className="text-[10px] text-slate-400">{new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block">{patName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {patId} • {admId}</span>
                          <span className="text-[10px] text-teal-700 block font-semibold">{ward} • {bed}</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800 block">{req.resourceType}</span>
                          <span className="text-[10px] text-slate-500">By: {req.doctorName || 'Attending Staff'} ({req.requestedByModel || 'Doctor'})</span>
                        </td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900">{req.quantity} unit(s)</span>
                          <span className={`block text-[10px] font-bold mt-0.5 px-2 py-0.2 rounded w-fit ${
                            req.priority === 'Critical' || req.priority === 'Emergency' || req.priority === 'Critical / Emergency'
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : req.priority === 'Urgent'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {req.priority || 'Routine'}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <p className="font-medium text-slate-800 line-clamp-2">{req.clinicalReason || req.reason}</p>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{durationStr}</span>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 border ${
                            req.status === 'Pending' ? 'bg-amber-50 text-amber-800 border-amber-200 animate-pulse' :
                            req.status === 'Approved' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                            req.status === 'Allocated' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                            req.status === 'In Use' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                            req.status === 'Released' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                            'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {req.status}
                          </span>
                          {req.allocatedResourceDetails?.assetTag && (
                            <span className="block text-[10px] font-mono text-purple-700 mt-1">
                              Tag: {req.allocatedResourceDetails.assetTag}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {/* STEP 4: APPROVE / REJECT */}
                          {(req.status === 'Pending' || req.status === 'Requested') && (
                            <>
                              <button
                                onClick={() => handleApprove(req._id, req.resourceType, req.quantity)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer text-white ${
                                  hasEnoughStock ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-400 hover:bg-slate-500'
                                }`}
                                title={hasEnoughStock ? `Stock Available (${currentAvail}) - Click to Approve` : `Low Stock: Only ${currentAvail} available`}
                              >
                                Approve ({currentAvail} Avail)
                              </button>
                              <button
                                onClick={() => handleReject(req._id)}
                                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {/* STEP 5: ALLOCATE */}
                          {req.status === 'Approved' && (
                            <button
                              onClick={() => {
                                setAllocateModal({ isOpen: true, req });
                                setAllocateDetails({
                                  assetTag: `TAG-${req.resourceType.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
                                  serialNumber: `SN-${Math.floor(100000 + Math.random() * 900000)}`,
                                  deviceModel: stockItem?.itemName || req.resourceType,
                                  notes: `Allocated to ${patName} in ${ward} (${bed})`
                                });
                              }}
                              className="px-2.5 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
                            >
                              Allocate Resource &rarr;
                            </button>
                          )}

                          {/* STEP 6: CONFIRM IN USE */}
                          {req.status === 'Allocated' && (
                            <button
                              onClick={() => handleConfirmInUse(req._id, patName)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
                            >
                              Confirm In Use &rarr;
                            </button>
                          )}

                          {/* STEP 7: RELEASE */}
                          {req.status === 'In Use' && (
                            <button
                              onClick={() => handleRelease(req._id, patName)}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-xs transition cursor-pointer"
                            >
                              Release Asset
                            </button>
                          )}

                          {req.status === 'Released' && (
                            <span className="text-[11px] font-bold text-slate-400">Archived</span>
                          )}

                          {req.status === 'Rejected' && (
                            <span className="text-[11px] font-bold text-rose-500">Rejected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-bold text-slate-600">
              <div>
                Showing <span className="text-slate-900 font-black">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-slate-900 font-black">{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of <span className="text-slate-900 font-black">{filteredRequests.length}</span> requests
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-md border text-xs font-black transition-all cursor-pointer ${
                      currentPage === p
                        ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Active Deployments & Asset Tracking */}
      {selectedTab === 'in-use' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeDeployments.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 text-slate-300">devices_other</span>
              <p className="font-bold text-slate-600">No active equipment deployed right now.</p>
            </div>
          ) : (
            activeDeployments.map(item => (
              <div key={item._id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 uppercase">
                      {item.resourceType}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 mt-1">{item.patientName}</h3>
                    <p className="text-[11px] text-slate-500 font-mono">ID: {item.patientCustomId || 'PX-100'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    item.status === 'In Use' ? 'bg-emerald-100 text-emerald-800 animate-pulse' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {item.status}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ward & Bed:</span>
                    <span className="font-bold text-slate-800">{item.ward || 'General'} • {item.bedNumber || 'Bed A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Asset Tag:</span>
                    <span className="font-mono font-bold text-purple-700">{item.allocatedResourceDetails?.assetTag || 'TAG-ACTIVE'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Serial No:</span>
                    <span className="font-mono text-slate-600">{item.allocatedResourceDetails?.serialNumber || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Allocated At:</span>
                    <span className="font-medium text-slate-700">{item.allocatedAt ? new Date(item.allocatedAt).toLocaleDateString() : 'Today'}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {item.status === 'Allocated' && (
                    <button
                      onClick={() => handleConfirmInUse(item._id, item.patientName)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">check</span>
                      <span>Confirm In Use</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleRelease(item._id, item.patientName)}
                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">restart_alt</span>
                    <span>Release Asset</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: Live Stock Matrix */}
      {selectedTab === 'inventory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Hospital Live Stock Matrix</h2>
            <span className="text-xs text-slate-500 font-semibold">{inventory.length} Catalogued Items</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Resource ID & Name</th>
                  <th className="p-3.5">Resource Type</th>
                  <th className="p-3.5">Total Qty</th>
                  <th className="p-3.5">Available</th>
                  <th className="p-3.5">Allocated</th>
                  <th className="p-3.5">In Active Use</th>
                  <th className="p-3.5">Maintenance</th>
                  <th className="p-3.5">Condition & Ward</th>
                  <th className="p-3.5">Supplier</th>
                  <th className="p-3.5">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map(item => {
                  const avail = item.availableQuantity !== undefined ? item.availableQuantity : item.quantity;
                  const allocated = item.allocatedQuantity || 0;
                  const inUse = item.inUseQuantity || 0;
                  const maint = item.maintenanceQuantity || 0;

                  return (
                    <tr key={item._id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <span className="font-mono text-purple-700 font-bold text-[10px] block">{item.resourceId || 'EQ-STORE'}</span>
                        <span className="font-bold text-slate-900 block">{item.itemName}</span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-700">{item.resourceType || 'Equipment'}</td>
                      <td className="p-3.5 font-bold text-slate-800">{item.quantity}</td>
                      <td className="p-3.5 font-black text-emerald-600">{avail}</td>
                      <td className="p-3.5 font-bold text-purple-700">{allocated}</td>
                      <td className="p-3.5 font-bold text-blue-700">{inUse}</td>
                      <td className="p-3.5 font-bold text-slate-500">{maint}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-slate-800 block">{item.condition || 'Good'}</span>
                        <span className="text-[10px] text-slate-400">{item.locationWard || 'Central Store'}</span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-700 block">{item.supplierName || 'Internal BioMed'}</span>
                        <span className="text-[10px] text-slate-400">{item.supplierContact || ''}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'In Stock' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'Low Stock' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {item.status}
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

      {/* TAB 4: Suppliers */}
      {selectedTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">Registered Suppliers & Procurement Directory</h2>
            <button
              onClick={() => setNewSupplierModal(true)}
              className="px-3 py-1.5 bg-purple-700 text-white rounded-lg text-xs font-bold hover:bg-purple-800 transition cursor-pointer"
            >
              + Add New Supplier
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="p-3.5">Supplier Name</th>
                  <th className="p-3.5">Contact Person</th>
                  <th className="p-3.5">Phone & Email</th>
                  <th className="p-3.5">Supply Categories</th>
                  <th className="p-3.5">Address</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {suppliers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      No suppliers registered yet. Click "+ Add New Supplier" to create one.
                    </td>
                  </tr>
                ) : (
                  suppliers.map(sup => (
                    <tr key={sup._id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-bold text-slate-900">{sup.supplierName}</td>
                      <td className="p-3.5 font-medium text-slate-700">{sup.contactPerson || 'Sales Desk'}</td>
                      <td className="p-3.5">
                        <span className="block font-medium text-slate-800">{sup.contactPhone || 'N/A'}</span>
                        <span className="text-[10px] text-slate-400">{sup.contactEmail || ''}</span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(sup.supplyCategories || []).map((cat, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[10px] font-bold border border-purple-200">
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{sup.address || 'N/A'}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          {sup.status || 'Active'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ALLOCATE ASSET */}
      {allocateModal.isOpen && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setAllocateModal({ isOpen: false, req: null })}
        >
          <div 
            className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto w-full max-w-lg"
            style={{ width: '100%', maxWidth: '32rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-purple-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Allocate Physical Asset</h3>
                <p className="text-xs text-purple-200">Requisition: {allocateModal.req?.resourceType} • Patient: {allocateModal.req?.patientName}</p>
              </div>
              <button onClick={() => setAllocateModal({ isOpen: false, req: null })} className="text-purple-200 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleConfirmAllocation} className="p-5 space-y-4 text-sm">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Asset Barcode / Tag *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TAG-VENT-9001"
                  value={allocateDetails.assetTag}
                  onChange={(e) => setAllocateDetails({ ...allocateDetails, assetTag: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono font-bold focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Serial Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SN-VENT-8899"
                    value={allocateDetails.serialNumber}
                    onChange={(e) => setAllocateDetails({ ...allocateDetails, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-mono focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Device Model</label>
                  <input
                    type="text"
                    placeholder="e.g. Medtronic PB980"
                    value={allocateDetails.deviceModel}
                    onChange={(e) => setAllocateDetails({ ...allocateDetails, deviceModel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">Handover / Bedside Notes</label>
                <textarea
                  rows={3}
                  placeholder="Handover instructions for attending staff or biomed technician..."
                  value={allocateDetails.notes}
                  onChange={(e) => setAllocateDetails({ ...allocateDetails, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                ></textarea>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAllocateModal({ isOpen: false, req: null })}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-sm transition cursor-pointer text-sm"
                >
                  Confirm Asset Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW EQUIPMENT (Hospital Admin) */}
      {newItemModal && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setNewItemModal(false)}
        >
          <div 
            className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto w-full max-w-xl"
            style={{ width: '100%', maxWidth: '36rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Add Equipment to Hospital Inventory</h3>
                <p className="text-xs text-slate-400">Catalogue ventilators, monitors, pumps, cylinders & clinical resources</p>
              </div>
              <button onClick={() => setNewItemModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateInventoryItem} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Resource / Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mechanical Ventilator (ICU Grade)"
                    value={newItemData.itemName}
                    onChange={(e) => setNewItemData({ ...newItemData, itemName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:bg-white focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Resource Type *</label>
                  <select
                    value={newItemData.resourceType}
                    onChange={(e) => setNewItemData({ ...newItemData, resourceType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:bg-white focus:border-purple-600 focus:outline-none"
                  >
                    <option value="Ventilator">Ventilator</option>
                    <option value="Oxygen Cylinder">Oxygen Cylinder</option>
                    <option value="Cardiac Monitor">Cardiac Monitor</option>
                    <option value="Infusion Pump">Infusion Pump</option>
                    <option value="Wheelchair">Wheelchair</option>
                    <option value="Defibrillator">Defibrillator</option>
                    <option value="Dialysis Machine">Dialysis Machine</option>
                    <option value="Suction Machine">Suction Machine</option>
                    <option value="Medical Equipment">Medical Equipment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Total Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItemData.quantity}
                    onChange={(e) => setNewItemData({ ...newItemData, quantity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={newItemData.unit}
                    onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Low Stock Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemData.lowStockThreshold}
                    onChange={(e) => setNewItemData({ ...newItemData, lowStockThreshold: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Condition</label>
                  <select
                    value={newItemData.condition}
                    onChange={(e) => setNewItemData({ ...newItemData, condition: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                  >
                    <option value="New">New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Needs Maintenance">Needs Maintenance</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Location / Ward</label>
                  <input
                    type="text"
                    placeholder="e.g. Central Equipment Store"
                    value={newItemData.locationWard}
                    onChange={(e) => setNewItemData({ ...newItemData, locationWard: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Registered Supplier</label>
                  <select
                    value={newItemData.supplierName}
                    onChange={(e) => {
                      const selName = e.target.value;
                      const matchedSup = suppliers.find(s => s.supplierName === selName);
                      setNewItemData({
                        ...newItemData,
                        supplierName: selName,
                        supplierContact: matchedSup?.contactPhone || newItemData.supplierContact,
                        supplierId: matchedSup?._id || ''
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-semibold focus:bg-white focus:border-purple-600 focus:outline-none"
                  >
                    <option value="">-- Select Registered Supplier (Optional) --</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s.supplierName}>
                        {s.supplierName} {s.contactPhone ? `(${s.contactPhone})` : ''}
                      </option>
                    ))}
                    <option value="Custom">Other / New Supplier</option>
                  </select>
                  {newItemData.supplierName === 'Custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom supplier name..."
                      onChange={(e) => setNewItemData({ ...newItemData, supplierName: e.target.value })}
                      className="w-full mt-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-purple-600"
                    />
                  )}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Supplier Contact Phone / Email</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98112 33441"
                    value={newItemData.supplierContact}
                    onChange={(e) => setNewItemData({ ...newItemData, supplierContact: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewItemModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-sm transition cursor-pointer text-xs"
                >
                  Save Equipment & Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD SUPPLIER */}
      {newSupplierModal && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setNewSupplierModal(false)}
        >
          <div 
            className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto w-full max-w-lg"
            style={{ width: '100%', maxWidth: '32rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Register Equipment Supplier</h3>
                <p className="text-xs text-slate-400">Vendor details for medical equipment procurement</p>
              </div>
              <button onClick={() => setNewSupplierModal(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supplier Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Medical Supplies Ltd."
                  value={newSupplierData.supplierName}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, supplierName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 font-bold focus:bg-white focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={newSupplierData.contactPerson}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newSupplierData.contactPhone}
                    onChange={(e) => setNewSupplierData({ ...newSupplierData, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="e.g. orders@medsupplies.in"
                  value={newSupplierData.contactEmail}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, contactEmail: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supply Categories (comma separated)</label>
                <input
                  type="text"
                  placeholder="Ventilator, Oxygen Cylinder, Medical Equipment"
                  value={newSupplierData.supplyCategories}
                  onChange={(e) => setNewSupplierData({ ...newSupplierData, supplyCategories: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:bg-white focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewSupplierModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold shadow-sm transition cursor-pointer text-xs"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: REQUEST DETAILS VIEW */}
      {detailsModal.isOpen && detailsModal.req && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setDetailsModal({ isOpen: false, req: null })}
        >
          <div 
            className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto w-full max-w-lg"
            style={{ width: '100%', maxWidth: '34rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 bg-purple-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold">Resource Requisition Dossier</h3>
                <p className="text-xs text-purple-200">ID: {detailsModal.req.requestId} • Status: {detailsModal.req.status}</p>
              </div>
              <button onClick={() => setDetailsModal({ isOpen: false, req: null })} className="text-purple-200 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Patient Details</span>
                  <span className="font-mono font-bold text-purple-700">{detailsModal.req.patientCustomId}</span>
                </div>
                <h4 className="text-sm font-black text-slate-900">{detailsModal.req.patientName}</h4>
                <p className="text-slate-600 mt-0.5">{detailsModal.req.ward} • Bed {detailsModal.req.bedNumber}</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Resource Requested</span>
                  <span className="font-bold text-slate-900 text-sm block mt-0.5">{detailsModal.req.resourceType}</span>
                  <span className="text-slate-500">Qty: {detailsModal.req.quantity} unit(s)</span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Priority Level</span>
                  <span className="font-bold text-rose-700 text-sm block mt-0.5">{detailsModal.req.priority}</span>
                  <span className="text-slate-500">By: {detailsModal.req.doctorName}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Clinical Justification</span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 font-medium">
                  {detailsModal.req.clinicalReason || detailsModal.req.reason}
                </p>
              </div>

              {detailsModal.req.allocatedResourceDetails?.assetTag && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900">
                  <span className="text-[10px] font-bold uppercase block text-emerald-800">Assigned Physical Asset:</span>
                  <div className="flex justify-between mt-1 font-mono">
                    <span>Tag: <strong>{detailsModal.req.allocatedResourceDetails.assetTag}</strong></span>
                    <span>SN: <strong>{detailsModal.req.allocatedResourceDetails.serialNumber || 'N/A'}</strong></span>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDetailsModal({ isOpen: false, req: null })}
                  className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
