import React, { useState, useEffect, useCallback } from 'react';
import {
  AudioWaveform,
  RotateCcw,
  CheckCircle2,
  Server,
  AlertCircle,
  Loader2,
  UserCheck,
  FileText,
  Clock,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import AudioUploader from '../components/audio/AudioUploader';
import AudioRecorder from '../components/audio/AudioRecorder';
import AudioPlayer from '../components/audio/AudioPlayer';
import RiskBadge from '../components/common/RiskBadge';
import { analyzeAudio, fetchSpeakers } from '../services/analysisService';
import { classifyDeepfakeProbability, calculateUnifiedRisk } from '../utils/classification';
import { safeLocalStorage } from '../utils/safeStorage';

export default function AnalyzeVoice() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [analysisContract, setAnalysisContract] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [enrolledSpeakers, setEnrolledSpeakers] = useState([]);
  const [selectedSpeakerId, setSelectedSpeakerId] = useState('none');

  // Load enrolled speakers on mount
  useEffect(() => {
    fetchSpeakers()
      .then((data) => {
        if (Array.isArray(data)) setEnrolledSpeakers(data);
      })
      .catch((err) => console.warn('[VoxGuard] Could not load speaker list:', err));
  }, []);

  const handleFileSelected = useCallback((file, metadata = null) => {
    if (!file || file.size === 0) {
      setErrorMsg('Selected audio sample is empty (0 bytes).');
      return;
    }

    setSelectedFile(file);
    setFileMetadata(metadata || { duration: null, isPlayable: true });
    setAnalysisContract(null);
    setErrorMsg('');
    setIsAnalyzing(false);
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setFileMetadata(null);
    setAnalysisContract(null);
    setErrorMsg('');
    setIsAnalyzing(false);
  }, []);

  const handleAnalyzeClick = async () => {
    const hasAudio = Boolean(selectedFile && selectedFile.size > 0);

    if (!hasAudio) {
      setErrorMsg('Please record or select an audio sample first.');
      return;
    }

    if (isRecordingActive) {
      setErrorMsg('Please stop recording before running inspection.');
      return;
    }

    if (isAnalyzing) return;

    setErrorMsg('');
    setIsAnalyzing(true);

    try {
      const contract = await analyzeAudio(selectedFile, {
        duration: fileMetadata?.duration,
        speakerId: selectedSpeakerId !== 'none' ? selectedSpeakerId : null,
        sensitivity: safeLocalStorage.getItem('voxguard_sensitivity') || 'balanced'
      });
      setAnalysisContract(contract);
    } catch (err) {
      console.error('[VoxGuard Debug] analyzeAudio error:', err);
      setErrorMsg(err.message || 'Failed to inspect audio stream.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isButtonDisabled = isRecordingActive || isAnalyzing;
  const isCloudLite = Boolean(
    analysisContract && (
      analysisContract.neural_available === false ||
      analysisContract.modelName === 'cloud-lite-dsp' ||
      analysisContract.engine === 'cloud-lite-dsp'
    )
  );
  const deepfakeClassification = analysisContract
    ? classifyDeepfakeProbability(analysisContract.deepfakeProbability, isCloudLite)
    : null;

  const unifiedRisk = analysisContract
    ? calculateUnifiedRisk({
        deepfakeProbability: analysisContract.deepfakeProbability,
        scamIntentScore: analysisContract.scamIntentScore,
        speakerMatch: analysisContract.speakerMatch,
        speakerSimilarity: analysisContract.speakerSimilarity,
        enrolled: Boolean(analysisContract.speakerMatch && analysisContract.speakerMatch !== 'NOT EVALUATED'),
        detectedIntents: analysisContract.detectedIntents,
        suspiciousPhrases: analysisContract.suspiciousPhrases,
        isCriticalWarning: Boolean(
          analysisContract.scamIntentScore >= 75 ||
          analysisContract.scamCategory === 'CRITICAL' ||
          (analysisContract.detectedIntents && analysisContract.detectedIntents.some((i) => ['OTP_REQUEST', 'FINANCIAL_CREDENTIAL', 'PAYMENT_DEMAND', 'REMOTE_ACCESS'].includes(i)))
        ),
        finalRiskScore: analysisContract.finalRiskScore,
        reasons: analysisContract.reasons,
        contributingSignals: analysisContract.contributingSignals
      })
    : null;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header-bar">
        <div className="page-intro">
          <h1>Analyze Audio Stream</h1>
          <p>Inspect recorded audio files or microphone captures for synthetic vocoder artifacts, deepfake cloning, and conversational scam intent.</p>
        </div>
      </div>

      <div className="analyze-layout-grid">
        {/* Left Column: Audio Input Zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="cyber-card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: 4 }}>Select Audio Sample</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Upload an audio capture (WAV, MP3, M4A, WebM, FLAC, OGG) or record directly using your microphone.
            </p>

            {/* Dropzone */}
            <AudioUploader onFileSelected={handleFileSelected} selectedFile={selectedFile} />

            <div style={{ margin: '16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
            </div>

            {/* Microphone recorder */}
            <AudioRecorder
              onRecordingComplete={handleFileSelected}
              onRecordingStateChange={setIsRecordingActive}
            />

            {/* Selected file preview */}
            {selectedFile && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  Staged Audio Stream
                </div>
                <AudioPlayer
                  file={selectedFile}
                  metadata={fileMetadata}
                  onClear={handleClearFile}
                />
              </div>
            )}

            {/* Speaker Verification Target Selector */}
            <div style={{ marginTop: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                <UserCheck size={15} color="var(--cyan-400)" />
                <span>Verify Against Trusted Biometric Speaker (Optional):</span>
              </label>
              <select
                className="form-select"
                value={selectedSpeakerId}
                onChange={(e) => setSelectedSpeakerId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.82rem' }}
              >
                <option value="none">None — Do not evaluate speaker identity</option>
                {enrolledSpeakers.map((spk) => (
                  <option key={spk.id} value={spk.id}>
                    {spk.name} ({spk.role || spk.department || 'Enrolled'})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={handleAnalyzeClick}
                disabled={isButtonDisabled}
                style={{ flex: 1, padding: '12px 20px', fontSize: '0.95rem' }}
                title={
                  isRecordingActive
                    ? 'Stop recording before running inspection'
                    : !selectedFile
                    ? 'Record or select an audio sample first'
                    : 'Run Deepfake Inspection'
                }
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Running AI Inspection...</span>
                  </>
                ) : (
                  <>
                    <AudioWaveform size={18} />
                    <span>Run Deepfake Inspection</span>
                  </>
                )}
              </button>

              {selectedFile && (
                <button
                  className="btn btn-secondary"
                  onClick={handleClearFile}
                  title="Reset audio selection"
                  disabled={isAnalyzing}
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>

            {analysisContract && unifiedRisk && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: unifiedRisk.color,
                fontSize: '0.82rem',
                marginTop: 14,
                background: unifiedRisk.bgColor,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${unifiedRisk.borderColor}`
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>
                  Inspection complete: {unifiedRisk.label} ({unifiedRisk.score}/100 Unified Risk • {analysisContract.deepfakeProbability}% deepfake likelihood)
                </span>
              </div>
            )}

            {errorMsg && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--threat)',
                fontSize: '0.82rem',
                marginTop: 14,
                background: 'var(--threat-bg)',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--threat-border)'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Analysis Results Area */}
        <div className="cyber-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 14 }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Forensic Inspection Results</h3>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>Backend AI Inference Model Output</span>
            </div>
            <RiskBadge
              level={unifiedRisk ? unifiedRisk.level : 'waiting'}
              label={unifiedRisk ? unifiedRisk.label : 'Not Analyzed'}
            />
          </div>

          {/* Prominent Inspection Status Banner */}
          {analysisContract && unifiedRisk ? (
            <div style={{
              margin: '20px 0',
              padding: '18px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
              border: `1px solid ${unifiedRisk.borderColor}`,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start'
            }}>
              <CheckCircle2 size={22} color={unifiedRisk.color} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.86rem', display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span className="mono-text" style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    Session ID: {analysisContract.analysisId}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className="demo-pill" style={{
                      borderColor: isCloudLite ? 'var(--cyan-400)' : 'var(--brand-primary)',
                      color: isCloudLite ? 'var(--cyan-400)' : 'var(--brand-primary)',
                      background: isCloudLite ? 'rgba(6, 182, 212, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                      fontWeight: 600
                    }}>
                      {isCloudLite ? 'Cloud Lite DSP Analysis' : 'Neural Anti-Spoofing Analysis'}
                    </span>
                    <span className="demo-pill" style={{
                      borderColor: unifiedRisk.borderColor,
                      color: unifiedRisk.color,
                      background: unifiedRisk.bgColor
                    }}>
                      {unifiedRisk.label}
                    </span>
                  </div>
                </div>

                <div style={{
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-line',
                  borderLeft: `3px solid ${unifiedRisk.color}`,
                  paddingLeft: 10,
                  margin: '4px 0'
                }}>
                  {analysisContract.message}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Server size={13} />
                    <span>Analysis Engine: {isCloudLite ? 'Cloud Lite DSP Analysis' : 'Neural Anti-Spoofing Analysis'}</span>
                  </div>
                  {analysisContract.processingTime != null && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} />
                      <span>Total Latency: {analysisContract.processingTime}ms</span>
                    </div>
                  )}
                </div>

              </div>
            </div>
          ) : (
            <div style={{
              margin: '20px 0',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              Select or record an audio sample and click <strong>"Run Deepfake Inspection"</strong> to evaluate.
            </div>
          )}

          {/* Results Grid - Real Backend Metrics */}
          <div className="results-grid">
            {/* Deepfake Probability / Acoustic Evaluation */}
            <div className="result-metric-card">
              <span className="result-metric-label">
                {isCloudLite ? 'Acoustic Signal Purity' : 'Deepfake Probability'}
              </span>
              <div className="result-metric-value mono-text" style={{
                color: isCloudLite ? 'var(--cyan-400)' : (deepfakeClassification ? deepfakeClassification.color : 'var(--neutral)'),
                fontSize: isCloudLite ? '1.15rem' : undefined
              }}>
                {isCloudLite
                  ? 'DSP Verified'
                  : (analysisContract && analysisContract.deepfakeProbability != null ? `${analysisContract.deepfakeProbability}%` : '--%')}
              </div>
              <span className="waiting-badge">
                <span className="risk-dot" style={{
                  backgroundColor: isCloudLite ? 'var(--cyan-400)' : (deepfakeClassification ? deepfakeClassification.color : 'var(--neutral)')
                }} />
                {isCloudLite ? 'Cloud Lite DSP Analysis' : (deepfakeClassification ? deepfakeClassification.label : 'Awaiting Model Inference')}
              </span>
            </div>

            {/* Authenticity Classification */}
            <div className="result-metric-card">
              <span className="result-metric-label">Authenticity</span>
              <div className="result-metric-value" style={{
                fontSize: '1.05rem',
                color: isCloudLite ? 'var(--cyan-400)' : (deepfakeClassification ? deepfakeClassification.color : 'var(--text-secondary)')
              }}>
                {isCloudLite ? 'Cloud Lite DSP Analysis' : (deepfakeClassification ? deepfakeClassification.label : 'Pending')}
              </div>
              <span className="waiting-badge">
                <span className="risk-dot" style={{
                  backgroundColor: isCloudLite ? 'var(--cyan-400)' : (deepfakeClassification ? deepfakeClassification.color : 'var(--neutral)')
                }} />
                {analysisContract
                  ? (isCloudLite ? 'Acoustic Signal Evaluated' : `${analysisContract.authenticityProbability != null ? analysisContract.authenticityProbability : (100 - Number(deepfakeClassification.percentage)).toFixed(1)}% Authentic`)
                  : 'Vocoder Analysis Pending'}
              </span>
            </div>

            {/* Speaker Match */}
            <div className="result-metric-card">
              <span className="result-metric-label">Speaker Verification</span>
              <div className="result-metric-value" style={{
                fontSize: '0.95rem',
                color: analysisContract && analysisContract.speakerMatch && analysisContract.speakerMatch !== 'NOT EVALUATED'
                  ? (analysisContract.speakerMatch === 'MATCH' ? 'var(--safe)' : analysisContract.speakerMatch === 'MISMATCH' ? 'var(--threat)' : 'var(--warning)')
                  : 'var(--neutral)'
              }}>
                {analysisContract && analysisContract.speakerMatch ? analysisContract.speakerMatch : 'NOT EVALUATED'}
              </div>
              <span className="waiting-badge">
                <span className="risk-dot" style={{
                  backgroundColor: analysisContract && analysisContract.speakerMatch && analysisContract.speakerMatch !== 'NOT EVALUATED'
                    ? (analysisContract.speakerMatch === 'MATCH' ? 'var(--safe)' : analysisContract.speakerMatch === 'MISMATCH' ? 'var(--threat)' : 'var(--warning)')
                    : 'var(--neutral)'
                }} />
                {analysisContract && analysisContract.speakerSimilarity != null
                  ? `Cosine Sim: ${analysisContract.speakerSimilarity}`
                  : 'No Profile Selected'}
              </span>
            </div>

            {/* Scam Intent Score */}
            <div className="result-metric-card">
              <span className="result-metric-label">Scam Intent Indicator</span>
              <div className="result-metric-value mono-text" style={{
                color: analysisContract && analysisContract.scamIntentScore != null
                  ? (analysisContract.scamIntentScore >= 75 ? 'var(--threat)' : analysisContract.scamIntentScore >= 50 ? '#f97316' : analysisContract.scamIntentScore >= 25 ? 'var(--warning)' : 'var(--safe)')
                  : 'var(--neutral)'
              }}>
                {analysisContract && analysisContract.scamIntentScore != null ? `${analysisContract.scamIntentScore}%` : '--'}
              </div>
              <span className="waiting-badge">
                <span className="risk-dot" style={{
                  backgroundColor: analysisContract && analysisContract.scamIntentScore != null
                    ? (analysisContract.scamIntentScore >= 75 ? 'var(--threat)' : analysisContract.scamIntentScore >= 50 ? '#f97316' : analysisContract.scamIntentScore >= 25 ? 'var(--warning)' : 'var(--safe)')
                    : 'var(--neutral)'
                }} />
                {analysisContract
                  ? `${analysisContract.scamCategory || (analysisContract.scamIntentScore >= 75 ? 'CRITICAL' : analysisContract.scamIntentScore >= 50 ? 'HIGH' : analysisContract.scamIntentScore >= 25 ? 'CAUTION' : 'LOW')} Risk`
                  : 'NLP Heuristics Ready'}
              </span>
            </div>
          </div>

          {/* Transcript & Detected Intents Card (if available) */}
          {analysisContract && (analysisContract.transcript || (analysisContract.detectedIntents && analysisContract.detectedIntents.length > 0)) && (
            <div className="result-metric-card" style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                <span className="result-metric-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={14} color="var(--cyan-400)" />
                  <span>Speech-to-Text Transcription ({analysisContract.detectedLanguage?.toUpperCase() || 'EN'})</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {analysisContract.scamCategory && (
                    <span className="demo-pill" style={{
                      fontSize: '0.7rem',
                      borderColor: analysisContract.scamCategory === 'CRITICAL' ? 'var(--threat-border)' : analysisContract.scamCategory === 'HIGH' ? '#ea580c' : analysisContract.scamCategory === 'CAUTION' ? 'var(--warning-border)' : 'var(--safe-border)',
                      color: analysisContract.scamCategory === 'CRITICAL' ? 'var(--threat)' : analysisContract.scamCategory === 'HIGH' ? '#f97316' : analysisContract.scamCategory === 'CAUTION' ? 'var(--warning)' : 'var(--safe)',
                      background: analysisContract.scamCategory === 'CRITICAL' ? 'rgba(239, 68, 68, 0.1)' : analysisContract.scamCategory === 'HIGH' ? 'rgba(249, 115, 22, 0.1)' : analysisContract.scamCategory === 'CAUTION' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'
                    }}>
                      SCAM INTENT: {analysisContract.scamCategory}
                    </span>
                  )}
                  {analysisContract.transcriptionConfidence != null && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Confidence: {Math.round(analysisContract.transcriptionConfidence * 100)}%
                    </span>
                  )}
                </div>
              </div>
              <div style={{
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.84rem',
                color: 'var(--text-primary)',
                fontStyle: 'italic',
                lineHeight: 1.5
              }}>
                {analysisContract.transcript ? `"${analysisContract.transcript}"` : '(No spoken words detected in audio stream)'}
              </div>

              {/* Detected Suspicious Phrases */}
              {analysisContract.suspiciousPhrases && analysisContract.suspiciousPhrases.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Detected Suspicious Phrases:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {analysisContract.suspiciousPhrases.map((item, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid var(--threat-border)',
                          color: 'var(--threat)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <ShieldAlert size={11} />
                        <strong>"{item.phrase}"</strong>
                        <span style={{ opacity: 0.75, fontSize: '0.68rem' }}>({item.category})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Intent Badges */}
              {analysisContract.detectedIntents && analysisContract.detectedIntents.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {analysisContract.detectedIntents.map((intent, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '0.7rem',
                        padding: '2px 7px',
                        borderRadius: 3,
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid var(--warning-border)',
                        color: 'var(--warning)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {intent}
                    </span>
                  ))}
                </div>
              )}

              {/* Sensitive Request Indicators */}
              {(analysisContract.sensitive_indicators || analysisContract.sensitiveIndicators) && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Sensitive Request Indicators:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(() => {
                      const sens = analysisContract.sensitive_indicators || analysisContract.sensitiveIndicators;
                      const badges = [
                        { key: 'otp_detected', label: 'OTP Solicit', active: sens.otp_detected },
                        { key: 'upi_pin_detected', label: 'UPI PIN Solicit', active: sens.upi_pin_detected },
                        { key: 'pin_detected', label: 'PIN Solicit', active: sens.pin_detected && !sens.upi_pin_detected },
                        { key: 'cvv_detected', label: 'CVV Solicit', active: sens.cvv_detected },
                        { key: 'password_detected', label: 'Password Request', active: sens.password_detected },
                        { key: 'payment_transfer_detected', label: 'Payment Transfer', active: sens.payment_transfer_detected },
                        { key: 'impersonation_detected', label: 'Authority Impersonation', active: sens.impersonation_detected },
                        { key: 'urgency_detected', label: 'Urgency Pressure', active: sens.urgency_detected }
                      ].filter(b => b.active);

                      if (badges.length === 0) {
                        return (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid var(--safe-border)', color: 'var(--safe)' }}>
                            No sensitive credential requests detected
                          </span>
                        );
                      }

                      return badges.map((b, idx) => (
                        <span key={idx} style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: 4,
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid var(--threat-border)',
                          color: 'var(--threat)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <ShieldAlert size={12} />
                          {b.label}
                        </span>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VoxGuard Unified Risk Engine Result Card */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="result-metric-card" style={{
              background: 'rgba(11, 17, 32, 0.95)',
              border: `1px solid ${unifiedRisk ? unifiedRisk.borderColor : 'var(--border-subtle)'}`,
              boxShadow: unifiedRisk ? `0 0 20px ${unifiedRisk.glowColor}` : 'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {unifiedRisk?.level === 'critical' ? (
                    <ShieldAlert size={20} color="var(--threat)" />
                  ) : (
                    <ShieldCheck size={20} color={unifiedRisk ? unifiedRisk.color : 'var(--cyan-400)'} />
                  )}
                  <div>
                    <h4 style={{ fontSize: '0.98rem', fontWeight: 600, margin: 0 }}>VoxGuard Unified Risk</h4>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Multi-Signal Fraud Intelligence Fusion</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="mono-text" style={{
                    fontSize: '1.35rem',
                    fontWeight: 700,
                    color: unifiedRisk ? unifiedRisk.color : 'var(--neutral)'
                  }}>
                    {unifiedRisk ? `${unifiedRisk.score} / 100` : '-- / 100'}
                  </span>
                  <RiskBadge
                    level={unifiedRisk ? unifiedRisk.level : 'waiting'}
                    label={unifiedRisk ? unifiedRisk.label : 'STANDBY'}
                  />
                </div>
              </div>

              {/* Risk Meter Bar */}
              <div style={{
                width: '100%',
                height: 8,
                borderRadius: 4,
                background: 'rgba(255, 255, 255, 0.06)',
                overflow: 'hidden',
                marginBottom: 14
              }}>
                <div style={{
                  width: `${unifiedRisk ? unifiedRisk.score : 0}%`,
                  height: '100%',
                  backgroundColor: unifiedRisk ? unifiedRisk.color : 'transparent',
                  transition: 'width 0.6s ease-out, background-color 0.4s ease'
                }} />
              </div>

              {/* Contributing Signals Overview */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 8,
                padding: '10px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                marginBottom: 12,
                fontSize: '0.76rem'
              }}>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Neural Deepfake</span>
                  <strong style={{ color: deepfakeClassification ? deepfakeClassification.color : 'var(--text-primary)' }}>
                    {analysisContract ? `${analysisContract.deepfakeProbability}% (${deepfakeClassification?.label})` : '--'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Scam Intent</span>
                  <strong style={{
                    color: analysisContract && analysisContract.scamIntentScore >= 75 ? 'var(--threat)' :
                           analysisContract && analysisContract.scamIntentScore >= 50 ? '#f97316' :
                           analysisContract && analysisContract.scamIntentScore >= 25 ? 'var(--warning)' : 'var(--safe)'
                  }}>
                    {analysisContract ? `${analysisContract.scamIntentScore}% (${analysisContract.scamCategory || 'LOW'})` : '--'}
                  </strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)', display: 'block' }}>Speaker Biometrics</span>
                  <strong style={{
                    color: analysisContract?.speakerMatch === 'MATCH' ? 'var(--safe)' :
                           analysisContract?.speakerMatch === 'MISMATCH' ? 'var(--threat)' : 'var(--neutral)'
                  }}>
                    {analysisContract?.speakerMatch || 'NOT EVALUATED'}
                  </strong>
                </div>
              </div>

              {/* Explanation / Reasons List */}
              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Unified Risk Explanations & Threat Indicators:
                </span>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                  {unifiedRisk && unifiedRisk.reasons && unifiedRisk.reasons.length > 0 ? (
                    unifiedRisk.reasons.map((reason, idx) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          backgroundColor: unifiedRisk.color,
                          marginTop: 5,
                          flexShrink: 0
                        }} />
                        <span style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{reason}</span>
                      </li>
                    ))
                  ) : (
                    <li style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Awaiting model inference to generate explainability indicators.
                    </li>
                  )}
                </ul>
              </div>
            </div>

            {/* Detection Reasons */}
            <div className="result-metric-card">
              <span className="result-metric-label" style={{ marginBottom: 6 }}>Detection Reasons & Forensic Indicators</span>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {analysisContract && analysisContract.reasons && analysisContract.reasons.length > 0 ? (
                  analysisContract.reasons.map((reason, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: unifiedRisk ? unifiedRisk.color : 'var(--safe)',
                        marginTop: 6,
                        flexShrink: 0
                      }} />
                      <span style={{ color: 'var(--text-secondary)' }}>{reason}</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--neutral)' }} />
                      <span>Spectral discontinuity check: Standby for backend engine</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--neutral)' }} />
                      <span>Phase coherence & vocoder artifact detection: Standby</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--neutral)' }} />
                      <span>Prosody & pitch variability analysis: Standby</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Timing Breakdown Profile */}
            {analysisContract && analysisContract.timing && (
              <div className="result-metric-card" style={{ padding: '12px 14px' }}>
                <span className="result-metric-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} color="var(--cyan-400)" />
                  <span>Pipeline Latency Profile</span>
                </span>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                  gap: 8,
                  fontSize: '0.74rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Preprocessing:</span>{' '}
                    <strong className="mono-text">{analysisContract.timing.preprocessing_ms || 0}ms</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Deepfake AI:</span>{' '}
                    <strong className="mono-text">{analysisContract.timing?.deepfake_ms != null ? `${analysisContract.timing.deepfake_ms}ms` : (isCloudLite ? 'Bypassed (DSP)' : '0ms')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Whisper STT:</span>{' '}
                    <strong className="mono-text">{analysisContract.transcription_available ? `${analysisContract.timing?.stt_ms || 0}ms` : 'Bypassed (Low-RAM)'}</strong>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Scam NLP:</span>{' '}
                    <strong className="mono-text">{analysisContract.timing.scam_ms || 0}ms</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>Risk Fusion:</span>{' '}
                    <strong className="mono-text">{analysisContract.timing.fusion_ms || 0}ms</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--cyan-400)' }}>Total:</span>{' '}
                    <strong className="mono-text" style={{ color: 'var(--cyan-400)' }}>{analysisContract.timing.total_ms || 0}ms</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
