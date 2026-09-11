import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Fingerprint,
  Layers,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import Modal from '../components/common/Modal';
import AudioUploader from '../components/audio/AudioUploader';
import AudioRecorder from '../components/audio/AudioRecorder';
import { fetchSpeakers, enrollSpeaker, deleteSpeaker, verifySpeaker } from '../services/analysisService';

export default function SpeakerVerification() {
  const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [speakerName, setSpeakerName] = useState('');
  const [speakerRole, setSpeakerRole] = useState('');
  const [speakerDepartment, setSpeakerDepartment] = useState('');
  const [referenceFile, setReferenceFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');

  // Voice Verification & Comparison State
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('');
  const [verificationFile, setVerificationFile] = useState(null);
  const [verificationMode, setVerificationMode] = useState('upload'); // 'upload' | 'record'
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  const loadSpeakers = async () => {
    try {
      setLoading(true);
      const data = await fetchSpeakers();
      if (Array.isArray(data)) {
        setSpeakers(data);
      }
    } catch (err) {
      console.error('[VoxGuard] Failed to fetch speakers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSpeakers();
  }, []);

  // Synchronize selected speaker with enrolled list
  useEffect(() => {
    if (speakers.length > 0) {
      setSelectedSpeakerId((prev) => {
        const exists = speakers.some((s) => s.id === prev);
        return exists ? prev : speakers[0].id;
      });
    } else {
      setSelectedSpeakerId('');
    }
  }, [speakers]);

  const selectedSpeaker = speakers.find((s) => s.id === selectedSpeakerId) || null;

  const handleOpenModal = () => {
    setSpeakerName('');
    setSpeakerRole('');
    setSpeakerDepartment('');
    setReferenceFile(null);
    setFormSuccess('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleEnrollSpeaker = async (e) => {
    e.preventDefault();
    if (!speakerName.trim()) {
      setFormError('Speaker name is required.');
      return;
    }

    if (!referenceFile) {
      setFormError('Please upload or record reference audio (3-15 seconds) to extract voiceprint.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      const result = await enrollSpeaker(
        speakerName.trim(),
        speakerRole.trim() || 'Authorized Personnel',
        speakerDepartment.trim() || 'General Operations',
        referenceFile
      );
      setFormSuccess(`Speaker '${speakerName.trim()}' enrolled successfully with cryptographic biometric hash.`);
      await loadSpeakers();
      if (result && result.id) {
        setSelectedSpeakerId(result.id);
      }
      setTimeout(() => {
        setIsModalOpen(false);
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to enroll speaker.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSpeaker = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove '${name}' from trusted biometric vault?`)) return;
    try {
      await deleteSpeaker(id);
      if (selectedSpeakerId === id) {
        setVerificationResult(null);
      }
      await loadSpeakers();
    } catch (err) {
      alert(`Failed to remove speaker: ${err.message}`);
    }
  };

  const handleVerifySpeaker = async (e) => {
    if (e) e.preventDefault();
    setVerifyError('');

    if (speakers.length === 0) {
      setVerifyError('No enrolled speakers available. Please enroll a trusted speaker first.');
      return;
    }

    if (!selectedSpeakerId || selectedSpeakerId === 'none') {
      setVerifyError('Please select an enrolled speaker to verify against.');
      return;
    }

    if (!verificationFile) {
      setVerifyError('Please upload or record an audio sample for verification.');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await verifySpeaker(selectedSpeakerId, verificationFile);
      setVerificationResult(result);
    } catch (err) {
      console.error('[VoxGuard] Speaker verification failed:', err);
      setVerifyError(err.message || 'Speaker verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetVerification = () => {
    setVerificationFile(null);
    setVerificationResult(null);
    setVerifyError('');
  };

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-bar">
        <div className="page-intro">
          <h1>Speaker Verification & Biometric Catalog</h1>
          <p>Register authorized executive voices and evaluate 1:1 voice embeddings to verify identity and detect spoofing.</p>
        </div>
        <div className="header-cta-group">
          <button id="btn-add-trusted-speaker" className="btn btn-primary" onClick={handleOpenModal}>
            <UserPlus size={16} />
            <span>Add Trusted Speaker</span>
          </button>
        </div>
      </div>

      {/* Grid: Trusted Speakers List & Biometric Verification Console */}
      <div className="speaker-verification-grid">
        {/* Left: Trusted Speaker Directory */}
        <div className="cyber-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Enrolled Speaker Biometrics</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Registered biometric voice embeddings stored securely in local vault</p>
            </div>
            <span className="demo-pill">{speakers.length} Enrolled Profiles</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10, color: 'var(--text-muted)' }}>
              <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Loading biometric profiles...</span>
            </div>
          ) : speakers.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
              No trusted speakers enrolled yet. Click "Add Trusted Speaker" to enroll a biometric profile.
            </div>
          ) : (
            <div className="speakers-catalog-grid">
              {speakers.map((spk) => (
                <div
                  key={spk.id}
                  className="cyber-card"
                  style={{
                    background: 'rgba(11, 17, 32, 0.7)',
                    border: selectedSpeakerId === spk.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                    padding: 16,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease, transform 0.2s ease'
                  }}
                  onClick={() => {
                    setSelectedSpeakerId(spk.id);
                    setVerificationResult(null);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(59, 130, 246, 0.2))',
                        border: '1px solid var(--border-accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--cyan-400)'
                      }}>
                        <Fingerprint size={20} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{spk.name}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{spk.role}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSpeaker(spk.id, spk.name);
                      }}
                      className="btn btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '0.7rem', color: 'var(--threat)' }}
                      title="Remove enrolled biometric"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Department:</span>
                      <span>{spk.department}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>Voice Hash:</span>
                      <span className="mono-text" style={{ fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }} title={spk.voiceHash}>{spk.voiceHash}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Sample:</span>
                      <span>{spk.sampleDuration}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                      <span style={{ color: 'var(--safe)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <span className="pulse-dot" style={{ backgroundColor: 'var(--safe)' }} />
                        Active Biometric
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Voice Verification & Comparison Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Main Verification Card */}
          <div className="cyber-card" style={{ border: '1px solid var(--border-accent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <UserCheck size={18} color="var(--cyan-400)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>1:1 Voiceprint Verification</h3>
              </div>
              <span className="demo-pill" style={{ fontSize: '0.72rem' }}>
                Cosine Biometrics
              </span>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              Compare a verification voice sample against an enrolled trusted profile using 32-d spectral formant embeddings and cosine similarity.
            </p>

            {verifyError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--threat-bg)',
                color: 'var(--threat)',
                border: '1px solid var(--threat-border)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.82rem',
                marginBottom: 14
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{verifyError}</span>
              </div>
            )}

            {speakers.length === 0 ? (
              <div style={{
                padding: '20px 16px',
                background: 'rgba(7, 10, 18, 0.6)',
                border: '1px dashed var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                marginBottom: 16
              }}>
                No enrolled speakers in the database.
                <br />
                Click <strong>"Add Trusted Speaker"</strong> above to register a reference voice before running verification.
              </div>
            ) : (
              <>
                {/* Target Speaker Selector */}
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" htmlFor="speaker-verify-select" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Target Enrolled Speaker *</span>
                    {selectedSpeaker && (
                      <span style={{ fontSize: '0.74rem', color: 'var(--cyan-400)', fontWeight: 500 }}>
                        ID: {selectedSpeaker.id}
                      </span>
                    )}
                  </label>
                  <select
                    id="speaker-verify-select"
                    className="form-select"
                    value={selectedSpeakerId}
                    onChange={(e) => {
                      setSelectedSpeakerId(e.target.value);
                      setVerificationResult(null);
                      setVerifyError('');
                    }}
                    style={{ width: '100%' }}
                  >
                    {speakers.map((spk) => (
                      <option key={spk.id} value={spk.id}>
                        {spk.name} — {spk.role} ({spk.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Speaker Details Card */}
                {selectedSpeaker && (
                  <div style={{
                    background: 'rgba(7, 10, 18, 0.6)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 12px',
                    marginBottom: 14,
                    fontSize: '0.76rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    color: 'var(--text-secondary)'
                  }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Enrolled Hash: </span>
                      <span className="mono-text" style={{ fontSize: '0.72rem' }}>{selectedSpeaker.voiceHash}</span>
                    </div>
                    <span style={{ color: 'var(--safe)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span className="pulse-dot" style={{ backgroundColor: 'var(--safe)' }} />
                      Active
                    </span>
                  </div>
                )}

                {/* Verification Audio Input: Upload or Record */}
                <div className="form-group" style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Verification Audio Sample *
                    </label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        id="tab-verify-upload"
                        className={`btn ${verificationMode === 'upload' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                        onClick={() => setVerificationMode('upload')}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        id="tab-verify-record"
                        className={`btn ${verificationMode === 'record' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '3px 10px', fontSize: '0.74rem' }}
                        onClick={() => setVerificationMode('record')}
                      >
                        Record Mic
                      </button>
                    </div>
                  </div>

                  {verificationMode === 'upload' ? (
                    <AudioUploader
                      onFileSelected={(file) => {
                        setVerificationFile(file);
                        setVerifyError('');
                        setVerificationResult(null);
                      }}
                      selectedFile={verificationFile}
                    />
                  ) : (
                    <div style={{
                      background: 'rgba(7, 10, 18, 0.6)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: 16
                    }}>
                      <AudioRecorder
                        onRecordingComplete={(file) => {
                          setVerificationFile(file);
                          setVerifyError('');
                          setVerificationResult(null);
                        }}
                      />
                    </div>
                  )}

                  {verificationFile && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 8,
                      padding: '6px 10px',
                      background: 'rgba(0, 240, 255, 0.05)',
                      border: '1px solid var(--border-accent)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem'
                    }}>
                      <span style={{ color: 'var(--cyan-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Selected: <strong>{verificationFile.name}</strong> ({(verificationFile.size / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={handleResetVerification}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.74rem' }}
                        title="Clear selected audio"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                {/* Verify Button */}
                <button
                  id="btn-run-speaker-verification"
                  type="button"
                  className="btn btn-primary"
                  onClick={handleVerifySpeaker}
                  disabled={isVerifying || !verificationFile || !selectedSpeakerId}
                  style={{ width: '100%', padding: '10px 16px', justifyContent: 'center', marginBottom: 16 }}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Comparing Biometric Voiceprints...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />
                      <span>Verify Voice Sample Against Enrolled Speaker</span>
                    </>
                  )}
                </button>

                {/* Result Card */}
                {verificationResult && (
                  <div
                    id="speaker-verification-result"
                    style={{
                      background: verificationResult.isVerified
                        ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.12) 0%, rgba(7, 10, 18, 0.85) 100%)'
                        : 'linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, rgba(7, 10, 18, 0.85) 100%)',
                      border: `1px solid ${verificationResult.isVerified ? 'var(--safe-border)' : 'var(--threat-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      animation: 'fadeIn 0.3s ease'
                    }}
                  >
                    {/* Header & Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Biometric Verification Result
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
                          Target: {verificationResult.speakerName}
                        </div>
                      </div>

                      <span
                        id="verification-status-badge"
                        className={`risk-badge ${verificationResult.isVerified ? 'safe' : 'threat'}`}
                        style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                      >
                        {verificationResult.isVerified ? (
                          <CheckCircle2 size={14} />
                        ) : (
                          <AlertCircle size={14} />
                        )}
                        {verificationResult.displayStatus}
                      </span>
                    </div>

                    {/* Similarity Score Meter */}
                    <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          Similarity / Confidence Score
                        </span>
                        <span
                          id="verification-similarity-score"
                          className="mono-text"
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            color: verificationResult.isVerified ? 'var(--safe)' : 'var(--threat)'
                          }}
                        >
                          {verificationResult.similarityScore}%
                        </span>
                      </div>

                      {/* Progress Meter Bar */}
                      <div style={{
                        width: '100%',
                        height: 8,
                        background: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 4,
                        overflow: 'hidden'
                      }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.max(0, verificationResult.similarityScore))}%`,
                            height: '100%',
                            background: verificationResult.isVerified
                              ? 'linear-gradient(90deg, #059669, #10B981)'
                              : 'linear-gradient(90deg, #DC2626, #EF4444)',
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Forensic Breakdown Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      fontSize: '0.76rem',
                      color: 'var(--text-secondary)'
                    }}>
                      <div style={{ background: 'rgba(7, 10, 18, 0.5)', padding: '6px 10px', borderRadius: 4 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Biometric Match</div>
                        <div style={{ fontWeight: 600, color: verificationResult.isVerified ? 'var(--safe)' : 'var(--threat)' }}>
                          {verificationResult.speakerMatch}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(7, 10, 18, 0.5)', padding: '6px 10px', borderRadius: 4 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Cosine Similarity</div>
                        <div className="mono-text" style={{ fontWeight: 600 }}>
                          {verificationResult.cosineSimilarity != null ? verificationResult.cosineSimilarity.toFixed(3) : 'N/A'}
                        </div>
                      </div>

                      <div style={{ background: 'rgba(7, 10, 18, 0.5)', padding: '6px 10px', borderRadius: 4 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Sample Duration</div>
                        <div style={{ fontWeight: 600 }}>
                          {verificationResult.durationSec}s
                        </div>
                      </div>

                      <div style={{ background: 'rgba(7, 10, 18, 0.5)', padding: '6px 10px', borderRadius: 4 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Formant Embedding</div>
                        <div style={{ fontWeight: 600, color: 'var(--cyan-400)' }}>
                          32-d Spectral
                        </div>
                      </div>
                    </div>

                    {/* Reset / Test Another */}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleResetVerification}
                      style={{ width: '100%', fontSize: '0.78rem', padding: '6px 12px', justifyContent: 'center' }}
                    >
                      <RotateCcw size={14} />
                      <span>Test Another Sample</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Engine Status Card */}
          <div className="cyber-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Layers size={18} color="var(--cyan-400)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Biometric Matching Engine</h3>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              VoxGuard extracts normalized acoustic formant embeddings and compares incoming speech against enrolled authorized speaker hashes using cosine similarity.
            </p>

            <div style={{
              background: 'rgba(7, 10, 18, 0.8)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10
            }}>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Biometric Engine Status
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Active Voice Profiles:</span>
                <span className="mono-text" style={{ fontSize: '0.95rem' }}>{speakers.length} Profiles</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Embedding Dimension:</span>
                <span className="mono-text" style={{ fontSize: '0.84rem' }}>32-d Spectral Formants</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Verification Status:</span>
                <span style={{ color: 'var(--safe)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="pulse-dot" style={{ backgroundColor: 'var(--safe)' }} />
                  Active & Calibrated (Online)
                </span>
              </div>
            </div>
          </div>

          {/* Defense in depth explanation */}
          <div className="cyber-card" style={{ background: 'rgba(11, 17, 32, 0.4)' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Shield size={20} color="var(--cyan-400)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--cyan-400)', marginBottom: 4 }}>
                  Defense-in-Depth Architecture
                </h4>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  <strong>Speaker Verification</strong> evaluates identity similarity (does this voice sound like the enrolled person?), while <strong>Anti-Spoofing</strong> detects synthetic generation and vocoder phase artifacts. Both systems are fused to prevent voice cloning attacks.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Add Trusted Speaker */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Enroll Trusted Speaker Voice">
        <form onSubmit={handleEnrollSpeaker} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {formSuccess && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--safe-bg)',
              color: 'var(--safe)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem'
            }}>
              <CheckCircle2 size={16} />
              <span>{formSuccess}</span>
            </div>
          )}

          {formError && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--threat-bg)',
              color: 'var(--threat)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem'
            }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              id="input-speaker-name"
              type="text"
              className="form-input"
              placeholder="e.g. Father, Dr. Robert Hughes, CFO"
              value={speakerName}
              onChange={(e) => setSpeakerName(e.target.value)}
              required
            />
          </div>

          <div className="form-row-2col">
            <div className="form-group">
              <label className="form-label">Role / Relationship</label>
              <input
                id="input-speaker-role"
                type="text"
                className="form-input"
                placeholder="e.g. Executive Contact, Family"
                value={speakerRole}
                onChange={(e) => setSpeakerRole(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department / Group</label>
              <input
                id="input-speaker-dept"
                type="text"
                className="form-input"
                placeholder="e.g. Executive Board, Personal"
                value={speakerDepartment}
                onChange={(e) => setSpeakerDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reference Voice Sample (Upload or Record) *</label>
            <AudioUploader onFileSelected={(file) => setReferenceFile(file)} selectedFile={referenceFile} />
            <div style={{ marginTop: 8 }}>
              <AudioRecorder onRecordingComplete={(file) => setReferenceFile(file)} />
            </div>
            {referenceFile && (
              <span style={{ fontSize: '0.78rem', color: 'var(--cyan-400)', marginTop: 4, display: 'block' }}>
                Selected sample: {referenceFile.name} ({(referenceFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>

          <div className="modal-footer" style={{ margin: '8px -24px -24px -24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </button>
            <button id="btn-submit-enroll-speaker" type="submit" className="btn btn-primary" disabled={!speakerName.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Computing Biometric Embedding...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Register Biometric Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
