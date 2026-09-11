import React, { useState, useEffect, useRef } from 'react';
import {
  Square,
  Play,
  Mic,
  MicOff,
  AlertCircle,
  Activity,
  Terminal,
  Volume2,
  VolumeX,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink
} from 'lucide-react';
import LiveWaveform from '../components/audio/LiveWaveform';
import RiskBadge from '../components/common/RiskBadge';
import { useMicrophone } from '../hooks/useMicrophone';
import { formatDuration } from '../services/audioService';
import { sendLiveChunk } from '../services/analysisService';
import { getBestSupportedRecordingMimeType } from '../utils/audioUtils';
import { createCanonicalLiveResult } from '../utils/classification';
import { checkAudioCapabilities } from '../utils/audioCapability';

export default function LiveDetection() {
  const {
    start,
    stop,
    toggleMute,
    isStreaming,
    isMuted,
    error: micError,
    audioLevel,
    analyserNode
  } = useMicrophone();

  const [capabilities] = useState(() => checkAudioCapabilities());
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [canonicalLiveResult, setCanonicalLiveResult] = useState(null);
  const [chunkCount, setChunkCount] = useState(0);
  const [isProcessingChunk, setIsProcessingChunk] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState([]);
  const [criticalAlert, setCriticalAlert] = useState(null);

  const [eventLogs, setEventLogs] = useState([
    {
      id: 1,
      type: 'safe',
      source: 'SYSTEM',
      time: 'Ready',
      title: 'Acoustic Monitor Initialized',
      detail: 'FastAPI neural inference backend connected and ready for stream chunking.'
    }
  ]);

  const timerRef = useRef(null);
  const chunkIndexRef = useRef(0);
  const isProcessingRef = useRef(false);
  const isLiveRef = useRef(false);
  const activeStreamRef = useRef(null);
  const activeRecorderRef = useRef(null);
  const chunkTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const sessionIdRef = useRef('');

  // Manage live session elapsed timer
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isStreaming]);

  // Clean up all resources and recorders on unmount
  useEffect(() => {
    return () => {
      isLiveRef.current = false;
      if (chunkTimeoutRef.current) clearTimeout(chunkTimeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
        try {
          activeRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stop();
    };
  }, [stop]);

  const addLog = (type, source, title, detail) => {
    const newLog = {
      id: `${Date.now()}-${chunkIndexRef.current}-${eventLogs.length}`,
      type,
      source,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title,
      detail
    };
    setEventLogs((prev) => [newLog, ...prev.slice(0, 29)]);
  };

  const addDiagnostic = (line, level = 'safe') => {
    setDiagnosticLogs((prev) => [
      ...prev.slice(-8),
      { text: `[${new Date().toLocaleTimeString()}] ${line}`, level }
    ]);
  };

  // Start live detection & chunking engine
  const handleStart = async () => {
    setSessionSeconds(0);
    setCanonicalLiveResult(null);
    setCriticalAlert(null);
    setChunkCount(0);
    setDiagnosticLogs([]);
    chunkIndexRef.current = 0;
    sessionIdRef.current = `LIVE-${Date.now().toString(36).toUpperCase()}`;
    isLiveRef.current = true;

    try {
      const stream = await start();
      activeStreamRef.current = stream;
      addLog('safe', 'MIC STREAM', 'Microphone Stream Engaged', 'Real-time audio input routed to AnalyserNode & chunk slicing engine.');
      addDiagnostic('Audio context active. Starting 2.5-second chunk inference loop...', 'safe');
      startNextChunk();
    } catch (err) {
      isLiveRef.current = false;
      const userMsg = err.message || 'Microphone access is required for live voice analysis. Enable microphone permission for VoxGuard in your browser settings.';
      addLog('threat', 'HARDWARE ERROR', 'Microphone Access Failed', userMsg);
      addDiagnostic(`[Hardware Error] ${userMsg}`, 'critical');
    }
  };

  // Slices microphone stream into clean 2.5-second audio chunks
  const startNextChunk = () => {
    if (!isLiveRef.current || !activeStreamRef.current) return;

    const detectedMime = getBestSupportedRecordingMimeType();
    let recorder;
    if (detectedMime) {
      try {
        recorder = new MediaRecorder(activeStreamRef.current, { mimeType: detectedMime });
      } catch (mimeErr) {
        console.warn('[VoxGuard Live] MediaRecorder failed with detected MIME, falling back to default:', mimeErr);
        recorder = new MediaRecorder(activeStreamRef.current);
      }
    } else {
      recorder = new MediaRecorder(activeStreamRef.current);
    }
    activeRecorderRef.current = recorder;

    const currentChunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        currentChunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      if (currentChunks.length > 0 && isLiveRef.current) {
        const actualMime = recorder.mimeType || detectedMime || 'audio/webm';
        const chunkBlob = new Blob(currentChunks, { type: actualMime });
        chunkIndexRef.current += 1;
        const currentIdx = chunkIndexRef.current;

        // Skip dispatching if previous chunk inference is still in-flight to prevent queue buildup
        if (isProcessingRef.current) {
          console.warn(`[VoxGuard Live] Inference engine busy; dropping chunk #${currentIdx} to maintain zero-lag streaming.`);
          addDiagnostic(`[Chunk #${currentIdx}] Dropped (pipeline busy, maintaining real-time latency)`);
        } else {
          dispatchChunk(chunkBlob, currentIdx);
        }
      }

      if (isLiveRef.current) {
        // Immediately start recording the next window
        startNextChunk();
      }
    };

    try {
      recorder.start();
    } catch (startErr) {
      console.warn('[VoxGuard Live] Could not start chunk recorder:', startErr);
      return;
    }

    // Schedule chunk cut every 2500ms
    chunkTimeoutRef.current = setTimeout(() => {
      if (recorder.state === 'recording') {
        try {
          recorder.stop();
        } catch {
          // ignore
        }
      }
    }, 2500);
  };

  // Dispatches chunk to POST /api/live/chunk
  const dispatchChunk = async (blob, index) => {
    if (!isLiveRef.current) return;
    isProcessingRef.current = true;
    setIsProcessingChunk(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const data = await sendLiveChunk(blob, index, sessionIdRef.current, controller.signal);
      if (!isLiveRef.current) return;

      const canonical = createCanonicalLiveResult(data);
      if (canonical) {
        setCanonicalLiveResult(canonical);
        setChunkCount((prev) => prev + 1);

        // Update critical alert state if critical scam phrase detected
        if (canonical.isCriticalWarning) {
          setCriticalAlert({
            message: canonical.criticalWarningMessage || 'Critical Social Engineering / Credential Request Detected!',
            phrases: canonical.suspiciousPhrases || [],
            time: new Date().toLocaleTimeString()
          });
        }

        // Update terminal diagnostics with canonical values
        const scamNote = canonical.scamIntentScore > 0 ? ` | Scam: ${canonical.scamIntentScore}% (${canonical.scamCategory})` : '';
        addDiagnostic(
          `Chunk #${index} (${canonical.durationSec.toFixed(1)}s): ${canonical.authenticityScore} | Risk: ${canonical.riskScore}/100${scamNote} | Deepfake: ${canonical.formattedDeepfakeProbability} | ${canonical.processingTime}ms`,
          canonical.level
        );

        // Add to event feed using canonical level, title and details
        if (canonical.isCriticalWarning) {
          const phraseList = canonical.suspiciousPhrases?.map((p) => `"${p.phrase}"`).join(', ') || 'Credential Solicitation';
          addLog(
            'threat',
            `CHUNK #${index} ALERT`,
            `CRITICAL PHRASE: ${phraseList}`,
            `${canonical.criticalWarningMessage || 'High risk credential extraction pattern'} • Scam Intent: ${canonical.scamIntentScore}%`
          );
        } else {
          addLog(
            canonical.level === 'critical' ? 'threat' : canonical.level,
            `CHUNK #${index}`,
            `${canonical.authenticityScore} (${canonical.riskScore}/100 Risk)`,
            `${canonical.reasons?.[0] || 'Acoustic inspection complete'}${canonical.scamIntentScore > 0 ? ` • Scam: ${canonical.scamIntentScore}% (${canonical.scamCategory})` : ''} • Prob: ${canonical.formattedDeepfakeProbability}, Latency: ${canonical.processingTime}ms`
          );
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn(`[VoxGuard Live] Error inspecting chunk #${index}:`, err);
        addDiagnostic(`Chunk #${index} analysis failed: ${err.message || 'Network error'}`, 'critical');
      }
    } finally {
      isProcessingRef.current = false;
      setIsProcessingChunk(false);
    }
  };

  // Clean shutdown on Stop
  const handleStop = () => {
    isLiveRef.current = false;
    setCriticalAlert(null);
    if (chunkTimeoutRef.current) {
      clearTimeout(chunkTimeoutRef.current);
      chunkTimeoutRef.current = null;
    }
    if (activeRecorderRef.current && activeRecorderRef.current.state === 'recording') {
      try {
        activeRecorderRef.current.stop();
      } catch {
        // ignore
      }
      activeRecorderRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stop();
    activeStreamRef.current = null;
    isProcessingRef.current = false;
    setIsProcessingChunk(false);

    addLog('neutral', 'SESSION', 'Monitoring Session Stopped', `Session closed after ${formatDuration(sessionSeconds)} with ${chunkCount} chunks evaluated.`);
    addDiagnostic('Live monitoring session concluded. Microphone and inference pipeline released.', 'safe');
    setSessionSeconds(0);
  };

  const handleToggleMute = () => {
    toggleMute();
    if (!isMuted) {
      addLog('suspicious', 'MIC STREAM', 'Microphone Muted', 'Audio input muted by user.');
    } else {
      addLog('safe', 'MIC STREAM', 'Microphone Unmuted', 'Audio input active.');
    }
  };

  // Derived threat rating from canonical live result
  const threatLevelKey = !isStreaming
    ? 'neutral'
    : canonicalLiveResult
    ? canonicalLiveResult.level
    : 'waiting';

  const threatLevelLabel = !isStreaming
    ? 'Standby'
    : canonicalLiveResult
    ? canonicalLiveResult.threatRatingText
    : 'Analyzing Stream...';

  return (
    <div>
      {/* Insecure LAN HTTP Notice */}
      {capabilities.isInsecureLanHttp && (
        <div style={{
          margin: '0 0 20px 0',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: '#fef08a',
          fontSize: '0.84rem',
          lineHeight: 1.5
        }}>
          <ShieldAlert size={18} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span>
              <strong>Mobile Notice:</strong> Mobile microphone requires secure HTTPS access. Open the secure VoxGuard URL to enable recording.
            </span>
            {capabilities.secureLanUrl && (
              <a
                href={capabilities.secureLanUrl}
                style={{
                  color: 'var(--cyan-400)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  textDecoration: 'none'
                }}
              >
                <span>Switch to Secure HTTPS ({capabilities.secureLanUrl})</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header-bar">
        <div className="page-intro">
          <h1>Live Stream Interception Console</h1>
          <p>Real-time microphone stream capture, low-latency neural vocoder detection, and continuous caller spoof alert feed.</p>
        </div>
        <div className="header-cta-group">
          {!isStreaming ? (
            <button className="btn btn-primary" onClick={handleStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Play size={16} />
              <span>Start Live Detection</span>
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className={`btn ${isMuted ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
              >
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                <span>{isMuted ? 'Unmute' : 'Mute'}</span>
              </button>
              <button className="btn btn-danger" onClick={handleStop} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Square size={16} />
                <span>Stop Detection Session</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {micError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--threat-bg)',
          color: 'var(--threat)',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 20,
          border: '1px solid var(--threat-border)',
          fontSize: '0.84rem'
        }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{micError}</span>
        </div>
      )}

      {/* Live Status Bar */}
      <div className="cyber-card" style={{ marginBottom: 24, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            {/* Mic Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Microphone Status:</span>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: isStreaming ? (isMuted ? 'var(--threat)' : 'var(--safe)') : 'var(--text-muted)'
              }}>
                {isStreaming ? (
                  isMuted ? <MicOff size={15} color="var(--threat)" /> : <Mic size={15} color="var(--safe)" />
                ) : (
                  <MicOff size={15} />
                )}
                {isStreaming ? (isMuted ? 'Muted' : 'Listening / Streaming') : 'Idle / Standby'}
              </span>
            </div>

            <div style={{ width: 1, height: 18, background: 'var(--border-subtle)' }} />

            {/* Session Elapsed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Session Elapsed:</span>
              <span className="mono-text" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {formatDuration(sessionSeconds)}
              </span>
            </div>

            <div style={{ width: 1, height: 18, background: 'var(--border-subtle)' }} />

            {/* Audio dB level indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Input Level:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 60,
                  height: 6,
                  borderRadius: 3,
                  background: 'rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${audioLevel.percent}%`,
                    height: '100%',
                    background: audioLevel.percent > 85 ? 'var(--threat)' : audioLevel.percent > 50 ? 'var(--warning)' : 'var(--safe)',
                    transition: 'width 0.1s ease'
                  }} />
                </div>
                <span className="mono-text" style={{ fontSize: '0.75rem', color: isStreaming ? 'var(--cyan-400)' : 'var(--text-muted)' }}>
                  {isStreaming && !isMuted ? `${audioLevel.db} dBFS` : '-- dB'}
                </span>
              </div>
            </div>

            <div style={{ width: 1, height: 18, background: 'var(--border-subtle)' }} />

            {/* Dynamic Threat Level */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Threat Rating:</span>
              <RiskBadge
                level={threatLevelKey}
                label={threatLevelLabel}
              />
            </div>
          </div>

          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Pipeline:</span>
            <span className="mono-text" style={{ color: 'var(--cyan-400)' }}>FastAPI Live Chunk Slicer (2.5s)</span>
          </div>
        </div>
      </div>

      {/* Immediate Visible Warning for Critical Social-Engineering Language */}
      {criticalAlert && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          background: 'rgba(239, 68, 68, 0.15)',
          color: 'var(--threat)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 24,
          border: '1px solid var(--threat-border)',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ShieldAlert size={24} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', letterSpacing: '0.01em' }}>
                {criticalAlert.message}
              </div>
              {criticalAlert.phrases && criticalAlert.phrases.length > 0 && (
                <div style={{ fontSize: '0.78rem', marginTop: 4, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                  <span>Flagged phrasing:</span>
                  {criticalAlert.phrases.map((p, i) => (
                    <span
                      key={i}
                      style={{
                        fontWeight: 600,
                        color: 'var(--threat)',
                        background: 'rgba(239, 68, 68, 0.25)',
                        padding: '1px 6px',
                        borderRadius: 3
                      }}
                    >
                      "{p.phrase}"
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => setCriticalAlert(null)}
            className="btn btn-secondary"
            style={{ fontSize: '0.74rem', padding: '4px 10px', flexShrink: 0 }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Console Grid */}
      <div className="live-console-grid">
        {/* Left Column: Waveform Canvas & Live Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="cyber-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={18} color="var(--cyan-400)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Real-Time Frequency Oscillogram</h3>
              </div>
              <span className="mono-text" style={{ fontSize: '0.72rem' }}>
                {isStreaming ? `${analyserNode?.fftSize || 256} FFT bins • Streaming` : '16 kHz • Standby'}
              </span>
            </div>

            {/* Real Web Audio API Oscilloscope Visualizer */}
            <LiveWaveform
              isActive={isStreaming}
              analyserNode={analyserNode}
              isMuted={isMuted}
            />
          </div>

          {/* Live Diagnostic Console */}
          <div className="cyber-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Terminal size={18} color="var(--cyan-400)" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Live Neural Inference Diagnostics</h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isProcessingChunk && (
                  <Loader2 size={13} style={{ animation: 'spin 1s linear infinite', color: 'var(--cyan-400)' }} />
                )}
                <span className="demo-pill" style={{
                  color: isStreaming ? 'var(--cyan-400)' : 'var(--text-muted)',
                  borderColor: isStreaming ? 'var(--cyan-400)' : 'var(--border-subtle)'
                }}>
                  {isStreaming ? (isProcessingChunk ? 'Inference Running' : 'Stream Active') : 'Stream Standby'}
                </span>
              </div>
            </div>

            <div style={{
              background: 'rgba(7, 10, 18, 0.95)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              minHeight: 140,
              maxHeight: 180,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              {isStreaming ? (
                diagnosticLogs.length > 0 ? (
                  diagnosticLogs.map((logItem, idx) => {
                    const text = typeof logItem === 'string' ? logItem : logItem.text;
                    const level = typeof logItem === 'string'
                      ? (logItem.includes('Threat') || logItem.includes('Critical') ? 'critical' : logItem.includes('Suspicious') ? 'suspicious' : 'safe')
                      : logItem.level;
                    const color = level === 'critical' ? 'var(--threat)' : level === 'suspicious' ? 'var(--warning)' : 'var(--cyan-400)';
                    return (
                      <div key={idx} style={{ color }}>
                        {text}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ color: 'var(--text-muted)' }}>
                    [Stream Engine] Initializing chunk capture pipeline...
                  </div>
                )
              ) : (
                <span style={{ color: 'var(--text-muted)', alignSelf: 'center', marginTop: 35 }}>
                  Awaiting stream start. Click "Start Live Detection" above to initiate real-time audio chunking.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Threat Level & Event Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Real-time Threat Meter Card */}
          <div className="cyber-card" style={{
            borderColor: canonicalLiveResult ? canonicalLiveResult.borderColor : 'var(--border-accent)',
            background: canonicalLiveResult ? canonicalLiveResult.bgColor : 'rgba(11, 17, 32, 0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {canonicalLiveResult?.level === 'critical' ? (
                  <ShieldAlert size={20} color="var(--threat)" />
                ) : (
                  <ShieldCheck size={20} color={canonicalLiveResult ? canonicalLiveResult.color : 'var(--text-muted)'} />
                )}
                <div>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Continuous Rolling Threat Meter</h4>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {chunkCount} audio chunks evaluated • 2.5s window
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="mono-text" style={{
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  color: canonicalLiveResult ? canonicalLiveResult.color : 'var(--text-muted)'
                }}>
                  {canonicalLiveResult ? `${canonicalLiveResult.riskScore} / 100` : (isStreaming ? 'Awaiting Chunk...' : '-- / 100')}
                </span>
                {canonicalLiveResult && (
                  <RiskBadge
                    level={canonicalLiveResult.level}
                    label={canonicalLiveResult.label}
                  />
                )}
              </div>
            </div>

            {/* Animated risk bar */}
            <div style={{
              width: '100%',
              height: 8,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.06)',
              overflow: 'hidden',
              marginBottom: 10
            }}>
              <div style={{
                width: `${canonicalLiveResult ? canonicalLiveResult.riskScore : 0}%`,
                height: '100%',
                backgroundColor: canonicalLiveResult ? canonicalLiveResult.color : 'var(--border-subtle)',
                transition: 'width 0.4s ease-out, background-color 0.3s ease'
              }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: 6 }}>
              <span>Latest Chunk: <strong style={{ color: canonicalLiveResult ? canonicalLiveResult.color : 'var(--text-primary)' }}>{canonicalLiveResult ? canonicalLiveResult.authenticityScore : (isStreaming ? 'Analyzing...' : 'Standby')}</strong></span>
              <span>Deepfake Prob: <strong style={{ color: canonicalLiveResult ? canonicalLiveResult.color : 'var(--text-primary)' }}>{canonicalLiveResult ? canonicalLiveResult.formattedDeepfakeProbability : '--%'}</strong></span>
              <span>Scam Intent: <strong style={{ color: canonicalLiveResult?.scamIntentScore >= 75 ? 'var(--threat)' : canonicalLiveResult?.scamIntentScore >= 50 ? '#f97316' : canonicalLiveResult?.scamIntentScore >= 25 ? 'var(--warning)' : 'var(--safe)' }}>{canonicalLiveResult && canonicalLiveResult.scamIntentScore != null ? `${canonicalLiveResult.scamIntentScore}% (${canonicalLiveResult.scamCategory || 'LOW'})` : '--'}</strong></span>
            </div>

            {canonicalLiveResult?.transcript && (
              <div style={{
                marginTop: 10,
                padding: '8px 10px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.76rem',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                fontStyle: 'italic'
              }}>
                "{canonicalLiveResult.transcript}"
              </div>
            )}

            {/* Detected Risky Phrases */}
            {canonicalLiveResult?.suspiciousPhrases && canonicalLiveResult.suspiciousPhrases.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Detected Risky Phrase(s):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {canonicalLiveResult.suspiciousPhrases.map((item, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '0.68rem',
                        padding: '2px 6px',
                        borderRadius: 3,
                        background: 'rgba(239, 68, 68, 0.2)',
                        border: '1px solid var(--threat-border)',
                        color: 'var(--threat)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3
                      }}
                    >
                      <ShieldAlert size={10} />
                      <strong>"{item.phrase}"</strong>
                      <span style={{ opacity: 0.75, fontSize: '0.62rem' }}>({item.category})</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {canonicalLiveResult?.detectedIntents && canonicalLiveResult.detectedIntents.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {canonicalLiveResult.detectedIntents.map((intent, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.68rem',
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: 'rgba(245, 158, 11, 0.15)',
                      border: '1px solid var(--warning-border)',
                      color: 'var(--warning)'
                    }}
                  >
                    {intent}
                  </span>
                ))}
              </div>
            )}

            {/* Live Sensitive Request Indicators */}
            {(() => {
              const sens = canonicalLiveResult?.sensitive_indicators || canonicalLiveResult?.sensitiveIndicators;
              if (!sens) return null;
              const liveBadges = [
                { key: 'otp_detected', label: 'OTP Solicit', active: sens.otp_detected },
                { key: 'upi_pin_detected', label: 'UPI PIN Solicit', active: sens.upi_pin_detected },
                { key: 'pin_detected', label: 'PIN Solicit', active: sens.pin_detected && !sens.upi_pin_detected },
                { key: 'cvv_detected', label: 'CVV Solicit', active: sens.cvv_detected },
                { key: 'password_detected', label: 'Password Solicit', active: sens.password_detected },
                { key: 'payment_transfer_detected', label: 'Payment Transfer', active: sens.payment_transfer_detected },
                { key: 'impersonation_detected', label: 'Impersonation', active: sens.impersonation_detected },
                { key: 'urgency_detected', label: 'Urgency Pressure', active: sens.urgency_detected }
              ].filter(b => b.active);

              if (liveBadges.length === 0) return null;

              return (
                <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {liveBadges.map((b, idx) => (
                    <span key={idx} style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: 3,
                      background: 'rgba(239, 68, 68, 0.2)',
                      border: '1px solid var(--threat-border)',
                      color: 'var(--threat)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <ShieldAlert size={10} />
                      {b.label}
                    </span>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Detection Event Feed */}
          <div className="cyber-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Stream Event Feed</h3>
              <span className="demo-pill">{eventLogs.length} Events</span>
            </div>

            <div className="live-feed-list" style={{ maxHeight: 340, overflowY: 'auto' }}>
              {eventLogs.map((log) => (
                <div key={log.id} className={`feed-event-item ${log.type}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <span className="mono-text">{log.source}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{log.time}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500, margin: '2px 0' }}>
                    {log.title}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {log.detail}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
