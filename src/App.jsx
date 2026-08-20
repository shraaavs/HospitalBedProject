import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientRegistrationMediFlow from './pages/PatientRegistrationMediFlow';
import MainMonitoringDashboardMediFlowCentral from './pages/MainMonitoringDashboardMediFlowCentral';
import AdminDashboardMediFlowDesktop from './pages/AdminDashboardMediFlowDesktop';
import AppointmentsAdmissionsQueue from './pages/AppointmentsAdmissionsQueue';
import StaffManagementDutyRoster from './pages/StaffManagementDutyRoster';
import ResourceAllocationMediFlowCentral from './pages/ResourceAllocationMediFlowCentral';
import EmergencyManagementRapidResponseCenter from './pages/EmergencyManagementRapidResponseCenter';
import BedManagementRealTimeStatus from './pages/BedManagementRealTimeStatus';
import SystemNotificationsAlertsControl from './pages/SystemNotificationsAlertsControl';
import SystemAnalyticsReports from './pages/SystemAnalyticsReports';
import HospitalSystemFRSSummary from './pages/HospitalSystemFRSSummary';
import NurseDashboardMediFlow from './pages/NurseDashboardMediFlow';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected/Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['Doctor', 'Nurse', 'Admin']}>
              <DashboardLayout>
                <MainMonitoringDashboardMediFlowCentral />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/nurse-dashboard"
          element={
            <ProtectedRoute allowedRoles={['Nurse', 'Admin']}>
              <DashboardLayout>
                <NurseDashboardMediFlow />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/beds"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Nurse', 'Receptionist']}>
              <DashboardLayout>
                <BedManagementRealTimeStatus />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/allocation"
          element={
            <ProtectedRoute allowedRoles={['Inventory Manager', 'Admin', 'Doctor', 'Nurse']}>
              <DashboardLayout>
                <ResourceAllocationMediFlowCentral />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/registration"
          element={
            <ProtectedRoute allowedRoles={['Receptionist', 'Admin']}>
              <DashboardLayout>
                <PatientRegistrationMediFlow />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/roster"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <DashboardLayout>
                <StaffManagementDutyRoster />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <DashboardLayout>
                <SystemAnalyticsReports />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/emergency"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Nurse']}>
              <DashboardLayout>
                <EmergencyManagementRapidResponseCenter />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute allowedRoles={['Admin', 'Doctor', 'Nurse', 'Receptionist', 'Inventory Manager']}>
              <DashboardLayout>
                <SystemNotificationsAlertsControl />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/appointments"
          element={
            <ProtectedRoute allowedRoles={['Receptionist', 'Admin', 'Doctor']}>
              <DashboardLayout>
                <AppointmentsAdmissionsQueue />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <DashboardLayout>
                <AdminDashboardMediFlowDesktop />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/frs-summary"
          element={
            <ProtectedRoute allowedRoles={['Admin']}>
              <DashboardLayout>
                <HospitalSystemFRSSummary />
              </DashboardLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
