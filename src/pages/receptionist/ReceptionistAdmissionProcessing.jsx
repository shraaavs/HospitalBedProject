import React, { useState, useEffect, useCallback } from 'react';
import Swal from 'sweetalert2';

export default function ReceptionistAdmissionProcessing() {
  const [admissions, setAdmissions] = useState([]);
  const [stats, setStats] = useState({
    awaitingVerification: 0,
    forwardedToBedMgmt: 0,
    bedsAllocated: 0,
    vacantBeds: 0
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    limit: 10
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Verification Modal State
  const [verificationModal, setVerificationModal] = useState({
    isOpen: false,
    request: null,
    emergencyContactVerified: true,
    insuranceOrPaymentVerified: true,
    idVerified: true,
    frontDeskNotes: ''
  });

  // Direct Admission Request Modal state
  const [isDirectModalOpen, setIsDirectModalOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [directForm, setDirectForm] = useState({
    patientId: '',
    wardType: 'General Ward',
    priority: 'Routine',
    admissionReason: '',
    doctorId: '',
    doctorName: '',
    department: 'General Medicine',
    diagnosis: '',
    clinicalNotes: ''
  });

  const fetchAdmissions = useCallback(async (page = 1, status = statusFilter, search = searchQuery) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const token = localStorage.getItem('userToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      });
      if (status && status !== 'All') {
        params.append('status', status);
      }
      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      const res = await fetch(`/api/admission-requests?${params.toString()}`, { headers });
      
      if (!res.ok) {
        throw new Error('Unable to load admission requests from database.');
      }

      const data = await res.json();
      if (data.success || Array.isArray(data.admissions) || Array.isArray(data.requests)) {
        const records = data.admissions || data.requests || [];
        setAdmissions(records);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            currentPage: page,
            totalPages: Math.ceil(records.length / 10) || 1,
            totalRecords: records.length,
            limit: 10
          });
        }
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setAdmissions([]);
      }
    } catch (err) {
      console.error('Error fetching admission data:', err);
      setErrorMsg('Unable to load admission requests. Please try again.');
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  const fetchPatientsAndDoctors = async () => {
    try {
      const token = localStorage.getItem('userToken');
      const headers = { 'Authorization': `Bearer ${token}` };
      const [patRes, docRes] = await Promise.all([
        fetch('/api/patients', { headers }),
        fetch('/api/doctors', { headers })
      ]);
      if (patRes.ok) {
        const data = await patRes.json();
        setPatients(data);
      }
      if (docRes.ok) {
        const docData = await docRes.json();
        setDoctors(docData);
      }
    } catch (err) {
      console.error('Error fetching patients or doctors:', err);
    }
  };

  useEffect(() => {
    fetchAdmissions(1, statusFilter, searchQuery);
    fetchPatientsAndDoctors();
  }, [statusFilter, fetchAdmissions]);

  // Handle Search submit / debounce
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchAdmissions(1, statusFilter, val);
  };

  // Handle Tab Change
  const handleTabChange = (key) => {
    setStatusFilter(key);
    fetchAdmissions(1, key, searchQuery);
  };

  // Handle Page Change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchAdmissions(newPage, statusFilter, searchQuery);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    fetchAdmissions(pagination.currentPage, statusFilter, searchQuery);
    fetchPatientsAndDoctors();
  };

  // Receptionist action: Verify registration details & forward to Bed Management / Admin
  const handleVerifyAndForward = async (e) => {
    e.preventDefault();
    if (!verificationModal.request) return;

    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch(`/api/admission-requests/${verificationModal.request._id}/verify-forward`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emergencyContactVerified: verificationModal.emergencyContactVerified,
          insuranceOrPaymentVerified: verificationModal.insuranceOrPaymentVerified,
          frontDeskNotes: verificationModal.frontDeskNotes
        })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Verified & Forwarded',
          html: `Admission request for <b>${verificationModal.request.patientName}</b> is verified and forwarded to <b>Bed Management</b> for final bed allocation.`,
          confirmButtonColor: '#0066cc'
        });
        setVerificationModal({ isOpen: false, request: null, emergencyContactVerified: true, insuranceOrPaymentVerified: true, idVerified: true, frontDeskNotes: '' });
        fetchAdmissions(pagination.currentPage, statusFilter, searchQuery);
      } else {
        Swal.fire('Error', 'Failed to forward admission request', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    }
  };

  // Submit direct admission requisition
  const handleDirectAdmission = async (e) => {
    e.preventDefault();
    const selPatient = patients.find(p => p._id === directForm.patientId);
    if (!selPatient) {
      return Swal.fire('Error', 'Please select a registered patient from database.', 'warning');
    }

    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch('/api/admission-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: selPatient._id,
          patientName: selPatient.fullName,
          patientCustomId: selPatient.patientId,
          wardType: directForm.wardType,
          requestedWard: directForm.wardType,
          priority: directForm.priority,
          reason: directForm.admissionReason || 'Inpatient Admission Requisition',
          admissionReason: directForm.admissionReason || 'Inpatient Admission Requisition',
          diagnosis: directForm.diagnosis || directForm.admissionReason || 'Clinical Evaluation',
          doctorName: directForm.doctorName || 'Dr. Akshay',
          department: directForm.department || (directForm.wardType.includes('ICU') ? 'ICU' : directForm.wardType.includes('Emergency') ? 'Emergency' : 'General Medicine'),
          clinicalNotes: directForm.clinicalNotes || `Requested by Front-Desk (${localStorage.getItem('userName') || 'Receptionist'})`
        })
      });

      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Admission Request Created',
          html: `Admission details for <b>${selPatient.fullName}</b> saved successfully and synchronized to <b>Doctor & Nurse</b> modules.`,
          confirmButtonColor: '#0066cc'
        });
        setIsDirectModalOpen(false);
        setDirectForm({
          patientId: '',
          wardType: 'General Ward',
          priority: 'Routine',
          admissionReason: '',
          doctorId: '',
          doctorName: '',
          department: 'General Medicine',
          diagnosis: '',
          clinicalNotes: ''
        });
        fetchAdmissions(1, statusFilter, searchQuery);
      } else {
        const err = await res.json();
        Swal.fire('Error', err.message || 'Admission request creation failed', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">domain_add</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Front-Desk Admission Processing</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Verify patient registration & admission requests and forward to authorized Bed Management
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDirectModalOpen(true)}
            className="px-4 py-2 bg-[#0066cc] hover:bg-[#0055b3] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-base">add_box</span> New Admission Request
          </button>
          <button
            onClick={handleRefresh}
            className="p-2 text-slate-500 hover:text-[#0066cc] bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
            title="Refresh list from MongoDB"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {/* Real-time Metrics Header from MongoDB */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">pending_actions</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Awaiting Verification</p>
            <p className="text-xl font-bold text-amber-700">{stats.awaitingVerification}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">forward_to_inbox</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Forwarded to Bed Mgmt</p>
            <p className="text-xl font-bold text-purple-700">{stats.forwardedToBedMgmt}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Beds Allocated</p>
            <p className="text-xl font-bold text-emerald-700">{stats.bedsAllocated}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-2xl">single_bed</span>
          </div>
          <div>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Vacant Beds Available</p>
            <p className="text-xl font-bold text-[#0066cc]">{stats.vacantBeds}</p>
          </div>
        </div>
      </div>

      {/* Requisitions List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'All', label: 'All Requests' },
              { key: 'Pending', label: 'Pending Verification' },
              { key: 'Forwarded', label: 'Forwarded to Bed Mgmt' },
              { key: 'Allocated', label: 'Allocated & Admitted' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.key ? 'bg-[#0066cc] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search patient, ID, doctor..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0066cc]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/75 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">Admission & Patient</th>
                <th className="p-3.5">Doctor & Dept</th>
                <th className="p-3.5">Requested Ward</th>
                <th className="p-3.5">Clinical Reason & Notes</th>
                <th className="p-3.5">Admission Status</th>
                <th className="p-3.5 text-right">Front-Desk Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400">Loading admission records from database...</td>
                </tr>
              ) : errorMsg ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center">
                    <p className="text-red-600 font-semibold mb-2">{errorMsg}</p>
                    <button
                      onClick={handleRefresh}
                      className="px-3 py-1.5 bg-[#0066cc] text-white rounded-lg text-xs font-bold hover:bg-[#0055b3]"
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : admissions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-400 font-medium">No admission requests found.</td>
                </tr>
              ) : (
                admissions.map(r => {
                  const isPending = r.status === 'Pending Verification' || r.status === 'Pending Approval' || r.status === 'Pending';
                  const isForwarded = r.status === 'Forwarded to Bed Management';
                  const isAllocated = r.status === 'Allocated' || r.status === 'Bed Allocated' || r.status === 'Approved';

                  return (
                    <tr key={r._id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">{r.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {r.patientCustomId || 'Patient'} {r.admissionId && <span className="ml-1 text-[#0066cc] font-semibold">({r.admissionId})</span>}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{r.doctorName || 'Doctor'}</div>
                        <div className="text-[11px] text-slate-500">{r.department || r.doctorDepartment || 'General'}</div>
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-full font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {r.requestedWard || r.wardType || r.requiredWardType || 'General Ward'}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="truncate font-medium text-slate-800">{r.admissionReason || r.reason || r.medicalReason}</div>
                        {r.priority && (
                          <span className={`text-[10px] font-bold ${
                            r.priority.includes('Emergency') || r.priority === 'Urgent' ? 'text-red-600' : 'text-slate-500'
                          }`}>
                            Priority: {r.priority}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isPending ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          isForwarded ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {isAllocated ? `Allocated: ${r.allocatedBedNumber || (r.bedId && r.bedId.bedNumber) || 'Bed Assigned'}` : r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {isPending ? (
                          <button
                            onClick={() => setVerificationModal({
                              isOpen: true,
                              request: r,
                              emergencyContactVerified: true,
                              insuranceOrPaymentVerified: true,
                              idVerified: true,
                              frontDeskNotes: ''
                            })}
                            className="px-3 py-1.5 bg-[#0066cc] hover:bg-[#0055b3] text-white rounded-lg font-bold text-xs shadow-xs transition-colors inline-flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">verified_user</span> Verify & Forward
                          </button>
                        ) : isForwarded ? (
                          <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">
                            Awaiting Bed Manager
                          </span>
                        ) : (
                          <span className="text-[11px] text-green-700 font-semibold bg-green-50 px-2 py-1 rounded-lg border border-green-100">
                            Bed {r.allocatedBedNumber || (r.bedId && r.bedId.bedNumber) || 'Assigned'} Active
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Showing {admissions.length > 0 ? ((pagination.currentPage - 1) * pagination.limit + 1) : 0} to{' '}
            {Math.min(pagination.currentPage * pagination.limit, pagination.totalRecords)} of {pagination.totalRecords} admission records
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage <= 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors"
              >
                Previous
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    pagination.currentPage === page
                      ? 'bg-[#0066cc] text-white'
                      : 'border border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= pagination.totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Verification & Forwarding Modal */}
      {verificationModal.isOpen && verificationModal.request && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setVerificationModal({ ...verificationModal, isOpen: false })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '34rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#0066cc] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-2xl">verified_user</span>
                <h3 className="font-bold text-white text-base">Verify & Forward Admission Request</h3>
              </div>
              <button 
                type="button"
                onClick={() => setVerificationModal({ ...verificationModal, isOpen: false })} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleVerifyAndForward} className="p-6 space-y-4">
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-100 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Patient:</span>
                  <strong className="text-slate-800">{verificationModal.request.patientName} ({verificationModal.request.patientCustomId})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Recommending Doctor:</span>
                  <strong className="text-[#0066cc]">{verificationModal.request.doctorName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Ward Type:</span>
                  <strong className="text-slate-800">{verificationModal.request.requestedWard || verificationModal.request.wardType || verificationModal.request.requiredWardType}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Medical Reason:</span>
                  <span className="text-slate-700 font-medium">{verificationModal.request.admissionReason || verificationModal.request.reason || verificationModal.request.medicalReason}</span>
                </div>
              </div>

              {/* Administrative Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Front-Desk Administrative Checklist
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationModal.idVerified}
                    onChange={(e) => setVerificationModal({ ...verificationModal, idVerified: e.target.checked })}
                    className="w-4 h-4 text-[#0066cc] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-700">Patient Government ID & Registration Verified</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationModal.emergencyContactVerified}
                    onChange={(e) => setVerificationModal({ ...verificationModal, emergencyContactVerified: e.target.checked })}
                    className="w-4 h-4 text-[#0066cc] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-700">Emergency Attendant / Contact Number Confirmed</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verificationModal.insuranceOrPaymentVerified}
                    onChange={(e) => setVerificationModal({ ...verificationModal, insuranceOrPaymentVerified: e.target.checked })}
                    className="w-4 h-4 text-[#0066cc] rounded focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-700">Insurance Pre-Auth / Inpatient Billing Formalities Initiated</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Reception Notes for Bed Management (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Patient arriving via wheelchair; attendant present..."
                  value={verificationModal.frontDeskNotes}
                  onChange={(e) => setVerificationModal({ ...verificationModal, frontDeskNotes: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                ></textarea>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-amber-600">info</span>
                <span>Actual bed allocation is performed by authorized Bed Management upon request receipt.</span>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setVerificationModal({ ...verificationModal, isOpen: false })}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0066cc] text-white text-xs font-bold rounded-lg hover:bg-[#0055b3] transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">send</span> Confirm & Forward to Bed Mgmt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Admission Modal */}
      {isDirectModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setIsDirectModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '32rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#0066cc] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-2xl">domain_add</span>
                <h3 className="font-bold text-white text-base">New Inpatient Admission Request</h3>
              </div>
              <button 
                type="button"
                onClick={() => setIsDirectModalOpen(false)} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleDirectAdmission} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Select Registered Patient *</label>
                <select
                  required
                  value={directForm.patientId}
                  onChange={(e) => setDirectForm({ ...directForm, patientId: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                >
                  <option value="">-- Choose Registered Patient --</option>
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName} ({p.patientId}) - {p.phone}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Required Ward Type *</label>
                  <select
                    value={directForm.wardType}
                    onChange={(e) => setDirectForm({ ...directForm, wardType: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  >
                    <option value="General Ward">General Ward</option>
                    <option value="Special Ward">Special Ward</option>
                    <option value="ICU">ICU (Intensive Care)</option>
                    <option value="Emergency Ward">Emergency Ward</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Priority</label>
                  <select
                    value={directForm.priority}
                    onChange={(e) => setDirectForm({ ...directForm, priority: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Emergency / High">Emergency / High</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Attending Doctor</label>
                  <select
                    value={directForm.doctorName}
                    onChange={(e) => {
                      const doc = doctors.find(d => d.name === e.target.value);
                      setDirectForm({
                        ...directForm,
                        doctorName: e.target.value,
                        doctorId: doc?._id || '',
                        department: doc?.department || directForm.department
                      });
                    }}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  >
                    <option value="">-- Auto-Assign / Dr. Akshay --</option>
                    {doctors.map(d => (
                      <option key={d._id} value={d.name}>{d.name} ({d.department})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Department</label>
                  <input
                    type="text"
                    placeholder="e.g. Emergency, Cardiology, General"
                    value={directForm.department}
                    onChange={(e) => setDirectForm({ ...directForm, department: e.target.value })}
                    className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Admission Indication / Reason *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Primary clinical diagnosis or reason for admission (e.g., Viral Fever, Acute Bronchitis)..."
                  value={directForm.admissionReason}
                  onChange={(e) => setDirectForm({ ...directForm, admissionReason: e.target.value, diagnosis: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDirectModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0066cc] text-white text-xs font-bold rounded-lg hover:bg-[#0055b3] transition-colors shadow-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  Submit & Sync to Doctor & Nurse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


