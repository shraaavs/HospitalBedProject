import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getSocket } from '../../utils/socket';

export default function ReceptionistDoctorAvailability() {
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Doctor Schedule & Slot Inspector Modal
  const [scheduleModal, setScheduleModal] = useState({
    isOpen: false,
    doctor: null,
    selectedDate: new Date().toISOString().split('T')[0]
  });

  // Direct Booking Modal
  const [bookModal, setBookModal] = useState({
    isOpen: false,
    doctor: null,
    date: new Date().toISOString().split('T')[0],
    slot: '10:00 AM',
    patientId: '',
    patientName: '',
    patientCustomId: '',
    type: 'Consultation',
    reason: '',
    priority: 'Routine'
  });

  const standardSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  useEffect(() => {
    fetchData();

    // Socket.IO real-time availability updates
    const socket = getSocket();
    if (socket) {
      const handleDoctorUpdate = () => {
        fetchData();
      };
      socket.on('DOCTOR_AVAILABLE', handleDoctorUpdate);
      socket.on('CONSULTATION_STARTED', handleDoctorUpdate);
      socket.on('CONSULTATION_COMPLETED', handleDoctorUpdate);

      return () => {
        socket.off('DOCTOR_AVAILABLE', handleDoctorUpdate);
        socket.off('CONSULTATION_STARTED', handleDoctorUpdate);
        socket.off('CONSULTATION_COMPLETED', handleDoctorUpdate);
      };
    }
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('userToken');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [usersRes, patientsRes, appRes] = await Promise.all([
        fetch('/api/users', { headers }),
        fetch('/api/patients', { headers }),
        fetch('/api/appointments', { headers })
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        const docs = data.filter(u => u.role === 'Doctor');
        setDoctors(docs);
      }
      if (patientsRes.ok) {
        setPatients(await patientsRes.json());
      }
      if (appRes.ok) {
        setAppointments(await appRes.json());
      }
    } catch (err) {
      console.error('Error fetching doctor schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = doctors.filter(doc => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      doc.name?.toLowerCase().includes(q) ||
      doc.department?.toLowerCase().includes(q) ||
      doc.specialization?.toLowerCase().includes(q) ||
      doc.cabinNumber?.toLowerCase().includes(q);

    const matchesDept = departmentFilter === 'All' || doc.department === departmentFilter;
    const docStatus = doc.availability?.status || 'Available';
    const matchesStatus = statusFilter === 'All' || docStatus === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Consultation':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'In Emergency / OT':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'On Leave':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Off Duty':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  // Check occupied slots for a doctor on a specific date
  const getDoctorSlotsForDate = (doctorName, dateStr) => {
    const docClean = doctorName.replace(/^Dr\.\s*/i, '').trim();
    const booked = appointments
      .filter(a => {
        const appDoc = (a.doctorName || '').replace(/^Dr\.\s*/i, '').trim();
        return (
          appDoc.toLowerCase() === docClean.toLowerCase() &&
          a.appointmentDate === dateStr &&
          a.status !== 'Cancelled'
        );
      })
      .map(a => a.appointmentTime);

    return standardSlots.map(slot => ({
      slot,
      isBooked: booked.includes(slot)
    }));
  };

  const handleOpenBooking = (doc, preselectedSlot = '10:00 AM', preselectedDate = null) => {
    setBookModal({
      isOpen: true,
      doctor: doc,
      date: preselectedDate || scheduleModal.selectedDate || new Date().toISOString().split('T')[0],
      slot: preselectedSlot,
      patientId: '',
      patientName: '',
      patientCustomId: '',
      type: 'Consultation',
      reason: '',
      priority: 'Routine'
    });
  };

  const handleSelectPatientForDirectBooking = (pId) => {
    const p = patients.find(pat => pat._id === pId);
    if (p) {
      setBookModal(prev => ({
        ...prev,
        patientId: p._id,
        patientName: p.fullName,
        patientCustomId: p.patientId
      }));
    }
  };

  const handleCreateDirectBooking = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('userToken');
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: bookModal.patientId || null,
          patientName: bookModal.patientName,
          patientCustomId: bookModal.patientCustomId,
          department: bookModal.doctor.department || 'General Medicine',
          doctorName: bookModal.doctor.name.startsWith('Dr.') ? bookModal.doctor.name : `Dr. ${bookModal.doctor.name}`,
          appointmentDate: bookModal.date,
          appointmentTime: bookModal.slot,
          type: bookModal.type,
          reason: bookModal.reason || 'Clinical Consultation',
          priority: bookModal.priority
        })
      });

      const data = await res.json();
      if (res.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Appointment Booked!',
          html: `Slot <b>${bookModal.slot}</b> on <b>${bookModal.date}</b> confirmed for <b>${bookModal.patientName}</b> with <b>${bookModal.doctor.name}</b>.`,
          confirmButtonColor: '#0066cc'
        });
        setBookModal({ ...bookModal, isOpen: false });
        if (scheduleModal.isOpen) {
          fetchData();
        }
      } else {
        Swal.fire('Slot Unavailable', data.message || 'Could not schedule appointment.', 'warning');
      }
    } catch (err) {
      Swal.fire('Error', 'Server connection error', 'error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col space-y-5">
      {/* Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066cc] flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">medical_services</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Doctor Availability & Slot Directory</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                Check active physician schedules, consultation suites, and book available patient time slots
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200">
            <span className="material-symbols-outlined text-sm text-slate-500">lock</span> Read-Only Roster
          </span>
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-[#0066cc] bg-slate-50 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
            title="Refresh list"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search doctor, specialization, cabin..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#0066cc]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="All">All Departments</option>
            <option value="Cardiology">Cardiology</option>
            <option value="Neurology">Neurology</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Emergency Care">Emergency Care</option>
            <option value="Pulmonology">Pulmonology</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none"
          >
            <option value="All">All Availability</option>
            <option value="Available">Available</option>
            <option value="In Consultation">In Consultation</option>
            <option value="In Emergency / OT">In Emergency / OT</option>
            <option value="On Leave">On Leave</option>
            <option value="Off Duty">Off Duty</option>
          </select>

          <span className="text-xs font-bold text-slate-500 whitespace-nowrap pl-2">
            {filtered.length} Doctors
          </span>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#0066cc] mb-2">sync</span>
            <p className="text-xs">Loading doctor availability directory...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_search</span>
            <p className="text-sm font-semibold text-slate-600">No doctors found matching current filters.</p>
          </div>
        ) : (
          filtered.map(doc => {
            const availStatus = doc.availability?.status || 'Available';
            const cabin = doc.cabinNumber || 'Consultation Suite 102';
            const shift = doc.availability?.shiftHours || '09:00 AM - 05:00 PM';
            const onCall = doc.availability?.emergencyOnCall !== false;
            const isDoctorAvailable = availStatus !== 'On Leave' && availStatus !== 'Off Duty';

            return (
              <div 
                key={doc._id} 
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 hover:border-[#0066cc]/40"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#0066cc] text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-xs">
                        {doc.name?.replace(/^Dr\.\s*/i, '').charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">
                          {doc.name?.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`}
                        </h3>
                        <p className="text-xs font-semibold text-[#0066cc]">{doc.department || 'Cardiology'}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(availStatus)}`}>
                      {availStatus}
                    </span>
                  </div>

                  <div className="mt-4 bg-slate-50 p-3 rounded-xl space-y-1.5 text-xs border border-slate-100">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Specialization:</span>
                      <strong className="text-slate-800 font-semibold">{doc.specialization || 'Clinical Specialist'}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Cabin / Room:</span>
                      <span className="text-slate-700 font-medium">{cabin}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">Duty Hours:</span>
                      <span className="text-slate-700 font-medium">{shift}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400">On-Call ER:</span>
                      <span className={`font-bold ${onCall ? 'text-rose-600' : 'text-slate-500'}`}>
                        {onCall ? 'Active On-Call' : 'Routine Shifts'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => setScheduleModal({
                      isOpen: true,
                      doctor: doc,
                      selectedDate: new Date().toISOString().split('T')[0]
                    })}
                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">calendar_month</span> View Slots
                  </button>

                  <button
                    onClick={() => handleOpenBooking(doc)}
                    disabled={!isDoctorAvailable}
                    className="flex-1 py-2 bg-[#0066cc] hover:bg-[#0055b3] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">event_available</span> Book Slot
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Schedule & Slot Inspector Modal */}
      {scheduleModal.isOpen && scheduleModal.doctor && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setScheduleModal({ ...scheduleModal, isOpen: false })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '34rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#0066cc] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-2xl">schedule</span>
                <h3 className="font-bold text-white text-base">
                  {scheduleModal.doctor.name} - Slot Availability
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setScheduleModal({ ...scheduleModal, isOpen: false })} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Select Inspection Date:</span>
                <input
                  type="date"
                  value={scheduleModal.selectedDate}
                  onChange={(e) => setScheduleModal({ ...scheduleModal, selectedDate: e.target.value })}
                  className="p-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
                  Time Slots for {scheduleModal.selectedDate}
                </h4>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {getDoctorSlotsForDate(scheduleModal.doctor.name, scheduleModal.selectedDate).map(({ slot, isBooked }) => (
                    <button
                      key={slot}
                      disabled={isBooked}
                      onClick={() => handleOpenBooking(scheduleModal.doctor, slot, scheduleModal.selectedDate)}
                      className={`p-2.5 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all ${
                        isBooked
                          ? 'bg-rose-50 text-rose-700 border-rose-200 opacity-60 cursor-not-allowed'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-600 hover:text-white cursor-pointer shadow-2xs'
                      }`}
                    >
                      <span>{slot}</span>
                      <span className="text-[10px] font-normal">
                        {isBooked ? 'Booked' : 'Available'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900">
                <strong>Read-Only Notice:</strong> Front-desk staff can schedule appointments into vacant slots. Altering doctor profiles, shift assignments, or departmental roles is reserved for Hospital Administrators.
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setScheduleModal({ ...scheduleModal, isOpen: false })}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Booking Modal */}
      {bookModal.isOpen && bookModal.doctor && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto"
          onClick={() => setBookModal({ ...bookModal, isOpen: false })}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up"
            style={{ width: '100%', maxWidth: '32rem', minWidth: '320px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-[#0066cc] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-white text-2xl">event_available</span>
                <h3 className="font-bold text-white text-base">Book Appointment</h3>
              </div>
              <button 
                type="button"
                onClick={() => setBookModal({ ...bookModal, isOpen: false })} 
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateDirectBooking} className="p-6 space-y-4">
              <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Physician:</span>
                  <strong className="text-[#0066cc]">{bookModal.doctor.name} ({bookModal.doctor.department})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Slot:</span>
                  <strong className="text-slate-800">{bookModal.date} at {bookModal.slot}</strong>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Choose Existing Registered Patient
                </label>
                <select
                  value={bookModal.patientId}
                  onChange={(e) => handleSelectPatientForDirectBooking(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0066cc]"
                >
                  <option value="">-- Choose Registered Patient or type below --</option>
                  {patients.map(p => (
                    <option key={p._id} value={p._id}>{p.fullName} ({p.patientId}) - {p.phone}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Patient Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Anand Roy"
                    value={bookModal.patientName}
                    onChange={(e) => setBookModal({ ...bookModal, patientName: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#0066cc]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Patient ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. PID-100234"
                    value={bookModal.patientCustomId}
                    onChange={(e) => setBookModal({ ...bookModal, patientCustomId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#0066cc]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">Reason / Symptoms</label>
                <input
                  type="text"
                  placeholder="Primary consultation reason..."
                  value={bookModal.reason}
                  onChange={(e) => setBookModal({ ...bookModal, reason: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-[#0066cc]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setBookModal({ ...bookModal, isOpen: false })}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0066cc] text-white text-xs font-bold rounded-lg hover:bg-[#0055b3] transition-colors shadow-sm"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

