import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, LogOut, Settings, ShieldCheck, UserCheck, CheckCircle2, Smartphone } from 'lucide-react';
import StatusIndicator from '../common/StatusIndicator';
import { useAuth } from '../../context/authContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import PwaInstallModal from '../common/PwaInstallModal';

const ROUTE_TITLES = {
  '/': { title: 'Security Dashboard', subtitle: 'Real-time telemetry and threat intelligence' },
  '/analyze': { title: 'Analyze Audio File', subtitle: 'Deepfake voice detection & forensic waveform inspection' },
  '/live': { title: 'Live Stream Detection', subtitle: 'Real-time microphone stream interception & spoof warning' },
  '/verification': { title: 'Speaker Verification', subtitle: '1:N voice biometric enrollment and reference catalog' },
  '/history': { title: 'Analysis Audit History', subtitle: 'Complete log of evaluated voice streams and verification reports' },
  '/reports': { title: 'Threat Intelligence Reports', subtitle: 'Synthetic speech breakdown and attack vector analytics' },
  '/settings': { title: 'System Configuration', subtitle: 'Detection sensitivity, security policies, and privacy preferences' }
};

export default function Header({ onToggleMobileMenu }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isStandalone, isIos, triggerInstall, showIosGuide, closeIosGuide } = usePwaInstall();

  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const currentRouteMeta = ROUTE_TITLES[location.pathname] || {
    title: 'VoxGuard AI Console',
    subtitle: 'Enterprise Voice Impersonation Defense'
  };

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setShowProfileMenu(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-toggle"
          onClick={onToggleMobileMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="header-title-box">
          <h2 className="header-title">{currentRouteMeta.title}</h2>
          <span className="header-subtitle">{currentRouteMeta.subtitle}</span>
        </div>
      </div>

      <div className="header-right">
        {/* System Status Indicator */}
        <StatusIndicator status="online" label="System Online" />

        {/* Action Controls */}
        <div className="header-actions">
          {/* Notifications button */}
          <div style={{ position: 'relative' }}>
            <button
              className="header-icon-btn"
              title="System Notifications"
              onClick={() => setShowNotificationToast(!showNotificationToast)}
              aria-label="View notifications"
            >
              <Bell size={18} />
              <span className="notification-badge" />
            </button>

            {showNotificationToast && (
              <div className="header-dropdown-menu notification-dropdown">
                <div className="dropdown-header">
                  <span>System Notifications</span>
                  <span className="badge-mini">1 Active</span>
                </div>
                <div className="dropdown-item notif-item">
                  <CheckCircle2 size={16} color="var(--safe)" />
                  <div>
                    <div className="notif-title">Acoustic Engine Online</div>
                    <div className="notif-sub">PyTorch CNN & Whisper models active</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown Badge */}
          <div className="header-profile-container" ref={profileMenuRef}>
            <button
              type="button"
              className="user-profile-badge interactive"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-label="Toggle user account menu"
            >
              <div className="user-avatar">
                <span>{user?.avatarInitials || 'SA'}</span>
              </div>
              <div className="user-details hide-on-mobile">
                <span className="user-name">{user?.name || 'SecOps Admin'}</span>
                <span className="user-role">{user?.role || 'SIH Security Lead'}</span>
              </div>
            </button>

            {showProfileMenu && (
              <div className="header-dropdown-menu profile-dropdown">
                <div className="dropdown-header profile-dropdown-header">
                  <div className="user-avatar large">
                    <span>{user?.avatarInitials || 'SA'}</span>
                  </div>
                  <div className="profile-info">
                    <div className="profile-name">{user?.name || 'SecOps Admin'}</div>
                    <div className="profile-email">{user?.email || 'admin@voxguard.ai'}</div>
                    <div className="profile-role">
                      <ShieldCheck size={12} color="var(--cyan-400)" />
                      <span>{user?.role || 'SIH Security Lead'}</span>
                    </div>
                  </div>
                </div>

                <div className="dropdown-divider" />

                <Link
                  to="/settings"
                  className="dropdown-item"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <Settings size={16} />
                  <span>Account & Policies</span>
                </Link>

                <Link
                  to="/verification"
                  className="dropdown-item"
                  onClick={() => setShowProfileMenu(false)}
                >
                  <UserCheck size={16} />
                  <span>Biometric Profiles</span>
                </Link>

                {!isStandalone && (
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setShowProfileMenu(false);
                      triggerInstall();
                    }}
                  >
                    <Smartphone size={16} color="var(--cyan-400)" />
                    <span style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>Install Mobile App</span>
                  </button>
                )}

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-item logout-action"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <PwaInstallModal
        isOpen={showIosGuide}
        onClose={closeIosGuide}
        isIos={isIos}
      />
    </header>
  );
}
