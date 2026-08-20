import React from 'react';

export default function EmergencyManagementRapidResponseCenter() {
  return (
    <div className="w-full">
      
{/* TopNavBar */}
<header className="flex justify-between items-center w-full px-margin-desktop py-base z-40 bg-surface shadow-sm sticky top-0">
<div className="flex items-center gap-lg">
<div className="md:hidden flex items-center gap-sm">
<span className="material-symbols-outlined text-primary">menu</span>
</div>
<h2 className="font-headline-md text-headline-md font-bold text-primary">Emergency Hub</h2>
</div>
<div className="flex items-center gap-lg">
{/* Quick Action Buttons */}
<div className="hidden lg:flex items-center gap-sm">
<button className="bg-primary text-on-primary px-lg py-sm rounded-lg font-label-md text-label-md flex items-center gap-xs hover:opacity-90 active:opacity-80 transition-all">
<span className="material-symbols-outlined text-[18px]">add_circle</span>
                        Register Emergency Case
                    </button>
<button className="bg-error text-on-error px-lg py-sm rounded-lg font-label-md text-label-md flex items-center gap-xs hover:opacity-90 active:opacity-80 transition-all">
<span className="material-symbols-outlined text-[18px]">warning</span>
                        Trigger Mass Casualty
                    </button>
</div>
<div className="flex items-center gap-md border-l border-outline-variant pl-lg">
<div className="relative cursor-pointer">
<span className="material-symbols-outlined text-on-surface-variant">notifications</span>
<span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
</div>
<span className="material-symbols-outlined text-on-surface-variant cursor-pointer">settings</span>
<div className="w-8 h-8 rounded-full bg-surface-container-highest overflow-hidden">
<img className="w-full h-full object-cover" data-alt="A professional headshot of a senior hospital administrator wearing clinical scrubs and a badge, set against a blurred high-tech medical background. The lighting is soft and professional, emphasizing expertise and authority in a modern healthcare setting. The color palette is composed of clean whites and medical blues." src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNhYl64eHOkZJvjCPLbhu0J0bXTcHt0hLgrsciuA8WMXBbjV0VDHYHGbhKP3K8PK6l7YBEdMm_nXz53iXYpvhDxcwAPNtZ0_nD76Sb42eQ2TeVBkIhh3yZJjdj22540sP4r1SbIyzqSCGh_b_kD8r_uZkpHd3VRXvmbdAuX8ffw6Y6BqdRg6-5QP3A4-XsZZcpUXsuHThk6sbURbptXoPR9uDiRwiBh30VdxpyF1ke4ML6EZ7fhbMAZg1WudC0DF58o8LAIERwExRv"/>
</div>
</div>
</div>
</header>
{/* Dashboard Canvas */}
<div className="p-margin-desktop flex flex-col gap-lg">
{/* Alert Banner */}
<div className="bg-error-container text-on-error-container p-md rounded-xl flex items-center justify-between critical-glow">
<div className="flex items-center gap-md">
<span className="material-symbols-outlined text-error text-[32px] status-pulse" style={{"fontVariationSettings":"'FILL' 1"}}>emergency_home</span>
<div>
<p className="font-headline-md text-headline-md leading-tight">Incoming Level 1 Trauma: 4 mins ETA</p>
<p className="text-body-sm font-body-sm opacity-80 uppercase tracking-wider">Trauma Bay 01 Prepped & Ready</p>
</div>
</div>
<button className="bg-error text-on-error px-lg py-sm rounded-lg font-label-md text-label-md">View Case File</button>
</div>
{/* Stats Overview */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg animate-fade-in animation-delay-100">
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-base">
<div className="flex justify-between items-start">
<span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">ER Bed Capacity</span>
<span className="material-symbols-outlined text-primary">bed</span>
</div>
<div className="flex items-baseline gap-xs mt-sm">
<span className="text-display-lg font-display-lg">04</span>
<span className="text-headline-md font-headline-md text-on-surface-variant">/ 18</span>
</div>
<div className="w-full h-2 bg-surface-container rounded-full mt-sm overflow-hidden">
<div className="h-full bg-error rounded-full" style={{"width":"78%"}}></div>
</div>
<p className="text-body-sm font-body-sm text-error mt-xs font-semibold">Critical Level: High Occupancy</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-base">
<div className="flex justify-between items-start">
<span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">ICU Status</span>
<span className="material-symbols-outlined text-secondary">monitor_heart</span>
</div>
<div className="flex items-baseline gap-xs mt-sm">
<span className="text-display-lg font-display-lg">02</span>
<span className="text-headline-md font-headline-md text-on-surface-variant">/ 12</span>
</div>
<div className="w-full h-2 bg-surface-container rounded-full mt-sm overflow-hidden">
<div className="h-full bg-secondary rounded-full" style={{"width":"83%"}}></div>
</div>
<p className="text-body-sm font-body-sm text-secondary mt-xs font-semibold">Only 2 Units Available</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-base">
<div className="flex justify-between items-start">
<span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Incoming Ambulances</span>
<span className="material-symbols-outlined text-primary">ambulance</span>
</div>
<div className="flex items-baseline gap-xs mt-sm">
<span className="text-display-lg font-display-lg">03</span>
<span className="text-headline-md font-headline-md text-on-surface-variant">Active</span>
</div>
<div className="flex gap-xs mt-sm">
<span className="w-2 h-2 rounded-full bg-error status-pulse"></span>
<span className="w-2 h-2 rounded-full bg-error status-pulse"></span>
<span className="w-2 h-2 rounded-full bg-tertiary"></span>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant mt-xs">2 Critical, 1 Stable</p>
</div>
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-base">
<div className="flex justify-between items-start">
<span className="text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">Response Team</span>
<span className="material-symbols-outlined text-on-tertiary-fixed-variant">groups</span>
</div>
<div className="flex items-baseline gap-xs mt-sm">
<span className="text-display-lg font-display-lg">14</span>
<span className="text-headline-md font-headline-md text-on-surface-variant">On Duty</span>
</div>
<p className="text-body-sm font-body-sm text-on-surface-variant mt-lg">2 Surgeons in Theatre</p>
</div>
</div>
<div className="grid grid-cols-1 xl:grid-cols-3 gap-lg animate-fade-in animation-delay-200">
{/* ER Map / Grid View */}
<div className="xl:col-span-2 bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm">
<div className="flex justify-between items-center mb-lg">
<div>
<h3 className="font-headline-md text-headline-md">ER Layout Map</h3>
<p className="text-body-sm font-body-sm text-on-surface-variant">Real-time occupancy visualization</p>
</div>
<div className="flex gap-md">
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-error"></span>
<span className="text-label-md font-label-md">Occupied</span>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-secondary-container"></span>
<span className="text-label-md font-label-md">Cleaning</span>
</div>
<div className="flex items-center gap-xs">
<span className="w-3 h-3 rounded-full bg-outline-variant"></span>
<span className="text-label-md font-label-md">Available</span>
</div>
</div>
</div>
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-md">
{/* Trauma Bays */}
<div className="aspect-video bg-error-container border-2 border-error p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-error">BAY 01</span>
<span className="material-symbols-outlined text-error self-center" style={{"fontVariationSettings":"'FILL' 1"}}>person_alert</span>
<span className="text-[10px] uppercase font-bold text-error text-center">TRAUMA (LVL 1)</span>
</div>
<div className="aspect-video bg-surface-container-high border border-outline-variant p-sm rounded flex flex-col justify-between cursor-pointer hover:bg-surface-variant transition-colors">
<span className="text-label-md font-bold text-on-surface-variant">BAY 02</span>
<span className="material-symbols-outlined text-outline-variant self-center">bed</span>
<span className="text-[10px] uppercase font-bold text-on-surface-variant text-center">AVAILABLE</span>
</div>
<div className="aspect-video bg-secondary-container/20 border-2 border-secondary-container p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-on-secondary-container">BAY 03</span>
<span className="material-symbols-outlined text-secondary-container self-center" style={{"fontVariationSettings":"'FILL' 1"}}>cleaning_services</span>
<span className="text-[10px] uppercase font-bold text-on-secondary-container text-center">CLEANING</span>
</div>
<div className="aspect-video bg-error-container/40 border border-error p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-on-error-container">BAY 04</span>
<span className="material-symbols-outlined text-error self-center" style={{"fontVariationSettings":"'FILL' 1"}}>personal_injury</span>
<span className="text-[10px] uppercase font-bold text-on-error-container text-center">STABLE (LVL 3)</span>
</div>
{/* More Bays Mockup */}
<div className="aspect-video bg-surface-container-high border border-outline-variant p-sm rounded flex flex-col justify-between cursor-pointer hover:bg-surface-variant transition-colors">
<span className="text-label-md font-bold text-on-surface-variant">BAY 05</span>
<span className="material-symbols-outlined text-outline-variant self-center">bed</span>
<span className="text-[10px] uppercase font-bold text-on-surface-variant text-center">AVAILABLE</span>
</div>
<div className="aspect-video bg-error-container border-2 border-error p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-error">BAY 06</span>
<span className="material-symbols-outlined text-error self-center" style={{"fontVariationSettings":"'FILL' 1"}}>person_alert</span>
<span className="text-[10px] uppercase font-bold text-error text-center">CRITICAL</span>
</div>
<div className="aspect-video bg-error-container/40 border border-error p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-on-error-container">BAY 07</span>
<span className="material-symbols-outlined text-error self-center" style={{"fontVariationSettings":"'FILL' 1"}}>personal_injury</span>
<span className="text-[10px] uppercase font-bold text-on-error-container text-center">URGENT</span>
</div>
<div className="aspect-video bg-surface-container-high border border-outline-variant p-sm rounded flex flex-col justify-between cursor-pointer hover:bg-surface-variant transition-colors">
<span className="text-label-md font-bold text-on-surface-variant">BAY 08</span>
<span className="material-symbols-outlined text-outline-variant self-center">bed</span>
<span className="text-[10px] uppercase font-bold text-on-surface-variant text-center">AVAILABLE</span>
</div>
<div className="aspect-video bg-surface-container-high border border-outline-variant p-sm rounded flex flex-col justify-between cursor-pointer hover:bg-surface-variant transition-colors">
<span className="text-label-md font-bold text-on-surface-variant">BAY 09</span>
<span className="material-symbols-outlined text-outline-variant self-center">bed</span>
<span className="text-[10px] uppercase font-bold text-on-surface-variant text-center">AVAILABLE</span>
</div>
<div className="aspect-video bg-error-container border-2 border-error p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-error">BAY 10</span>
<span className="material-symbols-outlined text-error self-center" style={{"fontVariationSettings":"'FILL' 1"}}>person_alert</span>
<span className="text-[10px] uppercase font-bold text-error text-center">CRITICAL</span>
</div>
<div className="aspect-video bg-secondary-container/20 border-2 border-secondary-container p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-on-secondary-container">BAY 11</span>
<span className="material-symbols-outlined text-secondary-container self-center" style={{"fontVariationSettings":"'FILL' 1"}}>cleaning_services</span>
<span className="text-[10px] uppercase font-bold text-on-secondary-container text-center">CLEANING</span>
</div>
<div className="aspect-video bg-error-container border-2 border-error p-sm rounded flex flex-col justify-between">
<span className="text-label-md font-bold text-error">BAY 12</span>
<span className="material-symbols-outlined text-error self-center" style={{"fontVariationSettings":"'FILL' 1"}}>person_alert</span>
<span className="text-[10px] uppercase font-bold text-error text-center">TRAUMA</span>
</div>
</div>
<div className="mt-lg grid grid-cols-1 md:grid-cols-2 gap-lg">
<div className="p-md bg-surface-container rounded-lg">
<h4 className="font-label-md text-label-md uppercase mb-sm">Rapid Resource Assignment</h4>
<div className="flex gap-sm">
<button className="flex-1 bg-surface-container-lowest border border-outline-variant p-sm rounded-lg hover:bg-primary-container hover:text-on-primary transition-all flex flex-col items-center gap-xs">
<span className="material-symbols-outlined">event</span>
<span className="text-[10px] font-bold">VENTILATOR</span>
</button>
<button className="flex-1 bg-surface-container-lowest border border-outline-variant p-sm rounded-lg hover:bg-primary-container hover:text-on-primary transition-all flex flex-col items-center gap-xs">
<span className="material-symbols-outlined">oxygen_saturation</span>
<span className="text-[10px] font-bold">O2 TANK</span>
</button>
<button className="flex-1 bg-surface-container-lowest border border-outline-variant p-sm rounded-lg hover:bg-primary-container hover:text-on-primary transition-all flex flex-col items-center gap-xs">
<span className="material-symbols-outlined">medical_services</span>
<span className="text-[10px] font-bold">TRAUMA KIT</span>
</button>
<button className="flex-1 bg-surface-container-lowest border border-outline-variant p-sm rounded-lg hover:bg-primary-container hover:text-on-primary transition-all flex flex-col items-center gap-xs">
<span className="material-symbols-outlined">monitor</span>
<span className="text-[10px] font-bold">VITALS MON.</span>
</button>
</div>
</div>
<div className="p-md bg-surface-container rounded-lg border-l-4 border-primary">
<h4 className="font-label-md text-label-md uppercase mb-sm text-primary">Emergency Bed Allocation Status</h4>
<div className="flex flex-col gap-xs">
<div className="flex justify-between items-center text-body-sm font-body-sm">
<span>Main ER Floor</span>
<span className="font-bold">14 / 18 Occupied</span>
</div>
<div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
<div className="h-full bg-primary" style={{"width":"77%"}}></div>
</div>
<div className="flex justify-between items-center text-body-sm font-body-sm mt-xs">
<span>Pediatric ER</span>
<span className="font-bold">03 / 08 Occupied</span>
</div>
<div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
<div className="h-full bg-secondary" style={{"width":"37%"}}></div>
</div>
</div>
</div>
</div>
</div>
{/* Priority Patient Handling & Alerts */}
<div className="flex flex-col gap-lg">
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col">
<div className="flex justify-between items-center mb-md">
<h3 className="font-headline-md text-headline-md">Incoming Priority</h3>
<span className="bg-error text-on-error px-xs py-[2px] rounded text-[10px] font-bold status-pulse">LIVE</span>
</div>
<div className="flex flex-col gap-md">
{/* Case 1 */}
<div className="p-sm bg-error-container/20 border-l-4 border-error rounded flex items-center gap-md">
<div className="w-10 h-10 bg-error rounded flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-on-error">ambulance</span>
</div>
<div className="flex-1 min-w-0">
<p className="text-label-md font-bold truncate">Case #7482 - M, 45y</p>
<p className="text-body-sm font-body-sm text-on-error-container">Cardiac Arrest - 2 min ETA</p>
</div>
<span className="text-error font-bold text-[10px] uppercase">Critical</span>
</div>
{/* Case 2 */}
<div className="p-sm bg-error-container/20 border-l-4 border-error rounded flex items-center gap-md">
<div className="w-10 h-10 bg-error rounded flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-on-error">ambulance</span>
</div>
<div className="flex-1 min-w-0">
<p className="text-label-md font-bold truncate">Case #7485 - F, 28y</p>
<p className="text-body-sm font-body-sm text-on-error-container">Multiple Trauma - 8 min ETA</p>
</div>
<span className="text-error font-bold text-[10px] uppercase">Critical</span>
</div>
{/* Case 3 */}
<div className="p-sm bg-surface-container rounded flex items-center gap-md">
<div className="w-10 h-10 bg-on-tertiary-fixed-variant rounded flex items-center justify-center shrink-0">
<span className="material-symbols-outlined text-white">ambulance</span>
</div>
<div className="flex-1 min-w-0">
<p className="text-label-md font-bold truncate">Case #7481 - M, 60y</p>
<p className="text-body-sm font-body-sm text-on-surface-variant">Laceration - 15 min ETA</p>
</div>
<span className="text-on-surface-variant font-bold text-[10px] uppercase">Urgent</span>
</div>
</div>
<button className="w-full mt-lg border border-outline text-on-surface-variant py-sm rounded-lg text-label-md font-label-md hover:bg-surface-variant transition-colors">View All Incoming</button>
</div>
{/* Dispatch / Map */}
<div className="bg-surface-container-lowest p-lg rounded-xl border border-outline-variant shadow-sm flex flex-col gap-md">
<div className="flex justify-between items-center">
<h3 className="font-headline-md text-headline-md">Active Dispatch</h3>
<button className="text-primary font-bold text-[12px] hover:underline">View Map</button>
</div>
<div className="relative h-48 rounded-lg overflow-hidden bg-surface-container">
<img className="w-full h-full object-cover grayscale brightness-75" data-location="New York" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBV5V4pMJWMAX_oP5BytY8LqID6bc6eyHJ-AbXAgl-Gpy3Aqz-bQpdX8J2b4Fsf_E2qM-K-A5z6FUw9BI4dzjMa-XwEpb8GJFyLuhTavyDNR9CzjzNqKvQpzTH7c1PbZrLhMPxhNsGLZn8Nik9ozUST5y8HsK5iIlXbN2dDdl548P1qHuYlApSxwIldjSOZp46WjrKwaGxTM-NBCTRDqubTPkkh8FNLARA_xoPlIOiekXiW_F1ZZKAxbrzpZLY8bsBY8WK6IIknxueM"/>
<div className="absolute inset-0 bg-primary/10"></div>
{/* Map Markers Mockup */}
<div className="absolute top-1/4 left-1/3 text-error status-pulse">
<span className="material-symbols-outlined text-[32px]" style={{"fontVariationSettings":"'FILL' 1"}}>location_on</span>
</div>
<div className="absolute bottom-1/3 right-1/4 text-primary">
<span className="material-symbols-outlined text-[24px]" style={{"fontVariationSettings":"'FILL' 1"}}>ambulance</span>
</div>
</div>
<div className="flex justify-between items-center px-sm">
<div className="text-center">
<p className="text-display-lg font-display-lg leading-none">08</p>
<p className="text-[10px] uppercase font-bold text-on-surface-variant">Units Out</p>
</div>
<div className="h-8 w-px bg-outline-variant"></div>
<div className="text-center">
<p className="text-display-lg font-display-lg leading-none">02</p>
<p className="text-[10px] uppercase font-bold text-on-surface-variant">Units Avail.</p>
</div>
<div className="h-8 w-px bg-outline-variant"></div>
<button className="bg-primary text-on-primary px-md py-sm rounded-lg font-label-md text-label-md">Dispatch</button>
</div>
</div>
</div>
</div>
{/* Footer Action Bar (Mobile only or additional bottom row) */}
<div className="lg:hidden grid grid-cols-1 gap-md mb-xl">
<button className="bg-primary text-on-primary w-full py-md rounded-xl font-headline-md text-headline-md shadow-lg">Register Emergency Case</button>
<button className="bg-error text-on-error w-full py-md rounded-xl font-headline-md text-headline-md shadow-lg">Mass Casualty Alert</button>
</div>
</div>

    </div>
  );
}
