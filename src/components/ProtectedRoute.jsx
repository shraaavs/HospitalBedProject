import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('userToken');
  const userRole = localStorage.getItem('userRole');

  if (!token) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Logged in but insufficient role
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
