import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthGuard from './components/auth/AuthGuard';

// Auth Pages
import SplashScreen from './pages/auth/SplashScreen';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';

// Protected App Pages
import Dashboard from './pages/Dashboard';
import AnalyzeVoice from './pages/AnalyzeVoice';
import LiveDetection from './pages/LiveDetection';
import SpeakerVerification from './pages/SpeakerVerification';
import History from './pages/History';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/splash" element={<SplashScreen />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Protected Core Application Routes */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="analyze" element={<AnalyzeVoice />} />
        <Route path="live" element={<LiveDetection />} />
        <Route path="verification" element={<SpeakerVerification />} />
        <Route path="history" element={<History />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Fallback route - Redirect unknown paths to / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
