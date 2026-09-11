import React, { useState } from 'react';
import { ShieldAlert, UserCheck, Zap, ArrowRight, Check, X } from 'lucide-react';
import { useAuth } from '../../context/authContext';

const SLIDES = [
  {
    step: 1,
    badge: 'Phase 1 • Deepfake Defense',
    title: 'Detect Cloned Voices in Seconds',
    description:
      'VoxGuard utilizes deep acoustic convolutional networks and spectral anomaly detection to identify synthetic audio artifacts, neural vocoder signatures, and cloned voices with millisecond latency.',
    icon: ShieldAlert,
    iconColor: '#00f0ff',
    bgGradient: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(2, 132, 199, 0.2))',
    features: [
      'High-frequency harmonic loss detection',
      'Mel-spectrogram phase disparity checks',
      'Neural vocoder artifact classification'
    ]
  },
  {
    step: 2,
    badge: 'Phase 2 • Biometrics',
    title: 'Verify Trusted Speakers (1:N Biometrics)',
    description:
      'Enroll executive voices into a secure local catalog. VoxGuard measures 32-dimensional vocal tract resonances, F1/F2 formants, and pitch cadence to confirm the caller is who they claim to be.',
    icon: UserCheck,
    iconColor: '#10b981',
    bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))',
    features: [
      '1:N cosine distance vector comparison',
      'Vocal tract formant extraction',
      'Strict voice impersonation thresholding'
    ]
  },
  {
    step: 3,
    badge: 'Phase 3 • Active Scam Protection',
    title: 'Detect Scam Intent in Real Time',
    description:
      'During live calls or recorded audio, our contextual NLP engine transcribes speech with Faster-Whisper and identifies social engineering tactics, panic triggers, urgency traps, and OTP demands.',
    icon: Zap,
    iconColor: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2))',
    features: [
      'Real-time automated speech-to-text',
      'Context-aware scam threat scoring',
      'Immediate alert dispatch for high-risk dialog'
    ]
  }
];

export default function OnboardingModal({ isOpen, onClose }) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const { markOnboardingComplete } = useAuth();

  if (!isOpen) return null;

  const currentSlide = SLIDES[currentSlideIndex];
  const isLast = currentSlideIndex === SLIDES.length - 1;
  const SlideIcon = currentSlide.icon;

  const handleFinish = () => {
    markOnboardingComplete();
    if (onClose) onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      setCurrentSlideIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  return (
    <div className="modal-backdrop onboarding-backdrop">
      <div className="modal-dialog onboarding-dialog">
        {/* Top bar with slide indicators and close */}
        <div className="onboarding-header">
          <div className="onboarding-dots">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                type="button"
                className={`onboarding-dot ${idx === currentSlideIndex ? 'active' : ''}`}
                onClick={() => setCurrentSlideIndex(idx)}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            className="onboarding-skip-btn"
            onClick={handleSkip}
            title="Skip onboarding"
          >
            <span>Skip</span>
            <X size={14} />
          </button>
        </div>

        {/* Slide Body */}
        <div className="onboarding-body">
          <div
            className="onboarding-icon-box"
            style={{
              background: currentSlide.bgGradient,
              borderColor: currentSlide.iconColor
            }}
          >
            <SlideIcon size={44} color={currentSlide.iconColor} />
          </div>

          <div className="onboarding-badge">{currentSlide.badge}</div>
          <h2 className="onboarding-title">{currentSlide.title}</h2>
          <p className="onboarding-desc">{currentSlide.description}</p>

          {/* Bullet highlights */}
          <div className="onboarding-features-list">
            {currentSlide.features.map((feat, i) => (
              <div key={i} className="onboarding-feature-item">
                <Check size={14} color={currentSlide.iconColor} />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="onboarding-footer">
          <div className="onboarding-step-counter">
            Step {currentSlideIndex + 1} of {SLIDES.length}
          </div>

          <button
            type="button"
            className="btn btn-primary onboarding-cta-btn"
            onClick={handleNext}
          >
            {isLast ? (
              <>
                <span>Get Started</span>
                <Check size={16} />
              </>
            ) : (
              <>
                <span>Next Feature</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
