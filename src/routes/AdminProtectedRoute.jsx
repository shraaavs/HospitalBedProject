import React from 'react';
import { Navigate } from 'react-router-dom';

export default function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem('userToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (role !== 'Admin') {
    // If they have a token but wrong role, send them to their respective dashboard
    if (role === 'Doctor') return <Navigate to="/dashboard" replace />;
    if (role === 'Nurse') return <Navigate to="/my-patients" replace />;
    if (role === 'Receptionist') return <Navigate to="/registration" replace />;
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}
