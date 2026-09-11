import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Bell,
  Shield,
  CheckCircle2,
  Save,
  Smartphone
} from 'lucide-react';
import { fetchSettings, saveSettings } from '../services/analysisService';
import { usePwaInstall } from '../hooks/usePwaInstall';
import PwaInstallModal from '../components/common/PwaInstallModal';

export default function Settings() {
  const { isStandalone, isIos, triggerInstall, showIosGuide, closeIosGuide } = usePwaInstall();
  const [sensitivityPreset, setSensitivityPreset] = useState(() => {
    return localStorage.getItem('voxguard_sensitivity') || 'balanced';
  });
  const [sensitivityValue, setSensitivityValue] = useState(75);
  const [browserAlerts, setBrowserAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [webhookAlerts, setWebhookAlerts] = useState(false);
  const [anonymizeTranscripts, setAnonymizeTranscripts] = useState(true);
  const [audioRetention, setAudioRetention] = useState('24_hours');
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        if (data.sensitivityPreset) {
          setSensitivityPreset(data.sensitivityPreset);
          localStorage.setItem('voxguard_sensitivity', data.sensitivityPreset);
        }
        if (data.sensitivityValue) setSensitivityValue(data.sensitivityValue);
        if (data.browserAlerts !== undefined) setBrowserAlerts(data.browserAlerts);
        if (data.emailAlerts !== undefined) setEmailAlerts(data.emailAlerts);
        if (data.webhookAlerts !== undefined) setWebhookAlerts(data.webhookAlerts);
        if (data.anonymizeTranscripts !== undefined) setAnonymizeTranscripts(data.anonymizeTranscripts);
        if (data.audioRetention) setAudioRetention(data.audioRetention);
      })
      .catch((err) => console.warn('[VoxGuard] Settings load fallback:', err));
  }, []);

  const handleSelectPreset = (preset) => {
    setSensitivityPreset(preset);
    if (preset === 'high_sensitivity') setSensitivityValue(60);
    else if (preset === 'high_precision') setSensitivityValue(85);
    else setSensitivityValue(75);
  };

  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    localStorage.setItem('voxguard_sensitivity', sensitivityPreset);

    try {
      await saveSettings({
        sensitivityPreset,
        sensitivityValue,
        browserAlerts,
        emailAlerts,
        webhookAlerts,
        anonymizeTranscripts,
        audioRetention
      });
      setSaveStatus('Configuration saved and synced with inference backend.');
    } catch (err) {
      setSaveStatus('Settings saved locally in session.');
    }

    setTimeout(() => {
      setSaveStatus('');
    }, 3000);
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-bar">
        <div className="page-intro">
          <h1>System Configuration & Policies</h1>
          <p>Configure deepfake detection thresholds, alert dispatching, biometric retention, and privacy policies.</p>
        </div>
        <div className="header-cta-group">
          <button className="btn btn-primary" onClick={handleSaveSettings}>
            <Save size={16} />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {saveStatus && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--safe-bg)',
          color: 'var(--safe)',
          padding: '10px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 20,
          border: '1px solid var(--safe-border)',
          fontSize: '0.84rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{saveStatus}</span>
        </div>
      )}

      <div className="settings-grid">
        {/* 1. Detection Sensitivity Presets */}
        <div className="cyber-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sliders size={20} color="var(--cyan-400)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Detection Sensitivity</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Alters classification threshold for flagging synthetic audio</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Presets List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Balanced */}
              <div
                onClick={() => handleSelectPreset('balanced')}
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${sensitivityPreset === 'balanced' ? 'var(--cyan-400)' : 'var(--border-subtle)'}`,
                  background: sensitivityPreset === 'balanced' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(7, 10, 18, 0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: sensitivityPreset === 'balanced' ? 'var(--cyan-400)' : 'var(--text-primary)' }}>
                    Balanced (Recommended)
                  </span>
                  <span className="mono-text" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Threshold: 65%</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Optimal trade-off between threat recall and false positive avoidance for enterprise audio.
                </p>
              </div>

              {/* High Sensitivity */}
              <div
                onClick={() => handleSelectPreset('high_sensitivity')}
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${sensitivityPreset === 'high_sensitivity' ? 'var(--cyan-400)' : 'var(--border-subtle)'}`,
                  background: sensitivityPreset === 'high_sensitivity' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(7, 10, 18, 0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: sensitivityPreset === 'high_sensitivity' ? 'var(--cyan-400)' : 'var(--text-primary)' }}>
                    High Sensitivity
                  </span>
                  <span className="mono-text" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Threshold: 55%</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                  More likely to catch subtle AI clones and low-latency voice synthesis, but may increase false alarms on degraded audio.
                </p>
              </div>

              {/* High Precision */}
              <div
                onClick={() => handleSelectPreset('high_precision')}
                style={{
                  padding: 12,
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${sensitivityPreset === 'high_precision' ? 'var(--cyan-400)' : 'var(--border-subtle)'}`,
                  background: sensitivityPreset === 'high_precision' ? 'rgba(0, 240, 255, 0.08)' : 'rgba(7, 10, 18, 0.6)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: sensitivityPreset === 'high_precision' ? 'var(--cyan-400)' : 'var(--text-primary)' }}>
                    High Precision
                  </span>
                  <span className="mono-text" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Threshold: 75%</span>
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Minimizes false alarms in high-volume environments, but requires stronger vocoder artifacts before flagging synthetic speech.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Alert Notifications */}
        <div className="cyber-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Bell size={20} color="var(--cyan-400)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Alert Notifications</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Real-time escalation triggers on spoof detection</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.82rem' }}>Browser Push Notifications</span>
              <input
                type="checkbox"
                checked={browserAlerts}
                onChange={(e) => setBrowserAlerts(e.target.checked)}
                style={{ accentColor: 'var(--cyan-500)', transform: 'scale(1.2)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.82rem' }}>Email Incident Dispatch</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                style={{ accentColor: 'var(--cyan-500)', transform: 'scale(1.2)' }}
              />
            </label>

            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.82rem' }}>SIEM / Webhook Dispatch</span>
              <input
                type="checkbox"
                checked={webhookAlerts}
                onChange={(e) => setWebhookAlerts(e.target.checked)}
                style={{ accentColor: 'var(--cyan-500)', transform: 'scale(1.2)' }}
              />
            </label>
          </div>
        </div>

        {/* 3. Biometric & Privacy Policy */}
        <div className="cyber-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Shield size={20} color="var(--cyan-400)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Privacy & Data Governance</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Biometric retention and transcript anonymization</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
              <span style={{ fontSize: '0.82rem' }}>Anonymize Transcripts in Audit Logs</span>
              <input
                type="checkbox"
                checked={anonymizeTranscripts}
                onChange={(e) => setAnonymizeTranscripts(e.target.checked)}
                style={{ accentColor: 'var(--cyan-500)', transform: 'scale(1.2)' }}
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem' }}>Audio Buffer Retention:</span>
              <select
                className="form-select"
                value={audioRetention}
                onChange={(e) => setAudioRetention(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '6px 10px' }}
              >
                <option value="immediate">Immediate Purge</option>
                <option value="24_hours">24 Hours</option>
                <option value="7_days">7 Days</option>
                <option value="30_days">30 Days</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Mobile App & PWA Installation */}
        <div className="cyber-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Smartphone size={20} color="var(--cyan-400)" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Mobile App Experience</h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Progressive Web App installation & offline shell</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Operating Mode:</span>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: isStandalone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 240, 255, 0.1)',
                  color: isStandalone ? 'var(--safe)' : 'var(--cyan-400)'
                }}
              >
                {isStandalone ? 'Installed (Standalone App)' : 'Browser Mode'}
              </span>
            </div>

            {isStandalone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: 'var(--safe)', marginTop: 4 }}>
                <CheckCircle2 size={16} />
                <span>Running as installed Home Screen application</span>
              </div>
            ) : (
              <button
                type="button"
                className="cyber-btn"
                onClick={triggerInstall}
                style={{ marginTop: 6, width: '100%', minHeight: '44px', justifyContent: 'center', gap: 8 }}
              >
                <Smartphone size={16} />
                <span>Install VoxGuard AI on Device</span>
              </button>
            )}
          </div>
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
