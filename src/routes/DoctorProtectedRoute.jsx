import React from 'react';
import { Navigate } from 'react-router-dom';

export default function DoctorProtectedRoute({ children }) {
  const token = localStorage.getItem('userToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/doctor/login" replace />;
  }

  // Doctor, Nurse, and Admin have permission for clinical routes
  if (role !== 'Doctor' && role !== 'Admin' && role !== 'Nurse') {
    if (role === 'Receptionist') return <Navigate to="/receptionist/dashboard" replace />;
    return <Navigate to="/doctor/login" replace />;
  }

  return children;
}

