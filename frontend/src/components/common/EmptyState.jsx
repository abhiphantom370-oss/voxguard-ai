import React from 'react';
import { ShieldCheck } from 'lucide-react';

export default function EmptyState({
  icon: Icon = ShieldCheck,
  title = "No Data Available",
  description = "There are no security records to display at this time.",
  action
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 20px',
      textAlign: 'center',
      color: 'var(--text-muted)'
    }}>
      <div style={{
        width: 54,
        height: 54,
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-secondary)',
        marginBottom: 16
      }}>
        <Icon size={26} />
      </div>
      <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: '0.84rem', maxWidth: 400, marginBottom: action ? 18 : 0 }}>{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
