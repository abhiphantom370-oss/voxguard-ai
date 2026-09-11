import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AudioWaveform, Radio, UserCheck, Menu } from 'lucide-react';

export default function BottomNav({ onOpenDrawer, isDrawerOpen }) {
  const items = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/analyze', label: 'Analyze', icon: AudioWaveform },
    { to: '/live', label: 'Live', icon: Radio },
    { to: '/verification', label: 'Speakers', icon: UserCheck }
  ];

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <div className="bottom-nav-container">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <div className="bottom-nav-icon-wrapper">
                <Icon size={20} />
              </div>
              <span className="bottom-nav-label">{item.label}</span>
            </NavLink>
          );
        })}

        {/* More Button to trigger drawer */}
        <button
          type="button"
          className={`bottom-nav-item ${isDrawerOpen ? 'active' : ''}`}
          onClick={onOpenDrawer}
          aria-label="Open more options"
        >
          <div className="bottom-nav-icon-wrapper">
            <Menu size={20} />
          </div>
          <span className="bottom-nav-label">More</span>
        </button>
      </div>
    </nav>
  );
}
