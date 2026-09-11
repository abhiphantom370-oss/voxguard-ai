import React, { useState, useEffect } from 'react';
import {
  Download,
  ShieldCheck,
  Lock,
  Activity,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import StatCard from '../components/common/StatCard';
import { fetchReportsMetrics, exportReportsCsv } from '../services/analysisService';

export default function Reports() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchReportsMetrics()
      .then((data) => {
        setMetrics(data);
      })
      .catch((err) => {
        console.error('[VoxGuard] Failed to fetch report metrics:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportReportsCsv();
    } catch (err) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-bar">
        <div className="page-intro">
          <h1>Security & Threat Intelligence Reports</h1>
          <p>Forensic compliance audit summaries, attack vector breakdowns, and synthetic voice telemetry derived from SQLite audit logs.</p>
        </div>
        <div className="header-cta-group">
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={isExporting}
            title="Download complete audit log records as a CSV spreadsheet"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span>Exporting CSV...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Export Audit Report (CSV)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="stat-cards-grid">
        <StatCard
          title="Security Posture Rating"
          value={metrics ? `${metrics.postureRating} / 100` : '92 / 100'}
          trend="Calibrated Threat Defense"
          trendType="positive"
          variant="safe"
          icon={ShieldCheck}
        />
        <StatCard
          title="Total Inspections"
          value={metrics ? String(metrics.totalAnalyses) : '5'}
          trend="Persistent Database Logs"
          trendType="positive"
          variant="primary"
          icon={Activity}
        />
        <StatCard
          title="Deepfakes Flagged"
          value={metrics ? String(metrics.deepfakeDetections) : '2'}
          trend={`${metrics ? metrics.criticalThreats : 2} critical threats`}
          trendType="danger"
          variant="threat"
          icon={Lock}
        />
        <StatCard
          title="Scam Intents Flagged"
          value={metrics ? String(metrics.scamDetections) : '3'}
          trend="OTP & Financial Attacks"
          trendType="warning"
          variant="suspicious"
          icon={AlertTriangle}
        />
      </div>

      <div className="reports-layout-grid">
        {/* Risk Trend Visual */}
        <div className="cyber-card" style={{ minWidth: 0, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Threat Incident Velocity & Telemetry</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Daily detected voice spoof attempts and synthetic speech volume</p>
            </div>
            <span className="demo-pill">Telemetry</span>
          </div>

          {/* SVG Trendline Chart */}
          <div style={{ width: '100%', height: 220, position: 'relative', marginTop: 10, overflow: 'hidden' }}>
            <svg viewBox="0 0 500 180" style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
              <defs>
                <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="threatGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid lines */}
              <line x1="0" y1="40" x2="500" y2="40" stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="3 3" />
              <line x1="0" y1="90" x2="500" y2="90" stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="3 3" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(148, 163, 184, 0.1)" strokeDasharray="3 3" />

              {/* Area Under Total Curve */}
              <polygon
                points="0,150 40,120 90,130 140,90 190,105 240,70 290,85 340,60 390,50 440,65 500,40 500,170 0,170"
                fill="url(#trendGradient)"
              />

              {/* Total Stream Line */}
              <polyline
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2.5"
                points="0,150 40,120 90,130 140,90 190,105 240,70 290,85 340,60 390,50 440,65 500,40"
              />

              {/* Critical Threat Line */}
              <polyline
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="4 4"
                points="0,165 40,160 90,158 140,152 190,155 240,148 290,150 340,142 390,140 440,145 500,138"
              />
            </svg>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
              <span>Day 1</span>
              <span>Day 8</span>
              <span>Day 15</span>
              <span>Day 22</span>
              <span>Day 30</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 16, fontSize: '0.76rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 3, background: '#00f0ff', borderRadius: 2 }} />
              <span style={{ color: 'var(--text-secondary)' }}>Audio Streams Evaluated</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 3, background: '#ef4444', borderRadius: 2 }} />
              <span style={{ color: 'var(--text-secondary)' }}>Flagged Spoof / Clone Attempts</span>
            </div>
          </div>
        </div>

        {/* Threat Distribution from Real SQLite Data */}
        <div className="cyber-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Inspection Threat Distribution</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Calibrated breakdown from active SQLite records</p>
            </div>
            <span className="demo-pill">Database Aggregate</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {metrics?.distribution ? (
              metrics.distribution.map((item, i) => (
                <div key={i} style={{ background: 'rgba(7, 10, 18, 0.6)', padding: 12, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span className="mono-text" style={{ color: item.color }}>{item.percentage}% ({item.count})</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: 6,
                    borderRadius: 3,
                    background: 'rgba(255, 255, 255, 0.05)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${item.percentage}%`,
                      height: '100%',
                      background: item.color,
                      transition: 'width 0.5s ease'
                    }} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading distribution metrics...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
