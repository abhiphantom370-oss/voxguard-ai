import React from 'react';

/**
 * StatusIndicator component with pulsing glow
 * @param {'online' | 'offline' | 'standby' | 'active'} status
 * @param {string} label
 */
export default function StatusIndicator({ status = 'online', label = 'Online' }) {
  const getStatusColorClass = () => {
    switch (status) {
      case 'active':
      case 'online':
        return 'var(--safe)';
      case 'standby':
        return 'var(--cyan-400)';
      case 'offline':
        return 'var(--threat)';
      default:
        return 'var(--neutral)';
    }
  };

  return (
    <div className="system-status-indicator">
      <span className="pulse-dot" style={{ backgroundColor: getStatusColorClass(), boxShadow: `0 0 10px ${getStatusColorClass()}` }} />
      <span className="status-label-text">{label}</span>
    </div>
  );
}
