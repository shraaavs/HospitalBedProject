import React, { useState, useEffect } from 'react';

export default function NurseDashboardMediFlow() {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch Dashboard Statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        const res = await fetch('/api/dashboard/nurse', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const tasksRes = await fetch('/api/nursing-tasks', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        
        if (res.ok && tasksRes.ok) {
          setStats(data);
          setTasks(await tasksRes.json());
        } else {
          setError(data.message || 'Failed to fetch dashboard data');
        }
      } catch (err) {
        setError('Error connecting to server.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    
    // Optional: Auto-refresh every 30 seconds
    const intervalId = setInterval(fetchStats, 30000);
    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-primary text-[48px]">sync</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-xl">
        <div className="bg-error-container text-error p-md rounded-xl">
          <h3 className="font-bold">Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Top Navbar */}
      <header className="flex justify-between items-center w-full px-margin-desktop py-base z-40 shadow-sm bg-surface dark:bg-inverse-surface sticky top-0">
        <div className="flex items-center gap-lg">
          <h2 className="text-headline-md font-headline-lg text-primary dark:text-primary-fixed-dim">
            Nurse Dashboard
          </h2>
          <span className="text-label-md text-outline">Real-time overview of current duties</span>
        </div>
        <div className="flex items-center gap-md">
          <button className="p-xs rounded-full hover:bg-surface-container-low transition-colors cursor-pointer active:opacity-80 relative">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
            <span className="absolute top-0 right-0 w-3 h-3 bg-error rounded-full border-2 border-surface"></span>
          </button>
          <div className="flex items-center gap-sm ml-md pl-md border-l border-outline-variant">
             {/* Mock Avatar */}
             <img 
               className="w-8 h-8 rounded-full border border-outline-variant" 
               alt="Nurse Avatar" 
               src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=100&q=80" 
             />
             <span className="text-body-md font-bold text-on-surface">Nurse Station</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-lg space-y-lg animate-fade-in">
        
        {/* KPI Grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {/* Card: Patients */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">Patients</span>
              <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
            </div>
            <h3 className="text-[48px] font-bold text-on-surface mt-xs z-10 relative">{stats.assignedPatients}</h3>
            <p className="text-body-sm text-outline z-10 relative mt-sm">Admitted patients</p>
          </div>

          {/* Card: Critical Patients */}
          <div className="bg-error-container/20 border border-error/20 rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <span className="text-error font-label-md uppercase tracking-wider">Critical Patients</span>
              <div className="w-10 h-10 rounded-full bg-error flex items-center justify-center text-on-error group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined pulse-critical" style={{ fontVariationSettings: "'FILL' 1" }}>ecg_heart</span>
              </div>
            </div>
            <h3 className="text-[48px] font-bold text-error mt-xs z-10 relative">{stats.criticalPatients}</h3>
            <p className="text-body-sm text-on-error-container z-10 relative mt-sm">In ICU wards</p>
          </div>

          {/* Card: Vitals Pending */}
          <div className="bg-tertiary-container/20 border border-tertiary/20 rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <span className="text-tertiary font-label-md uppercase tracking-wider">Vitals Pending</span>
              <div className="w-10 h-10 rounded-full bg-tertiary flex items-center justify-center text-on-tertiary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>monitor_heart</span>
              </div>
            </div>
            <h3 className="text-[48px] font-bold text-tertiary mt-xs z-10 relative">{stats.vitalsPending}</h3>
            <p className="text-body-sm text-on-tertiary-container z-10 relative mt-sm">Checks overdue</p>
          </div>

          {/* Card: Pending Nursing Tasks */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <span className="text-on-surface-variant font-label-md uppercase tracking-wider">Pending Tasks</span>
              <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>assignment</span>
              </div>
            </div>
            <h3 className="text-[48px] font-bold text-on-surface mt-xs z-10 relative">{stats.pendingTasks}</h3>
            <p className="text-body-sm text-outline z-10 relative mt-sm">General, meds, etc.</p>
          </div>
        </section>

        {/* Secondary Grid */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-md mt-lg">
          {/* Card: Available Beds */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center text-green-700">
               <span className="material-symbols-outlined">bed</span>
            </div>
            <div>
              <p className="text-label-md text-outline tracking-wide uppercase">Available Beds</p>
              <p className="text-headline-sm font-bold text-on-surface">{stats.availableBeds}</p>
            </div>
          </div>

          {/* Card: Medicine Requests */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
               <span className="material-symbols-outlined">medication</span>
            </div>
            <div>
              <p className="text-label-md text-outline tracking-wide uppercase">Medicine Requests</p>
              <p className="text-headline-sm font-bold text-on-surface">{stats.medicineRequests}</p>
            </div>
          </div>

          {/* Card: Equipment Requests */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
               <span className="material-symbols-outlined">medical_services</span>
            </div>
            <div>
              <p className="text-label-md text-outline tracking-wide uppercase">Equip. Requests</p>
              <p className="text-headline-sm font-bold text-on-surface">{stats.equipmentRequests}</p>
            </div>
          </div>

          {/* Card: Emergency Alerts */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex items-center gap-md group cursor-pointer hover:bg-error-container/10 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-error-container flex items-center justify-center text-error group-hover:animate-pulse">
               <span className="material-symbols-outlined">notifications_active</span>
            </div>
            <div>
              <p className="text-label-md text-error tracking-wide uppercase">Emergency Alerts</p>
              <p className="text-headline-sm font-bold text-error">{stats.emergencyAlerts}</p>
            </div>
          </div>
        </section>
        
        {/* Dynamic Task Feed */}
        <section className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-lg shadow-sm">
          <div className="flex justify-between items-center mb-md">
            <h3 className="font-headline-md text-on-surface">Recent Task Activity</h3>
            <button className="text-primary font-bold text-label-md hover:underline">View All</button>
          </div>
          
          <div className="space-y-sm">
            {tasks.length === 0 ? (
                <p className="text-body-md text-on-surface-variant italic">No pending tasks.</p>
            ) : (
                tasks.map(task => (
                    <div key={task._id} className={`p-md rounded-xl bg-surface-container border border-outline-variant flex justify-between items-center ${task.status === 'Completed' ? 'opacity-70' : ''}`}>
                      <div className="flex items-center gap-md">
                        <span className={`material-symbols-outlined ${task.status === 'Completed' ? 'text-green-600' : task.taskType === 'Vitals' ? 'text-tertiary' : 'text-primary'}`}>
                            {task.status === 'Completed' ? 'check_circle' : task.taskType === 'Vitals' ? 'monitor_heart' : 'assignment'}
                        </span>
                        <div>
                          <p className="font-bold text-body-md text-on-surface">
                              {task.taskType}: {task.description}
                          </p>
                          <p className="text-body-sm text-on-surface-variant">
                              Patient: {task.patient ? task.patient.fullName : 'Unknown'} • {task.status}
                          </p>
                        </div>
                      </div>
                      {task.status !== 'Completed' && (
                          <button 
                              onClick={async () => {
                                  try {
                                      const token = localStorage.getItem('userToken') || localStorage.getItem('token');
                                      const res = await fetch(`/api/nursing-tasks/${task._id}/complete`, {
                                          method: 'PUT',
                                          headers: { 'Authorization': `Bearer ${token}` }
                                      });
                                      if (res.ok) {
                                          // Refresh data immediately
                                          const fetchStats = async () => {
                                            const dbRes = await fetch('/api/dashboard/nurse', { headers: { 'Authorization': `Bearer ${token}` } });
                                            const tasksRes = await fetch('/api/nursing-tasks', { headers: { 'Authorization': `Bearer ${token}` } });
                                            if (dbRes.ok && tasksRes.ok) {
                                              setStats(await dbRes.json());
                                              setTasks(await tasksRes.json());
                                            }
                                          };
                                          fetchStats();
                                      }
                                  } catch (err) {
                                      console.error(err);
                                  }
                              }}
                              className="px-md py-xs bg-primary text-on-primary border border-transparent rounded-lg text-label-md shadow-sm hover:brightness-110 transition-all"
                          >
                              Complete
                          </button>
                      )}
                    </div>
                ))
            )}
          </div>
        </section>
        
      </main>
    </div>
  );
}
