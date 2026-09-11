import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import MobileDrawer from '../components/layout/MobileDrawer';
import OnboardingModal from '../components/common/OnboardingModal';
import { useAuth } from '../context/authContext';

export default function MainLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { isNewUser, hasSeenOnboarding, isAuthenticated } = useAuth();

  // Show onboarding modal for newly registered user or first login if not yet seen
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try {
      return Boolean(isAuthenticated && (isNewUser || (typeof hasSeenOnboarding === 'function' && !hasSeenOnboarding())));
    } catch {
      return false;
    }
  });

  return (
    <div className="app-layout">
      {/* Sidebar navigation for desktop / tablet */}
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      {/* Main Content Area */}
      <div className="app-main">
        <Header onToggleMobileMenu={() => setMobileDrawerOpen(true)} />
        <main className="page-container">
          <Outlet />
        </main>
      </div>

      {/* Bottom Navigation for mobile viewports */}
      <BottomNav
        isDrawerOpen={mobileDrawerOpen}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
      />

      {/* Slide-up drawer for secondary items, profile & logout */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* First-time onboarding walkthrough */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
