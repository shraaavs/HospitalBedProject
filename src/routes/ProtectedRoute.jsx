import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem('userToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    if (role === 'Receptionist') return <Navigate to="/receptionist/login" replace />;
    if (role === 'Doctor') return <Navigate to="/doctor/login" replace />;
    if (role === 'Nurse') return <Navigate to="/nurse/login" replace />;
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
