import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Swal from 'sweetalert2';

export default function AppointmentsAdmissionsQueue() {
  const [admissions, setAdmissions] = useState([
    { id: '#4459012', initials: 'SM', name: 'Sarah Mitchell', department: 'Cardiology', priority: 'Urgent', requested: '15 mins ago', bg: 'bg-primary/10', text: 'text-primary' },
    { id: '#4459122', initials: 'RK', name: 'Robert King', department: 'Orthopedics', priority: 'Routine', requested: '1 hour ago', bg: 'bg-tertiary/10', text: 'text-tertiary' },
    { id: '#4459450', initials: 'AL', name: 'Amanda Lee', department: 'Neurology', priority: 'Intermediate', requested: '2 hours ago', bg: 'bg-secondary/10', text: 'text-secondary' },
    { id: '#4459881', initials: 'JH', name: 'James Holt', department: 'General Ward', priority: 'Routine', requested: '3 hours ago', bg: 'bg-primary/10', text: 'text-primary' }
  ]);
  
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [rapidAdmission, setRapidAdmission] = useState({
    name: '',
    traumaLevel: 'Level 3 - Stable Emergency',
    targetUnit: 'Surgical Suite 4'
  });
  
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isViewAllOpen, setIsViewAllOpen] = useState(false);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const prevMonthDays = getDaysInMonth(year, month - 1);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDateClick = (day) => {
    setSelectedDate(new Date(year, month, day));
  };

  const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const mockAppointments = [
    { id: 1, date: formatDate(new Date()), time: '09:30 AM', doctor: 'Dr. Marcus Thorne', patient: 'Henry G. (Consultation)', status: 'Confirmed', actionType: 'Check In' },
    { id: 2, date: formatDate(new Date()), time: '11:15 AM', doctor: 'Dr. Sarah Jenkins', patient: 'Lucy F. (Post-Op Check)', status: 'Pending', actionType: 'Notify' },
    { id: 3, date: formatDate(new Date()), time: '01:00 PM', doctor: 'Dr. Kevin Zhang', patient: 'William S. (Dialysis)', status: 'Admitted', actionType: null, subtext: 'Ward 4, Bed 12' },
    { id: 4, date: formatDate(new Date()), time: '02:30 PM', doctor: 'Dr. Emily Watson', patient: 'Tom H. (Routine Labs)', status: 'Confirmed', actionType: 'Check In' },
  ];
  
  // Add an appointment for tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  mockAppointments.push({ id: 5, date: formatDate(tomorrow), time: '10:00 AM', doctor: 'Dr. Alan Grant', patient: 'Tim M. (Follow-up)', status: 'Confirmed', actionType: 'Check In' });
  // Add an appointment for yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  mockAppointments.push({ id: 6, date: formatDate(yesterday), time: '04:00 PM', doctor: 'Dr. Ellie Sattler', patient: 'Ian M. (Consultation)', status: 'Pending', actionType: 'Notify' });

  const currentDayAppointments = mockAppointments.filter(app => app.date === formatDate(selectedDate));

  
  const handleRapidAdmission = (e) => {
    e.preventDefault();
    if (!rapidAdmission.name) return;

    const newId = `#${Math.floor(1000000 + Math.random() * 9000000)}`;
    const initials = rapidAdmission.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
    
    const admissionEntry = {
      id: newId,
      initials,
      name: rapidAdmission.name,
      department: rapidAdmission.targetUnit,
      priority: rapidAdmission.traumaLevel.includes('Critical') || rapidAdmission.traumaLevel.includes('High') ? 'Urgent' : 'Intermediate',
      requested: 'Just now',
      bg: 'bg-error-container',
      text: 'text-on-error-container'
    };
    
    setAdmissions([admissionEntry, ...admissions]);
    
    Swal.fire({
      icon: 'warning',
      iconColor: '#ba1a1a',
      title: 'RAPID ADMISSION EXECUTED',
      text: `${rapidAdmission.name} has been rushed to ${rapidAdmission.targetUnit} under ${rapidAdmission.traumaLevel}.`,
      confirmButtonColor: '#ba1a1a',
      confirmButtonText: 'ACKNOWLEDGE'
    });

    setRapidAdmission({ name: '', traumaLevel: 'Level 3 - Stable Emergency', targetUnit: 'Surgical Suite 4' });
  };

  const handleAppointmentAction = (action, patientName) => {
    Swal.fire({
      icon: 'success',
      title: 'Action Successful',
      text: `${action} triggered for ${patientName}.`,
      timer: 2000,
      showConfirmButton: false
    });
  };

  // Calendar rendering helpers
  const renderCalendarDays = () => {
    const days = [];
    // Previous month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push(
        <button key={`prev-${i}`} className="py-2 text-label-md text-on-surface-variant/40 cursor-default" disabled>
          {prevMonthDays - i}
        </button>
      );
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const isSelected = selectedDate.getDate() === i && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
      days.push(
        <button 
          key={`day-${i}`} 
          onClick={() => handleDateClick(i)}
          className={`py-2 text-label-md transition-colors ${isSelected ? 'font-bold bg-primary text-on-primary rounded-full hover:bg-primary/90' : 'text-on-surface hover:bg-surface-container-high rounded-full'}`}
        >
          {i}
        </button>
      );
    }
    // Next month padding (to fill 42 slots max)
    const totalSlots = days.length;
    const remaining = (7 - (totalSlots % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push(
        <button key={`next-${i}`} className="py-2 text-label-md text-on-surface-variant/40 cursor-default" disabled>
          {i}
        </button>
      );
    }
    return days;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;
  const totalPages = Math.ceil(admissions.length / itemsPerPage);
  const currentAdmissions = admissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  
  const [newAdmission, setNewAdmission] = useState({
    name: '',
    department: 'Cardiology',
    priority: 'Routine',
  });

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(admissions.map(a => ({
      'Patient Name': a.name,
      'ID': a.id,
      'Department': a.department,
      'Priority': a.priority,
      'Requested': a.requested
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Admissions");
    XLSX.writeFile(wb, "AdmissionsQueue.xlsx");
    setIsExportOpen(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Admission Approval Queue", 14, 15);
    doc.autoTable({
      head: [['Patient Name', 'ID', 'Ward / Unit', 'Priority', 'Requested']],
      body: admissions.map(a => [a.name, a.id, a.department, a.priority, a.requested]),
      startY: 20
    });
    doc.save("AdmissionsQueue.pdf");
    setIsExportOpen(false);
  };

  const handleAddAdmission = (e) => {
    e.preventDefault();
    const newId = `#${Math.floor(1000000 + Math.random() * 9000000)}`;
    const initials = newAdmission.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'NA';
    
    const colors = [
      { bg: 'bg-primary/10', text: 'text-primary' },
      { bg: 'bg-secondary/10', text: 'text-secondary' },
      { bg: 'bg-tertiary/10', text: 'text-tertiary' }
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const admissionEntry = {
      id: newId,
      initials,
      name: newAdmission.name,
      department: newAdmission.department,
      priority: newAdmission.priority,
      requested: 'Just now',
      bg: color.bg,
      text: color.text
    };
    setAdmissions([admissionEntry, ...admissions]);
    setIsModalOpen(false);
    
    Swal.fire({
      icon: 'success',
      title: 'Admission Added',
      text: `${admissionEntry.name} has been added to ${admissionEntry.department} with ${admissionEntry.priority} priority.`,
      confirmButtonColor: '#00478d'
    });

    setNewAdmission({ name: '', department: 'Cardiology', priority: 'Routine' });
  };

  return (
    <div className="w-full">
      
<header className="mb-lg">
<div className="flex justify-between items-end">
<div>
<h2 className="font-display-lg text-display-lg text-on-surface">Admission Management</h2>
<p className="text-body-lg text-on-surface-variant">Real-time control center for upcoming appointments and hospital admissions.</p>
</div>
<div className="flex gap-3">
<div className="relative">
<button onClick={() => setIsExportOpen(!isExportOpen)} className="flex items-center gap-2 px-4 py-2 border border-outline text-on-surface font-semibold rounded-lg hover:bg-surface-container-low transition-colors">
<span className="material-symbols-outlined text-xl">file_download</span>
                        Export Report
                    </button>
{isExportOpen && (
<div className="absolute top-full right-0 mt-2 bg-surface border border-outline-variant rounded-lg shadow-lg w-48 z-50 overflow-hidden">
<button onClick={exportToExcel} className="w-full text-left px-4 py-3 hover:bg-surface-container-low text-on-surface flex items-center gap-2 transition-colors">
<span className="material-symbols-outlined text-sm">table_view</span> Excel (.xlsx)
</button>
<button onClick={exportToPDF} className="w-full text-left px-4 py-3 hover:bg-surface-container-low text-on-surface flex items-center gap-2 transition-colors">
<span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF (.pdf)
</button>
</div>
)}
</div>
<button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:shadow-lg transition-all">
<span className="material-symbols-outlined text-xl">add</span>
                        New Admission
                    </button>
</div>
</div>
</header>
{/* Bento Grid Content */}
<div className="bento-grid grid grid-cols-12 gap-lg animate-fade-in animation-delay-100">
{/* Column 1 & 2: Admission Approval Queue (Left) */}
<section className="col-span-12 lg:col-span-8 space-y-lg">
{/* Admission Approval Queue Card */}
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
<div className="px-lg py-md border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
<div className="flex items-center gap-2">
<span className="material-symbols-outlined text-primary">pending_actions</span>
<h3 className="font-headline-md text-headline-md text-on-surface">Admission Approval Queue</h3>
</div>
<span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-label-md">12 Pending</span>
</div>
<div className="flex-1 overflow-auto custom-scrollbar">
<table className="w-full text-left border-collapse min-w-[700px]">
<thead className="sticky top-0 bg-surface-container-lowest z-10">
<tr className="text-label-md text-on-surface-variant uppercase tracking-wider border-b border-outline-variant">
<th className="px-lg py-4">Patient Name</th>
<th className="px-lg py-4">Ward / Unit</th>
<th className="px-lg py-4">Priority</th>
<th className="px-lg py-4">Requested</th>
<th className="px-lg py-4 text-right">Actions</th>
</tr>
</thead>
<tbody className="divide-y divide-outline-variant/30">
{currentAdmissions.map((admission, idx) => (
<tr key={idx} onClick={() => setSelectedPatient(admission)} className="hover:bg-primary/5 transition-colors cursor-pointer">
<td className="px-lg py-4">
<div className="flex items-center gap-3">
<div className={`h-8 w-8 rounded-full ${admission.bg} flex items-center justify-center ${admission.text} font-bold`}>{admission.initials}</div>
<div>
<p className="font-semibold text-on-surface">{admission.name}</p>
<p className="text-xs text-on-surface-variant">ID: {admission.id}</p>
</div>
</div>
</td>
<td className="px-lg py-4 text-body-md text-on-surface-variant">{admission.department}</td>
<td className="px-lg py-4">
{admission.priority === 'Urgent' ? (
<span className="status-badge bg-error-container text-on-error-container">
<span className="w-1.5 h-1.5 rounded-full bg-error"></span> Urgent
</span>
) : admission.priority === 'Intermediate' ? (
<span className="status-badge bg-secondary-container text-on-secondary-container">
<span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Intermediate
</span>
) : (
<span className="status-badge bg-surface-container-high text-on-surface-variant">
<span className="w-1.5 h-1.5 rounded-full bg-outline"></span> Routine
</span>
)}
</td>
<td className="px-lg py-4 text-body-md text-on-surface-variant">{admission.requested}</td>
<td className="px-lg py-4 text-right">
<div className="flex justify-end gap-2">
<button className="p-1.5 text-error hover:bg-error-container/20 rounded-md transition-colors"><span className="material-symbols-outlined">close</span></button>
<button className="p-1.5 text-secondary hover:bg-secondary-container/20 rounded-md transition-colors"><span className="material-symbols-outlined">check</span></button>
</div>
</td>
</tr>
))}
</tbody>
</table>
</div>
</div>
{/* Emergency Admission Form (Bento Large) */}
<div className="bg-primary/5 border border-primary/20 rounded-xl p-lg relative overflow-hidden group transition-all hover:shadow-md">
<div className="absolute top-0 right-0 p-4 opacity-10">
<span className="material-symbols-outlined text-[120px]" style={{"fontVariationSettings":"'FILL' 1"}}>emergency</span>
</div>
<div className="relative z-10">
<div className="flex items-center gap-3 mb-md">
<span className="material-symbols-outlined text-error font-bold">notification_important</span>
<h3 className="font-headline-md text-headline-md text-on-surface">Emergency Admission Rapid-Entry</h3>
</div>
<p className="text-body-md text-on-surface-variant mb-lg max-w-2xl">Use this form for high-criticality bypass admission. All validation rules are minimized for speed. Patient safety protocol remains mandatory upon arrival.</p>
<form onSubmit={handleRapidAdmission} className="grid grid-cols-1 md:grid-cols-3 gap-lg">
<div className="space-y-2">
<label className="text-label-md font-bold text-on-surface-variant">PATIENT NAME / UNKNOWN ID</label>
<input required value={rapidAdmission.name} onChange={(e) => setRapidAdmission({...rapidAdmission, name: e.target.value})} className="w-full bg-surface-container-lowest border border-outline rounded-lg py-3 px-4 focus:ring-error focus:border-error" placeholder="Full Name or Emergency Code" type="text"/>
</div>
<div className="space-y-2">
<label className="text-label-md font-bold text-on-surface-variant">TRAUMA LEVEL</label>
<select value={rapidAdmission.traumaLevel} onChange={(e) => setRapidAdmission({...rapidAdmission, traumaLevel: e.target.value})} className="w-full bg-surface-container-lowest border border-outline rounded-lg py-3 px-4 focus:ring-error focus:border-error">
<option>Level 1 - Critical</option>
<option>Level 2 - High</option>
<option>Level 3 - Stable Emergency</option>
</select>
</div>
<div className="space-y-2">
<label className="text-label-md font-bold text-on-surface-variant">TARGET UNIT</label>
<select value={rapidAdmission.targetUnit} onChange={(e) => setRapidAdmission({...rapidAdmission, targetUnit: e.target.value})} className="w-full bg-surface-container-lowest border border-outline rounded-lg py-3 px-4 focus:ring-error focus:border-error">
<option>ER Main Bay</option>
<option>ICU - Zone A</option>
<option>Surgical Suite 4</option>
</select>
</div>
<div className="md:col-span-3 flex justify-end pt-2">
<button className="px-8 py-3 bg-error text-on-error font-bold rounded-lg shadow-lg hover:bg-error/90 active:scale-95 transition-all flex items-center gap-2" type="submit">
<span className="material-symbols-outlined">bolt</span>
                                    EXECUTE RAPID ADMISSION
                                </button>
</div>
</form>
</div>
</div>
</section>
{/* Column 3: Calendar & Upcoming (Right) */}
<section className="col-span-12 lg:col-span-4 space-y-lg">
{/* Calendar Widget */}
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-lg">
<div className="flex justify-between items-center mb-md">
<h4 className="font-headline-md text-headline-md text-on-surface">September 2024</h4>
<div className="flex gap-1">
<button className="p-1 hover:bg-surface-container-low rounded"><span className="material-symbols-outlined">chevron_left</span></button>
<button className="p-1 hover:bg-surface-container-low rounded"><span className="material-symbols-outlined">chevron_right</span></button>
</div>
</div>
<div className="grid grid-cols-7 gap-1 text-center mb-2">
<span className="text-[10px] font-bold text-on-surface-variant">S</span>
<span className="text-[10px] font-bold text-on-surface-variant">M</span>
<span className="text-[10px] font-bold text-on-surface-variant">T</span>
<span className="text-[10px] font-bold text-on-surface-variant">W</span>
<span className="text-[10px] font-bold text-on-surface-variant">T</span>
<span className="text-[10px] font-bold text-on-surface-variant">F</span>
<span className="text-[10px] font-bold text-on-surface-variant">S</span>
</div>
<div className="grid grid-cols-7 gap-2 text-center">
<button className="py-2 text-label-md text-on-surface-variant/40">28</button>
<button className="py-2 text-label-md text-on-surface-variant/40">29</button>
<button className="py-2 text-label-md text-on-surface-variant/40">30</button>
<button className="py-2 text-label-md text-on-surface-variant/40">31</button>
<button className="py-2 text-label-md text-on-surface">1</button>
<button className="py-2 text-label-md text-on-surface">2</button>
<button className="py-2 text-label-md text-on-surface">3</button>
<button className="py-2 text-label-md text-on-surface">4</button>
<button className="py-2 text-label-md text-on-surface">5</button>
<button className="py-2 text-label-md text-on-surface">6</button>
<button className="py-2 text-label-md text-on-surface font-bold bg-primary-container text-on-primary-container rounded-full">7</button>
<button className="py-2 text-label-md text-on-surface">8</button>
<button className="py-2 text-label-md text-on-surface">9</button>
<button className="py-2 text-label-md text-on-surface">10</button>
<button className="py-2 text-label-md text-on-surface">11</button>
<button className="py-2 text-label-md text-on-surface">12</button>
<button className="py-2 text-label-md text-on-surface">13</button>
<button className="py-2 text-label-md text-on-surface">14</button>
<button className="py-2 text-label-md text-on-surface">15</button>
<button className="py-2 text-label-md text-on-surface">16</button>
<button className="py-2 text-label-md text-on-surface">17</button>
<button className="py-2 text-label-md text-on-surface">18</button>
</div>
</div>
{/* Upcoming Appointments List */}
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col h-[525px]">
<div className="px-lg py-md border-b border-outline-variant flex justify-between items-center">
<h3 className="font-headline-md text-headline-md text-on-surface">Today's Appointments</h3>
<span className="text-label-md text-primary font-bold cursor-pointer hover:underline">View All</span>
</div>
<div className="flex-1 overflow-y-auto custom-scrollbar p-lg space-y-4">
{/* Appointment 1 */}
<div className="p-4 rounded-xl border border-outline-variant/50 bg-surface hover:border-primary transition-all group">
<div className="flex justify-between items-start mb-2">
<span className="text-primary font-bold text-body-sm">09:30 AM</span>
<span className="status-badge bg-secondary-container/20 text-on-secondary-container">Confirmed</span>
</div>
<h5 className="font-bold text-on-surface group-hover:text-primary transition-colors">Dr. Marcus Thorne</h5>
<p className="text-body-sm text-on-surface-variant">Patient: Henry G. (Consultation)</p>
<div className="mt-3 flex gap-2">
<button className="flex-1 py-1.5 bg-primary-container/10 text-primary rounded text-label-md font-bold hover:bg-primary-container/20">Check In</button>
<button className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded"><span className="material-symbols-outlined text-sm">more_vert</span></button>
</div>
</div>
{/* Appointment 2 */}
<div className="p-4 rounded-xl border border-outline-variant/50 bg-surface hover:border-primary transition-all group">
<div className="flex justify-between items-start mb-2">
<span className="text-primary font-bold text-body-sm">11:15 AM</span>
<span className="status-badge bg-tertiary-container/20 text-on-tertiary-container">Pending</span>
</div>
<h5 className="font-bold text-on-surface group-hover:text-primary transition-colors">Dr. Sarah Jenkins</h5>
<p className="text-body-sm text-on-surface-variant">Patient: Lucy F. (Post-Op Check)</p>
<div className="mt-3 flex gap-2">
<button className="flex-1 py-1.5 bg-primary-container/10 text-primary rounded text-label-md font-bold hover:bg-primary-container/20">Notify</button>
<button className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded"><span className="material-symbols-outlined text-sm">more_vert</span></button>
</div>
</div>
{/* Appointment 3 */}
<div className="p-4 rounded-xl border border-outline-variant/50 bg-primary/5 border-primary/30">
<div className="flex justify-between items-start mb-2">
<span className="text-primary font-bold text-body-sm">01:00 PM</span>
<span className="status-badge bg-primary text-on-primary">Admitted</span>
</div>
<h5 className="font-bold text-on-surface">Dr. Kevin Zhang</h5>
<p className="text-body-sm text-on-surface-variant">Patient: William S. (Dialysis)</p>
<p className="text-[10px] mt-2 text-primary font-semibold flex items-center gap-1">
<span className="material-symbols-outlined text-[10px]">location_on</span> Ward 4, Bed 12
                            </p>
</div>
{/* Appointment 4 */}
<div className="p-4 rounded-xl border border-outline-variant/50 bg-surface hover:border-primary transition-all group">
<div className="flex justify-between items-start mb-2">
<span className="text-primary font-bold text-body-sm">02:30 PM</span>
<span className="status-badge bg-secondary-container/20 text-on-secondary-container">Confirmed</span>
</div>
<h5 className="font-bold text-on-surface group-hover:text-primary transition-colors">Dr. Emily Watson</h5>
<p className="text-body-sm text-on-surface-variant">Patient: Tom H. (Routine Labs)</p>
<div className="mt-3 flex gap-2">
<button className="flex-1 py-1.5 bg-primary-container/10 text-primary rounded text-label-md font-bold hover:bg-primary-container/20">Check In</button>
<button className="p-1.5 text-on-surface-variant hover:bg-surface-container-high rounded"><span className="material-symbols-outlined text-sm">more_vert</span></button>
</div>
</div>
</div>
</div>
</section>
</div>

      {/* New Admission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-[90%] md:w-[450px] overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h3 className="font-headline-md text-on-surface">New Admission</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddAdmission} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-label-md font-bold text-on-surface-variant">PATIENT NAME</label>
                <input 
                  required
                  type="text"
                  value={newAdmission.name}
                  onChange={(e) => setNewAdmission({...newAdmission, name: e.target.value})}
                  className="w-full bg-surface-container-lowest border border-outline rounded-lg py-2 px-3 focus:ring-primary focus:border-primary text-on-surface"
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-label-md font-bold text-on-surface-variant">WARD / UNIT</label>
                <select 
                  value={newAdmission.department}
                  onChange={(e) => setNewAdmission({...newAdmission, department: e.target.value})}
                  className="w-full bg-surface-container-lowest border border-outline rounded-lg py-2 px-3 focus:ring-primary focus:border-primary text-on-surface"
                >
                  <option>General Ward</option>
                  <option>ICU</option>
                  <option>Emergency Room</option>
                  <option>Surgery</option>
                  <option>Maternity</option>
                  <option>Pediatrics</option>
                  <option>Private Room</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-label-md font-bold text-on-surface-variant">PRIORITY</label>
                <select 
                  value={newAdmission.priority}
                  onChange={(e) => setNewAdmission({...newAdmission, priority: e.target.value})}
                  className="w-full bg-surface-container-lowest border border-outline rounded-lg py-2 px-3 focus:ring-primary focus:border-primary text-on-surface"
                >
                  <option>Routine</option>
                  <option>Intermediate</option>
                  <option>Urgent</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline text-on-surface font-semibold rounded-lg hover:bg-surface-container-low transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:shadow-lg transition-all"
                >
                  Add Admission
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-[90%] md:w-[450px] overflow-hidden animate-fade-in relative">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <h3 className="font-headline-md text-on-surface">Admission Details</h3>
              <button onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); }} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 border-b border-outline-variant pb-4">
                <div className={`h-16 w-16 rounded-full ${selectedPatient.bg} flex items-center justify-center ${selectedPatient.text} text-2xl font-bold`}>
                  {selectedPatient.initials}
                </div>
                <div>
                  <h2 className="text-headline-lg font-bold text-on-surface">{selectedPatient.name}</h2>
                  <p className="text-body-lg text-on-surface-variant">ID: {selectedPatient.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-label-md font-bold text-on-surface-variant mb-1">WARD / UNIT</p>
                  <p className="text-body-lg text-on-surface">{selectedPatient.department}</p>
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface-variant mb-1">PRIORITY</p>
                  <p className="text-body-lg text-on-surface">{selectedPatient.priority}</p>
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface-variant mb-1">REQUESTED</p>
                  <p className="text-body-lg text-on-surface">{selectedPatient.requested}</p>
                </div>
                <div>
                  <p className="text-label-md font-bold text-on-surface-variant mb-1">STATUS</p>
                  <p className="text-body-lg text-on-surface text-primary font-semibold">Pending Approval</p>
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3 border-t border-outline-variant mt-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedPatient(null); }}
                  className="px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:shadow-lg transition-all w-full"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* View All Appointments Modal */}
      {isViewAllOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in relative flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <div>
                <h3 className="font-headline-md text-on-surface">All Appointments</h3>
                <p className="text-label-md text-on-surface-variant">{selectedDate.toDateString()}</p>
              </div>
              <button onClick={() => setIsViewAllOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {currentDayAppointments.length > 0 ? currentDayAppointments.map((app) => (
                <div key={`modal-${app.id}`} className="flex justify-between items-center p-4 border border-outline-variant rounded-lg">
                  <div>
                    <h4 className="font-bold text-on-surface">{app.patient}</h4>
                    <p className="text-body-sm text-on-surface-variant">{app.time} - {app.doctor}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-label-md font-bold text-primary">{app.status}</span>
                    {app.actionType && (
                      <button onClick={() => handleAppointmentAction(app.actionType, app.patient)} className="px-4 py-1.5 bg-primary-container/10 text-primary rounded text-label-md font-bold hover:bg-primary-container/20">
                        {app.actionType}
                      </button>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-on-surface-variant">No appointments found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
