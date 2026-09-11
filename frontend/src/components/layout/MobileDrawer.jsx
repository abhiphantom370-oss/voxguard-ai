import React from 'react';
import { NavLink } from 'react-router-dom';
import { History, FileText, Settings, LogOut, X, Shield, ChevronRight, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/authContext';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import PwaInstallModal from '../common/PwaInstallModal';

export default function MobileDrawer({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { isStandalone, isIos, triggerInstall, showIosGuide, closeIosGuide } = usePwaInstall();

  if (!isOpen) return null;

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <div className="mobile-drawer-backdrop" onClick={onClose}>
      <div className="mobile-drawer-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Drawer drag handle */}
        <div className="mobile-drawer-handle-bar">
          <div className="mobile-drawer-handle" />
        </div>

        {/* Drawer header with User Profile */}
        <div className="mobile-drawer-header">
          <div className="mobile-drawer-user">
            <div className="user-avatar drawer-avatar">
              <span>{user?.avatarInitials || 'VG'}</span>
            </div>
            <div className="user-details">
              <span className="drawer-user-name">{user?.name || 'Security Analyst'}</span>
              <span className="drawer-user-email">{user?.email || 'admin@voxguard.ai'}</span>
              <span className="drawer-user-role">
                <Shield size={11} color="var(--cyan-400)" />
                {user?.role || 'SecOps Operator'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Secondary Navigation Links */}
        <div className="mobile-drawer-content">
          <div className="drawer-section-title">Additional Defense Modules</div>

          <div className="drawer-nav-list">
            <NavLink
              to="/history"
              className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <div className="drawer-nav-item-left">
                <History size={18} />
                <span>Audit History</span>
              </div>
              <ChevronRight size={16} className="drawer-chevron" />
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <div className="drawer-nav-item-left">
                <FileText size={18} />
                <span>Threat Reports</span>
              </div>
              <ChevronRight size={16} className="drawer-chevron" />
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) => `drawer-nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <div className="drawer-nav-item-left">
                <Settings size={18} />
                <span>Account & Security Settings</span>
              </div>
              <ChevronRight size={16} className="drawer-chevron" />
            </NavLink>

            {!isStandalone && (
              <button
                type="button"
                className="drawer-nav-item"
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => {
                  onClose();
                  triggerInstall();
                }}
              >
                <div className="drawer-nav-item-left">
                  <Smartphone size={18} color="var(--cyan-400)" />
                  <span style={{ color: 'var(--cyan-400)', fontWeight: 600 }}>Install VoxGuard App</span>
                </div>
                <ChevronRight size={16} className="drawer-chevron" />
              </button>
            )}
          </div>
        </div>

        {/* Drawer Footer with Logout */}
        <div className="mobile-drawer-footer">
          <button
            type="button"
            className="drawer-logout-btn"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>Sign Out of Console</span>
          </button>
        </div>
      </div>

      <PwaInstallModal
        isOpen={showIosGuide}
        onClose={closeIosGuide}
        isIos={isIos}
      />
    </div>
  );
}
