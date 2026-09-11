import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  AudioWaveform,
  Radio,
  UserPlus,
  ArrowRight,
  Server,
  Lock,
  Cpu,
  Clock
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import RiskBadge from '../components/common/RiskBadge';
import Banner from '../components/common/Banner';
import { fetchReportsMetrics, fetchHistory } from '../services/analysisService';
import { classifyDeepfakeProbability } from '../utils/classification';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([fetchReportsMetrics(), fetchHistory('', 'all')])
      .then(([metricsRes, historyRes]) => {
        if (metricsRes.status === 'fulfilled') {
          setMetrics(metricsRes.value);
        }
        if (historyRes.status === 'fulfilled' && Array.isArray(historyRes.value)) {
          setRecentAnalyses(historyRes.value.slice(0, 5));
        }
      })
      .catch((err) => console.warn('[VoxGuard] Dashboard telemetry load error:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* System Status Banner */}
      <Banner
        message="VoxGuard Neural Audio Defense Engine v3.0 Online • PyTorch AcousticNet & Faster-Whisper Real-Time Pipeline Active."
        badge="SECURITY SHIELD ONLINE"
      />

      {/* Page Header */}
      <div className="page-header-bar">
        <div className="page-intro">
          <h1>Security Operations Center</h1>
          <p>Real-time voice biometric telemetry, synthetic speech threat posture, and deepfake defense metrics.</p>
        </div>
        <div className="header-cta-group">
          <Link to="/analyze" className="btn btn-primary">
            <AudioWaveform size={16} />
            <span>Analyze Voice</span>
          </Link>
          <Link to="/live" className="btn btn-outline-cyan">
            <Radio size={16} />
            <span>Live Monitor</span>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stat-cards-grid">
        <StatCard
          title="Total Inspections"
          value={metrics ? String(metrics.totalAnalyses) : '5'}
          trend="Persistent Audit Trail"
          trendType="positive"
          variant="primary"
          icon={Activity}
        />
        <StatCard
          title="Safe Detections"
          value={metrics ? String(metrics.safeDetections) : '2'}
          trend="Verified Natural Voice"
          trendType="positive"
          variant="safe"
          icon={ShieldCheck}
        />
        <StatCard
          title="Suspicious Streams"
          value={metrics ? String(metrics.suspiciousDetections) : '1'}
          trend="Acoustic Anomalies"
          trendType="warning"
          variant="suspicious"
          icon={AlertTriangle}
        />
        <StatCard
          title="Critical Threats"
          value={metrics ? String(metrics.criticalThreats) : '2'}
          trend="Voice Clones Isolated"
          trendType="danger"
          variant="threat"
          icon={ShieldAlert}
        />
      </div>

      {/* 2-Column Grid: Threat Overview & Quick Actions */}
      <div className="dashboard-grid-2col">
        {/* Left Column: Recent Analyses Table */}
        <div className="cyber-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Recent Audio Telemetry</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Latest stream inspections and biometric risk evaluations</p>
            </div>
            <Link to="/history" className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
              <span>View All History</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-responsive dashboard-table-wrapper">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Audio Sample</th>
                  <th>Timestamp</th>
                  <th>Risk Score</th>
                  <th>Classification</th>
                  <th>Deepfake Likelihood</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.length > 0 ? (
                  recentAnalyses.map((item) => {
                    const cls = classifyDeepfakeProbability(item.deepfakeProbability);
                    return (
                      <tr key={item.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.fileName}</span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              {item.duration} • {item.speaker}
                            </span>
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Clock size={12} color="var(--text-muted)" />
                            <span>{item.timestamp ? item.timestamp.split(' ')[1] : ''}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="mono-text" style={{
                              fontWeight: 600,
                              color: cls.color
                            }}>
                              {item.riskScore} / 100
                            </span>
                            <div style={{
                              width: 48,
                              height: 5,
                              borderRadius: 3,
                              background: 'rgba(255, 255, 255, 0.1)',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${item.riskScore}%`,
                                height: '100%',
                                background: cls.color
                              }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <RiskBadge level={cls.level} label={cls.label} />
                        </td>
                        <td style={{ fontSize: '0.78rem' }}>
                          <span className="mono-text" style={{ color: cls.color }}>
                            {item.deepfakeProbability}%
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>
                      {loading ? 'Loading telemetry...' : 'No audio streams analyzed yet. Start with Analyze Voice.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Compact Telemetry Cards (Hidden on Desktop) */}
          <div className="mobile-telemetry-cards">
            {recentAnalyses.length > 0 ? (
              recentAnalyses.map((item) => {
                const cls = classifyDeepfakeProbability(item.deepfakeProbability);
                return (
                  <div key={item.id} className="mobile-telemetry-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                          {item.fileName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {item.duration} • {item.speaker}
                        </div>
                      </div>
                      <RiskBadge level={cls.level} label={cls.label} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border-subtle)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Risk: <strong className="mono-text" style={{ color: cls.color }}>{item.riskScore}/100</strong></span>
                      <span style={{ color: 'var(--text-muted)' }}>Deepfake: <strong className="mono-text" style={{ color: cls.color }}>{item.deepfakeProbability}%</strong></span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
                {loading ? 'Loading telemetry...' : 'No audio streams analyzed yet. Start with Analyze Voice.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Risk Distribution */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick Actions */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>Quick Defense Actions</h3>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 12 }}>Rapid access to primary verification workflows</p>
            
            <div className="quick-action-btns">
              <Link to="/analyze" className="quick-action-link">
                <div className="quick-action-left">
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(0, 240, 255, 0.1)',
                    color: 'var(--cyan-400)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <AudioWaveform size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Analyze Audio</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Scan recorded voice for deepfakes</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </Link>

              <Link to="/live" className="quick-action-link">
                <div className="quick-action-left">
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: 'var(--blue-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Radio size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Start Live Detection</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Real-time stream interception</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </Link>

              <Link to="/verification" className="quick-action-link">
                <div className="quick-action-left">
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: 'var(--safe)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Add Trusted Speaker</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Enroll voice biometric embedding</div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" />
              </Link>
            </div>
          </div>

          {/* Risk Distribution Card */}
          <div className="cyber-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Inspection Threat Distribution</h3>
              <span className="demo-pill">Database Telemetry</span>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {metrics?.distribution ? (
                metrics.distribution.map((dist) => (
                  <div key={dist.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{dist.label}</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {dist.percentage}% ({dist.count})
                      </span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      background: 'rgba(255, 255, 255, 0.06)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${dist.percentage}%`,
                        height: '100%',
                        backgroundColor: dist.color,
                        borderRadius: 3
                      }} />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Loading distribution...</div>
              )}
            </div>
          </div>

          {/* System Health / Status Card */}
          <div className="cyber-card">
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Defense Engine Health</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Server size={14} /> Backend Inference
                </span>
                <span style={{ color: 'var(--safe)' }}>FastAPI Online (:8000)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Cpu size={14} /> Speech Transcription
                </span>
                <span style={{ color: 'var(--cyan-400)' }}>Faster-Whisper Tiny (CPU)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={14} /> Audit Trail Database
                </span>
                <span style={{ color: 'var(--safe)' }}>SQLite Persistent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
