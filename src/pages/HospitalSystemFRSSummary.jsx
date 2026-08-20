import React from 'react';

export default function HospitalSystemFRSSummary() {
  return (
    <div className="w-full max-w-4xl mx-auto animate-fade-in animation-delay-100">
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-xl border-b border-outline-variant bg-surface-container-low/30">
          <div className="flex items-center gap-sm mb-sm text-primary">
            <span className="material-symbols-outlined text-[32px]">assignment</span>
            <h1 className="text-display-lg font-display-lg font-bold">Functional Requirements</h1>
          </div>
          <p className="text-body-lg text-on-surface-variant">Hospital Bed & Resource Management System (FRS)</p>
        </div>

        <div className="p-xl space-y-xl">
          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-primary">info</span>
              1. Introduction
            </h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed">
              The Hospital Bed & Resource Management System is a web-based application to automate hospital bed allocation, patient admissions, resource tracking, staff scheduling, and reporting.
            </p>
          </section>

          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-secondary">group</span>
              2. User Roles
            </h2>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-sm text-body-md text-on-surface-variant">
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Super Admin:</span> System monitoring, hospital/user management.
              </li>
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Hospital Admin:</span> Bed, staff, and resource management.
              </li>
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Doctor:</span> Patient monitoring, bed transfer requests, ICU.
              </li>
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Nurse:</span> Bed status updates, patient assignment.
              </li>
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Receptionist:</span> Patient registration, admissions.
              </li>
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Inventory Mgr:</span> Oxygen, medicine, equipment tracking.
              </li>
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Emergency:</span> Emergency bed reservation, ambulance.
              </li>
              <li className="flex items-start gap-sm bg-surface-container p-sm rounded-lg">
                <span className="font-bold text-on-surface min-w-[120px]">Public User:</span> Bed availability search.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-tertiary">dashboard_customize</span>
              3. Key Modules & Features
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              {[
                "Authentication (Login, registration, RBAC)",
                "Patient Registration (ID generation, history)",
                "Bed Management (Real-time availability, ICU/General)",
                "Resource Allocation (Ventilators, oxygen, ambulances)",
                "Doctor & Staff Management (Duty allocation, shift)",
                "Appointments & Admissions (Booking, emergency, queue)",
                "Emergency Management (Rapid resource assignment)",
                "Dashboard & Monitoring (Live statistics, occupancy charts)",
                "Notifications (SMS/Email alerts)",
                "Analytics & Reporting (Exportable PDF/Excel reports)"
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-sm text-body-md text-on-surface-variant">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-label-md">
                    {idx + 1}
                  </span>
                  {feature}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-headline-md font-headline-md text-on-surface mb-md flex items-center gap-xs">
              <span className="material-symbols-outlined text-outline-variant">code</span>
              4. Technical Specs
            </h2>
            <div className="flex flex-wrap gap-md">
              <div className="bg-surface-container px-md py-sm rounded-lg">
                <span className="text-label-md font-bold text-on-surface block mb-xs">Frontend</span>
                <span className="text-body-sm text-on-surface-variant">React, Tailwind CSS v4, HTML5</span>
              </div>
              <div className="bg-surface-container px-md py-sm rounded-lg">
                <span className="text-label-md font-bold text-on-surface block mb-xs">Backend</span>
                <span className="text-body-sm text-on-surface-variant">Node.js / Express</span>
              </div>
              <div className="bg-surface-container px-md py-sm rounded-lg">
                <span className="text-label-md font-bold text-on-surface block mb-xs">Database</span>
                <span className="text-body-sm text-on-surface-variant">MongoDB</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
