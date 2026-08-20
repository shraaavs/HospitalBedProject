import React from 'react';

export default function SystemNotificationsAlertsControl() {
  return (
    <div className="w-full">
      
{/* TopNavBar (from JSON) */}
<header className="flex justify-between items-center w-full px-margin-desktop py-base z-40 shadow-sm bg-surface dark:bg-inverse-surface sticky top-0">
<div className="flex items-center gap-lg">
<h2 className="text-headline-md font-headline-lg text-primary dark:text-primary-fixed-dim">Alert Control Center</h2>
<div className="relative w-96">
<span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">search</span>
<input className="w-full bg-surface-container-low border-none rounded-full py-xs pl-xl pr-md text-body-md focus:ring-2 focus:ring-primary" placeholder="Search alerts, staff, or wards..." type="text"/>
</div>
</div>
<div className="flex items-center gap-md">
<button className="p-xs rounded-full hover:bg-surface-container-low transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined text-on-surface-variant">notifications</span>
</button>
<button className="p-xs rounded-full hover:bg-surface-container-low transition-colors cursor-pointer active:opacity-80">
<span className="material-symbols-outlined text-on-surface-variant">settings</span>
</button>
<div className="flex items-center gap-sm ml-md pl-md border-l border-outline-variant">
<img className="w-8 h-8 rounded-full border border-outline-variant" data-alt="A professional headshot of a senior hospital administrator with a calm and focused expression, wearing a navy blue blazer. The background is a brightly lit, sterile hospital office with soft out-of-focus medical equipment and a large window showing daylight." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDvQ2QwoPmsTmMjyXiR09gONp6tO173nvepxi-x2j2tGteHuz-UrWlVHRnMTYBQ4RS-9HQU9qSJ3O9UBgLtwMv8yJ5y2zneAW4sXybjqbGPMoKnxth03s7Nl2I3eKfxvzp6OxsMHOB0oCu5OHwGjv4YNVmz-DmK5JYXV0tlD3a-C7b_YqiUFkX-SRSVEk5Sou_3EDYRvNfdhwWqOQ3Cl8JB5s5unNSuT57l7Q5T6L2VjedlOpw0_Zow2Xc3nq4QrX66vzRTqJDswrnZ"/>
<span className="text-body-md font-bold">Admin Panel</span>
</div>
</div>
</header>
{/* Content Canvas */}
<div className="p-lg space-y-lg">
{/* Top Bento Grid Section */}
<div className="grid grid-cols-12 gap-lg animate-fade-in animation-delay-100">
{/* Hospital-Wide Announcements (Active Broadcasts) */}
<section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
<div className="flex justify-between items-center mb-md">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-primary" style={{"fontVariationSettings":"'FILL' 1"}}>campaign</span>
<h3 className="font-headline-md text-headline-md">Active Broadcasts</h3>
</div>
<button className="bg-primary text-on-primary px-md py-xs rounded-lg font-label-md flex items-center gap-xs hover:bg-primary-container transition-colors">
<span className="material-symbols-outlined text-[18px]">add</span>
                            New Announcement
                        </button>
</div>
<div className="space-y-md">
<div className="relative overflow-hidden group rounded-lg bg-surface-container p-md border-l-4 border-primary">
<div className="flex justify-between items-start">
<div>
<h4 className="font-bold text-body-lg">Annual Facility Maintenance - West Wing</h4>
<p className="text-on-surface-variant text-body-md mt-base">Scheduled electrical checks starting at 22:00. Emergency lighting will remain active. Coordinate patient shifts as needed.</p>
<div className="flex gap-sm mt-md">
<span className="text-label-md bg-primary-container/20 text-primary px-xs py-[2px] rounded">All Staff</span>
<span className="text-label-md text-outline flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">schedule</span> Starts in 2h 45m</span>
</div>
</div>
<span className="material-symbols-outlined text-outline cursor-pointer hover:text-error">cancel</span>
</div>
</div>
</div>
</section>
{/* Statistics / Alert Summary */}
<div className="col-span-12 lg:col-span-4 grid grid-rows-2 gap-lg">
<div className="bg-error-container/20 rounded-xl border border-error/20 p-md flex flex-col justify-between relative overflow-hidden">
<div className="z-10">
<p className="text-error font-label-md tracking-wider">CRITICAL ALERTS</p>
<h4 className="text-[48px] font-bold text-error leading-none mt-xs">03</h4>
<p className="text-on-error-container text-body-sm mt-base">Requires immediate acknowledgment</p>
</div>
<div className="absolute -right-4 -bottom-4 opacity-10">
<span className="material-symbols-outlined text-[120px] text-error">warning</span>
</div>
</div>
<div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md flex flex-col justify-between">
<div>
<p className="text-on-surface-variant font-label-md tracking-wider">SYSTEM STATUS</p>
<div className="flex items-center gap-sm mt-xs">
<div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
<span className="text-headline-md font-bold">Optimal</span>
</div>
</div>
<div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-md">
<div className="bg-primary h-full w-[88%]"></div>
</div>
<p className="text-label-md text-outline mt-xs">88% Response Rate (Target: 95%)</p>
</div>
</div>
</div>
{/* Main Control Center Grid */}
<div className="grid grid-cols-12 gap-lg animate-fade-in animation-delay-200 mt-lg">
{/* Live Alert Feed */}
<section className="col-span-12 lg:col-span-8 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
<div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
<div className="flex items-center gap-md">
<h3 className="font-headline-md text-headline-md">Live Alert Feed</h3>
<div className="flex bg-surface-container p-base rounded-lg">
<button className="px-md py-xs rounded-md bg-surface-container-lowest text-primary font-bold shadow-sm text-label-md">All</button>
<button className="px-md py-xs rounded-md text-on-surface-variant font-label-md hover:bg-surface-variant/30">Critical</button>
<button className="px-md py-xs rounded-md text-on-surface-variant font-label-md hover:bg-surface-variant/30">Warning</button>
</div>
</div>
<div className="flex items-center gap-sm">
<span className="text-label-md text-outline">Auto-refreshing in 12s</span>
<span className="material-symbols-outlined text-outline animate-spin text-[18px]">sync</span>
</div>
</div>
<div className="divide-y divide-outline-variant max-h-[600px] overflow-y-auto">
{/* Critical Alert Item */}
<div className="p-lg hover:bg-surface-container-low/50 transition-colors group">
<div className="flex gap-lg">
<div className="flex-shrink-0 relative">
<div className="w-12 h-12 rounded-full bg-error-container flex items-center justify-center text-error pulse-critical">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>emergency_home</span>
</div>
<div className="absolute -right-1 -top-1 w-4 h-4 bg-error border-2 border-surface-container-lowest rounded-full"></div>
</div>
<div className="flex-1">
<div className="flex justify-between mb-xs">
<span className="text-error font-bold text-label-md flex items-center gap-xs">
                                            CRITICAL • CODE BLUE
                                        </span>
<span className="text-outline text-label-md">2m ago</span>
</div>
<h4 className="text-body-lg font-bold">Cardiac Emergency - Ward B, Room 402</h4>
<p className="text-on-surface-variant text-body-md mt-xs">Patient ID: #PX-9928. Rapid Response Team dispatched. Floor supervisor acknowledgement pending.</p>
<div className="flex justify-between items-center mt-md">
<div className="flex -space-x-2">
<img className="w-8 h-8 rounded-full border-2 border-surface-container-lowest" data-alt="A portrait of a male nurse wearing medical scrubs, professional profile style with a soft blue background. Clinical and modern aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuDCMwhac8usScwcRGzUth6TbkmEi8K9sa36ghdlAwf39GdvsR_SisDyLg35ALMeOKZZx-dLnaFm7mkh4ZwC_PkXBiRw67VnLud9xxVV378Hf9oB_sn4GwmXaL18gNORZhZ5MCC9LY166Bd-x_NORylyOtFZbiJzmcrflFJH5CF8Rq-MIh2jI3H3tz7mEAjQb6E6q790QoIppQMejCw0_O2tPHi47ie9YDEPp5GPsWoN1bHevMmFjdEOj8aIMU58IZatMSRD9dcQRJE7"/>
<img className="w-8 h-8 rounded-full border-2 border-surface-container-lowest" data-alt="A portrait of a female doctor in a white lab coat, looking helpful and professional, professional profile style with a soft blue background. Clinical and modern aesthetic." src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2qzJvglczTl3NF_BJFlk1-gQw39hLKa5lXlhBjn4ZmShTGNThxIuSwPLKc_n5YGT6bLTf_Mn619mqhtI2uxBulXBcPt2Rvz_vCE-1Hpe5e4D3yBreN4OxnfPFOAfL2aEZfjoO8iVquOxjQc8tw4t4LEsrgl9OlBfjDI4A2L6xqP2J7I1JwX8BrRqxTv5Dja8r5H9xc4SOkgmR8tPgaiIf0J0IhXhcrEF22LTazJDOk9u42cARzA1ttKYRLIgAXpkTC2tfHpHMiwPB"/>
<div className="w-8 h-8 rounded-full border-2 border-surface-container-lowest bg-surface-container flex items-center justify-center text-[10px] font-bold text-on-surface-variant">+2</div>
</div>
<div className="flex gap-sm">
<button className="px-md py-xs rounded-lg border border-outline-variant text-label-md hover:bg-surface-variant transition-colors">Track Response</button>
<button className="px-md py-xs rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary-container shadow-sm">Acknowledge</button>
</div>
</div>
</div>
</div>
</div>
{/* Warning Alert Item */}
<div className="p-lg hover:bg-surface-container-low/50 transition-colors group">
<div className="flex gap-lg">
<div className="flex-shrink-0">
<div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>bed</span>
</div>
</div>
<div className="flex-1">
<div className="flex justify-between mb-xs">
<span className="text-amber-700 font-bold text-label-md">WARNING • CAPACITY</span>
<span className="text-outline text-label-md">14m ago</span>
</div>
<h4 className="text-body-lg font-bold">ICU Bed Availability Critical</h4>
<p className="text-on-surface-variant text-body-md mt-xs">Only 2 beds remaining in Central ICU. Pending admissions from ER: 4 patients. Review discharge list for possible transfers.</p>
<div className="flex justify-between items-center mt-md">
<div className="flex items-center gap-xs text-label-md text-green-600">
<span className="material-symbols-outlined text-[16px]">check_circle</span>
                                            Acknowledged by Dr. Sarah Chen
                                        </div>
<button className="px-md py-xs rounded-lg border border-outline-variant text-label-md hover:bg-surface-variant transition-colors">Details</button>
</div>
</div>
</div>
</div>
{/* Information Alert Item */}
<div className="p-lg hover:bg-surface-container-low/50 transition-colors group">
<div className="flex gap-lg">
<div className="flex-shrink-0">
<div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
<span className="material-symbols-outlined" style={{"fontVariationSettings":"'FILL' 1"}}>info</span>
</div>
</div>
<div className="flex-1">
<div className="flex justify-between mb-xs">
<span className="text-blue-700 font-bold text-label-md">INFO • SYSTEM</span>
<span className="text-outline text-label-md">45m ago</span>
</div>
<h4 className="text-body-lg font-bold">Staff Directory Updated</h4>
<p className="text-on-surface-variant text-body-md mt-xs">Internal messaging protocols updated for Q3. Please review the updated contact trees for night-shift coordinators.</p>
<div className="flex justify-end mt-md">
<button className="px-md py-xs rounded-lg border border-outline-variant text-label-md hover:bg-surface-variant transition-colors">View Update</button>
</div>
</div>
</div>
</div>
</div>
</section>
{/* Sidebar Controls: Configuration & Tracking */}
<aside className="col-span-4 space-y-lg">
{/* Configuration & Triggers */}
<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
<h3 className="font-headline-md text-headline-md mb-md">Global Triggers</h3>
<div className="space-y-md">
<div className="flex items-center justify-between p-sm rounded-lg bg-surface-container-low">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-on-surface-variant">sms</span>
<div>
<p className="font-bold text-body-md">SMS Alerts</p>
<p className="text-label-md text-outline">Enabled for Critical</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input checked={true} className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<div className="flex items-center justify-between p-sm rounded-lg bg-surface-container-low">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-on-surface-variant">mail</span>
<div>
<p className="font-bold text-body-md">Email Digests</p>
<p className="text-label-md text-outline">Staff-wide hourly</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input checked={true} className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<div className="flex items-center justify-between p-sm rounded-lg bg-surface-container-low">
<div className="flex items-center gap-sm">
<span className="material-symbols-outlined text-on-surface-variant">volume_up</span>
<div>
<p className="font-bold text-body-md">PA Integration</p>
<p className="text-label-md text-outline">Emergency Audio Overrides</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
</div>
<button className="w-full mt-lg py-sm border border-primary text-primary font-bold rounded-lg hover:bg-primary-container/10 transition-colors">
                            Manage All Triggers
                        </button>
</section>
{/* Response Tracking */}
<section className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg shadow-sm">
<div className="flex justify-between items-center mb-md">
<h3 className="font-headline-md text-headline-md">Recent Tracking</h3>
<span className="material-symbols-outlined text-outline">history</span>
</div>
<div className="space-y-sm">
<div className="p-sm bg-surface-container-low rounded-lg border border-outline-variant/30">
<div className="flex justify-between text-label-md mb-xs">
<span className="font-bold">Code Red - Ward A</span>
<span className="text-green-600">Resolved</span>
</div>
<div className="flex items-center gap-sm">
<div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
<div className="bg-green-500 h-full w-full"></div>
</div>
<span className="text-label-md font-bold">100%</span>
</div>
<p className="text-label-md text-outline mt-xs">Acknowledge: 4.2s (Avg)</p>
</div>
<div className="p-sm bg-surface-container-low rounded-lg border border-outline-variant/30">
<div className="flex justify-between text-label-md mb-xs">
<span className="font-bold">Patient Alarm - R402</span>
<span className="text-primary">Ongoing</span>
</div>
<div className="flex items-center gap-sm">
<div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
<div className="bg-primary h-full w-[65%]"></div>
</div>
<span className="text-label-md font-bold">65%</span>
</div>
<p className="text-label-md text-outline mt-xs">Pending: Night Supervisor</p>
</div>
</div>
<p className="text-center text-label-md text-primary mt-md cursor-pointer hover:underline">Download Detailed Audit Log</p>
</section>
</aside>
</div>
</div>

    </div>
  );
}
