import React, { useEffect, useRef } from 'react';
import { Mic, Square, XCircle, AlertCircle } from 'lucide-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { formatDuration } from '../../services/audioService';

export default function AudioRecorder({ onRecordingComplete, onRecordingStateChange }) {
  const onRecordingCompleteRef = useRef(onRecordingComplete);
  const onRecordingStateChangeRef = useRef(onRecordingStateChange);

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
    error,
    startRecording,
    stopRecording,
    cancelRecording
  } = useAudioRecorder();

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {!isRecording ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={startRecording}
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

      {error && (
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
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
