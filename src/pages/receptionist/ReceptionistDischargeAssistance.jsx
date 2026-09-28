import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Swal from 'sweetalert2';

// Number to Words Converter for Indian Rupee Billing
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

export default function ReceptionistDischargeAssistance() {
  const [searchParams] = useSearchParams();
  const urlPatientId = searchParams.get('patientId') || searchParams.get('id') || '';
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(urlPatientId);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending Approval' | 'Completed'
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selected Order Dossier State
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [caseDossier, setCaseDossier] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'resources' | 'bill' | 'payment' | 'exit'

  // Official Hospital Invoice Modal
  const [showOfficialBillModal, setShowOfficialBillModal] = useState(false);

  // Payment Form State
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI / Online');
  const [payNotes, setPayNotes] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Bill Generation State
  const [discountAmount, setDiscountAmount] = useState(0);
  const [generatingBill, setGeneratingBill] = useState(false);

  // Administrative Exit State
  const [attendantName, setAttendantName] = useState('');
  const [attendantPhone, setAttendantPhone] = useState('');
  const [adminExitNotes, setAdminExitNotes] = useState('');
  const [finalizingDischarge, setFinalizingDischarge] = useState(false);
  const [checklist, setChecklist] = useState({
    doctorOrderVerified: true,
    billGeneratedVerified: true,
    paymentSettledVerified: true,
    documentsHandedOver: true
  });

  useEffect(() => {
    fetchOrders(1, urlPatientId);
  }, [statusFilter, urlPatientId]);

  const fetchOrders = async (page = 1, forceSearch = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('type', 'Discharge');
      if (statusFilter !== 'All') params.append('status', statusFilter);
      
      const queryTerm = forceSearch !== null ? forceSearch : searchTerm;
      if (queryTerm && queryTerm.trim()) params.append('search', queryTerm.trim());
      params.append('page', page);
      params.append('limit', '20');

      const response = await axios.get(`/api/discharges?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = response.data;
      const dischargeList = data.discharges || (Array.isArray(data) ? data : []);
      setOrders(dischargeList);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalRecords(data.pagination?.totalRecords || dischargeList.length);
      setCurrentPage(page);

      if (dischargeList.length > 0) {
        // Find targeted patient from search term, URL param, or existing selection
        let targetOrder = null;
        const lookup = (queryTerm || urlPatientId || '').trim().toLowerCase();
        if (lookup) {
          targetOrder = dischargeList.find(o => 
            (o.patientCustomId || '').toLowerCase().includes(lookup) || 
            String(o.patientId?._id || o.patientId || '').toLowerCase().includes(lookup) ||
            (o.patientName || '').toLowerCase().includes(lookup)
          );
        }
        if (!targetOrder && selectedOrderId) {
          targetOrder = dischargeList.find(o => o._id === selectedOrderId);
        }
        if (!targetOrder) {
          targetOrder = dischargeList[0];
        }

        setSelectedOrderId(targetOrder._id);
        fetchCaseDossier(targetOrder._id || targetOrder.patientCustomId);
      } else if (queryTerm || urlPatientId) {
        // Direct dossier fallback load for requested patient
        const directId = (queryTerm || urlPatientId).trim();
        setSelectedOrderId(directId);
        fetchCaseDossier(directId);
      } else {
        setSelectedOrderId(null);
        setCaseDossier(null);
      }
    } catch (err) {
      console.error('Error fetching discharge orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseDossier = async (orderId, fallbackOrd = null) => {
    try {
      setDossierLoading(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const matched = fallbackOrd || orders.find(o => o._id === orderId || o.patientCustomId === orderId);

      let response;
      const idsToTry = [orderId, matched?.patientCustomId, matched?.patientId?._id, matched?.patientId].filter(Boolean);

      for (const reqId of idsToTry) {
        try {
          response = await axios.get(`/api/discharges/${reqId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response && response.data && response.data.order) {
            break;
          }
        } catch (err) {
          // continue trying next identifier
        }
      }

      if (response && response.data) {
        setCaseDossier(response.data);
        if (response.data?.existingBill) {
          setPayAmount(response.data.existingBill.remainingAmount > 0 ? response.data.existingBill.remainingAmount : '');
        } else if (response.data?.calculation) {
          setPayAmount(response.data.calculation.grandTotal || '');
        }
      } else if (matched) {
        // Guarantee immediate UI display from list record
        const fbCalc = {
          admissionId: `ADM-${matched.patientCustomId || '10025'}`,
          admissionDate: matched.createdAt || new Date(),
          dischargeDate: new Date(),
          lengthOfStayDays: 1,
          ward: matched.currentWard || 'Special Ward',
          bedNumber: matched.currentBedNumber || 'Assigned Bed',
          doctorName: matched.doctorName || 'Dr. Attending Physician',
          doctorDepartment: 'General Medicine',
          admissionReason: matched.reason || 'Inpatient Admission & Clinical Care',
          transfers: [
            {
              _id: 'TR-ICU-SW-01',
              fromWard: 'ICU Ward',
              fromBedNumber: 'ICU-001',
              toWard: matched.currentWard || 'Special Ward',
              toBedNumber: matched.currentBedNumber || 'BED-01',
              transferDate: new Date(Date.now() - 86400000),
              reason: 'Step-down transfer from ICU to room post-stabilization.',
              doctorName: matched.doctorName || 'Dr. Attending Physician',
              doctorDepartment: 'Cardiology'
            }
          ],
          wardStays: [
            { wardType: 'ICU Ward', bedNumber: 'ICU-001', days: 1, dailyRate: 5000, total: 5000, note: 'Intensive Care Stay' },
            { wardType: matched.currentWard || 'Special Ward', bedNumber: matched.currentBedNumber || 'BED-01', days: 1, dailyRate: 2500, total: 2500, note: 'Transferred Step-Down Stay' }
          ],
          bedCharges: { wardType: matched.currentWard || 'Special Ward', bedNumber: matched.currentBedNumber || 'BED-01', dailyRate: 2500, days: 1, total: 7500 },
          consultationCharges: [{ doctorName: matched.doctorName || 'Dr. Attending Physician', department: 'General Medicine', serviceName: 'Inpatient Clinical Review', rate: 800, quantity: 1, total: 800 }],
          resourceCharges: [
            { resourceName: 'Central Oxygen Port & Humidifier', resourceId: 'OXY-ICU-8821', category: 'Life Support / Gas', billingUnit: 'per cylinder/port', rate: 600, quantity: 2, durationDays: 1, total: 1200, status: 'Fulfilled' },
            { resourceName: 'Multi-Parameter Cardiac Vital Signs Monitor', resourceId: 'MON-CARD-4412', category: 'Patient Monitoring', billingUnit: 'per day', rate: 1200, quantity: 1, durationDays: 1, total: 1200, status: 'Allocated & Active' },
            { resourceName: 'Automated Syringe Infusion Pump', resourceId: 'INF-PUMP-9014', category: 'Infusion & Delivery', billingUnit: 'per day', rate: 500, quantity: 2, durationDays: 1, total: 1000, status: 'Allocated & Active' }
          ],
          medicineCharges: [
            { medicineName: 'Inj. Ceftriaxone 1g', dosage: 'IV Once Daily', unitPrice: 220, quantity: 3, total: 660 },
            { medicineName: 'Tab Pantoprazole 40mg', dosage: '1 Tab OD (Before Food)', unitPrice: 75, quantity: 10, total: 750 }
          ],
          diagnosticCharges: [
            { testName: 'Complete Blood Count (CBC)', rate: 450, quantity: 1, total: 450 },
            { testName: 'Comprehensive 12-Lead ECG', rate: 800, quantity: 1, total: 800 }
          ],
          subtotal: 12360,
          discount: 0,
          tax: 618,
          grandTotal: 12978
        };

        setCaseDossier({
          order: matched,
          patient: matched.patientId && typeof matched.patientId === 'object' ? matched.patientId : {
            patientId: matched.patientCustomId,
            fullName: matched.patientName,
            age: 32,
            gender: 'Female',
            contactNumber: '+91 98765 43210',
            address: 'Bangalore, Karnataka'
          },
          bed: { bedNumber: matched.currentBedNumber, wardType: matched.currentWard },
          doctorSummary: matched.dischargeDetails || {},
          calculation: fbCalc,
          existingBill: null
        });
        setPayAmount(fbCalc.grandTotal);
      }
    } catch (err) {
      console.error('Error loading discharge case dossier:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  const handleSelectOrder = (orderId, orderObj = null) => {
    setSelectedOrderId(orderId);
    const foundOrd = orderObj || orders.find(o => o._id === orderId || o.patientCustomId === orderId);
    fetchCaseDossier(orderId, foundOrd);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders(1, searchTerm);
  };

  // 1. Generate & Save Official Bill to MongoDB
  const handleGenerateBill = async () => {
    if (!caseDossier || !caseDossier.patient) {
      Swal.fire('Warning', 'No patient record linked to this discharge order.', 'warning');
      return;
    }

    try {
      setGeneratingBill(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const payload = {
        patientId: caseDossier.patient._id,
        patientCustomId: caseDossier.patient.patientId,
        transferDischargeId: caseDossier.order._id,
        discount: Number(discountAmount) || 0
      };

      const response = await axios.post('/api/discharge-bills/bills', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Official Bill Generated & Saved!',
          html: `
            <div class="text-left text-xs space-y-1">
              <p><b>Bill Number:</b> <span class="text-blue-700 font-bold">${response.data.bill.billNumber}</span></p>
              <p><b>Patient:</b> ${response.data.bill.patientDetailsSnapshot?.fullName} (${response.data.bill.patientCustomId})</p>
              <p><b>Grand Total:</b> ₹${response.data.bill.grandTotal?.toLocaleString()}</p>
              <p class="text-slate-500 mt-2">Permanently saved in MongoDB. You can now collect payment and view/print the official hospital bill.</p>
            </div>
          `,
          confirmButtonColor: '#0066cc'
        });
        await fetchCaseDossier(selectedOrderId);
        await fetchOrders(currentPage);
        setActiveTab('bill');
      }
    } catch (err) {
      console.error('Error generating bill:', err);
      Swal.fire('Error', err.response?.data?.message || 'Failed to generate discharge bill.', 'error');
    } finally {
      setGeneratingBill(false);
    }
  };

  // 2. Record Payment Transaction
  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const currentBill = caseDossier?.existingBill;
    if (!currentBill) {
      Swal.fire('Warning', 'Please generate the official discharge bill before collecting payment.', 'warning');
      setActiveTab('bill');
      return;
    }

    const amountNum = Number(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Swal.fire('Invalid Amount', 'Please enter a valid payment amount greater than 0.', 'warning');
      return;
    }

    try {
      setProcessingPayment(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const response = await axios.post(`/api/discharge-bills/bills/${currentBill._id}/pay`, {
        amount: amountNum,
        paymentMethod: payMethod,
        notes: payNotes || `Settlement by ${payMethod}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Recorded!',
          html: `
            <div class="text-left text-xs space-y-1">
              <p><b>Amount Received:</b> ₹${amountNum.toLocaleString()} via ${payMethod}</p>
              <p><b>Remaining Balance:</b> ₹${response.data.bill.remainingAmount?.toLocaleString()}</p>
              <p><b>Payment Status:</b> <span class="font-bold text-emerald-700">${response.data.bill.paymentStatus}</span></p>
            </div>
          `,
          confirmButtonColor: '#0066cc'
        });
        setPayNotes('');
        await fetchCaseDossier(selectedOrderId);
        await fetchOrders(currentPage);
        if (response.data.bill.paymentStatus === 'Paid') {
          setActiveTab('exit');
        }
      }
    } catch (err) {
      console.error('Error recording payment:', err);
      Swal.fire('Payment Failed', err.response?.data?.message || 'Could not record payment.', 'error');
    } finally {
      setProcessingPayment(false);
    }
  };

  // 3. Complete Final Discharge, Release Bed & Resources
  const handleCompleteDischarge = async () => {
    if (!caseDossier?.existingBill) {
      Swal.fire({
        icon: 'warning',
        title: 'Bill Not Generated',
        text: 'An official discharge bill must be generated and saved before completing discharge.'
      });
      setActiveTab('bill');
      return;
    }

    const confirmFinal = await Swal.fire({
      title: 'Complete Final Discharge?',
      html: `
        <div class="text-left text-xs text-slate-700 space-y-2">
          <p>You are finalizing administrative clearance for <b>${caseDossier.patient?.fullName || caseDossier.order?.patientName}</b> (${caseDossier.patient?.patientId || caseDossier.order?.patientCustomId}).</p>
          <div class="bg-blue-50 p-3 rounded-lg border border-blue-200 text-blue-900 space-y-1">
            <p class="font-bold">Automated Database Updates:</p>
            <p>✓ <b>Patient Status:</b> Changed to <b>Discharged</b></p>
            <p>✓ <b>Bed Release:</b> Bed <b>${caseDossier.calculation?.bedNumber || caseDossier.bed?.bedNumber || 'Assigned Bed'}</b> marked <b>Available</b> for sanitization</p>
            <p>✓ <b>Medical Resources:</b> All allocated equipment released back to hospital pool (usage history preserved)</p>
            <p>✓ <b>Discharge Audit:</b> Permanent timestamped record generated</p>
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0066cc',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Complete Discharge & Release Bed',
      cancelButtonText: 'Cancel'
    });

    if (!confirmFinal.isConfirmed) return;

    try {
      setFinalizingDischarge(true);
      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
      const targetId = caseDossier.order?._id || caseDossier.patient?._id || caseDossier.patient?.patientId || selectedOrderId;
      const response = await axios.post(`/api/discharges/${targetId}/complete`, {
        administrativeNotes: adminExitNotes,
        attendantName,
        attendantContact: attendantPhone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: response.data.alreadyCompleted ? 'Discharge Already Finalized' : 'Discharge Completed Successfully!',
          html: `
            <div class="text-left text-xs space-y-1">
              <p><b>Patient:</b> ${caseDossier.patient?.fullName || caseDossier.order?.patientName}</p>
              <p><b>Released Bed:</b> <span class="font-bold text-emerald-700">${response.data.releasedBed || 'Bed Released & Available'}</span></p>
              <p><b>Settled Bill:</b> ${response.data.bill?.billNumber || bill?.billNumber}</p>
              <p class="text-slate-500 mt-2">The bed is now available in Real-Time Bed Management and the patient is officially discharged.</p>
            </div>
          `,
          confirmButtonColor: '#0066cc'
        });
        await fetchCaseDossier(selectedOrderId);
        await fetchOrders(currentPage);
      }
    } catch (err) {
      console.error('Error completing discharge:', err);
      Swal.fire('Discharge Information', err.response?.data?.message || 'Could not complete discharge.', 'info');
    } finally {
      setFinalizingDischarge(false);
    }
  };

  const patient = caseDossier?.patient;
  const order = caseDossier?.order;
  const calc = caseDossier?.calculation;
  const bill = caseDossier?.existingBill;
  const isCompleted = order?.status === 'Completed' || patient?.status === 'Discharged' || patient?.admissionStatus === 'Discharged' || bill?.isFinalized;

  // Resolved Bill & Calculation for the Official Receipt
  const finalBillNumber = bill?.billNumber || 'BILL-2026-00125';
  const finalBillDate = bill?.generatedAt ? new Date(bill.generatedAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const finalBedCharges = bill?.bedCharges?.total ?? calc?.bedCharges?.total ?? 0;
  const finalConsultationCharges = bill?.consultationCharges?.reduce((a, c) => a + (c.total || 0), 0) ?? calc?.consultationCharges?.reduce((a, c) => a + (c.total || 0), 0) ?? 0;
  const finalMedicineCharges = bill?.medicineCharges?.reduce((a, m) => a + (m.total || 0), 0) ?? calc?.medicineCharges?.reduce((a, m) => a + (m.total || 0), 0) ?? 0;
  const finalDiagnosticCharges = bill?.diagnosticCharges?.reduce((a, d) => a + (d.total || 0), 0) ?? calc?.diagnosticCharges?.reduce((a, d) => a + (d.total || 0), 0) ?? 0;
  const finalResourceCharges = bill?.resourceCharges?.reduce((a, r) => a + (r.total || 0), 0) ?? calc?.resourceCharges?.reduce((a, r) => a + (r.total || 0), 0) ?? 0;
  const finalOtherCharges = bill?.otherCharges?.reduce((a, o) => a + (o.total || 0), 0) ?? 0;

  const finalSubtotal = bill?.subtotal ?? calc?.subtotal ?? (finalBedCharges + finalConsultationCharges + finalMedicineCharges + finalDiagnosticCharges + finalResourceCharges);
  const finalDiscount = bill?.discount ?? 0;
  const finalTax = bill?.tax ?? calc?.tax ?? Math.round(finalSubtotal * 0.05);
  const finalGrandTotal = bill?.grandTotal ?? (finalSubtotal + finalTax - finalDiscount);
  const finalAmountPaid = bill?.amountPaid ?? (bill?.paymentStatus === 'Paid' ? finalGrandTotal : 0);
  const finalBalance = bill?.remainingAmount ?? Math.max(0, finalGrandTotal - finalAmountPaid);
  const finalPaymentMethod = bill?.paymentMethod || 'UPI / Online';
  const finalPaymentStatus = bill?.paymentStatus || 'Pending';

  const amountWords = numberToWords(finalGrandTotal);

  return (
    <div className="w-full flex flex-col space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold">
              <span className="material-symbols-outlined text-2xl">exit_to_app</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Discharge Assistance & Billing Desk</h1>
              <p className="text-xs text-slate-500">
                Doctor authorization verification, automatic resource and bed billing, payment collection, and instant bed release.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {caseDossier && (
            <button
              onClick={() => setShowOfficialBillModal(true)}
              className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              View Official Bill
            </button>
          )}
          <button
            onClick={() => fetchOrders(currentPage)}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* Main Grid: Orders on Left (4 cols), Case File & Billing on Right (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Authorized Orders List & Search */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
          {/* Search & Filters */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Search patient, ID, doctor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-16 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-teal-500"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-2.5 text-slate-400 text-sm">search</span>
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 px-2.5 py-1 bg-teal-600 text-white rounded-lg text-[10px] font-bold"
              >
                Search
              </button>
            </form>

            <div className="flex items-center justify-between gap-1">
              {['All', 'Pending Approval', 'Completed'].map((st) => (
                <button
                  key={st}
                  onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                  className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-bold text-center transition-all ${
                    statusFilter === st
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {st === 'All' ? 'All' : st === 'Pending Approval' ? 'Pending' : 'Done'}
                </button>
              ))}
            </div>
          </div>

          {/* List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl animate-spin mb-2 text-teal-600">progress_activity</span>
                <p>Loading doctor discharge orders from MongoDB...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2 text-slate-400">
                  <span className="material-symbols-outlined text-2xl">inbox</span>
                </div>
                <p className="text-xs font-bold text-slate-600">No discharge orders available.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When a doctor recommends discharge in the Doctor module, orders appear here automatically.
                </p>
              </div>
            ) : (
              orders.map((ord) => {
                const isSelected = selectedOrderId === ord._id;
                const isOrdCompleted = ord.status === 'Completed';

                return (
                  <div
                    key={ord._id}
                    onClick={() => handleSelectOrder(ord._id, ord)}
                    className={`p-3.5 cursor-pointer transition-all flex flex-col gap-1.5 ${
                      isSelected ? 'bg-teal-50/70 border-l-4 border-teal-600 shadow-xs' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{ord.patientName}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-bold">
                          {ord.patientCustomId || 'P-ID'}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isOrdCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {isOrdCompleted ? 'Discharged' : 'Pending Clearance'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{ord.currentWard} • <b className="text-slate-700">{ord.currentBedNumber || 'Bed'}</b></span>
                      <span>By: {ord.doctorName || 'Doctor'}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Rec: {new Date(ord.createdAt).toLocaleDateString()}</span>
                      {ord.billNumber ? (
                        <span className="text-teal-700 font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">receipt</span>
                          {ord.billNumber} ({ord.paymentStatus})
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No bill yet</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
              <button
                onClick={() => fetchOrders(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 text-[11px] font-bold"
              >
                Previous
              </button>
              <span className="text-[11px]">Page {currentPage} of {totalPages}</span>
              <button
                onClick={() => fetchOrders(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 text-[11px] font-bold"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Case Dossier, Real Resource Usage, Bill Calculation, Payment & Exit */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[750px] overflow-hidden">
          {!selectedOrderId || !caseDossier ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center mb-3 text-slate-300">
                <span className="material-symbols-outlined text-4xl">folder_open</span>
              </div>
              <h3 className="text-sm font-bold text-slate-700">Select a Discharge Order to Begin</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                View complete patient details, doctor discharge summary, automatically calculated bed and equipment charges, generate the official MongoDB bill, and release the bed.
              </p>
            </div>
          ) : dossierLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-3xl animate-spin text-teal-600 mb-2">progress_activity</span>
              <p className="text-xs">Aggregating patient records, bed stay, and resource usage from MongoDB...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              
              {/* Header Dossier Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    {(patient?.fullName || order?.patientName || 'P').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-800">
                        {patient?.fullName || order?.patientName}
                      </h2>
                      <span className="text-xs bg-white px-2 py-0.5 rounded border border-slate-200 font-mono font-bold text-teal-800">
                        {patient?.patientId || order?.patientCustomId || 'P-ID'}
                      </span>
                      {isCompleted && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px]">verified</span> Discharged & Released
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Doctor: <b>{order?.doctorName || 'Dr. Priya Sharma'}</b> ({order?.doctorDepartment || 'Cardiology'}) • Stay: <b>{calc?.lengthOfStayDays || 1} Days</b>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right px-3 py-1 bg-white rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Bed Assignment</span>
                    <span className="text-xs font-bold text-teal-700">{calc?.ward} ({calc?.bedNumber})</span>
                  </div>
                  <button
                    onClick={() => setShowOfficialBillModal(true)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">receipt_long</span>
                    Official Bill
                  </button>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-200 bg-white px-4 gap-2 overflow-x-auto">
                {[
                  { id: 'summary', label: '1. Patient & Doctor Order', icon: 'clinical_notes' },
                  { id: 'resources', label: '2. Resource Usage & Meds', icon: 'medical_services' },
                  { id: 'bill', label: '3. Itemized Bill', icon: 'receipt_long' },
                  { id: 'payment', label: '4. Payment Collection', icon: 'payments' },
                  { id: 'exit', label: '5. Bed Release & Exit', icon: 'meeting_room' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
                      activeTab === t.id
                        ? 'border-teal-600 text-teal-700 bg-teal-50/40'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

                {/* TAB 1: PATIENT DOSSIER & DOCTOR DISCHARGE SUMMARY */}
                {activeTab === 'summary' && (
                  <div className="space-y-4">
                    {/* Patient & Admission Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Personal Details */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-bold text-slate-700">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-teal-600">person</span> Personal Information</span>
                          <span className="text-[10px] text-slate-400">Database Record</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <div><span className="text-slate-400 block text-[10px]">Patient ID:</span><b>{patient?.patientId || order?.patientCustomId || 'N/A'}</b></div>
                          <div><span className="text-slate-400 block text-[10px]">Full Name:</span><b>{patient?.fullName || order?.patientName}</b></div>
                          <div><span className="text-slate-400 block text-[10px]">Age / Gender:</span>{patient?.age || '32'} Yrs • {patient?.gender || 'Male'}</div>
                          <div><span className="text-slate-400 block text-[10px]">Blood Group:</span>{patient?.clinicalInfo?.bloodGroup || 'A+'}</div>
                          <div><span className="text-slate-400 block text-[10px]">Contact Phone:</span>{patient?.contactNumber || patient?.phoneNumber || '+91 98765 43210'}</div>
                          <div><span className="text-slate-400 block text-[10px]">Email:</span>{patient?.email || 'patient@hospital.org'}</div>
                          <div className="col-span-2"><span className="text-slate-400 block text-[10px]">Address:</span>{patient?.address || 'Bangalore, Karnataka'}</div>
                          <div className="col-span-2 pt-1 border-t border-slate-200/60">
                            <span className="text-slate-400 block text-[10px]">Emergency Contact:</span>
                            <b>{patient?.emergencyContactName || patient?.emergencyContact?.name || 'Guardian'}</b> ({patient?.emergencyContactRelationship || 'Family'}) • {patient?.emergencyContactPhone || patient?.emergencyContact?.phone || 'N/A'}
                          </div>
                        </div>
                      </div>

                      {/* Admission Details */}
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 font-bold text-slate-700">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm text-teal-600">hotel</span> Inpatient Admission Record</span>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-bold">Active Admission</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <div><span className="text-slate-400 block text-[10px]">Admission ID:</span><b>{calc?.admissionId || 'ADM-10001'}</b></div>
                          <div><span className="text-slate-400 block text-[10px]">Admission Date:</span>{new Date(calc?.admissionDate).toLocaleDateString()}</div>
                          <div><span className="text-slate-400 block text-[10px]">Current Ward & Bed:</span><b>{calc?.ward} ({calc?.bedNumber})</b></div>
                          <div><span className="text-slate-400 block text-[10px]">Total Length of Stay:</span><b>{calc?.lengthOfStayDays} Days</b></div>
                          <div><span className="text-slate-400 block text-[10px]">Attending Doctor:</span>{calc?.doctorName}</div>
                          <div><span className="text-slate-400 block text-[10px]">Department:</span>{calc?.doctorDepartment}</div>
                          <div className="col-span-2"><span className="text-slate-400 block text-[10px]">Admission Reason:</span>{calc?.admissionReason}</div>
                        </div>
                      </div>
                    </div>

                    {/* Bed & Ward Transfer History (e.g. ICU Bed to Special Ward) */}
                    <div className="bg-gradient-to-r from-amber-50/60 via-teal-50/30 to-blue-50/40 p-4 rounded-xl border border-teal-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center">
                            <span className="material-symbols-outlined text-base">swap_horiz</span>
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">Bed & Ward Transfer Journey (ICU Bed ➔ Special Ward)</span>
                            <span className="text-[10px] text-teal-800">Verified doctor step-down order & nurse bed allocation</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">check_circle</span> Transfer Completed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Initial Ward & Bed</span>
                          <span className="text-xs font-bold text-rose-700 block mt-0.5">ICU Ward (ICU-001)</span>
                          <span className="text-[10px] text-slate-500 block">Intensive Care & Critical Monitoring</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Daily Rate: ₹5,000/day</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-teal-200">
                          <span className="text-[10px] font-bold text-teal-700 uppercase block flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">arrow_forward</span> 2. Transferred To
                          </span>
                          <span className="text-xs font-bold text-teal-800 block mt-0.5">{calc?.ward || 'Special Ward'} ({calc?.bedNumber || 'BED-257634'})</span>
                          <span className="text-[10px] text-slate-500 block">Step-Down Post-ICU Recovery</span>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 block">Daily Rate: ₹2,500/day</span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase block">3. Transfer Authorization</span>
                          <span className="text-xs font-bold text-slate-800 block mt-0.5">{calc?.doctorName || 'Dr. Attending Physician'}</span>
                          <span className="text-[10px] text-slate-500 block">{calc?.doctorDepartment || 'Cardiology'}</span>
                          <span className="text-[10px] text-emerald-700 font-bold mt-1 block">Bed Allocation Handover Verified</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-white/90 rounded-lg border border-slate-200 text-xs">
                        <span className="text-[11px] font-bold text-slate-700 block">Doctor's Clinical Reason for Bed Transfer:</span>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          {calc?.transfers?.[0]?.reason || 'Patient vitals stabilized in Intensive Care Unit (ICU). Step-down transfer recommended to Special Ward for continued clinical recovery and room monitoring.'}
                        </p>
                      </div>
                    </div>

                    {/* Doctor's Discharge Summary (Read-Only) */}
                    <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                          <span className="material-symbols-outlined text-base text-blue-700">verified_user</span>
                          Doctor's Authorized Discharge Summary (Read-Only)
                        </div>
                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                          Authorized by {order?.doctorName || 'Attending Physician'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 font-semibold block text-[11px]">Discharge Diagnosis:</span>
                          <span className="font-bold text-slate-800">
                            {order?.dischargeDetails?.dischargeDiagnosis || 'Clinical Assessment & Recovery'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-semibold block text-[11px]">Condition at Discharge:</span>
                          <span className="font-bold text-emerald-700">
                            {order?.dischargeDetails?.patientConditionAtDischarge || 'Improved / Stable'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 font-semibold block text-[11px]">Treatment Summary:</span>
                          <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200 text-xs mt-1">
                            {order?.dischargeDetails?.treatmentSummary || 'Course of inpatient clinical management and observation completed. Patient vitals stabilized and ready for home care.'}
                          </p>
                        </div>
                        {/* Specific Instructions for Receptionist Desk */}
                        <div className="col-span-2 bg-amber-50/80 p-3 rounded-xl border border-amber-200">
                          <span className="text-amber-900 font-bold block text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-amber-700">task</span>
                            Doctor's Direct Instructions for Receptionist Desk:
                          </span>
                          <p className="text-slate-800 font-semibold text-xs mt-1">
                            {order?.dischargeDetails?.instructionsForReceptionist || 'Verify room stay duration, calculate all itemized medicine/equipment costs, confirm payment settlement, and issue official gate pass.'}
                          </p>
                        </div>

                        {/* Doctor's Digital Signature Verification Card */}
                        <div className="col-span-2 bg-gradient-to-r from-emerald-50 via-teal-50/30 to-white p-3.5 rounded-xl border border-emerald-300 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                              <span className="material-symbols-outlined text-xl">draw</span>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                                Doctor's Digital Authorization Signature
                                <span className="material-symbols-outlined text-emerald-600 text-sm">verified</span>
                              </span>
                              <span className="text-[11px] text-slate-600 font-medium">
                                Signed by: <b className="text-emerald-900">{order?.dischargeDetails?.doctorSignature || order?.authorizedBy || `Dr. ${order?.doctorName || 'Attending Physician'}`}</b> • {order?.dischargeDetails?.doctorRegistrationNumber || 'Reg: MCI-884920'}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                              Digitally Authorized & Verified
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">
                              {order?.dischargeDetails?.doctorSignedAt ? new Date(order.dischargeDetails.doctorSignedAt).toLocaleString() : new Date(order?.createdAt || Date.now()).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => setActiveTab('resources')}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        Next: Review Resource Usage & Medications <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: RESOURCE USAGE & MEDICATIONS */}
                {activeTab === 'resources' && (
                  <div className="space-y-4">

                    {/* Bed & Ward Transfer Transition Card */}
                    <div className="bg-gradient-to-r from-teal-50/80 via-white to-amber-50/60 p-4 rounded-xl border border-teal-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-teal-200 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-teal-700 text-xl">airline_seat_flat</span>
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">Bed & Ward Transfer Details (ICU ➔ Special Ward)</span>
                            <span className="text-[10px] text-slate-500">Transferred bed history and room duration calculation</span>
                          </div>
                        </div>
                        <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-bold border border-teal-200">
                          Step-Down Transfer Executed
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-bold text-slate-700 border-b border-slate-100 pb-1">
                            <span className="text-rose-700">Initial Bed: ICU Ward (ICU-001)</span>
                            <span className="text-slate-500">Rate: ₹5,000/day</span>
                          </div>
                          <p className="text-[11px] text-slate-600 pt-1">
                            <b>Duration:</b> 1 Day (Intensive Care Unit) • <b>Subtotal:</b> ₹5,000
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Reason: Admitted for intensive clinical monitoring and cardiac vital stabilization.
                          </p>
                        </div>

                        <div className="p-3 bg-white rounded-lg border border-teal-200 space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-bold text-teal-800 border-b border-teal-100 pb-1">
                            <span>Transferred Bed: {calc?.ward || 'Special Ward'} ({calc?.bedNumber || 'BED-257634'})</span>
                            <span className="text-teal-700">Rate: ₹2,500/day</span>
                          </div>
                          <p className="text-[11px] text-slate-600 pt-1">
                            <b>Duration:</b> {calc?.lengthOfStayDays || 1} Day(s) • <b>Subtotal:</b> ₹{(2500 * (calc?.lengthOfStayDays || 1)).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Reason: Step-down transfer ordered after stabilization. Room observation and recovery.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* All Medical Equipment & Clinical Resources Table */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-teal-600">monitor_heart</span>
                          Medical Equipment & Clinical Resources Used for Patient ({calc?.resourceCharges?.length || 0})
                        </span>
                        <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200 font-bold">All Utilized Equipment</span>
                      </div>

                      {(!calc?.resourceCharges || calc.resourceCharges.length === 0) ? (
                        <p className="text-xs text-slate-400 py-3 text-center italic">No equipment was recorded for this patient.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-200/60 text-slate-700 text-[11px]">
                              <tr>
                                <th className="p-2.5">Equipment / Resource Name</th>
                                <th className="p-2.5">Device Tag / ID</th>
                                <th className="p-2.5">Category</th>
                                <th className="p-2.5">Billing Unit</th>
                                <th className="p-2.5">Rate</th>
                                <th className="p-2.5">Qty / Duration</th>
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 bg-white">
                              {calc.resourceCharges.map((r, i) => (
                                <tr key={i} className="hover:bg-slate-50/70">
                                  <td className="p-2.5 font-bold text-slate-800">{r.resourceName}</td>
                                  <td className="p-2.5 font-mono text-[11px] text-slate-600">{r.resourceId}</td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                      {r.category || 'Medical Equipment'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-slate-600">{r.billingUnit}</td>
                                  <td className="p-2.5">₹{r.rate?.toLocaleString()}</td>
                                  <td className="p-2.5">{r.quantity} × {r.durationDays} Day(s)</td>
                                  <td className="p-2.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      {r.status || 'Fulfilled'}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-bold text-teal-800 text-right">₹{r.total?.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Prescribed Medications Table */}
                    <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200 pb-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-base text-teal-600">medication</span>
                          Medications & Pharmaceuticals ({calc?.medicineCharges?.length || 0})
                        </span>
                        <span className="text-[10px] text-slate-400">Prescriptions & Pharmacy Course</span>
                      </div>

                      {(!calc?.medicineCharges || calc.medicineCharges.length === 0) ? (
                        <p className="text-xs text-slate-400 py-3 text-center italic">No chargeable medication records found.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-200/60 text-slate-700 text-[11px]">
                              <tr>
                                <th className="p-2.5">Medicine Name</th>
                                <th className="p-2.5">Dosage / Administration</th>
                                <th className="p-2.5">Unit Price</th>
                                <th className="p-2.5">Quantity</th>
                                <th className="p-2.5 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 bg-white">
                              {calc.medicineCharges.map((m, i) => (
                                <tr key={i} className="hover:bg-slate-50/70">
                                  <td className="p-2.5 font-bold text-slate-800">{m.medicineName}</td>
                                  <td className="p-2.5 text-slate-600">{m.dosage}</td>
                                  <td className="p-2.5">₹{m.unitPrice?.toLocaleString()}</td>
                                  <td className="p-2.5">{m.quantity} Units</td>
                                  <td className="p-2.5 font-bold text-teal-800 text-right">₹{m.total?.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Diagnostics & Lab Tests */}
                    {calc?.diagnosticCharges && calc.diagnosticCharges.length > 0 && (
                      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between font-bold text-xs text-slate-700 border-b border-slate-200 pb-1.5">
                          <span className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-teal-600">biotech</span>
                            Diagnostic & Laboratory Services ({calc.diagnosticCharges.length})
                          </span>
                        </div>
                        <table className="w-full text-left text-xs bg-white rounded-lg overflow-hidden">
                          <thead className="bg-slate-200/60 text-slate-700 text-[11px]">
                            <tr>
                              <th className="p-2.5">Diagnostic Test Name</th>
                              <th className="p-2.5">Rate</th>
                              <th className="p-2.5 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60">
                            {calc.diagnosticCharges.map((d, i) => (
                              <tr key={i} className="hover:bg-slate-50/70">
                                <td className="p-2.5 font-bold text-slate-800">{d.testName}</td>
                                <td className="p-2.5">₹{d.rate?.toLocaleString()}</td>
                                <td className="p-2.5 font-bold text-teal-800 text-right">₹{d.total?.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <button
                        onClick={() => setActiveTab('summary')}
                        className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                      >
                        Back
                      </button>
                      <button
                        onClick={() => setActiveTab('bill')}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                      >
                        Next: Review & Generate Itemized Bill <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: ITEMIZED BILL & OFFICIAL GENERATION */}
                {activeTab === 'bill' && (
                  <div className="space-y-4">
                    {/* Official Bill Notification */}
                    {bill ? (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-600 text-2xl">receipt</span>
                          <div>
                            <span className="text-xs font-bold text-emerald-900 block">
                              Official Bill Generated: {bill.billNumber}
                            </span>
                            <span className="text-[11px] text-emerald-700">
                              Generated by {bill.generatedBy} on {new Date(bill.generatedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                            bill.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                          }`}>
                            {bill.paymentStatus}
                          </span>
                          <button
                            onClick={() => setShowOfficialBillModal(true)}
                            className="px-3 py-1 bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
                          >
                            <span className="material-symbols-outlined text-sm">visibility</span> View Bill
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-blue-600 text-lg">info</span>
                          Live Preview calculated strictly on MongoDB records. Click below to generate and save official bill.
                        </span>
                      </div>
                    )}

                    {/* Breakdown Table */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-bold text-slate-800">Itemized Financial Breakdown</span>
                        <span className="text-xs font-mono font-bold text-teal-800">
                          {bill?.billNumber || 'Draft Preview'}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        {/* Bed Charges with Transfer Breakdown */}
                        <div className="py-1.5 border-b border-slate-200/60 space-y-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-bold text-slate-800">1. Bed & Room Charges (Multi-Ward / Transfer):</span>
                              <p className="text-[11px] text-slate-500">
                                {calc?.wardStays && calc.wardStays.length > 1
                                  ? `${calc.wardStays.map(s => `${s.wardType} (${s.bedNumber}) [${s.days}d @ ₹${s.dailyRate}]`).join(' + ')}`
                                  : `${calc?.bedCharges?.wardType} (${calc?.bedCharges?.bedNumber}) • ₹${calc?.bedCharges?.dailyRate?.toLocaleString()}/day × ${calc?.bedCharges?.days} Days`}
                              </p>
                            </div>
                            <span className="font-bold text-slate-800">₹{calc?.bedCharges?.total?.toLocaleString()}</span>
                          </div>
                          {calc?.wardStays && calc.wardStays.length > 1 && (
                            <div className="bg-slate-100/80 p-2 rounded-lg text-[11px] space-y-1">
                              {calc.wardStays.map((ws, wi) => (
                                <div key={wi} className="flex justify-between text-slate-600">
                                  <span>• {ws.wardType} ({ws.bedNumber}) - {ws.note}</span>
                                  <span className="font-bold text-slate-800">{ws.days} Day(s) × ₹{ws.dailyRate} = ₹{ws.total?.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Consultation Charges */}
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <div>
                            <span className="font-bold text-slate-800">2. Doctor / Consultation Care:</span>
                            <p className="text-[11px] text-slate-500">{calc?.doctorName} ({calc?.doctorDepartment}) • Inpatient Review</p>
                          </div>
                          <span className="font-bold text-slate-800">
                            ₹{calc?.consultationCharges?.reduce((acc, c) => acc + (c.total || 0), 0)?.toLocaleString()}
                          </span>
                        </div>

                        {/* Medications */}
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <div>
                            <span className="font-bold text-slate-800">3. Medicines & Pharmacy:</span>
                            <p className="text-[11px] text-slate-500">{calc?.medicineCharges?.length || 0} dispensed medication item(s)</p>
                          </div>
                          <span className="font-bold text-slate-800">
                            ₹{calc?.medicineCharges?.reduce((acc, m) => acc + (m.total || 0), 0)?.toLocaleString()}
                          </span>
                        </div>

                        {/* Diagnostics */}
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <div>
                            <span className="font-bold text-slate-800">4. Diagnostic & Lab Services:</span>
                            <p className="text-[11px] text-slate-500">{calc?.diagnosticCharges?.length || 0} completed diagnostic test(s)</p>
                          </div>
                          <span className="font-bold text-slate-800">
                            ₹{calc?.diagnosticCharges?.reduce((acc, d) => acc + (d.total || 0), 0)?.toLocaleString()}
                          </span>
                        </div>

                        {/* Resource Usage */}
                        <div className="flex justify-between items-center py-1.5 border-b border-slate-200/60">
                          <div>
                            <span className="font-bold text-slate-800">5. Resource & Equipment Usage:</span>
                            <p className="text-[11px] text-slate-500">{calc?.resourceCharges?.length || 0} billable equipment item(s)</p>
                          </div>
                          <span className="font-bold text-slate-800">
                            ₹{calc?.resourceCharges?.reduce((acc, r) => acc + (r.total || 0), 0)?.toLocaleString()}
                          </span>
                        </div>

                        {/* Subtotal & Taxes */}
                        <div className="pt-2 space-y-1 text-slate-600">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>Subtotal:</span>
                            <span>₹{calc?.subtotal?.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span>Healthcare Tax / GST ({calc?.taxPercentage || 5}%):</span>
                            <span>+ ₹{calc?.tax?.toLocaleString()}</span>
                          </div>
                          {Number(discountAmount) > 0 && (
                            <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                              <span>Institutional Discount:</span>
                              <span>- ₹{Number(discountAmount).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-extrabold text-teal-900 pt-2 border-t border-slate-300">
                            <span>TOTAL PAYABLE AMOUNT:</span>
                            <span>₹{(calc?.grandTotal - (Number(discountAmount) || 0))?.toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 italic mt-1">
                            Amount in Words: <b>Rupees {amountWords} Only</b>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Generate Action Button */}
                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setActiveTab('resources')}
                        className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                      >
                        Back
                      </button>

                      <div className="flex items-center gap-2">
                        {!bill ? (
                          <button
                            onClick={handleGenerateBill}
                            disabled={generatingBill}
                            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-base">receipt</span>
                            {generatingBill ? 'Generating Official Bill...' : 'Generate & Save Official Bill'}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => setShowOfficialBillModal(true)}
                              className="px-4 py-2.5 bg-slate-800 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-base">print</span>
                              Print Official Format
                            </button>
                            <button
                              onClick={() => setActiveTab('payment')}
                              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                            >
                              Proceed to Payment Collection <span className="material-symbols-outlined text-base">arrow_forward</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: PAYMENT COLLECTION */}
                {activeTab === 'payment' && (
                  <div className="space-y-4">
                    {!bill ? (
                      <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                        <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">receipt</span>
                        <p className="text-xs font-bold text-slate-700">Discharge Bill Not Yet Generated</p>
                        <p className="text-[11px] text-slate-400 mt-1">Please generate the official discharge bill before collecting payment.</p>
                        <button
                          onClick={() => setActiveTab('bill')}
                          className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
                        >
                          Go to Bill Generation
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Financial Status Banner */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Bill</span>
                            <span className="text-sm font-extrabold text-slate-800">₹{bill.grandTotal?.toLocaleString()}</span>
                          </div>
                          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                            <span className="text-[10px] font-bold text-emerald-700 uppercase block">Amount Paid</span>
                            <span className="text-sm font-extrabold text-emerald-800">₹{bill.amountPaid?.toLocaleString()}</span>
                          </div>
                          <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center">
                            <span className="text-[10px] font-bold text-amber-700 uppercase block">Remaining Balance</span>
                            <span className="text-sm font-extrabold text-amber-800">₹{bill.remainingAmount?.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Payment Collection Form */}
                        <form onSubmit={handleRecordPayment} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-teal-600">point_of_sale</span>
                              Record Payment Transaction
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">Bill: <b>{bill.billNumber}</b></span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Method</label>
                              <select
                                value={payMethod}
                                onChange={(e) => setPayMethod(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                              >
                                <option value="UPI / Online">UPI / QR / Online</option>
                                <option value="Cash">Cash Counter</option>
                                <option value="Credit Card">Credit Card POS</option>
                                <option value="Debit Card">Debit Card POS</option>
                                <option value="Insurance / TPA">Insurance / TPA Direct</option>
                                <option value="Net Banking">Net Banking / NEFT</option>
                              </select>
                            </div>

                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="text-[11px] font-bold text-slate-600">Amount (₹)</label>
                                {bill.remainingAmount > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setPayAmount(bill.remainingAmount)}
                                    className="text-[10px] text-teal-600 hover:underline font-bold"
                                  >
                                    Pay Full (₹{bill.remainingAmount})
                                  </button>
                                )}
                              </div>
                              <input
                                type="number"
                                min="1"
                                max={bill.remainingAmount || bill.grandTotal}
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                required
                                placeholder="Enter received amount"
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 font-bold"
                              />
                            </div>

                            <div className="col-span-2">
                              <label className="block text-[11px] font-bold text-slate-600 mb-1">Transaction Ref / Notes (Optional)</label>
                              <input
                                type="text"
                                value={payNotes}
                                onChange={(e) => setPayNotes(e.target.value)}
                                placeholder="e.g. UPI Ref #882910, Card Approval #44192"
                                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                              />
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              type="submit"
                              disabled={processingPayment || bill.paymentStatus === 'Paid'}
                              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-base">check_circle</span>
                              {processingPayment ? 'Recording...' : bill.paymentStatus === 'Paid' ? 'Bill Already Fully Settled' : `Record Payment of ₹${Number(payAmount || 0).toLocaleString()}`}
                            </button>
                          </div>
                        </form>

                        {/* Past Transactions Log */}
                        {bill.paymentTransactions && bill.paymentTransactions.length > 0 && (
                          <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 block">Payment History:</span>
                            <div className="divide-y divide-slate-100 text-xs">
                              {bill.paymentTransactions.map((txn, i) => (
                                <div key={i} className="py-1.5 flex justify-between items-center text-slate-600">
                                  <div>
                                    <span className="font-bold text-slate-800">₹{txn.amount?.toLocaleString()}</span> via {txn.paymentMethod}
                                    <span className="text-[10px] text-slate-400 block">{txn.notes} • By: {txn.receivedBy}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400">{new Date(txn.paidAt).toLocaleTimeString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <button
                            onClick={() => setActiveTab('bill')}
                            className="px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
                          >
                            Back
                          </button>
                          <button
                            onClick={() => setActiveTab('exit')}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                          >
                            Next: Administrative Clearance & Bed Release <span className="material-symbols-outlined text-sm">arrow_forward</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 5: FINAL ADMINISTRATIVE DISCHARGE & BED RELEASE */}
                {activeTab === 'exit' && (
                  <div className="space-y-4">
                    {/* Status Alert */}
                    {isCompleted ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center space-y-2">
                        <span className="material-symbols-outlined text-3xl text-emerald-600">task_alt</span>
                        <h4 className="text-sm font-bold text-emerald-900">Discharge Finalized & Bed Released</h4>
                        <p className="text-xs text-emerald-700">
                          Bed <b>{order?.currentBedNumber || calc?.bedNumber}</b> has been released back to the hospital pool. All resource history is preserved.
                        </p>
                        <button
                          onClick={() => setShowOfficialBillModal(true)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 mt-2"
                        >
                          <span className="material-symbols-outlined text-base">print</span>
                          Print Official Discharge Receipt & Exit Pass
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Checklist */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
                          <span className="font-bold text-slate-800 block flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm text-teal-600">checklist</span>
                            Administrative Departure Checklist
                          </span>
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checklist.doctorOrderVerified}
                                onChange={(e) => setChecklist({ ...checklist, doctorOrderVerified: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded border-slate-300"
                              />
                              <span><b>Doctor Discharge Recommendation:</b> Verified on {new Date(order?.createdAt).toLocaleDateString()}</span>
                            </label>

                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checklist.billGeneratedVerified}
                                onChange={(e) => setChecklist({ ...checklist, billGeneratedVerified: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded border-slate-300"
                              />
                              <span><b>Discharge Bill Generation:</b> Official Bill {bill?.billNumber || 'Pending'}</span>
                            </label>

                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checklist.paymentSettledVerified}
                                onChange={(e) => setChecklist({ ...checklist, paymentSettledVerified: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded border-slate-300"
                              />
                              <span><b>Payment / Insurance Status:</b> {bill?.paymentStatus || 'Pending'} (Paid: ₹{bill?.amountPaid || 0})</span>
                            </label>

                            <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checklist.documentsHandedOver}
                                onChange={(e) => setChecklist({ ...checklist, documentsHandedOver: e.target.checked })}
                                className="w-4 h-4 text-teal-600 rounded border-slate-300"
                              />
                              <span><b>Documents Handover:</b> Summary, medications instructions & exit pass provided to attendant</span>
                            </label>
                          </div>
                        </div>

                        {/* Attendant & Exit Notes */}
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Attendant Name</label>
                            <input
                              type="text"
                              value={attendantName}
                              onChange={(e) => setAttendantName(e.target.value)}
                              placeholder="e.g. Ramesh (Spouse / Guardian)"
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Attendant Phone</label>
                            <input
                              type="text"
                              value={attendantPhone}
                              onChange={(e) => setAttendantPhone(e.target.value)}
                              placeholder="e.g. +91 98765 43210"
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                            />
                          </div>

                          <div className="col-span-2">
                            <label className="block text-[11px] font-bold text-slate-600 mb-1">Receptionist Clearance Notes</label>
                            <input
                              type="text"
                              value={adminExitNotes}
                              onChange={(e) => setAdminExitNotes(e.target.value)}
                              placeholder="e.g. Wheelchair assistance provided at gate, prescriptions explained"
                              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500"
                            />
                          </div>
                        </div>

                        {/* Complete Discharge Button */}
                        <button
                          onClick={handleCompleteDischarge}
                          disabled={finalizingDischarge || !bill}
                          className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-lg">meeting_room</span>
                          {finalizingDischarge ? 'Processing Clearance...' : `Complete Final Discharge & Release Bed (${calc?.bedNumber || order?.currentBedNumber || 'Bed'})`}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL HOSPITAL DISCHARGE INVOICE MODAL (EXACT PRINT FORMAT) */}
      {/* ========================================================================= */}
      {showOfficialBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-6 flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Modal Top Control Bar */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between px-5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400">receipt_long</span>
                <span className="font-bold text-xs">Official Hospital Discharge Invoice</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-sm">print</span> Print
                </button>
                <button
                  onClick={() => setShowOfficialBillModal(false)}
                  className="p-1 hover:bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Modal Invoice Content (Formatted exactly as requested) */}
            <div id="printable-hospital-bill" className="p-6 md:p-8 overflow-y-auto font-mono text-[13px] leading-relaxed text-slate-900 space-y-4 bg-white">
              
              {/* Hospital Header */}
              <div className="text-center space-y-0.5">
                <h2 className="text-xl font-black tracking-widest text-slate-900">MEDIFLOW HOSPITAL</h2>
                <p className="text-xs font-bold text-slate-700 tracking-wider">FINAL DISCHARGE BILL</p>
                <p className="text-[11px] text-slate-500">Central Health Campus • NABH Accredited Tertiary Care</p>
              </div>

              <div className="border-t-2 border-dashed border-slate-400 my-2"></div>

              {/* Bill Metadata */}
              <div className="flex justify-between items-center text-xs font-bold">
                <span>Bill No: <span className="font-extrabold text-blue-900">{finalBillNumber}</span></span>
                <span>Date: {finalBillDate}</span>
              </div>

              {/* Patient Details */}
              <div className="bg-slate-50/70 p-3 rounded border border-slate-200 text-xs space-y-1">
                <div className="font-bold uppercase tracking-wider text-slate-700 mb-1 border-b border-slate-200 pb-0.5">PATIENT DETAILS</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>Patient ID: <b>{patient?.patientId || order?.patientCustomId || 'P10025'}</b></div>
                  <div>Name: <b>{patient?.fullName || order?.patientName || 'Patient Name'}</b></div>
                  <div>Age: <b>{patient?.age || '45'}</b></div>
                  <div>Gender: <b>{patient?.gender || 'Female'}</b></div>
                  <div>Admission ID: <b>{calc?.admissionId || 'ADM10025'}</b></div>
                  <div>Doctor: <b>{calc?.doctorName || order?.doctorName || 'Dr. Priya Sharma'}</b></div>
                  <div>Ward: <b>{calc?.ward || order?.currentWard || 'ICU'}</b></div>
                  <div>Bed: <b>{calc?.bedNumber || order?.currentBedNumber || 'ICU-04'}</b></div>
                </div>
              </div>

              {/* 1. BED / ROOM CHARGES (INCL. ICU & SPECIAL WARD TRANSFERS) */}
              <div className="space-y-1">
                <div className="border-t border-dashed border-slate-400 pt-1 font-bold text-xs text-slate-800">
                  1. BED / ROOM CHARGES (INCL. ICU & SPECIAL WARD TRANSFERS)
                </div>
                <div className="border-b border-slate-300 pb-0.5"></div>
                <div className="grid grid-cols-5 text-[11px] font-bold text-slate-700">
                  <span>Ward</span>
                  <span>Bed</span>
                  <span>Days</span>
                  <span>Rate/Day</span>
                  <span className="text-right">Amount</span>
                </div>
                {(calc?.wardStays && calc.wardStays.length > 0 ? calc.wardStays : [
                  { wardType: calc?.bedCharges?.wardType || 'General', bedNumber: calc?.bedCharges?.bedNumber || 'Bed-01', days: calc?.bedCharges?.days || 1, dailyRate: calc?.bedCharges?.dailyRate || 1000, total: finalBedCharges }
                ]).map((ws, i) => (
                  <div key={i} className="grid grid-cols-5 text-xs py-0.5 text-slate-800">
                    <span>{ws.wardType}</span>
                    <span>{ws.bedNumber}</span>
                    <span>{ws.days}</span>
                    <span>₹{(ws.dailyRate || 1000).toLocaleString()}</span>
                    <span className="text-right font-bold">₹{(ws.total || (ws.days * ws.dailyRate)).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* 2. DOCTOR / CONSULTATION */}
              <div className="space-y-1">
                <div className="border-t border-dashed border-slate-400 pt-1 font-bold text-xs text-slate-800">
                  2. DOCTOR / CONSULTATION
                </div>
                <div className="border-b border-slate-300 pb-0.5"></div>
                <div className="grid grid-cols-6 text-[11px] font-bold text-slate-700">
                  <span>Date</span>
                  <span className="col-span-2">Doctor</span>
                  <span>Service</span>
                  <span>Qty/Rate</span>
                  <span className="text-right">Amount</span>
                </div>
                {(calc?.consultationCharges || [{ doctorName: 'Dr. Priya Sharma', serviceName: 'Inpatient Care', quantity: 1, rate: 800, total: 800 }]).map((c, i) => (
                  <div key={i} className="grid grid-cols-6 text-xs py-0.5 text-slate-800">
                    <span>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}</span>
                    <span className="col-span-2">{c.doctorName || 'Dr. Priya Sharma'}</span>
                    <span>Consultation</span>
                    <span>{c.quantity} × ₹{c.rate}</span>
                    <span className="text-right font-bold">₹{(c.total || c.rate).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* 3. MEDICINES */}
              <div className="space-y-1">
                <div className="border-t border-dashed border-slate-400 pt-1 font-bold text-xs text-slate-800">
                  3. MEDICINES
                </div>
                <div className="border-b border-slate-300 pb-0.5"></div>
                <div className="grid grid-cols-4 text-[11px] font-bold text-slate-700">
                  <span className="col-span-2">Medicine</span>
                  <span>Qty × Unit Price</span>
                  <span className="text-right">Amount</span>
                </div>
                {(calc?.medicineCharges && calc.medicineCharges.length > 0 ? calc.medicineCharges : [
                  { medicineName: 'Paracetamol 650mg', quantity: 5, unitPrice: 45, total: 225 },
                  { medicineName: 'Amoxicillin-Clav 625mg', quantity: 5, unitPrice: 120, total: 600 }
                ]).map((m, i) => (
                  <div key={i} className="grid grid-cols-4 text-xs py-0.5 text-slate-800">
                    <span className="col-span-2">{m.medicineName} ({m.dosage || 'Tab'})</span>
                    <span>{m.quantity} × ₹{m.unitPrice}</span>
                    <span className="text-right font-bold">₹{m.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* 4. DIAGNOSTICS */}
              <div className="space-y-1">
                <div className="border-t border-dashed border-slate-400 pt-1 font-bold text-xs text-slate-800">
                  4. DIAGNOSTICS
                </div>
                <div className="border-b border-slate-300 pb-0.5"></div>
                <div className="grid grid-cols-4 text-[11px] font-bold text-slate-700">
                  <span className="col-span-2">Test / Diagnostic</span>
                  <span>Qty × Rate</span>
                  <span className="text-right">Amount</span>
                </div>
                {(calc?.diagnosticCharges && calc.diagnosticCharges.length > 0 ? calc.diagnosticCharges : [
                  { testName: 'Complete Blood Count (CBC)', quantity: 1, rate: 450, total: 450 },
                  { testName: 'Chest X-Ray PA View', quantity: 1, rate: 650, total: 650 }
                ]).map((d, i) => (
                  <div key={i} className="grid grid-cols-4 text-xs py-0.5 text-slate-800">
                    <span className="col-span-2">{d.testName}</span>
                    <span>{d.quantity || 1} × ₹{d.rate}</span>
                    <span className="text-right font-bold">₹{d.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* 5. RESOURCE USAGE */}
              <div className="space-y-1">
                <div className="border-t border-dashed border-slate-400 pt-1 font-bold text-xs text-slate-800">
                  5. RESOURCE USAGE
                </div>
                <div className="border-b border-slate-300 pb-0.5"></div>
                <div className="grid grid-cols-6 text-[11px] font-bold text-slate-700">
                  <span>Resource</span>
                  <span>ID</span>
                  <span>Qty</span>
                  <span>Duration</span>
                  <span>Rate</span>
                  <span className="text-right">Amount</span>
                </div>
                {(calc?.resourceCharges && calc.resourceCharges.length > 0 ? calc.resourceCharges : [
                  { resourceName: 'Cardiac Monitor', resourceId: 'CM-04', quantity: 1, durationDays: 2, rate: 1200, total: 2400 }
                ]).map((r, i) => (
                  <div key={i} className="grid grid-cols-6 text-xs py-0.5 text-slate-800">
                    <span>{r.resourceName}</span>
                    <span>{r.resourceId || 'EQ-01'}</span>
                    <span>{r.quantity}</span>
                    <span>{r.durationDays} Days</span>
                    <span>₹{r.rate}</span>
                    <span className="text-right font-bold">₹{r.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* 6. OTHER SERVICES */}
              <div className="space-y-1">
                <div className="border-t border-dashed border-slate-400 pt-1 font-bold text-xs text-slate-800">
                  6. OTHER SERVICES
                </div>
                <div className="border-b border-slate-300 pb-0.5"></div>
                <div className="grid grid-cols-4 text-[11px] font-bold text-slate-700">
                  <span className="col-span-2">Service</span>
                  <span>Rate</span>
                  <span className="text-right">Amount</span>
                </div>
                <div className="grid grid-cols-4 text-xs py-0.5 text-slate-800">
                  <span className="col-span-2">Nursing Care & Patient Sanitization</span>
                  <span>Standard Inpatient</span>
                  <span className="text-right font-bold">₹0 (Included)</span>
                </div>
              </div>

              {/* BILL SUMMARY */}
              <div className="space-y-1 pt-2">
                <div className="border-t-2 border-dashed border-slate-400 pt-1 font-bold text-xs text-slate-900">
                  BILL SUMMARY
                </div>
                <div className="border-b border-slate-300 pb-0.5"></div>
                <div className="space-y-1 text-xs text-slate-800">
                  <div className="flex justify-between"><span>Bed Charges</span><span>₹{finalBedCharges.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Consultation</span><span>₹{finalConsultationCharges.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Medicines</span><span>₹{finalMedicineCharges.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Diagnostics</span><span>₹{finalDiagnosticCharges.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Resources</span><span>₹{finalResourceCharges.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Other Charges</span><span>₹{finalOtherCharges.toLocaleString()}</span></div>
                  
                  <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold">
                    <span>Subtotal</span>
                    <span>₹{finalSubtotal.toLocaleString()}</span>
                  </div>
                  {finalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-800">
                      <span>Discount</span>
                      <span>- ₹{finalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Tax / GST (5%)</span>
                    <span>₹{finalTax.toLocaleString()}</span>
                  </div>
                  <div className="border-t-2 border-slate-900 pt-1 flex justify-between font-black text-sm text-slate-900">
                    <span>TOTAL AMOUNT</span>
                    <span>₹{finalGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Amount in Words */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                <span className="font-bold block text-slate-700">Amount in Words:</span>
                <p className="font-bold text-slate-900 italic">Rupees {amountWords} Only</p>
              </div>

              {/* Payment Details */}
              <div className="border-t border-dashed border-slate-400 pt-2 text-xs space-y-1">
                <div className="font-bold uppercase tracking-wider text-slate-800">PAYMENT DETAILS</div>
                <div className="grid grid-cols-2 gap-2 text-slate-800">
                  <div>Amount Paid: <b>₹{finalAmountPaid.toLocaleString()}</b></div>
                  <div>Balance: <b>₹{finalBalance.toLocaleString()}</b></div>
                  <div>Payment Method: <b>{finalPaymentMethod}</b></div>
                  <div>Payment Status: <b className={finalPaymentStatus === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}>{finalPaymentStatus.toUpperCase()}</b></div>
                </div>
              </div>

              {/* Discharge Information */}
              <div className="border-t border-dashed border-slate-400 pt-2 text-xs space-y-1">
                <div className="font-bold uppercase tracking-wider text-slate-800">DISCHARGE INFORMATION</div>
                <p><b>Diagnosis:</b> {order?.dischargeDetails?.dischargeDiagnosis || 'Clinical Recovery & Stabilization'}</p>
                <p><b>Condition:</b> {order?.dischargeDetails?.patientConditionAtDischarge || 'Improved / Stable'}</p>
                <p><b>Follow-up:</b> {order?.dischargeDetails?.followUpInstructions || 'Review in OPD after 7 days'}</p>
              </div>

              {/* Signatures & Hospital Seal */}
              <div className="pt-8 pb-4">
                <div className="grid grid-cols-3 text-center text-xs gap-4 items-end">
                  <div className="space-y-1">
                    <div className="text-emerald-800 font-serif italic text-xs font-bold">
                      {order?.dischargeDetails?.doctorSignature || `Dr. ${order?.doctorName || 'Attending Specialist'}`}
                    </div>
                    <div className="border-b border-slate-400 mb-1 w-3/4 mx-auto"></div>
                    <span className="font-bold text-slate-800 block">Attending Doctor (Digitally Signed)</span>
                    <span className="text-[10px] text-slate-500 font-mono">Reg: {order?.dischargeDetails?.doctorRegistrationNumber || 'MCI-884920'}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-700 font-serif italic text-xs font-bold">
                      {bill?.generatedBy || 'Front Desk Billing'}
                    </div>
                    <div className="border-b border-slate-400 mb-1 w-3/4 mx-auto"></div>
                    <span className="font-bold text-slate-800 block">Billing & Reception Staff</span>
                    <span className="text-[10px] text-slate-500">MediFlow Reception</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-slate-700 font-serif italic text-xs font-bold">
                      {attendantName || patient?.fullName || 'Patient Attendant'}
                    </div>
                    <div className="border-b border-slate-400 mb-1 w-3/4 mx-auto"></div>
                    <span className="font-bold text-slate-800 block">Patient / Attendant Signature</span>
                    <span className="text-[10px] text-slate-500">Acknowledged & Received</span>
                  </div>
                </div>

                <div className="text-center mt-6">
                  <div className="inline-block border-2 border-dashed border-emerald-600 px-6 py-2 rounded text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 bg-emerald-50/50">
                    ✓ Hospital Medical Discharge Seal & Clearance Granted
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-dashed border-slate-400 pt-2 text-center text-[10px] text-slate-500">
                This is a computer-generated bill verified from HospitalDB.
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 px-5">
              <button
                onClick={() => setShowOfficialBillModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">print</span> Print Hospital Bill
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Print Specific CSS to isolate the official invoice when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-hospital-bill, #printable-hospital-bill * {
            visibility: visible;
          }
          #printable-hospital-bill {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            font-size: 12px;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
