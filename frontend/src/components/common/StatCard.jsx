import React from 'react';
import { Activity } from 'lucide-react';

/**
 * StatCard component for displaying high-impact cybersecurity metrics
 */
export default function StatCard({
  title,
  value,
  trend,
  trendType = 'positive',
  variant = 'primary',
  icon: IconComponent = Activity,
  demo = true
}) {
  return (
    <div className={`cyber-card stat-card ${variant}`}>
      <div className="stat-card-header">
        <span className="stat-label">{title}</span>
        <div className="stat-icon-wrapper">
          <IconComponent size={20} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-meta">
        {trend && (
          <span className={`stat-trend ${trendType}`}>
            {trendType === 'positive' ? '↑' : trendType === 'danger' ? '⚠' : '•'} {trend}
          </span>
        )}
        {demo && <span className="demo-pill">Sample</span>}
      </div>
    </div>
  );
}
