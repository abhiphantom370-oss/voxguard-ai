import React from 'react';
import { ShieldCheck, Share, PlusSquare, X, Smartphone, CheckCircle } from 'lucide-react';

export default function PwaInstallModal({ isOpen, onClose, isIos }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-dialog cyber-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px', padding: '24px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid var(--border-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Smartphone size={18} color="var(--cyan-400)" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Install VoxGuard AI
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Add to your mobile Home Screen
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
          Experience VoxGuard AI like a native application with full-screen view, instant offline shell caching, and rapid microphone defense.
        </p>

        {isIos ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '6px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', color: 'var(--cyan-400)' }}>
                <Share size={18} />
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <strong>Step 1:</strong> In Safari's bottom toolbar, tap the <strong>Share</strong> button.
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', color: 'var(--safe)' }}>
                <PlusSquare size={18} />
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                <strong>Step 2:</strong> Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ padding: '6px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', color: 'var(--cyan-400)' }}>
                <CheckCircle size={18} />
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                Tap the browser menu <strong>(⋮)</strong> and select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          className="cyber-btn primary"
          onClick={onClose}
          style={{ width: '100%', marginTop: '18px', minHeight: '44px', justifyContent: 'center' }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
