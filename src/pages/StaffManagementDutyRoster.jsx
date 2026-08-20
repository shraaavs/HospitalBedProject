import React from 'react';

export default function StaffManagementDutyRoster() {
  return (
    <div className="w-full">
      
{/* Dashboard Header & Stats */}
<div className="flex justify-between items-end">
<div>
<h2 className="font-headline-lg text-headline-lg text-primary">Doctor & Staff Management</h2>
<p className="font-body-md text-on-surface-variant">Real-time oversight of personnel deployment and shift cycles.</p>
</div>
<button className="bg-primary text-on-primary px-lg py-sm rounded-lg flex items-center gap-2 font-body-md font-bold shadow-md hover:opacity-90 transition-all active:scale-95" onClick="document.getElementById('shift-modal').classList.remove('hidden')">
<span className="material-symbols-outlined">add_task</span> Assign Shift
            </button>
</div>
{/* Bento Grid Stats */}
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-lg animate-fade-in animation-delay-100">
<div className="glass-card p-lg rounded-xl shadow-sm">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-primary/10 rounded-lg text-primary">
<span className="material-symbols-outlined">person_check</span>
</div>
<span className="text-secondary font-label-md">+4 Today</span>
</div>
<p className="text-on-surface-variant font-label-md">TOTAL ON-DUTY</p>
<p className="font-headline-lg text-headline-lg">124</p>
</div>
<div className="glass-card p-lg rounded-xl shadow-sm">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-secondary-container/20 rounded-lg text-secondary">
<span className="material-symbols-outlined">medical_services</span>
</div>
<span className="text-error font-label-md">-2 Late</span>
</div>
<p className="text-on-surface-variant font-label-md">DOCTORS ACTIVE</p>
<p className="font-headline-lg text-headline-lg">42</p>
</div>
<div className="glass-card p-lg rounded-xl shadow-sm">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-tertiary-container/20 rounded-lg text-tertiary">
<span className="material-symbols-outlined">support_agent</span>
</div>
<span className="text-on-surface-variant font-label-md">15m Response</span>
</div>
<p className="text-on-surface-variant font-label-md">ON-CALL STAFF</p>
<p className="font-headline-lg text-headline-lg">18</p>
</div>
<div className="glass-card p-lg rounded-xl shadow-sm">
<div className="flex justify-between items-start mb-sm">
<div className="p-2 bg-error-container/20 rounded-lg text-error">
<span className="material-symbols-outlined">warning</span>
</div>
<span className="text-error font-label-md">High Demand</span>
</div>
<p className="text-on-surface-variant font-label-md">ICU VACANCY</p>
<p className="font-headline-lg text-headline-lg">3</p>
</div>
</div>
{/* Directory & Calendar Section */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-lg h-auto animate-fade-in animation-delay-200">
{/* Staff Directory (Left Col) */}
<div className="lg:col-span-8 glass-card rounded-xl shadow-sm overflow-hidden flex flex-col">
<div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
<h3 className="font-headline-md text-headline-md">Staff Directory</h3>
<div className="flex gap-sm">
<select className="bg-surface-container-low border-none rounded-lg text-body-sm font-medium focus:ring-primary py-1.5 px-3">
<option>All Departments</option>
<option>Cardiology</option>
<option>ICU</option>
<option>General Ward</option>
</select>
<button className="p-2 hover:bg-surface-container-low rounded-lg transition-colors">
<span className="material-symbols-outlined">filter_list</span>
</button>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left min-w-[700px]">
<thead className="bg-surface-container-low/50 sticky top-0 font-label-md text-on-surface-variant uppercase tracking-wider">
<tr>
<th className="px-lg py-md">Name / Role</th>
<th className="px-lg py-md">Department</th>
<th className="px-lg py-md">Status</th>
<th className="px-lg py-md text-center">Capacity</th>
<th className="px-lg py-md">Shift</th>
<th className="px-lg py-md"></th>
</tr>
</thead>
<tbody className="divide-y divide-outline-variant/30">
{/* Staff Member 1 */}
<tr className="hover:bg-primary/5 transition-colors group">
<td className="px-lg py-md">
<div className="flex items-center gap-sm">
<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">AL</div>
<div>
<p className="font-body-md font-bold">Dr. Alana L. </p>
<p className="text-body-sm text-on-surface-variant">Senior Cardiologist</p>
</div>
</div>
</td>
<td className="px-lg py-md">
<span className="px-2 py-1 rounded bg-surface-variant text-on-surface-variant font-label-md">Cardiology</span>
</td>
<td className="px-lg py-md">
<span className="flex items-center gap-1.5 text-secondary font-body-sm">
<span className="w-2 h-2 rounded-full bg-secondary"></span> On-Duty
                                    </span>
</td>
<td className="px-lg py-md w-32">
<div className="h-1.5 w-full bg-outline-variant/30 rounded-full overflow-hidden">
<div className="h-full bg-error rounded-full" style={{"width":"85%"}}></div>
</div>
<p className="text-[10px] text-right mt-1 text-on-surface-variant">85% Loaded</p>
</td>
<td className="px-lg py-md font-body-sm">Morning (06:00 - 14:00)</td>
<td className="px-lg py-md text-right">
<button className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">more_vert</button>
</td>
</tr>
{/* Staff Member 2 */}
<tr className="hover:bg-primary/5 transition-colors group">
<td className="px-lg py-md">
<div className="flex items-center gap-sm">
<div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-bold">JK</div>
<div>
<p className="font-body-md font-bold">James K.</p>
<p className="text-body-sm text-on-surface-variant">Head Nurse</p>
</div>
</div>
</td>
<td className="px-lg py-md">
<span className="px-2 py-1 rounded bg-surface-variant text-on-surface-variant font-label-md">ICU</span>
</td>
<td className="px-lg py-md">
<span className="flex items-center gap-1.5 text-primary font-body-sm">
<span className="w-2 h-2 rounded-full bg-primary"></span> On-Call
                                    </span>
</td>
<td className="px-lg py-md w-32">
<div className="h-1.5 w-full bg-outline-variant/30 rounded-full overflow-hidden">
<div className="h-full bg-secondary rounded-full" style={{"width":"20%"}}></div>
</div>
<p className="text-[10px] text-right mt-1 text-on-surface-variant">20% Loaded</p>
</td>
<td className="px-lg py-md font-body-sm">Evening (14:00 - 22:00)</td>
<td className="px-lg py-md text-right">
<button className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">more_vert</button>
</td>
</tr>
{/* Staff Member 3 */}
<tr className="hover:bg-primary/5 transition-colors group">
<td className="px-lg py-md">
<div className="flex items-center gap-sm">
<div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary font-bold">MH</div>
<div>
<p className="font-body-md font-bold">Maya H.</p>
<p className="text-body-sm text-on-surface-variant">Junior Resident</p>
</div>
</div>
</td>
<td className="px-lg py-md">
<span className="px-2 py-1 rounded bg-surface-variant text-on-surface-variant font-label-md">General Ward</span>
</td>
<td className="px-lg py-md">
<span className="flex items-center gap-1.5 text-on-surface-variant font-body-sm">
<span className="w-2 h-2 rounded-full bg-outline"></span> Off-Duty
                                    </span>
</td>
<td className="px-lg py-md w-32">
<div className="h-1.5 w-full bg-outline-variant/30 rounded-full overflow-hidden">
<div className="h-full bg-outline rounded-full" style={{"width":"0%"}}></div>
</div>
<p className="text-[10px] text-right mt-1 text-on-surface-variant">Available</p>
</td>
<td className="px-lg py-md font-body-sm">Night (22:00 - 06:00)</td>
<td className="px-lg py-md text-right">
<button className="material-symbols-outlined text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">more_vert</button>
</td>
</tr>
</tbody>
</table>
</div>
</div>
{/* Calendar / Shift Overview (Right Col) */}
<div className="lg:col-span-4 space-y-lg">
<div className="glass-card rounded-xl shadow-sm p-lg">
<div className="flex justify-between items-center mb-lg">
<h3 className="font-headline-md text-headline-md">Shift Cycles</h3>
<div className="flex items-center gap-2">
<button className="p-1 hover:bg-surface-container-low rounded-lg transition-colors"><span className="material-symbols-outlined text-body-md">chevron_left</span></button>
<span className="font-body-md font-bold">Oct 24</span>
<button className="p-1 hover:bg-surface-container-low rounded-lg transition-colors"><span className="material-symbols-outlined text-body-md">chevron_right</span></button>
</div>
</div>
<div className="space-y-md">
{/* Morning Shift */}
<div className="p-md rounded-lg bg-secondary/5 border-l-4 border-secondary">
<div className="flex justify-between items-center mb-xs">
<p className="font-body-md font-bold text-secondary">Morning Shift</p>
<span className="font-label-md text-secondary">06:00 - 14:00</span>
</div>
<div className="flex -space-x-2 mb-sm">
<img className="w-7 h-7 rounded-full border-2 border-surface-container-lowest" data-alt="Small circle avatar of a doctor with glasses and smiling" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBvWZln50PZh1aODL6IbBtG51db_WgyQINl8t6vLu_o8ed_zVYfT57RwUfXPM9bKQBkq-bGv_IxxHGMM62XfXO0oyk0QZJTPBz8bMYgUaGfyEbnrCYFvGRyea3RCYWkthf761dbzpX6KNYE1adoxspSpAzdX1K4gGAEheBOC2yaUWcY9hr4A9hO0QnfVZSC8wJ_bP7RQo1jfabO87T99xm56QJY-eq6BPnbP1TJQcidHj3kVL_CH1ngkZTE9CYjQD7WOZQnoOws3P_H"/>
<img className="w-7 h-7 rounded-full border-2 border-surface-container-lowest" data-alt="Small circle avatar of a nurse with blue scrubs" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD5tkuIg0qE5J8biQvf5lKz1Kv2qwGo7He7zJeM4bBtTVI_zq2_Q-KHrzCU-vdGPirxm-Z8aRx2F9ticPC3z1_YNXJPERH1rvZgOmbbqHp4PlNnxwN_7LKL6XdopBbk9MyZx_yeubA0vUMKawuVv7ul_lqF_e_f49sNFbaAwQKj50GcKS4xVJWG2FMPDmJGeM2LRgO7v03XhtaEcSW6a0t3L8ngHWL0cYnd5eHSAczZ5BAEPRt1Ogpvo4M0vKM8MYJZtQaNIZAhEGOm"/>
<div className="w-7 h-7 rounded-full border-2 border-surface-container-lowest bg-secondary-container text-[10px] flex items-center justify-center font-bold text-on-secondary-container">+12</div>
</div>
<div className="w-full h-1.5 bg-outline-variant/20 rounded-full">
<div className="h-full bg-secondary rounded-full" style={{"width":"90%"}}></div>
</div>
<p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-tighter">Full Staffing Reached</p>
</div>
{/* Evening Shift */}
<div className="p-md rounded-lg bg-primary/5 border-l-4 border-primary">
<div className="flex justify-between items-center mb-xs">
<p className="font-body-md font-bold text-primary">Evening Shift</p>
<span className="font-label-md text-primary">14:00 - 22:00</span>
</div>
<div className="flex -space-x-2 mb-sm">
<img className="w-7 h-7 rounded-full border-2 border-surface-container-lowest" data-alt="Small circle avatar of a male doctor in his 30s" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPYDOnLz2yQJosZOZ7yutExLGiD7ma4bZXlahru66i1tDYbeMmZabcp-YibEjmiSbYdI6x6OZTzZD35CIUh6cPw829tVaarThJ3q-svBO3i4KprEqg24Pc0XYL54RaJx3oePIOdId_xfm9qhbejEZxYX0lt8H1oRCYZ17D-w6bi6Vt-mMKP9IWzmOXo1FAHAHtL566h1MPg2ztRgeTVPYgzF8yZFQFAlU109tk5uZbYaeP2hG4tniaP0PuVkOtR6IzfXvH6MyEYNFC"/>
<img className="w-7 h-7 rounded-full border-2 border-surface-container-lowest" data-alt="Small circle avatar of a female doctor in green scrubs" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCwqEvLYP2skifF4412dLFc2ds5_w7GABSSbRZHGFqfxje7VX3axdwQ0N2XH5nNTFIg_ILvxVPjjhknYC_Sr1bsdDeB-KRKhYyWX-I-o_8XP8y_SD4UHau63ufazAsFu75pRdpVEjoL4GFVEujhhSUAEuf7gBP_5Ad7ThKUjuFPo9pZoXJuFoTIQ6-0DBzgHTQBi56DRl1zoCaVMEjdmXXwA6Xrn9uoHW35na0bMaaER_Tmodec7hdi_cbSyaRFVWqaKWv-u3KHU6AJ"/>
<div className="w-7 h-7 rounded-full border-2 border-surface-container-lowest bg-primary-container/20 text-[10px] flex items-center justify-center font-bold text-primary">+8</div>
</div>
<div className="w-full h-1.5 bg-outline-variant/20 rounded-full">
<div className="h-full bg-primary rounded-full" style={{"width":"65%"}}></div>
</div>
<p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-tighter">Needs 3 More Nurses</p>
</div>
{/* Night Shift */}
<div className="p-md rounded-lg bg-tertiary/5 border-l-4 border-tertiary">
<div className="flex justify-between items-center mb-xs">
<p className="font-body-md font-bold text-tertiary">Night Shift</p>
<span className="font-label-md text-tertiary">22:00 - 06:00</span>
</div>
<div className="flex -space-x-2 mb-sm">
<img className="w-7 h-7 rounded-full border-2 border-surface-container-lowest" data-alt="Small circle avatar of a surgical specialist" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUgQ4CLc9V-WfrEB9bgqWpyKtuUU0RuUj5kD9in3mO0Df2uYAJsViAmiY1Px4UNHunRV-yfsiyimSSGdeBSEObyGYn32T4tV2Uh3iC6QZM-2B-AyQoNHDer-2LKqUPsCwTyerO5IO3HHflSQ0WQhO_0Q-PBExywH28PE_sGw59g1Va-c9FZZIOGPfuGp3nzuNVlt4qPQQOE4h6ZqENT8PdzzPETeRB50J33k9GR_6GrSuuliPyDo0_zoWNLIKNoSBDOCr66qynyyeF"/>
<div className="w-7 h-7 rounded-full border-2 border-surface-container-lowest bg-tertiary-container/20 text-[10px] flex items-center justify-center font-bold text-tertiary">+5</div>
</div>
<div className="w-full h-1.5 bg-outline-variant/20 rounded-full">
<div className="h-full bg-tertiary rounded-full" style={{"width":"40%"}}></div>
</div>
<p className="text-[10px] text-on-surface-variant mt-1 uppercase tracking-tighter">Understaffed - Urgent</p>
</div>
</div>
</div>
{/* Department Quick Filters */}
<div className="glass-card rounded-xl shadow-sm p-lg">
<h3 className="font-headline-md text-headline-md mb-md">Departments</h3>
<div className="grid grid-cols-2 gap-sm">
<button className="p-md bg-surface-container-low rounded-lg text-left hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20">
<p className="font-body-md font-bold">Cardiology</p>
<p className="text-body-sm text-on-surface-variant">18 Staff</p>
</button>
<button className="p-md bg-surface-container-low rounded-lg text-left hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20">
<p className="font-body-md font-bold">ICU</p>
<p className="text-body-sm text-on-surface-variant">24 Staff</p>
</button>
<button className="p-md bg-surface-container-low rounded-lg text-left hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20">
<p className="font-body-md font-bold">Pediatrics</p>
<p className="text-body-sm text-on-surface-variant">12 Staff</p>
</button>
<button className="p-md bg-surface-container-low rounded-lg text-left hover:bg-primary/10 transition-all border border-transparent hover:border-primary/20">
<p className="font-body-md font-bold">Surgery</p>
<p className="text-body-sm text-on-surface-variant">15 Staff</p>
</button>
</div>
</div>
</div>
</div>

    </div>
  );
}
