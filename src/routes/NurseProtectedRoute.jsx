import React from 'react';
import { Navigate } from 'react-router-dom';

export default function NurseProtectedRoute({ children }) {
  const token = localStorage.getItem('userToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/nurse/login" replace />;
  }

  if (role !== 'Nurse' && role !== 'Admin' && role !== 'Doctor') {
    return <Navigate to="/nurse/login" replace />;
  }

  return children;
}
