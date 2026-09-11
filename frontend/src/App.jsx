import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/authContext';
import AppRoutes from './routes';
import ErrorBoundary from './components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
