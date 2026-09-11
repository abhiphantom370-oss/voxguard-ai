import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Cpu, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/authContext';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 1400);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isLoading, navigate]);

  const handleLaunch = () => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="splash-screen-container">
      {/* Background ambient glow */}
      <div className="splash-glow-bg" />

      <div className="splash-content">
        <div className="splash-logo-box">
          <div className="splash-icon-wrapper">
            <ShieldCheck size={52} />
          </div>
          <div className="splash-pulse-ring" />
        </div>

        <div className="splash-text-group">
          <h1 className="splash-title">VoxGuard AI</h1>
          <p className="splash-tagline">Detect. Verify. Protect.</p>
          <span className="splash-badge">AI Voice Cloning Defense • SIH 2024</span>
        </div>

        {/* Loading status */}
        <div className="splash-loader-bar">
          <div className="splash-loader-progress" />
        </div>

        <div className="splash-footer">
          <button className="splash-btn-skip" onClick={handleLaunch}>
            <span>Launch Console</span>
            <ArrowRight size={14} />
          </button>
          <div className="splash-version">
            <Cpu size={12} color="var(--cyan-400)" />
            <span>Acoustic Forensics v2.4</span>
          </div>
        </div>
      </div>
    </div>
  );
}
