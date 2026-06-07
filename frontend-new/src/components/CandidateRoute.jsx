import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function CandidateRoute() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Note: We'll consider any logged-in user who isn't explicitly an admin to be a Candidate
  if (user.isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  
  return <Outlet />;
}
