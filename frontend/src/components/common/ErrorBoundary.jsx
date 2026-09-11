import React from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[VoxGuard ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const isInline = Boolean(this.props.inline);
      return (
        <div style={{
          minHeight: isInline ? '320px' : '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary, #070a12)',
          color: 'var(--text-primary, #ffffff)',
          padding: '24px',
          textAlign: 'center',
          gap: '16px',
          borderRadius: isInline ? '12px' : 0,
          border: isInline ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
          margin: isInline ? '16px 0' : 0,
          boxSizing: 'border-box',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif'
        }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: '14px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)'
          }}>
            <ShieldAlert size={28} color="#ef4444" />
          </div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: '#ffffff' }}>
            VoxGuard encountered a browser compatibility issue.
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
            A component could not complete execution in this browser environment. Tap Reload to restore the secure console.
          </p>
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={this.handleReload}
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={15} />
              <span>Reload Application</span>
            </button>
            {isInline && (
              <button
                type="button"
                onClick={this.handleReset}
                className="btn btn-secondary"
                style={{ padding: '10px 16px', fontSize: '0.88rem', cursor: 'pointer' }}
              >
                Retry Component
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
