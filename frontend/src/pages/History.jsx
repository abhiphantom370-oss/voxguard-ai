import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Calendar,
  Trash2,
  Loader2
} from 'lucide-react';
import RiskBadge from '../components/common/RiskBadge';
import EmptyState from '../components/common/EmptyState';
import { fetchHistory, deleteHistoryRecord } from '../services/analysisService';
import { classifyDeepfakeProbability } from '../utils/classification';

export default function History() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all_time');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchHistory(searchTerm, riskFilter);
      if (Array.isArray(data)) {
        setRecords(data);
      }
    } catch (err) {
      console.error('[VoxGuard] Error loading history:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, riskFilter]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = async (id, fileName) => {
    if (!window.confirm(`Delete forensic record for '${fileName}'?`)) return;
    try {
      await deleteHistoryRecord(id);
      loadHistory();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-bar">
        <div className="page-intro">
          <h1>Analysis Audit History</h1>
          <p>Forensic inspection logs, caller verification records, and cryptographic audit trails stored in SQLite.</p>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="cyber-card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 260px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                placeholder="Search by filename, transcript, or speaker identity..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 38, width: '100%' }}
              />
            </div>
          </div>

          {/* Risk Level Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Risk Level:</span>
            {['all', 'safe', 'caution', 'suspicious', 'critical'].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setRiskFilter(level)}
                className={`btn ${riskFilter === level ? 'btn-outline-cyan' : 'btn-secondary'}`}
                style={{ padding: '6px 12px', fontSize: '0.76rem', textTransform: 'capitalize' }}
              >
                {level === 'all' ? 'All Risks' : level}
              </button>
            ))}
          </div>

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="var(--text-muted)" />
            <select
              className="form-select"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
            >
              <option value="all_time">All Time</option>
              <option value="today">Today</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="cyber-card">
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'var(--text-muted)' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading audit history records...</span>
          </div>
        ) : records.length > 0 ? (
          <div className="table-responsive">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>Audio File & Duration</th>
                  <th>Deepfake & Authenticity</th>
                  <th>Scam Intent</th>
                  <th>Speaker Identity</th>
                  <th>Overall Risk</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const cls = classifyDeepfakeProbability(rec.deepfakeProbability);
                  return (
                    <tr key={rec.id}>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span>{rec.timestamp ? rec.timestamp.split(' ')[0] : '2026-09-10'}</span>
                          <span className="mono-text" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {rec.timestamp ? rec.timestamp.split(' ')[1] : ''}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rec.fileName}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {rec.duration} • ID: {rec.id}
                          </span>
                          {rec.transcript && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--cyan-400)', fontStyle: 'italic', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              "{rec.transcript}"
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: cls.color }}>{cls.label}</span>
                          <span className="mono-text" style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            Prob: {rec.deepfakeProbability}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span className="mono-text" style={{ fontSize: '0.82rem' }}>{rec.scamScore}%</span>
                          {rec.detectedIntents && rec.detectedIntents.length > 0 ? (
                            <span style={{ fontSize: '0.7rem', color: 'var(--threat)' }}>
                              {rec.detectedIntents[0]}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: 'var(--safe)' }}>Safe context</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{rec.speaker}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rec.speakerMatch}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="mono-text" style={{
                            fontWeight: 600,
                            color: cls.color
                          }}>
                            {rec.riskScore} / 100
                          </span>
                          <RiskBadge level={cls.level} label={cls.label} />
                        </div>
                      </td>
                    <td>
                      <button
                        onClick={() => handleDelete(rec.id, rec.fileName)}
                        className="btn btn-secondary"
                        style={{ padding: '4px 8px', color: 'var(--threat)' }}
                        title="Delete audit record"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No Records Found"
            description={`No audit logs match your filter criteria ("${searchTerm || riskFilter}").`}
            action={
              <button
                className="btn btn-secondary"
                onClick={() => { setSearchTerm(''); setRiskFilter('all'); }}
              >
                Reset Filters
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
