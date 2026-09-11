import React from 'react';

/**
 * RiskBadge component for consistent visual risk indication
 * @param {'safe' | 'suspicious' | 'critical' | 'neutral' | 'waiting'} level
 * @param {string} label
 */
export default function RiskBadge({ level = 'neutral', label, className = '' }) {
  const normalizedLevel = level.toLowerCase();
  const displayLabel = label || normalizedLevel;

  return (
    <span className={`risk-badge ${normalizedLevel} ${className}`}>
      <span className="risk-dot" />
      {displayLabel}
    </span>
  );
}
