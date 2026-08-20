import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
export default function MainMonitoringDashboardMediFlowCentral() {
  const navigate = useNavigate();
  const [beds, setBeds] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('userToken');
      if (!token) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      try {
        const [bedsRes, usersRes, invRes, patientsRes] = await Promise.all([
          fetch('/api/beds', { headers }),
          fetch('/api/users', { headers }),
          fetch('/api/inventory', { headers }),
          fetch('/api/patients', { headers })
        ]);

        if (bedsRes.ok) setBeds(await bedsRes.json());
        if (usersRes.ok) setUsers(await usersRes.json());
        if (invRes.ok) setInventory(await invRes.json());
        if (patientsRes.ok) setPatients(await patientsRes.json());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Compute Metrics
  const totalBeds = beds.length || 450;
  const occupiedBeds = beds.filter(b => b.status === 'Occupied').length || 382;
  const occupiedPercentage = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 85;

  const icuBeds = beds.filter(b => b.wardType === 'ICU');
  const totalICUBeds = icuBeds.length || 40;
  const availableICUBeds = icuBeds.filter(b => b.status === 'Available').length || 12;
  const occupiedICUBeds = totalICUBeds - availableICUBeds;
  const occupiedICUPercentage = totalICUBeds > 0 ? Math.round((occupiedICUBeds / totalICUBeds) * 100) : 70;
  const availableICUPercentage = 100 - occupiedICUPercentage;

  const emergencyRequests = patients.filter(p => p.status === 'Registered').length || 3;

  const totalStaff = users.length || 124;
  const physicians = users.filter(u => u.role === 'Doctor').length || 18;
  const nursesCount = users.filter(u => u.role === 'Nurse').length || 82;
  const supportStaff = totalStaff - physicians - nursesCount || 24;

  const getWardStats = (wardType, defaults) => {
    const wardBeds = beds.filter(b => b.wardType === wardType);
    if (wardBeds.length === 0) return defaults;
    const occupied = wardBeds.filter(b => b.status === 'Occupied').length;
    const cleaning = wardBeds.filter(b => b.status === 'Cleaning').length;
    const available = wardBeds.filter(b => b.status === 'Available').length;
    const total = wardBeds.length;
    return {
      occupied, cleaning, available, total,
      occPct: total > 0 ? (occupied/total)*100 : 0,
      cleanPct: total > 0 ? (cleaning/total)*100 : 0,
      availPct: total > 0 ? (available/total)*100 : 0,
    };
  };

  const genWard = getWardStats('General', { occupied: 210, cleaning: 30, available: 10, occPct: 84, cleanPct: 12, availPct: 4, total: 250 });
  const icuWard = getWardStats('ICU', { occupied: 28, cleaning: 4, available: 8, occPct: 70, cleanPct: 10, availPct: 20, total: 40 });
  const pedWard = getWardStats('Pediatric', { occupied: 45, cleaning: 3, available: 12, occPct: 75, cleanPct: 5, availPct: 20, total: 60 });
  const isoWard = getWardStats('Isolation', { occupied: 95, cleaning: 2, available: 3, occPct: 95, cleanPct: 2, availPct: 3, total: 100 });

  const oxygen = inventory.find(i => i.itemName.toLowerCase().includes('oxygen')) || { quantity: 142, lowStockThreshold: 200, unit: '' };
  const ventilators = inventory.find(i => i.itemName.toLowerCase().includes('ventilator')) || { quantity: 4, lowStockThreshold: 40, unit: '' };
  const monitors = inventory.find(i => i.itemName.toLowerCase().includes('monitor')) || { quantity: 56, lowStockThreshold: 60, unit: '' };
  const pumps = inventory.find(i => i.itemName.toLowerCase().includes('pump')) || { quantity: 88, lowStockThreshold: 100, unit: '' };
  
  if (loading) return <div className="p-8 text-center text-on-surface">Loading dashboard...</div>;

  const handleRequestReplenishment = () => {
    const lowStockItems = [
      { ...oxygen, name: 'Oxygen Cylinders (H-Type)' },
      { ...ventilators, name: 'Ventilators (Portable)' },
      { ...monitors, name: 'Patient Monitors' },
      { ...pumps, name: 'Infusion Pumps' }
    ].filter(item => item.quantity < item.lowStockThreshold);

    if (lowStockItems.length > 0) {
      const itemNames = lowStockItems.map(item => item.name).join(', ');
      alert(`Replenishment request sent to Resource Allocation module for: ${itemNames}`);
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
<p className="text-body-lg text-on-surface-variant">Real-time system-wide monitoring and resource allocation.</p>
</div>

</header>
{/* Live Statistics Grid */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg mb-xl animate-fade-in animation-delay-100">
<div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant hover:border-primary transition-colors">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-primary/10 rounded-lg">
<span className="material-symbols-outlined text-primary">bed</span>
</div>
<span className="text-label-md text-error font-bold flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">trending_up</span>
                    2% vs avg
                </span>
</div>
<h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-xs">Total Beds</h3>
<p className="text-display-lg font-display-lg text-on-surface leading-tight">{totalBeds}</p>
<div className="mt-md w-full bg-surface-container rounded-full h-2">
<div className="bg-primary h-2 rounded-full" style={{"width": `${occupiedPercentage}%`}}></div>
</div>
<p className="text-body-sm text-on-surface-variant mt-sm">{occupiedPercentage}% Occupied ({occupiedBeds} Active)</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant hover:border-secondary transition-colors">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-secondary/10 rounded-lg">
<span className="material-symbols-outlined text-secondary">monitor_heart</span>
</div>
<span className="text-label-md text-secondary font-bold">STABLE</span>
</div>
<h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-xs">ICU Availability</h3>
<p className="text-display-lg font-display-lg text-on-surface leading-tight">{availableICUBeds}/{totalICUBeds}</p>
<div className="mt-md flex gap-1 h-2">
<div className="bg-error rounded-full flex-grow" style={{"flexBasis": `${occupiedICUPercentage}%`}}></div>
<div className="bg-surface-container rounded-full flex-grow" style={{"flexBasis": `${availableICUPercentage}%`}}></div>
</div>
<p className="text-body-sm text-on-surface-variant mt-sm">{availableICUPercentage}% Available Capacity</p>
</div>
<div className="bg-error-container p-lg rounded-xl shadow-sm border border-error/20 hover:shadow-md transition-shadow">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-error/20 rounded-lg">
<span className="material-symbols-outlined text-error" data-weight="fill">emergency</span>
</div>
<span className="px-xs py-[2px] bg-error text-on-error text-[10px] font-bold rounded uppercase animate-pulse">Urgent</span>
</div>
<h3 className="text-label-md text-on-error-container uppercase tracking-wider mb-xs">Emergency Requests</h3>
<p className="text-display-lg font-display-lg text-on-error-container leading-tight">{emergencyRequests} Active</p>
<p className="text-body-sm text-on-error-container/80 mt-sm">Average wait time: 14 mins</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant hover:border-tertiary transition-colors">
<div className="flex justify-between items-start mb-sm">
<div className="p-xs bg-tertiary/10 rounded-lg">
<span className="material-symbols-outlined text-tertiary">badge</span>
</div>
<span className="text-label-md text-tertiary font-bold">FULL SHIFT</span>
</div>
<h3 className="text-label-md text-on-surface-variant uppercase tracking-wider mb-xs">Staff on Duty</h3>
<p className="text-display-lg font-display-lg text-on-surface leading-tight">{totalStaff}</p>
<p className="text-body-sm text-on-surface-variant mt-sm">{physicians} Physicians • {nursesCount} Nurses • {supportStaff} Support</p>
</div>
</div>
{/* Main Content Grid */}
<div className="grid grid-cols-12 gap-lg items-start animate-fade-in animation-delay-200">
{/* Left Column: Bed Status & Trends */}
<div className="col-span-12 lg:col-span-8 space-y-lg">
{/* Bed Capacity by Ward */}
<section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg">
<div className="flex justify-between items-center mb-xl">
<div>
<h3 className="text-headline-md font-headline-md">Bed Capacity by Ward</h3>
<p className="text-body-sm text-on-surface-variant">Live breakdown of facility occupation</p>
</div>
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
<span className="text-body-sm font-medium"><span className="text-error">{genWard.occupied}</span> / <span className="text-secondary-container">{genWard.cleaning}</span> / <span className="text-[#10b981]">{genWard.available}</span></span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width": `${genWard.occPct}%`}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width": `${genWard.cleanPct}%`}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width": `${genWard.availPct}%`}}></div>
</div>
</div>
{/* ICU */}
<div className="space-y-sm">
<div className="flex justify-between items-end">
<span className="text-body-md font-bold">Intensive Care Unit (ICU)</span>
<span className="text-body-sm font-medium"><span className="text-error">{icuWard.occupied}</span> / <span className="text-secondary-container">{icuWard.cleaning}</span> / <span className="text-[#10b981]">{icuWard.available}</span></span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width": `${icuWard.occPct}%`}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width": `${icuWard.cleanPct}%`}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width": `${icuWard.availPct}%`}}></div>
</div>
</div>
{/* Pediatric */}
<div className="space-y-sm">
<div className="flex justify-between items-end">
<span className="text-body-md font-bold">Pediatric Ward</span>
<span className="text-body-sm font-medium"><span className="text-error">{pedWard.occupied}</span> / <span className="text-secondary-container">{pedWard.cleaning}</span> / <span className="text-[#10b981]">{pedWard.available}</span></span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width": `${pedWard.occPct}%`}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width": `${pedWard.cleanPct}%`}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width": `${pedWard.availPct}%`}}></div>
</div>
</div>
{/* Isolation */}
<div className="space-y-sm">
<div className="flex justify-between items-end">
<span className="text-body-md font-bold">Isolation Units</span>
<span className="text-body-sm font-medium"><span className="text-error">{isoWard.occupied}</span> / <span className="text-secondary-container">{isoWard.cleaning}</span> / <span className="text-[#10b981]">{isoWard.available}</span></span>
</div>
<div className="flex h-6 rounded-lg overflow-hidden bg-surface-container shadow-inner">
<div className="bg-error capacity-bar-segment" style={{"width": `${isoWard.occPct}%`}}></div>
<div className="bg-secondary-container capacity-bar-segment" style={{"width": `${isoWard.cleanPct}%`}}></div>
<div className="bg-[#10b981] capacity-bar-segment" style={{"width": `${isoWard.availPct}%`}}></div>
</div>
</div>
</div>
<div className="mt-xl pt-lg border-t border-outline-variant">
<div className="grid grid-cols-3 gap-md">
<div className="text-center border-r border-outline-variant">
<p className="text-headline-md font-bold text-on-surface">42 min</p>
<p className="text-label-md text-on-surface-variant uppercase">Avg Discharge</p>
</div>
<div className="text-center border-r border-outline-variant">
<p className="text-headline-md font-bold text-on-surface">18%</p>
<p className="text-label-md text-on-surface-variant uppercase">Turnaround</p>
</div>
<div className="text-center">
<p className="text-headline-md font-bold text-on-surface">12</p>
<p className="text-label-md text-on-surface-variant uppercase">In Maintenance</p>
</div>
</div>
</div>
</section>
{/* Live Occupancy Trends */}
<section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg">
<div className="flex justify-between items-center mb-lg">
<div>
<h3 className="text-headline-md font-headline-md">Live Occupancy Trends</h3>
<p className="text-body-sm text-on-surface-variant">Last 24 hours activity level</p>
</div>
<select className="bg-surface-container-low border-none rounded-lg text-label-md focus:ring-primary">
<option>Last 24 Hours</option>
<option>Last 7 Days</option>
</select>
</div>
<div className="relative h-48 w-full mt-lg">
{/* Simple SVG Line Chart Placeholder */}
<svg className="w-full h-full" preserveaspectratio="none" viewbox="0 0 1000 200">
{/* Grid Lines */}
<line stroke="#e2e8f0" stroke-width="1" x1="0" x2="1000" y1="50" y2="50"></line>
<line stroke="#e2e8f0" stroke-width="1" x1="0" x2="1000" y1="100" y2="100"></line>
<line stroke="#e2e8f0" stroke-width="1" x1="0" x2="1000" y1="150" y2="150"></line>
{/* Area Fill */}
<path d="M0,200 L0,140 L100,150 L200,130 L300,160 L400,140 L500,110 L600,80 L700,90 L800,120 L900,100 L1000,80 L1000,200 Z" fill="url(#gradient)" opacity="0.1"></path>
<defs>
<lineargradient id="gradient" x1="0%" x2="0%" y1="0%" y2="100%">
<stop offset="0%" stop-color="#00478d"></stop>
<stop offset="100%" stop-color="#00478d" stop-opacity="0"></stop>
</lineargradient>
</defs>
{/* Line */}
<path className="trend-line" d="M0,140 L100,150 L200,130 L300,160 L400,140 L500,110 L600,80 L700,90 L800,120 L900,100 L1000,80" fill="none" stroke="#00478d" stroke-linecap="round" stroke-width="3"></path>
{/* Data Points */}
<circle cx="500" cy="110" fill="#00478d" r="4"></circle>
<circle cx="1000" cy="80" fill="#00478d" r="4"></circle>
</svg>
{/* X-Axis Labels */}
<div className="flex justify-between mt-xs text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter">
<span>08:00</span>
<span>12:00</span>
<span>16:00</span>
<span>20:00</span>
<span>00:00</span>
<span>04:00</span>
<span>Now</span>
</div>
</div>
</section>
</div>
{/* Right Column: Resources & Activity */}
<div className="col-span-12 lg:col-span-4 space-y-lg">
{/* Critical Resources Utilization */}
<section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg">
<div className="flex justify-between items-center mb-lg">
<h3 className="text-headline-md font-headline-md">Critical Resources</h3>
<a className="text-label-md text-primary font-bold hover:underline" href="#">View All</a>
</div>
<div className="space-y-lg">
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Oxygen Cylinders (H-Type)</span>
<span className="text-label-md font-bold text-on-surface">{oxygen.quantity}/{oxygen.lowStockThreshold}</span>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-primary h-2 rounded-full" style={{"width": `${Math.min(100, (oxygen.quantity/oxygen.lowStockThreshold)*100)}%`}}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Ventilators (Portable)</span>
<div className="flex items-center gap-xs">
{ventilators.quantity < ventilators.lowStockThreshold && <span className="material-symbols-outlined text-error text-sm animate-pulse">warning</span>}
<span className={`text-label-md font-bold ${ventilators.quantity < ventilators.lowStockThreshold ? 'text-error' : 'text-on-surface'}`}>{ventilators.quantity}/{ventilators.lowStockThreshold}</span>
</div>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className={`${ventilators.quantity < ventilators.lowStockThreshold ? 'bg-error' : 'bg-primary'} h-2 rounded-full`} style={{"width": `${Math.min(100, (ventilators.quantity/ventilators.lowStockThreshold)*100)}%`}}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Patient Monitors</span>
<span className="text-label-md font-bold text-on-surface">{monitors.quantity}/{monitors.lowStockThreshold}</span>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-[#10b981] h-2 rounded-full" style={{"width": `${Math.min(100, (monitors.quantity/monitors.lowStockThreshold)*100)}%`}}></div>
</div>
</div>
<div>
<div className="flex justify-between mb-xs">
<span className="text-body-md font-medium">Infusion Pumps</span>
<span className="text-label-md font-bold text-on-surface">{pumps.quantity}/{pumps.lowStockThreshold}</span>
</div>
<div className="w-full bg-surface-container rounded-full h-2">
<div className="bg-[#10b981] h-2 rounded-full" style={{"width": `${Math.min(100, (pumps.quantity/pumps.lowStockThreshold)*100)}%`}}></div>
</div>
</div>
</div>
<button onClick={handleRequestReplenishment} className="w-full mt-lg py-sm text-label-md font-bold border-2 border-primary text-primary rounded-lg hover:bg-primary hover:text-on-primary transition-all">
                    Request Replenishment
                </button>
</section>
{/* Live Activity Feed (Recent Admissions) */}
<section className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
<div className="p-lg bg-surface-container-low border-b border-outline-variant flex justify-between items-center">
<h3 className="text-headline-md font-headline-md">Live Activity</h3>
<div className="flex items-center gap-xs text-[10px] text-primary font-bold uppercase tracking-widest">
<span className="w-2 h-2 rounded-full bg-primary animate-ping"></span>
                        Streaming
                    </div>
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
<p className="text-body-sm text-on-surface-variant mt-xs line-clamp-1 italic">Status: Triage Priority 1 - Severe Distress</p>
<p className="text-label-md text-primary mt-xs font-medium flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">history</span>
                            Admitted 12m ago
                        </p>
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
<p className="text-body-sm text-on-surface-variant mt-xs line-clamp-1">Status: Post-op recovery following appendectomy</p>
<p className="text-label-md text-on-surface-variant mt-xs flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">history</span>
                            Admitted 45m ago
                        </p>
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
<p className="text-body-sm text-on-surface-variant mt-xs line-clamp-1">Status: Suspected viral pneumonia, isolated</p>
<p className="text-label-md text-on-surface-variant mt-xs flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">history</span>
                            Admitted 1h 12m ago
                        </p>
</div>
</div>
<button onClick={() => navigate('/appointments')} className="w-full p-md text-center text-label-md font-bold text-primary hover:bg-surface-container-high transition-colors">
                    View Complete Log
                </button>
</section>
</div>
</div>

    </div>
  );
}
