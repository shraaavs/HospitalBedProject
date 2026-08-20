import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboardMediFlowDesktop() {
  const navigate = useNavigate();
  const handleRequestReplenishment = () => {
    const lowStockItems = ['Ventilators (Portable)'];
    if (lowStockItems.length > 0) {
      alert(`Replenishment request sent to Resource Allocation module for: ${lowStockItems.join(', ')}`);
    } else {
      alert('All critical resources are adequately stocked.');
    }
  };

  return (
    <div className="w-full">
      
{/* Header Section */}
<header className="mb-lg flex justify-between items-end">
<div>
<h2 className="text-display-lg font-display-lg text-on-surface">Dashboard</h2>
<p className="text-body-lg text-on-surface-variant">System-wide resource overview and real-time status.</p>
</div>

</header>
{/* Quick Stats Grid */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl animate-fade-in animation-delay-100">
<div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-primary/10 rounded-lg">
<span className="material-symbols-outlined text-primary">bed</span>
</div>
<span className="text-label-md text-error font-bold">+2% from avg</span>
</div>
<h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-xs">Total Beds</h3>
<p className="text-headline-lg font-headline-lg text-on-surface">450</p>
<div className="mt-md w-full bg-surface-container rounded-full h-2">
<div className="bg-primary h-2 rounded-full" style={{"width":"85%"}}></div>
</div>
<p className="text-body-sm text-on-surface-variant mt-sm">85% Occupied</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-secondary/10 rounded-lg">
<span className="material-symbols-outlined text-secondary">monitor_heart</span>
</div>
<span className="text-label-md text-secondary font-bold">Stable</span>
</div>
<h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-xs">ICU Availability</h3>
<p className="text-headline-lg font-headline-lg text-on-surface">12/40</p>
<div className="mt-md flex gap-1 h-2">
<div className="bg-error rounded-full flex-grow" style={{"flexBasis":"70%"}}></div>
<div className="bg-surface-container rounded-full flex-grow" style={{"flexBasis":"30%"}}></div>
</div>
<p className="text-body-sm text-on-surface-variant mt-sm">30% Available</p>
</div>
<div className="bg-error-container p-lg rounded-xl shadow-sm border border-error/20 hover:shadow-md transition-shadow animate-pulse">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-error/20 rounded-lg">
<span className="material-symbols-outlined text-error" data-weight="fill">emergency</span>
</div>
<span className="text-label-md text-error font-extrabold">URGENT</span>
</div>
<h3 className="text-label-md text-on-error-container uppercase tracking-wider mb-xs">Emergency Requests</h3>
<p className="text-headline-lg font-headline-lg text-on-error-container">3 Active</p>
<p className="text-body-sm text-on-error-container/80 mt-sm">Awaiting triage assignment</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-shadow">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-tertiary/10 rounded-lg">
<span className="material-symbols-outlined text-tertiary">badge</span>
</div>
<span className="text-label-md text-tertiary font-bold">Full Shift</span>
</div>
<h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-xs">Staff on Duty</h3>
<p className="text-headline-lg font-headline-lg text-on-surface">124</p>
<p className="text-body-sm text-on-surface-variant mt-sm">18 Physicians, 82 Nurses, 24 Support</p>
</div>
</div>
{/* Bento Grid Main Content */}
<div className="grid grid-cols-12 gap-lg items-start animate-fade-in animation-delay-200">
{/* Real-Time Bed Status Chart (Left Column) */}
<div className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg">
<div className="flex justify-between items-center mb-xl">
<h3 className="text-headline-md font-headline-md">Bed Capacity by Ward</h3>
<div className="flex items-center gap-md">
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-error"></span>
<span className="text-label-md">Occupied</span>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-secondary-container"></span>
<span className="text-label-md">Cleaning</span>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-[#10b981]"></span>
<span className="text-label-md">Available</span>
</div>
</div>
</div>
<div className="space-y-xl">
{/* General Ward */}
<div className="space-y-sm">
<div className="flex justify-between items-end">
<span className="text-body-md font-bold">General Ward (A-D)</span>
<span className="text-body-sm text-on-surface-variant">210 / 250 Beds</span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width":"80%"}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width":"12%"}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width":"8%"}}></div>
</div>
</div>
{/* ICU */}
<div className="space-y-sm">
<div className="flex justify-between items-end">
<span className="text-body-md font-bold">Intensive Care Unit (ICU)</span>
<span className="text-body-sm text-on-surface-variant">28 / 40 Beds</span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width":"70%"}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width":"10%"}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width":"20%"}}></div>
</div>
</div>
{/* Pediatric */}
<div className="space-y-sm">
<div className="flex justify-between items-end">
<span className="text-body-md font-bold">Pediatric Ward</span>
<span className="text-body-sm text-on-surface-variant">45 / 60 Beds</span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width":"75%"}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width":"5%"}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width":"20%"}}></div>
</div>
</div>
{/* Isolation */}
<div className="space-y-sm">
<div className="flex justify-between items-end">
<span className="text-body-md font-bold">Isolation Units</span>
<span className="text-body-sm text-on-surface-variant">95 / 100 Beds</span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width":"95%"}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width":"2%"}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width":"3%"}}></div>
</div>
</div>
</div>
<div className="mt-xl pt-lg border-t border-outline-variant">
<div className="grid grid-cols-3 gap-md">
<div className="text-center border-r border-outline-variant">
<p className="text-headline-md font-bold text-on-surface">42 min</p>
<p className="text-label-md text-on-surface-variant uppercase">Avg. Discharge Time</p>
</div>
<div className="text-center border-r border-outline-variant">
<p className="text-headline-md font-bold text-on-surface">18%</p>
<p className="text-label-md text-on-surface-variant uppercase">Cleaning Turnaround</p>
</div>
<div className="text-center">
<p className="text-headline-md font-bold text-on-surface">12</p>
<p className="text-label-md text-on-surface-variant uppercase">Beds in Maintenance</p>
</div>
</div>
</div>
</div>
{/* Resource Tracking Table (Right Column Top) */}
<div className="col-span-12 lg:col-span-4 space-y-lg">
<div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg">
<div className="flex justify-between items-center mb-lg">
<h3 className="text-headline-md font-headline-md">Critical Resources</h3>
<a className="text-label-md text-primary font-bold hover:underline" href="#">View All</a>
</div>
<div className="space-y-lg">
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Oxygen Cylinders (H-Type)</span>
<span className="text-label-md font-bold text-on-surface">142/200</span>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-primary h-2 rounded-full" style={{"width":"71%"}}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Ventilators (Portable)</span>
<span className="text-label-md font-bold text-error">4/40</span>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-error h-2 rounded-full" style={{"width":"10%"}}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Patient Monitors</span>
<span className="text-label-md font-bold text-on-surface">56/60</span>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-[#10b981] h-2 rounded-full" style={{"width":"93%"}}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Defibrillators</span>
<span className="text-label-md font-bold text-on-surface">18/20</span>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-[#10b981] h-2 rounded-full" style={{"width":"90%"}}></div>
</div>
</div>
</div>
<button onClick={handleRequestReplenishment} className="w-full mt-lg py-sm text-label-md font-bold border border-outline-variant rounded-lg hover:bg-surface-container transition-colors">
                        Request Replenishment
                    </button>
</div>
{/* Recent Admissions (Right Column Bottom) */}
<div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
<div className="p-lg bg-surface-container-low border-b border-outline-variant">
<h3 className="text-headline-md font-headline-md">Recent Admissions</h3>
</div>
<div className="divide-y divide-outline-variant">
{/* Patient 1 */}
<div className="p-md hover:bg-primary/5 transition-colors cursor-pointer group">
<div className="flex justify-between items-start">
<div>
<p className="text-body-md font-bold">Johnathan Blake</p>
<p className="text-label-md text-on-surface-variant">ID: #PX-9821 • Male, 45y</p>
</div>
<span className="px-xs py-[2px] bg-error-container text-on-error-container text-[10px] font-bold rounded uppercase">ICU-4</span>
</div>
<p className="text-body-sm text-on-surface-variant mt-xs line-clamp-1">Severe respiratory distress, chronic COPD history...</p>
<p className="text-label-md text-primary mt-xs font-medium">Admitted 12m ago</p>
</div>
{/* Patient 2 */}
<div className="p-md hover:bg-primary/5 transition-colors cursor-pointer">
<div className="flex justify-between items-start">
<div>
<p className="text-body-md font-bold">Elena Rodriguez</p>
<p className="text-label-md text-on-surface-variant">ID: #PX-9822 • Female, 28y</p>
</div>
<span className="px-xs py-[2px] bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-bold rounded uppercase">Gen-A12</span>
</div>
<p className="text-body-sm text-on-surface-variant mt-xs line-clamp-1">Post-operative recovery, appendectomy...</p>
<p className="text-label-md text-on-surface-variant mt-xs">Admitted 45m ago</p>
</div>
{/* Patient 3 */}
<div className="p-md hover:bg-primary/5 transition-colors cursor-pointer">
<div className="flex justify-between items-start">
<div>
<p className="text-body-md font-bold">Samuel Thompson</p>
<p className="text-label-md text-on-surface-variant">ID: #PX-9823 • Male, 62y</p>
</div>
<span className="px-xs py-[2px] bg-secondary-fixed text-on-secondary-fixed-variant text-[10px] font-bold rounded uppercase">Iso-02</span>
</div>
<p className="text-body-sm text-on-surface-variant mt-xs line-clamp-1">Suspected viral pneumonia, fever 102F...</p>
<p className="text-label-md text-on-surface-variant mt-xs">Admitted 1h 12m ago</p>
</div>
{/* Patient 4 */}
<div className="p-md hover:bg-primary/5 transition-colors cursor-pointer">
<div className="flex justify-between items-start">
<div>
<p className="text-body-md font-bold">Maria Garcia</p>
<p className="text-label-md text-on-surface-variant">ID: #PX-9824 • Female, 54y</p>
</div>
<span className="px-xs py-[2px] bg-tertiary-fixed text-on-tertiary-fixed-variant text-[10px] font-bold rounded uppercase">Gen-B05</span>
</div>
<p className="text-body-sm text-on-surface-variant mt-xs line-clamp-1">Elective orthopedic surgery preparation...</p>
<p className="text-label-md text-on-surface-variant mt-xs">Admitted 2h 05m ago</p>
</div>
</div>
<button onClick={() => navigate('/appointments')} className="w-full p-md text-center text-label-md font-bold text-primary hover:bg-surface-container-high transition-colors">
                        View All Admissions
                    </button>
</div>
</div>
</div>
{/* Animated Background Element (Subtle) */}
<div className="fixed bottom-0 right-0 w-64 h-64 pointer-events-none opacity-20">

</div>

    </div>
  );
}
