// client/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const isLoggedIn = !!localStorage.getItem('token'); // ganti sesuai login kamu
  return isLoggedIn ? children : <Navigate to="/" />;
};

export default ProtectedRoute;
