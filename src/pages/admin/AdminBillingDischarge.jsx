import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

// Number to Words Helper for Indian Rupees
function numberToWords(num) {
  if (!num || isNaN(num) || num === 0) return 'Zero';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  }
  return inWords(Math.round(num)).trim();
}

export default function AdminBillingDischarge() {
  const [discharges, setDischarges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDischarge, setSelectedDischarge] = useState(null);
  const [caseDossier, setCaseDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal States
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Billing Actions
  const [discountAmount, setDiscountAmount] = useState(0);
  const [generatingBill, setGeneratingBill] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI / Online');
  const [payNotes, setPayNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [finalizingDischarge, setFinalizingDischarge] = useState(false);

  const token = localStorage.getItem('userToken') || localStorage.getItem('token');

  const fetchDischarges = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/discharges?type=Discharge&limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data?.discharges || (Array.isArray(res.data) ? res.data : []);
      setDischarges(data);

      if (data.length > 0) {
        if (!selectedDischarge) {
          handleSelectDischarge(data[0]);
        } else {
          const refreshed = data.find(d => d._id === selectedDischarge._id);
          if (refreshed) handleSelectDischarge(refreshed);
        }
      }
    } catch (err) {
      console.error('Error fetching billing & discharges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDischarges();
  }, []);

  const handleSelectDischarge = async (order) => {
    setSelectedDischarge(order);
    try {
      setDossierLoading(true);
      const res = await axios.get(`/api/discharges/${order._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseDossier(res.data);
      if (res.data?.existingBill) {
        setPayAmount(res.data.existingBill.remainingAmount > 0 ? res.data.existingBill.remainingAmount : '');
      } else if (res.data?.calculation) {
        setPayAmount(res.data.calculation.grandTotal || '');
      }
    } catch (err) {
      console.error('Error fetching case dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!caseDossier?.patient || !selectedDischarge) return;
    try {
      setGeneratingBill(true);
      const payload = {
        patientId: caseDossier.patient._id,
        patientCustomId: caseDossier.patient.patientId,
        transferDischargeId: selectedDischarge._id,
        discount: Number(discountAmount) || 0
      };

      const res = await axios.post('/api/discharge-bills/bills', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Invoice Generated & Stored',
          text: `Bill ${res.data.bill.billNumber} created with full line-item charges and stored in MongoDB.`,
          timer: 1800,
          showConfirmButton: false
        });
        handleSelectDischarge(selectedDischarge);
        fetchDischarges();
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to generate bill', 'error');
    } finally {
      setGeneratingBill(false);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const bill = caseDossier?.existingBill;
    if (!bill?._id) {
      Swal.fire('Warning', 'Please generate the official discharge bill before recording payment.', 'warning');
      return;
    }

    try {
      setProcessingPayment(true);
      const res = await axios.post(`/api/discharge-bills/bills/${bill._id}/pay`, {
        amount: Number(payAmount),
        paymentMethod: payMethod,
        notes: payNotes || 'Settled at Administration Billing Desk'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Confirmed',
          text: `Payment of ₹${Number(payAmount).toLocaleString()} recorded. Bill Status: ${res.data.bill.paymentStatus}.`,
          timer: 1600,
          showConfirmButton: false
        });
        setShowPaymentModal(false);
        setPayNotes('');
        handleSelectDischarge(selectedDischarge);
        fetchDischarges();
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Failed to record payment', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleFinalizeAndRelease = async () => {
    if (!selectedDischarge) return;
    const bill = caseDossier?.existingBill;

    if (!bill) {
      Swal.fire({
        icon: 'warning',
        title: 'Bill Required',
        text: 'You must generate the patient invoice before finalizing discharge.'
      });
      return;
    }

    const confirm = await Swal.fire({
      title: 'Complete Discharge & Release Resources?',
      html: `
        <div class="text-left text-xs space-y-2">
          <p>Confirming final administrative exit for <b>${selectedDischarge.patientName}</b> (${selectedDischarge.patientCustomId}):</p>
          <ul class="list-disc pl-4 space-y-1 text-slate-700">
            <li>Patient status changes to <b>Discharged</b>.</li>
            <li>Bed <b>${selectedDischarge.currentBedNumber || 'GW-Bed'}</b> is automatically freed and marked <b>Available</b>.</li>
            <li>All allocated oxygen, ventilators, and pumps are returned to <b>Available</b> stock.</li>
          </ul>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      confirmButtonText: 'Yes, Finalize & Release Bed'
    });

    if (confirm.isConfirmed) {
      try {
        setFinalizingDischarge(true);
        const res = await axios.post(`/api/discharges/${selectedDischarge._id}/complete`, {
          administrativeNotes: 'Discharge finalized by Hospital Administrator. Bed & resources automatically released.',
          attendantName: caseDossier?.patient?.emergencyContact?.name || 'Attendant Handover'
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        Swal.fire({
          icon: 'success',
          title: 'Discharge Finalized & Bed Released!',
          html: `Patient <b>${selectedDischarge.patientName}</b> is officially discharged.<br/>Bed <b>${res.data.releasedBedNumber || selectedDischarge.currentBedNumber}</b> has been returned to available inventory.`,
          confirmButtonColor: '#059669'
        });

        handleSelectDischarge(selectedDischarge);
        fetchDischarges();
      } catch (err) {
        Swal.fire('Error', err.response?.data?.message || 'Failed to finalize discharge', 'error');
      } finally {
        setFinalizingDischarge(false);
      }
    }
  };

  const filteredList = discharges.filter(d => {
    if (statusFilter !== 'All' && d.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = d.patientName?.toLowerCase().includes(q);
      const matchPid = d.patientCustomId?.toLowerCase().includes(q);
      const matchDoc = d.doctorName?.toLowerCase().includes(q);
      const matchWard = d.currentWard?.toLowerCase().includes(q);
      return matchName || matchPid || matchDoc || matchWard;
    }
    return true;
  });

  const activeBill = caseDossier?.existingBill;
  const calc = caseDossier?.calculation;
  const displayBill = activeBill || calc;

  return (
    <div className="w-full flex flex-col space-y-5 pb-12">
      
      {/* 1. Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-2xl shadow-xs">
            💰
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Inpatient Billing, Discharge & Settlements</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
                {discharges.length} Inpatients & Discharges
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Itemized Bed, Medication, Resource & Doctor Fee Accounting for Admitted & Discharged Patients
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchDischarges}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 transition-colors flex items-center gap-1 text-xs font-bold px-3"
          >
            <span className="material-symbols-outlined text-base">refresh</span> Live Refresh
          </button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xl">
            🛏️
          </div>
          <div>
            <span className="text-xl font-black text-slate-800 block">
              {discharges.filter(d => d.status !== 'Completed' && d.status !== 'Final Discharge Completed').length}
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Admitted Inpatients</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-xl">
            ✅
          </div>
          <div>
            <span className="text-xl font-black text-emerald-700 block">
              {discharges.filter(d => d.status === 'Completed' || d.status === 'Final Discharge Completed').length}
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Discharged & Settled</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xl">
            ⏳
          </div>
          <div>
            <span className="text-xl font-black text-amber-700 block">
              {discharges.filter(d => !d.billNumber || d.paymentStatus === 'Pending').length}
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Settlement</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-teal-100 shadow-2xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xl">
            🧾
          </div>
          <div>
            <span className="text-xl font-black text-teal-700 block">
              ₹{(discharges.reduce((acc, d) => acc + (d.grandTotal || d.dischargeDetails?.estimatedBillTotal || 8500), 0)).toLocaleString()}
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Inpatient Billing</span>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Patient Name, ID, Attending Doctor, Ward, Bed..."
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            <option value="All">All Inpatients & Discharges</option>
            <option value="Admitted">🛏️ Admitted Inpatients</option>
            <option value="Discharged">✅ Discharged Patients</option>
          </select>
        </div>
      </div>

      {/* 4. Dual-Pane Master Detail Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Discharge Cases Queue (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col max-h-[820px]">
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700 text-sm">receipt_long</span>
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Discharge Registry ({filteredList.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-400">Select to audit bill</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-3xl animate-spin text-emerald-600 mb-2">sync</span>
                <p className="text-xs font-bold">Loading discharge cases...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">folder_open</span>
                <p className="text-xs font-bold text-slate-700">No discharge records found</p>
                <p className="text-[11px] text-slate-400 mt-1">Authorized discharges from doctors will appear here.</p>
              </div>
            ) : (
              filteredList.map((order) => {
                const isSelected = selectedDischarge?._id === order._id;
                const isCompleted = order.status === 'Completed' || order.status === 'Final Discharge Completed';

                return (
                  <div
                    key={order._id}
                    onClick={() => handleSelectDischarge(order)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-emerald-50/70 border-emerald-600 ring-1 ring-emerald-600 shadow-xs'
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {order.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-extrabold text-slate-900 truncate">{order.patientName}</h4>
                          <span className="text-[10px] font-mono text-slate-500">ID: {order.patientCustomId || 'PID-N/A'}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {isCompleted ? '✓ Completed' : order.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-700 font-medium line-clamp-1">
                      {order.dischargeDetails?.dischargeDiagnosis || order.clinicalReason || 'Inpatient Discharge & Settlement'}
                    </p>

                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-teal-600">bed</span>
                        {order.currentWard} • Bed: {order.currentBedNumber || 'Assigned'}
                      </span>
                      <span className="font-medium text-slate-500">
                        👨‍⚕️ {order.doctorName}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Line-Item Itemized Invoice Dossier (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col min-h-[600px] max-h-[820px] overflow-hidden">
          {!selectedDischarge ? (
            <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
              <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">receipt</span>
              <h3 className="text-sm font-extrabold text-slate-700">Select a Discharge Case</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Choose a patient from the left queue to inspect itemized bed, ICU, equipment, medicine, and procedure charges, generate bills, and process payments.
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
              
              {/* Patient Banner */}
              <div className="p-4 bg-emerald-50/70 border-b border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-700 to-teal-800 text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                    {selectedDischarge.patientName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900">{selectedDischarge.patientName}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white text-emerald-900 border border-emerald-200 font-mono">
                        {selectedDischarge.patientCustomId}
                      </span>
                      {activeBill && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                          {activeBill.billNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Ward: <strong>{selectedDischarge.currentWard}</strong> • Bed: <strong>{selectedDischarge.currentBedNumber}</strong> • Attending: <strong>{selectedDischarge.doctorName}</strong>
                    </p>
                  </div>
                </div>

                {/* Printable Bill Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowBillModal(true)}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">print</span> Print Invoice
                  </button>
                </div>
              </div>

              {/* Comprehensive Itemized Billing Table */}
              <div className="p-5 space-y-4">
                
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-emerald-700">inventory_2</span>
                    Itemized Medical & Facility Charges
                  </h4>
                  <span className="text-[11px] font-bold text-slate-500">
                    Length of Stay: <strong className="text-slate-800">{displayBill?.admissionDetailsSnapshot?.lengthOfStayDays || displayBill?.lengthOfStayDays || 1} Day(s)</strong>
                  </span>
                </div>

                {/* Line Item Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="px-3.5 py-2.5">Service Description / Resource</th>
                        <th className="px-3.5 py-2.5">Qty / Duration</th>
                        <th className="px-3.5 py-2.5">Unit Rate</th>
                        <th className="px-3.5 py-2.5 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      
                      {/* 1. Bed & Room Charges */}
                      {displayBill?.bedCharges && (
                        <tr className="hover:bg-slate-50">
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-slate-900 block">Bed & Nursing Accommodation ({displayBill.bedCharges.wardType})</span>
                            <span className="text-[10px] text-slate-400">Bed Number: {displayBill.bedCharges.bedNumber}</span>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium">{displayBill.bedCharges.days} Day(s)</td>
                          <td className="px-3.5 py-2.5">₹{displayBill.bedCharges.dailyRate?.toLocaleString()} / day</td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-800">₹{displayBill.bedCharges.total?.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* 2. Consultation Charges */}
                      {displayBill?.consultationCharges?.map((c, i) => (
                        <tr key={`c-${i}`} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-slate-900 block">{c.serviceName}</span>
                            <span className="text-[10px] text-slate-400">{c.doctorName} ({c.department})</span>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium">{c.quantity} Visit(s)</td>
                          <td className="px-3.5 py-2.5">₹{c.rate?.toLocaleString()} / visit</td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-800">₹{c.total?.toLocaleString()}</td>
                        </tr>
                      ))}

                      {/* 3. Resource Usage Charges (Ventilators, Oxygen, Monitors) */}
                      {displayBill?.resourceCharges?.map((r, i) => (
                        <tr key={`r-${i}`} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-slate-900 block">🧰 {r.resourceName}</span>
                            <span className="text-[10px] text-slate-400">Asset Tag: {r.resourceId || 'Standard Unit'}</span>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium">{r.durationDays || r.quantity} {r.billingUnit || 'Day(s)'}</td>
                          <td className="px-3.5 py-2.5">₹{r.rate?.toLocaleString()}</td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-800">₹{r.total?.toLocaleString()}</td>
                        </tr>
                      ))}

                      {/* 4. Medicines & Pharmacy */}
                      {displayBill?.medicineCharges?.map((m, i) => (
                        <tr key={`m-${i}`} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-slate-900 block">💊 {m.medicineName}</span>
                            <span className="text-[10px] text-slate-400">{m.dosage || 'Prescribed Course'}</span>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium">{m.quantity} Unit(s)</td>
                          <td className="px-3.5 py-2.5">₹{m.unitPrice}</td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-800">₹{m.total?.toLocaleString()}</td>
                        </tr>
                      ))}

                      {/* 5. Diagnostics & Lab */}
                      {displayBill?.diagnosticCharges?.map((d, i) => (
                        <tr key={`d-${i}`} className="hover:bg-slate-50">
                          <td className="px-3.5 py-2.5">
                            <span className="font-bold text-slate-900 block">🔬 {d.testName}</span>
                            <span className="text-[10px] text-slate-400">Clinical Pathology / Radiology</span>
                          </td>
                          <td className="px-3.5 py-2.5 font-medium">{d.quantity} Test</td>
                          <td className="px-3.5 py-2.5">₹{d.rate?.toLocaleString()}</td>
                          <td className="px-3.5 py-2.5 text-right font-bold text-slate-800">₹{d.total?.toLocaleString()}</td>
                        </tr>
                      ))}

                    </tbody>
                  </table>
                </div>

                {/* Financial Summary Breakdown Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Gross Subtotal (All Medical Services):</span>
                    <span className="font-bold text-slate-800">₹{(displayBill?.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Applicable Hospital Tax / GST (5%):</span>
                    <span className="font-bold text-slate-800">₹{(displayBill?.tax || 0).toLocaleString()}</span>
                  </div>
                  {displayBill?.discount > 0 && (
                    <div className="flex justify-between text-xs text-emerald-700">
                      <span>Concession / Insurance Discount:</span>
                      <span className="font-bold">-₹{(displayBill.discount).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                    <span className="font-black text-slate-900">Final Bill Total:</span>
                    <span className="font-black text-emerald-800 text-base">₹{(displayBill?.grandTotal || 0).toLocaleString()}</span>
                  </div>

                  {activeBill && (
                    <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Amount Paid</span>
                        <span className="font-black text-emerald-700 text-sm">₹{(activeBill.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Balance Due</span>
                        <span className={`font-black text-sm ${activeBill.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          ₹{(activeBill.remainingAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">Settlement Status</span>
                        <span className={`font-black text-xs block mt-0.5 ${
                          activeBill.paymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          {activeBill.paymentStatus || 'Pending'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Administrative Workflow Action Bar */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Discharge & Billing Administrative Actions
                  </h4>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* 1. Generate Bill Button */}
                    {!activeBill && (
                      <button
                        type="button"
                        onClick={handleGenerateBill}
                        disabled={generatingBill}
                        className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">post_add</span>
                        {generatingBill ? 'Compiling Bill...' : 'Generate Official Invoice'}
                      </button>
                    )}

                    {/* 2. Record Payment Button */}
                    {activeBill && activeBill.paymentStatus !== 'Paid' && (
                      <button
                        type="button"
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">paid</span>
                        Record Payment Transaction
                      </button>
                    )}

                    {/* 3. Finalize Discharge & Release Bed Button */}
                    {selectedDischarge.status !== 'Completed' && selectedDischarge.status !== 'Final Discharge Completed' && (
                      <button
                        type="button"
                        onClick={handleFinalizeAndRelease}
                        disabled={finalizingDischarge}
                        className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all ml-auto"
                      >
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        {finalizingDischarge ? 'Releasing Bed...' : 'Finalize Discharge & Release Bed'}
                      </button>
                    )}

                    {selectedDischarge.status === 'Completed' && (
                      <div className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto">
                        <span className="material-symbols-outlined text-base">verified</span>
                        Discharged & Bed Returned to Inventory
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>

      {/* PAYMENT TRANSACTION MODAL */}
      {showPaymentModal && activeBill && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">payments</span>
                <h3 className="text-base font-black text-slate-900">Record Payment: {activeBill.billNumber}</h3>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Total Balance Remaining:</span>
                <span className="text-sm font-black text-rose-600">₹{(activeBill.remainingAmount || 0).toLocaleString()}</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Payment Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={activeBill.remainingAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Payment Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold"
                >
                  <option value="UPI / Online">UPI / Online / QR</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash Settlement</option>
                  <option value="Insurance / TPA">Insurance / TPA Claim</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 uppercase text-[10px]">Transaction Notes / Cheque / Ref</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="e.g. UPI Ref #49281920"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold shadow-xs flex items-center gap-1"
                >
                  {processingPayment ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL PRINTABLE INVOICE MODAL */}
      {showBillModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl border border-slate-200 my-8">
            
            {/* Action Top Bar */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold uppercase text-slate-500">Official Hospital Tax Invoice</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">print</span> Print
                </button>
                <button
                  onClick={() => setShowBillModal(false)}
                  className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="space-y-6 pt-4 text-xs font-sans text-slate-800">
              
              {/* Hospital Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">MEDIFLOW MULTISPECIALTY HOSPITAL</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">NABH & JCI Accredited Tertiary Care Healthcare Network</p>
                  <p className="text-[10px] text-slate-400">100 Feet Ring Road, Healthcare City • Emergency Ph: +91 80 4000 9999</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-bold rounded-lg text-xs font-mono block">
                    {displayBill?.billNumber || 'INVOICE-PREVIEW'}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Date: {new Date().toLocaleDateString()}</span>
                </div>
              </div>

              {/* Patient & Admission Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-[11px]">
                <div className="space-y-1">
                  <p><strong>Patient Name:</strong> {selectedDischarge.patientName}</p>
                  <p><strong>Patient ID:</strong> {selectedDischarge.patientCustomId}</p>
                  <p><strong>Admission ID:</strong> {displayBill?.admissionId || 'ADM-RECORD'}</p>
                  <p><strong>Attending Doctor:</strong> {selectedDischarge.doctorName} ({selectedDischarge.doctorDepartment})</p>
                </div>
                <div className="space-y-1">
                  <p><strong>Ward / Room:</strong> {selectedDischarge.currentWard} (Bed: {selectedDischarge.currentBedNumber})</p>
                  <p><strong>Length of Stay:</strong> {displayBill?.admissionDetailsSnapshot?.lengthOfStayDays || displayBill?.lengthOfStayDays || 1} Day(s)</p>
                  <p><strong>Diagnosis:</strong> {selectedDischarge.dischargeDetails?.dischargeDiagnosis || 'Clinical Recovery'}</p>
                  <p><strong>Payment Status:</strong> <strong className="text-emerald-700">{activeBill?.paymentStatus || 'Settled'}</strong></p>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-800 text-[10px] font-black uppercase text-slate-600">
                    <th className="py-2">Description</th>
                    <th className="py-2">Quantity</th>
                    <th className="py-2">Rate (₹)</th>
                    <th className="py-2 text-right">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {displayBill?.bedCharges && (
                    <tr>
                      <td className="py-2 font-semibold">Bed & Facility Accommodation ({displayBill.bedCharges.wardType})</td>
                      <td className="py-2">{displayBill.bedCharges.days} Day(s)</td>
                      <td className="py-2">₹{displayBill.bedCharges.dailyRate?.toLocaleString()}</td>
                      <td className="py-2 text-right font-bold">₹{displayBill.bedCharges.total?.toLocaleString()}</td>
                    </tr>
                  )}
                  {displayBill?.consultationCharges?.map((c, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold">{c.serviceName}</td>
                      <td className="py-2">{c.quantity}</td>
                      <td className="py-2">₹{c.rate?.toLocaleString()}</td>
                      <td className="py-2 text-right font-bold">₹{c.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {displayBill?.resourceCharges?.map((r, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold">🧰 {r.resourceName} ({r.resourceId || 'Unit'})</td>
                      <td className="py-2">{r.durationDays || r.quantity}</td>
                      <td className="py-2">₹{r.rate?.toLocaleString()}</td>
                      <td className="py-2 text-right font-bold">₹{r.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {displayBill?.medicineCharges?.map((m, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold">💊 {m.medicineName}</td>
                      <td className="py-2">{m.quantity}</td>
                      <td className="py-2">₹{m.unitPrice}</td>
                      <td className="py-2 text-right font-bold">₹{m.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                  {displayBill?.diagnosticCharges?.map((d, idx) => (
                    <tr key={idx}>
                      <td className="py-2 font-semibold">🔬 {d.testName}</td>
                      <td className="py-2">{d.quantity}</td>
                      <td className="py-2">₹{d.rate?.toLocaleString()}</td>
                      <td className="py-2 text-right font-bold">₹{d.total?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Box */}
              <div className="border-t-2 border-slate-800 pt-3 flex justify-between items-start">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase">Amount in Words:</p>
                  <p className="font-bold text-slate-800 italic">Rupees {numberToWords(displayBill?.grandTotal || 0)} Only</p>
                </div>
                <div className="w-64 space-y-1 text-right text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-bold">₹{(displayBill?.subtotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tax / GST (5%):</span>
                    <span className="font-bold">₹{(displayBill?.tax || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black border-t border-slate-300 pt-1 text-slate-900">
                    <span>Grand Total:</span>
                    <span className="text-emerald-800">₹{(displayBill?.grandTotal || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-10 flex justify-between text-center text-[10px] text-slate-400">
                <div className="border-t border-slate-300 w-40 pt-1">
                  Patient / Attendant Signature
                </div>
                <div className="border-t border-slate-300 w-40 pt-1">
                  Billing Officer / Accounts
                </div>
                <div className="border-t border-slate-300 w-40 pt-1">
                  Medical Superintendent
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
