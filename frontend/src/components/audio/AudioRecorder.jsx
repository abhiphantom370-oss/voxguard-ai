import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square, XCircle, AlertCircle, ShieldAlert, ExternalLink } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { formatDuration } from '../../services/audioService';
import { checkAudioCapabilities } from '../../utils/audioCapability';

export default function AudioRecorder({ onRecordingComplete, onRecordingStateChange }) {
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);

  const [capabilities] = useState(() => checkAudioCapabilities());

  useEffect(() => {
    onRecordingCompleteRef.current = onRecordingComplete;
    onRecordingStateChangeRef.current = onRecordingStateChange;
  });

  // Track the last emitted file to prevent infinite re-emission on parent re-renders
  const lastEmittedFileRef = useRef(null);

  const {
    isRecording,
    recordingTime,
    recordedFile,
    error: recorderError,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder();

  const [actionError, setActionError] = useState('');

  // Notify parent of recording activity changes without re-render loop
  useEffect(() => {
    if (onRecordingStateChangeRef.current) {
      onRecordingStateChangeRef.current(isRecording);
    }
  }, [isRecording]);

  // Notify parent ONLY ONCE per newly recorded file
  useEffect(() => {
    if (recordedFile && recordedFile !== lastEmittedFileRef.current) {
      lastEmittedFileRef.current = recordedFile;
      if (onRecordingCompleteRef.current) {
        onRecordingCompleteRef.current(recordedFile);
      }
    }
  }, [recordedFile]);

  const handleStart = async () => {
    setActionError('');
    try {
      await startRecording();
    } catch (err) {
      setActionError(err.message || 'Microphone capture could not be initiated.');
    }
  };

  const displayError = actionError || recorderError;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {capabilities.isInsecureLanHttp && (
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          background: 'rgba(234, 179, 8, 0.1)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 12px',
          color: '#fef08a',
          fontSize: '0.8rem',
          lineHeight: 1.45
        }}>
          <ShieldAlert size={16} color="#eab308" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                  gap: 4,
                  marginTop: 2,
                  textDecoration: 'none'
                }}
              >
                <span>Switch to Secure HTTPS ({capabilities.secureLanUrl})</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {!isRecording ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleStart}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Mic size={16} color="var(--cyan-400)" />
            <span>Record From Microphone</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Stop and Save Button */}
            <button
              type="button"
              className="btn btn-danger"
              onClick={stopRecording}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Square size={14} />
              <span>Stop Recording ({formatDuration(recordingTime)})</span>
            </button>

            {/* Cancel and Discard Button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelRecording}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--threat-border)', color: '#fca5a5' }}
              title="Discard recording without saving"
            >
              <XCircle size={15} />
              <span>Cancel</span>
            </button>

            {/* Pulsing indicator */}
            <span style={{ fontSize: '0.8rem', color: 'var(--threat)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pulse-dot" style={{ backgroundColor: 'var(--threat)' }} />
              Recording Active
            </span>
          </div>
        )}
      </div>

      {displayError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--threat)',
          fontSize: '0.8rem',
          background: 'var(--threat-bg)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--threat-border)'
        }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  );
}
