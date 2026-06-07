import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute() {
  const { user } = useAuth();

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If logged in but not an admin, redirect to home
  if (!user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Render the nested admin routes
  return <Outlet />;
}
