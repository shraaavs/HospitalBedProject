import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';

// Auth Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminRegister from './pages/admin/AdminRegister';
import DoctorLogin from './pages/doctor/DoctorLogin';
import NurseLogin from './pages/nurse/NurseLogin';
import NurseDashboard from './pages/nurse/NurseDashboard';
import NurseProfile from './pages/nurse/NurseProfile';
import NursingObservations from './pages/nurse/NursingObservations';
import NurseMedicationTreatment from './pages/nurse/NurseMedicationTreatment';
import NurseDoctorInstructions from './pages/nurse/NurseDoctorInstructions';
import NurseBedPatientMonitoring from './pages/nurse/NurseBedPatientMonitoring';
import NurseEmergencyCriticalCare from './pages/nurse/NurseEmergencyCriticalCare';
import NurseResourceRequests from './pages/nurse/NurseResourceRequests';
import NurseTransferDischarge from './pages/nurse/NurseTransferDischarge';
import NurseNotifications from './pages/nurse/NurseNotifications';
import ReceptionistLogin from './pages/receptionist/ReceptionistLogin';
import ForgotPassword from './pages/ForgotPassword';
import Register from './pages/Register';

// Protected Routes
import AdminProtectedRoute from './routes/AdminProtectedRoute';
import DoctorProtectedRoute from './routes/DoctorProtectedRoute';
import NurseProtectedRoute from './routes/NurseProtectedRoute';
import ReceptionistProtectedRoute from './routes/ReceptionistProtectedRoute';
import ProtectedRoute from './routes/ProtectedRoute';


// Import Pages
import MainMonitoringDashboardMediFlowCentral from './pages/MainMonitoringDashboardMediFlowCentral';
import BedManagementRealTimeStatus from './pages/BedManagementRealTimeStatus';
import ResourceAllocationMediFlowCentral from './pages/ResourceAllocationMediFlowCentral';
import PatientRegistrationMediFlow from './pages/PatientRegistrationMediFlow';
import SystemAnalyticsReports from './pages/SystemAnalyticsReports';
import HospitalSystemFRSSummary from './pages/HospitalSystemFRSSummary';
import MyPatientsMediFlow from './pages/MyPatientsMediFlow';
import AppointmentsAdmissionsQueue from './pages/AppointmentsAdmissionsQueue';
import EmergencyManagementRapidResponseCenter from './pages/EmergencyManagementRapidResponseCenter';
import SystemNotificationsAlertsControl from './pages/SystemNotificationsAlertsControl';
import AdminDashboardMediFlowDesktop from './pages/AdminDashboardMediFlowDesktop';
import StaffManagementDutyRoster from './pages/StaffManagementDutyRoster';
import AdminUserAccessManagement from './pages/admin/AdminUserAccessManagement';
import AdminBillingDischarge from './pages/admin/AdminBillingDischarge';
import AdminSettings from './pages/admin/AdminSettings';
import AdminProfile from './pages/admin/AdminProfile';
import DoctorPrescriptions from './pages/doctor/DoctorPrescriptions';
import DoctorPatientVitals from './pages/doctor/DoctorPatientVitals';
import DoctorAdmissionBedRequests from './pages/doctor/DoctorAdmissionBedRequests';
import DoctorResourceRequests from './pages/doctor/DoctorResourceRequests';
import DoctorEmergencyPatients from './pages/doctor/DoctorEmergencyPatients';
import DoctorTransferDischarge from './pages/doctor/DoctorTransferDischarge';
import DoctorNotifications from './pages/doctor/DoctorNotifications';
import DoctorProfile from './pages/doctor/DoctorProfile';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorConsultations from './pages/doctor/DoctorConsultations';

// Receptionist Pages
import ReceptionistDashboard from './pages/receptionist/ReceptionistDashboard';
import ReceptionistPatientSearch from './pages/receptionist/ReceptionistPatientSearch';
import ReceptionistCheckIn from './pages/receptionist/ReceptionistCheckIn';
import ReceptionistAdmissionProcessing from './pages/receptionist/ReceptionistAdmissionProcessing';
import ReceptionistEmergencyRegistration from './pages/receptionist/ReceptionistEmergencyRegistration';
import ReceptionistBedAvailability from './pages/receptionist/ReceptionistBedAvailability';
import ReceptionistDoctorAvailability from './pages/receptionist/ReceptionistDoctorAvailability';
import ReceptionistQueueManagement from './pages/receptionist/ReceptionistQueueManagement';
import ReceptionistDischargeAssistance from './pages/receptionist/ReceptionistDischargeAssistance';
import ReceptionistNotifications from './pages/receptionist/ReceptionistNotifications';
import ReceptionistProfile from './pages/receptionist/ReceptionistProfile';
import PatientDetails from './pages/receptionist/PatientDetails';


// Dynamic Role-Adaptive Route Components
function AdaptiveDashboard() {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();
  if (role === 'doctor') return <DoctorDashboard />;
  if (role === 'nurse') return <NurseDashboard />;
  if (role === 'receptionist') return <ReceptionistDashboard />;
  return <AdminDashboardMediFlowDesktop />;
}

function AdaptivePrescriptions() {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();
  if (role === 'nurse') return <NurseMedicationTreatment />;
  return <DoctorPrescriptions />;
}

function AdaptiveResourceRequests() {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();
  if (role === 'nurse') return <NurseResourceRequests />;
  return <DoctorResourceRequests />;
}

function AdaptiveEmergency() {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();
  if (role === 'nurse') return <NurseEmergencyCriticalCare />;
  if (role === 'doctor') return <DoctorEmergencyPatients />;
  return <EmergencyManagementRapidResponseCenter />;
}

function AdaptiveTransferDischarge() {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();
  if (role === 'nurse') return <NurseTransferDischarge />;
  return <DoctorTransferDischarge />;
}

function AdaptiveBeds() {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();
  if (role === 'nurse') return <NurseBedPatientMonitoring />;
  if (role === 'receptionist') return <ReceptionistBedAvailability />;
  return <BedManagementRealTimeStatus />;
}

function AdaptiveNotifications() {
  const role = (localStorage.getItem('userRole') || '').trim().toLowerCase();
  if (role === 'receptionist') return <ReceptionistNotifications />;
  if (role === 'nurse') return <NurseNotifications />;
  if (role === 'doctor') return <DoctorNotifications />;
  return <SystemNotificationsAlertsControl />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Auth Routes */}
        <Route path="/" element={<AdminLogin />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/register" element={<Navigate to="/admin/login" replace />} />
        <Route path="/doctor/login" element={<DoctorLogin />} />
        <Route path="/doctor/register" element={<Register defaultRole="Doctor" />} />
        <Route path="/nurse/login" element={<NurseLogin />} />
        <Route path="/nurse/register" element={<Register defaultRole="Nurse" />} />
        <Route path="/receptionist/login" element={<ReceptionistLogin />} />
        <Route path="/receptionist/register" element={<Register defaultRole="Receptionist" />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ForgotPassword />} />

        {/* Admin Protected Routes */}
        <Route
          path="/frs-summary"
          element={<Navigate to="/dashboard" replace />}
        />
        <Route
          path="/analytics"
          element={
            <AdminProtectedRoute>
              <DashboardLayout>
                <SystemAnalyticsReports />
              </DashboardLayout>
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/roster"
          element={
            <AdminProtectedRoute>
              <DashboardLayout>
                <StaffManagementDutyRoster />
              </DashboardLayout>
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={<Navigate to="/roster" replace />}
        />
        <Route
          path="/admin/billing"
          element={
            <AdminProtectedRoute>
              <DashboardLayout>
                <AdminBillingDischarge />
              </DashboardLayout>
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <AdminProtectedRoute>
              <DashboardLayout>
                <AdminSettings />
              </DashboardLayout>
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/profile"
          element={
            <AdminProtectedRoute>
              <DashboardLayout>
                <AdminProfile />
              </DashboardLayout>
            </AdminProtectedRoute>
          }
        />


        {/* Universal Dashboard Route (Role-Adaptive) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdaptiveDashboard />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Doctor Dedicated Dashboard Route */}
        <Route
          path="/doctor/dashboard"
          element={
            <DoctorProtectedRoute>
              <DashboardLayout>
                <DoctorDashboard />
              </DashboardLayout>
            </DoctorProtectedRoute>
          }
        />

        {/* Patients Route for Doctor, Nurse & Admin */}
        <Route
          path="/my-patients"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <MyPatientsMediFlow />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Doctor Consultations Route */}
        <Route
          path="/consultations"
          element={
            <DoctorProtectedRoute>
              <DashboardLayout>
                <DoctorConsultations />
              </DashboardLayout>
            </DoctorProtectedRoute>
          }
        />

        {/* Medication & Treatment / Prescriptions Route */}
        <Route
          path="/prescriptions"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdaptivePrescriptions />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Patient Vitals Route */}
        <Route
          path="/vitals"
          element={
            <DoctorProtectedRoute>
              <DashboardLayout>
                <DoctorPatientVitals />
              </DashboardLayout>
            </DoctorProtectedRoute>
          }
        />

        {/* Nursing Observations Route */}
        <Route
          path="/nursing-observations"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <NursingObservations />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Doctor Instructions Route */}
        <Route
          path="/doctor-instructions"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <NurseDoctorInstructions />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Doctor Admissions & Bed Requests Route */}
        <Route
          path="/bed-requests"
          element={
            <DoctorProtectedRoute>
              <DashboardLayout>
                <DoctorAdmissionBedRequests />
              </DashboardLayout>
            </DoctorProtectedRoute>
          }
        />

        {/* Resource Requests Route (Doctor & Nurse) */}
        <Route
          path="/resource-requests"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdaptiveResourceRequests />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Emergency Patients Route */}
        <Route
          path="/emergency"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdaptiveEmergency />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Transfer & Discharge Route (Doctor & Nurse) */}
        <Route
          path="/transfer-discharge"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdaptiveTransferDischarge />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Receptionist Protected Routes */}
        <Route
          path="/receptionist/dashboard"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistDashboard />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/register-patient"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <PatientRegistrationMediFlow />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/registration"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <PatientRegistrationMediFlow />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/search-patients"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistPatientSearch />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/patients/:patientId"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <PatientDetails />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/receptionist/patients/:patientId"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <PatientDetails />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/appointments"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <AppointmentsAdmissionsQueue />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/check-in"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistCheckIn />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/admissions"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistAdmissionProcessing />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/emergency"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistEmergencyRegistration />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/beds"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistBedAvailability />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/doctors"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistDoctorAvailability />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/queue"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistQueueManagement />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/discharge"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistDischargeAssistance />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        <Route
          path="/receptionist/profile"
          element={
            <ReceptionistProtectedRoute>
              <DashboardLayout>
                <ReceptionistProfile />
              </DashboardLayout>
            </ReceptionistProtectedRoute>
          }
        />
        {/* Appointments Route for Doctor, Receptionist & Admin */}
        <Route
          path="/appointments"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AppointmentsAdmissionsQueue />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Beds & Patient Monitoring Route */}
        <Route
          path="/beds"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdaptiveBeds />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/allocation"
          element={
            <AdminProtectedRoute>
              <DashboardLayout>
                <ResourceAllocationMediFlowCentral />
              </DashboardLayout>
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <DashboardLayout>
                <AdaptiveNotifications />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />


        {/* Doctor Profile Route */}
        <Route
          path="/doctor/profile"
          element={
            <DoctorProtectedRoute>
              <DashboardLayout>
                <DoctorProfile />
              </DashboardLayout>
            </DoctorProtectedRoute>
          }
        />

        {/* Nurse Profile Route */}
        <Route
          path="/nurse/profile"
          element={
            <NurseProtectedRoute>
              <DashboardLayout>
                <NurseProfile />
              </DashboardLayout>
            </NurseProtectedRoute>
          }
        />



        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
