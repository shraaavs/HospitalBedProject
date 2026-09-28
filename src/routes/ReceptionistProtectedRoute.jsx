import React from 'react';
import { Navigate } from 'react-router-dom';

export default function ReceptionistProtectedRoute({ children }) {
  const token = localStorage.getItem('userToken');
  const role = localStorage.getItem('userRole');

  if (!token) {
    return <Navigate to="/receptionist/login" replace />;
  }

  if (role !== 'Receptionist' && role !== 'Admin') {
    return <Navigate to="/receptionist/login" replace />;
  }

  return children;
}
