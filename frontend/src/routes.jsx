import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import AuthGuard from './components/auth/AuthGuard';
import ErrorBoundary from './components/common/ErrorBoundary';

// Static imports for rock-solid mobile browser loading over LAN
import SplashScreen from './pages/auth/SplashScreen';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AnalyzeVoice from './pages/AnalyzeVoice';
import LiveDetection from './pages/LiveDetection';
import SpeakerVerification from './pages/SpeakerVerification';
import History from './pages/History';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

function renderIsolated(Component, name, inline = true) {
  return (
    <ErrorBoundary inline={inline} componentName={name}>
      <Component />
    </ErrorBoundary>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Routes */}
      <Route path="/splash" element={renderIsolated(SplashScreen, 'SplashScreen', false)} />
      <Route path="/login" element={renderIsolated(Login, 'Login', false)} />
      <Route path="/signup" element={renderIsolated(Signup, 'Signup', false)} />
      <Route path="/forgot-password" element={renderIsolated(ForgotPassword, 'ForgotPassword', false)} />

      {/* Protected Core Application Routes */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        <Route index element={renderIsolated(Dashboard, 'Dashboard')} />
        <Route path="analyze" element={renderIsolated(AnalyzeVoice, 'AnalyzeVoice')} />
        <Route path="live" element={renderIsolated(LiveDetection, 'LiveDetection')} />
        <Route path="verification" element={renderIsolated(SpeakerVerification, 'SpeakerVerification')} />
        <Route path="history" element={renderIsolated(History, 'History')} />
        <Route path="reports" element={renderIsolated(Reports, 'Reports')} />
        <Route path="settings" element={renderIsolated(Settings, 'Settings')} />
      </Route>

      {/* Fallback route - Redirect unknown paths to / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
