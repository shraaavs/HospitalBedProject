import React from 'react';

export default function SystemAnalyticsReports() {
  return (
    <div className="w-full">
      
{/* Action Bar & Controls */}
<section className="mb-xl flex flex-wrap items-end justify-between gap-lg">
<div>
<h2 className="text-display-lg font-display-lg text-on-surface">Analytics & Reporting</h2>
<p className="text-body-lg text-on-surface-variant">Comprehensive clinical performance and resource overview.</p>
</div>
<div className="flex items-center gap-sm bg-surface-container-lowest p-xs rounded-xl shadow-sm border border-outline-variant">
<div className="flex items-center gap-xs px-md py-sm rounded-lg bg-surface-container-high cursor-pointer hover:bg-surface-container-highest transition-colors">
<span className="material-symbols-outlined text-[20px]">calendar_month</span>
<span className="text-body-md font-bold">Last 30 Days</span>
</div>
<div className="h-6 w-[1px] bg-outline-variant"></div>
<button className="flex items-center gap-xs px-md py-sm rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity">
<span className="material-symbols-outlined text-[20px]">download</span>
<span className="text-body-md font-bold">Export Report</span>
</button>
<button className="flex items-center justify-center w-10 h-10 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors">
<span className="material-symbols-outlined">more_vert</span>
</button>
</div>
</section>
{/* Summary Cards Bento */}
<section className="bento-grid grid grid-cols-12 gap-lg mb-xl animate-fade-in animation-delay-100">
{/* Summary 1: Avg Length of Stay */}
<div className="col-span-12 sm:col-span-6 lg:col-span-3 glass-card p-lg rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
<div className="flex justify-between items-start mb-md">
<div className="p-xs bg-primary-container/10 rounded-lg text-primary">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>timer</span>
</div>
<span className="text-label-md text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">trending_down</span> 4.2%
                    </span>
</div>
<h3 className="text-label-md text-on-surface-variant mb-xs">Avg Length of Stay</h3>
<div className="flex items-baseline gap-xs">
<span className="text-display-lg font-display-lg text-on-surface">5.4</span>
<span className="text-body-md text-on-surface-variant">days</span>
</div>
<p className="text-label-md text-on-surface-variant mt-sm">Vs. 5.7 days last month</p>
</div>
{/* Summary 2: Discharge Rate */}
<div className="col-span-12 sm:col-span-6 lg:col-span-3 glass-card p-lg rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
<div className="flex justify-between items-start mb-md">
<div className="p-xs bg-secondary-container/10 rounded-lg text-secondary">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>door_open</span>
</div>
<span className="text-label-md text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">trending_up</span> 1.8%
                    </span>
</div>
<h3 className="text-label-md text-on-surface-variant mb-xs">Discharge Rate</h3>
<div className="flex items-baseline gap-xs">
<span className="text-display-lg font-display-lg text-on-surface">88.2</span>
<span className="text-body-md text-on-surface-variant">%</span>
</div>
<p className="text-label-md text-on-surface-variant mt-sm">92 patients today</p>
</div>
{/* Summary 3: Daily Admissions */}
<div className="col-span-12 sm:col-span-6 lg:col-span-3 glass-card p-lg rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
<div className="flex justify-between items-start mb-md">
<div className="p-xs bg-tertiary-container/10 rounded-lg text-tertiary">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>person_add</span>
</div>
<span className="text-label-md text-error bg-error-container/20 px-2 py-0.5 rounded-full flex items-center gap-1">
<span className="material-symbols-outlined text-[14px]">trending_up</span> 12%
                    </span>
</div>
<h3 className="text-label-md text-on-surface-variant mb-xs">Daily Admissions</h3>
<div className="flex items-baseline gap-xs">
<span className="text-display-lg font-display-lg text-on-surface">114</span>
<span className="text-body-md text-on-surface-variant">patients</span>
</div>
<p className="text-label-md text-on-surface-variant mt-sm">Higher than seasonal avg</p>
</div>
{/* Summary 4: Staff-to-Patient */}
<div className="col-span-12 sm:col-span-6 lg:col-span-3 glass-card p-lg rounded-xl shadow-sm border border-outline-variant hover:shadow-md transition-all">
<div className="flex justify-between items-start mb-md">
<div className="p-xs bg-primary-container/10 rounded-lg text-primary">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>medical_services</span>
</div>
<span className="text-label-md text-on-surface-variant bg-surface-container-high px-2 py-0.5 rounded-full flex items-center gap-1">
                        Stable
                    </span>
</div>
<h3 className="text-label-md text-on-surface-variant mb-xs">Staff-to-Patient Ratio</h3>
<div className="flex items-baseline gap-xs">
<span className="text-display-lg font-display-lg text-on-surface">1:4.2</span>
</div>
<p className="text-label-md text-on-surface-variant mt-sm">Optimum range (1:4 - 1:6)</p>
</div>
</section>
{/* Charts and Detailed Data */}
<div className="grid grid-cols-12 gap-xl animate-fade-in animation-delay-200">
{/* Bed Occupancy Line Chart */}
<div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
<div className="flex justify-between items-center mb-xl">
<div>
<h3 className="text-headline-md font-headline-md text-on-surface">Bed Occupancy Trends</h3>
<p className="text-body-sm text-on-surface-variant">Hourly capacity distribution across all wards</p>
</div>
<div className="flex gap-sm">
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-primary"></span>
<span className="text-label-md">Current</span>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-outline-variant"></span>
<span className="text-label-md">Last Week</span>
</div>
</div>
</div>
<div className="h-64 chart-container flex items-end justify-between px-xs">
{/* Stylized SVG Line Chart Mock */}
<div className="absolute inset-0 flex flex-col justify-between py-xs pointer-events-none opacity-30">
<div className="border-t border-dashed border-outline"></div>
<div className="border-t border-dashed border-outline"></div>
<div className="border-t border-dashed border-outline"></div>
<div className="border-t border-dashed border-outline"></div>
</div>
<div className="relative w-full h-full">
<svg className="w-full h-full overflow-visible" viewbox="0 0 800 200">
{/* Background Path (Last Week) */}
<path d="M0 150 Q100 140 200 160 T400 130 T600 150 T800 140" fill="none" stroke="#c2c6d4" stroke-dasharray="4" stroke-width="2"></path>
{/* Active Path (Current) */}
<path d="M0 120 Q100 100 200 130 T400 80 T600 110 T800 90" fill="none" stroke="#00478d" stroke-linecap="round" stroke-width="4"></path>
{/* Area Fill */}
<path d="M0 120 Q100 100 200 130 T400 80 T600 110 T800 90 L800 200 L0 200 Z" fill="url(#gradient-primary)" opacity="0.1"></path>
<defs>
<lineargradient id="gradient-primary" x1="0" x2="0" y1="0" y2="1">
<stop offset="0%" stop-color="#00478d"></stop>
<stop offset="100%" stop-color="#00478d" stop-opacity="0"></stop>
</lineargradient>
</defs>
{/* Data points */}
<circle cx="400" cy="80" fill="#00478d" r="6"></circle>
</svg>
{/* Chart Tooltip Mock */}
<div className="absolute top-[40px] left-[360px] bg-inverse-surface text-inverse-on-surface px-sm py-xs rounded shadow-lg text-label-md z-10">
                            12:00 PM: 94% Occupancy
                        </div>
</div>
</div>
<div className="flex justify-between mt-sm px-xs">
<span className="text-label-md text-on-surface-variant">00:00</span>
<span className="text-label-md text-on-surface-variant">06:00</span>
<span className="text-label-md text-on-surface-variant font-bold text-primary">12:00</span>
<span className="text-label-md text-on-surface-variant">18:00</span>
<span className="text-label-md text-on-surface-variant">23:59</span>
</div>
</div>
{/* Resource Utilization Pie/Donut */}
<div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col">
<h3 className="text-headline-md font-headline-md text-on-surface mb-xs">Resource Utilization</h3>
<p className="text-body-sm text-on-surface-variant mb-xl">Equipment and facility usage</p>
<div className="flex-1 flex flex-col items-center justify-center relative">
{/* CSS Donut Chart */}
<div className="relative w-48 h-48 rounded-full border-[16px] border-surface-container-high" style={{"background":"conic-gradient(#00478d 0% 45%, #41befd 45% 75%, #ba1a1a 75% 100%)"}}>
<div className="absolute inset-0 m-2 rounded-full bg-surface-container-lowest flex flex-col items-center justify-center">
<span className="text-headline-lg font-headline-lg text-on-surface">82%</span>
<span className="text-label-md text-on-surface-variant">Total Capacity</span>
</div>
</div>
<div className="w-full mt-xl grid grid-cols-2 gap-md">
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-primary"></span>
<div className="flex flex-col">
<span className="text-label-md font-bold">Standard Bed</span>
<span className="text-label-md text-on-surface-variant">45% Usage</span>
</div>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-secondary-container"></span>
<div className="flex flex-col">
<span className="text-label-md font-bold">ICU Support</span>
<span className="text-label-md text-on-surface-variant">30% Usage</span>
</div>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-error"></span>
<div className="flex flex-col">
<span className="text-label-md font-bold">Emergency</span>
<span className="text-label-md text-on-surface-variant">25% Usage</span>
</div>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-surface-container-high"></span>
<div className="flex flex-col">
<span className="text-label-md font-bold">Idle/Repair</span>
<span className="text-label-md text-on-surface-variant">18% Available</span>
</div>
</div>
</div>
</div>
</div>
{/* Detailed Reports Data Table */}
<div className="col-span-12 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
<div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-bright">
<h3 className="text-headline-md font-headline-md text-on-surface">Recent Reports Queue</h3>
<div className="flex gap-sm">
<button className="flex items-center gap-xs px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-on-surface-variant">
<span className="material-symbols-outlined text-[18px]">filter_list</span>
<span className="text-body-sm font-bold">Filter By Type</span>
</button>
<button className="flex items-center gap-xs px-md py-sm rounded-lg border border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low transition-colors text-on-surface-variant">
<span className="material-symbols-outlined text-[18px]">history</span>
<span className="text-body-sm font-bold">History</span>
</button>
</div>
</div>
<table className="w-full text-left border-collapse">
<thead>
<tr className="bg-surface-container-low/50 text-label-md text-on-surface-variant border-b border-outline-variant">
<th className="px-lg py-md font-semibold uppercase tracking-wider">Report Name</th>
<th className="px-lg py-md font-semibold uppercase tracking-wider text-center">Data Range</th>
<th className="px-lg py-md font-semibold uppercase tracking-wider text-center">Status</th>
<th className="px-lg py-md font-semibold uppercase tracking-wider text-center">Size</th>
<th className="px-lg py-md font-semibold uppercase tracking-wider text-right">Actions</th>
</tr>
</thead>
<tbody className="text-body-md text-on-surface">
<tr className="border-b border-outline-variant hover:bg-primary/5 transition-colors">
<td className="px-lg py-md">
<div className="flex items-center gap-md">
<div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
<span className="material-symbols-outlined">picture_as_pdf</span>
</div>
<div className="flex flex-col">
<span className="font-bold">Bed_Occupancy_Q3_Summary.pdf</span>
<span className="text-body-sm text-on-surface-variant">Generated by System • 2m ago</span>
</div>
</div>
</td>
<td className="px-lg py-md text-center">Jul 01 - Sep 30, 2023</td>
<td className="px-lg py-md text-center">
<span className="bg-green-100 text-green-700 px-sm py-xs rounded-full text-label-md font-bold">Ready</span>
</td>
<td className="px-lg py-md text-center text-on-surface-variant">4.2 MB</td>
<td className="px-lg py-md text-right">
<div className="flex justify-end gap-xs">
<button className="p-2 hover:bg-surface-container-high rounded-lg transition-all text-primary" title="Download">
<span className="material-symbols-outlined">download</span>
</button>
<button className="p-2 hover:bg-surface-container-high rounded-lg transition-all text-on-surface-variant" title="Share">
<span className="material-symbols-outlined">share</span>
</button>
</div>
</td>
</tr>
<tr className="border-b border-outline-variant hover:bg-primary/5 transition-colors">
<td className="px-lg py-md">
<div className="flex items-center gap-md">
<div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
<span className="material-symbols-outlined">table_chart</span>
</div>
<div className="flex flex-col">
<span className="font-bold">Daily_Admission_Log_Oct24.xlsx</span>
<span className="text-body-sm text-on-surface-variant">Requested by Dr. Smith • 45m ago</span>
</div>
</div>
</td>
<td className="px-lg py-md text-center">Oct 24, 2023</td>
<td className="px-lg py-md text-center">
<span className="bg-green-100 text-green-700 px-sm py-xs rounded-full text-label-md font-bold">Ready</span>
</td>
<td className="px-lg py-md text-center text-on-surface-variant">842 KB</td>
<td className="px-lg py-md text-right">
<div className="flex justify-end gap-xs">
<button className="p-2 hover:bg-surface-container-high rounded-lg transition-all text-primary" title="Download">
<span className="material-symbols-outlined">download</span>
</button>
<button className="p-2 hover:bg-surface-container-high rounded-lg transition-all text-on-surface-variant" title="Share">
<span className="material-symbols-outlined">share</span>
</button>
</div>
</td>
</tr>
<tr className="border-b border-outline-variant hover:bg-primary/5 transition-colors">
<td className="px-lg py-md">
<div className="flex items-center gap-md">
<div className="w-10 h-10 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary">
<span className="material-symbols-outlined">monitoring</span>
</div>
<div className="flex flex-col">
<span className="font-bold">Staff_Efficiency_Audit_W42.pdf</span>
<span className="text-body-sm text-on-surface-variant">Weekly Automated Sync • 3h ago</span>
</div>
</div>
</td>
<td className="px-lg py-md text-center">Oct 16 - Oct 22, 2023</td>
<td className="px-lg py-md text-center">
<span className="bg-primary-container/10 text-primary px-sm py-xs rounded-full text-label-md font-bold animate-pulse">Processing</span>
</td>
<td className="px-lg py-md text-center text-on-surface-variant">--</td>
<td className="px-lg py-md text-right">
<div className="flex justify-end gap-xs">
<button className="p-2 opacity-30 cursor-not-allowed" disabled="">
<span className="material-symbols-outlined">download</span>
</button>
<button className="p-2 hover:bg-surface-container-high rounded-lg transition-all text-on-surface-variant">
<span className="material-symbols-outlined">cancel</span>
</button>
</div>
</td>
</tr>
</tbody>
</table>
<div className="p-md flex justify-center bg-surface-container-lowest">
<button className="text-primary font-bold text-body-sm hover:underline">View All Generated Reports</button>
</div>
</div>
</div>
{/* Real-Time Capacity Bar Section */}
<section className="mt-xl bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
<h3 className="text-headline-md font-headline-md text-on-surface mb-lg">Live Capacity Overview</h3>
<div className="space-y-lg">
<div>
<div className="flex justify-between items-center mb-xs">
<span className="text-body-md font-bold">General Ward - East Wing</span>
<span className="text-body-sm text-on-surface-variant">42 / 50 Beds Occupied (84%)</span>
</div>
<div className="w-full h-4 bg-surface-container-high rounded-full overflow-hidden flex">
<div className="h-full bg-error" style={{"width":"70%"}}></div> {/* Occupied */}
<div className="h-full bg-secondary-container" style={{"width":"14%"}}></div> {/* Cleaning */}
<div className="h-full bg-green-500" style={{"width":"16%"}}></div> {/* Available */}
</div>
</div>
<div>
<div className="flex justify-between items-center mb-xs">
<span className="text-body-md font-bold">ICU - Level 4</span>
<span className="text-body-sm text-on-surface-variant">18 / 20 Beds Occupied (90%)</span>
</div>
<div className="w-full h-4 bg-surface-container-high rounded-full overflow-hidden flex">
<div className="h-full bg-error" style={{"width":"85%"}}></div>
<div className="h-full bg-secondary-container" style={{"width":"5%"}}></div>
<div className="h-full bg-green-500" style={{"width":"10%"}}></div>
</div>
</div>
<div>
<div className="flex justify-between items-center mb-xs">
<span className="text-body-md font-bold">Pediatric Unit</span>
<span className="text-body-sm text-on-surface-variant">12 / 30 Beds Occupied (40%)</span>
</div>
<div className="w-full h-4 bg-surface-container-high rounded-full overflow-hidden flex">
<div className="h-full bg-error" style={{"width":"35%"}}></div>
<div className="h-full bg-secondary-container" style={{"width":"5%"}}></div>
<div className="h-full bg-green-500" style={{"width":"60%"}}></div>
</div>
</div>
</div>
<div className="mt-lg flex gap-lg border-t border-outline-variant pt-md">
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-sm bg-error"></span>
<span className="text-label-md text-on-surface-variant">Occupied</span>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-sm bg-secondary-container"></span>
<span className="text-label-md text-on-surface-variant">Cleaning/Prep</span>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-sm bg-green-500"></span>
<span className="text-label-md text-on-surface-variant">Available</span>
</div>
</div>
</section>

    </div>
  );
}
