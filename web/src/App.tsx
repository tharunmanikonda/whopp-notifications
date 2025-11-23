import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import OAuthCallback from './pages/OAuthCallback';

export default function App() {
  const { loadFromStorage, validateToken } = useAuthStore();

  useEffect(() => {
    // Load auth from localStorage on app start
    loadFromStorage();

    // Validate token
    const checkToken = async () => {
      const isValid = await validateToken();
      if (!isValid) {
        // Token is invalid, user will be redirected to login
      }
    };

    checkToken();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/oauth/callback" element={<OAuthCallback />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
