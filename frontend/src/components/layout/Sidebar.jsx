import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AudioWaveform,
  Radio,
  UserCheck,
  History,
  FileText,
  Settings,
  ShieldCheck,
  Cpu
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/analyze', label: 'Analyze Voice', icon: AudioWaveform },
    { to: '/live', label: 'Live Detection', icon: Radio },
    { to: '/verification', label: 'Speaker Verification', icon: UserCheck },
    { to: '/history', label: 'History', icon: History },
    { to: '/reports', label: 'Reports', icon: FileText },
    { to: '/settings', label: 'Settings', icon: Settings }
  ];

  return (
    <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-icon-wrapper">
          <ShieldCheck size={22} />
        </div>
        <div className="brand-info">
          <span className="brand-name">VoxGuard AI</span>
          <span className="brand-tagline">Detect • Verify • Protect</span>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        <div className="nav-section-title">Core Defense Modules</div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-status-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={14} color="var(--cyan-400)" />
            <span className="sidebar-status-label">Engine Core</span>
          </div>
          <span className="sidebar-version">v1.0.0-UI</span>
        </div>
      </div>
    </aside>
  );
}
