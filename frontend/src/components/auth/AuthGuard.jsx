import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/authContext';
import { ShieldAlert } from 'lucide-react';

export default function AuthGuard({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary, #070a12)',
        color: 'var(--text-primary, #ffffff)',
        gap: 16
      }}>
        <div style={{
          width: 50,
          height: 50,
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(59, 130, 246, 0.2))',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 25px rgba(0, 240, 255, 0.3)',
          animation: 'pulse-glow 1.5s infinite'
        }}>
          <ShieldAlert size={28} color="#00f0ff" />
        </div>
        <div style={{ fontSize: '0.9rem', color: 'var(--cyan-400, #00f0ff)', letterSpacing: '0.05em' }}>
          Verifying Security Credentials...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
