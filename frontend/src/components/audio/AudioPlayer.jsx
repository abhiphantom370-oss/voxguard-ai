import React, { useState, useEffect, useRef } from 'react';
import { FileAudio, Trash2, AlertCircle, Clock } from 'lucide-react';
import { formatBytes, formatDuration } from '../../services/audioService';

export default function AudioPlayer({ file, metadata = null, onClear }) {
  const [playbackError, setPlaybackError] = useState(false);
  const [elementDuration, setElementDuration] = useState(null);
  const audioRef = useRef(null);

  const [audioUrl, setAudioUrl] = useState(null);

  // Manage Object URL cleanly via useEffect without triggering render loops
  useEffect(() => {
    if (!file) {
      setAudioUrl(null);
      setPlaybackError(false);
      setElementDuration(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setPlaybackError(false);
    setElementDuration(null);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  if (!file || !audioUrl) return null;

  // Derive duration gracefully; show "Unknown" if Infinity/NaN or unprovided
  const validDuration =
    metadata?.duration && !isNaN(metadata.duration) && isFinite(metadata.duration) && metadata.duration > 0
      ? metadata.duration
      : elementDuration && !isNaN(elementDuration) && isFinite(elementDuration) && elementDuration > 0
      ? elementDuration
      : null;

  const durationDisplay = validDuration ? formatDuration(validDuration) : 'Unknown';

  const handleLoadedMetadata = (e) => {
    const dur = e.currentTarget.duration;
    if (dur && !isNaN(dur) && isFinite(dur) && dur > 0) {
      setElementDuration(dur);
    }
  };

  const handleAudioError = (e) => {
    const mediaError = e.currentTarget?.error;
    const errCode = mediaError?.code;
    const notSupportedCode = typeof window !== 'undefined' && window.MediaError ? window.MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED : 4;
    if (errCode === notSupportedCode || errCode) {
      setPlaybackError(true);
    }
  };

  return (
    <div className="audio-info-card">
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
          <div className="audio-file-meta">
            <div className="audio-file-icon">
              <FileAudio size={22} />
            </div>
            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <div className="audio-file-name">
                {file.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap', wordBreak: 'break-word' }}>
                <span>{formatBytes(file.size)}</span>
                <span>•</span>
                <span className="mono-text" style={{ wordBreak: 'break-all' }}>{file.type || 'audio/raw'}</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--cyan-400)' }}>
                  <Clock size={11} /> {durationDisplay}
                </span>
              </div>
            </div>
          </div>

          {onClear && (
            <button
              onClick={onClear}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.78rem' }}
              title="Remove audio sample"
              aria-label="Remove audio sample"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          )}
        </div>

        {playbackError ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--threat)',
            fontSize: '0.8rem',
            background: 'var(--threat-bg)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--threat-border)',
            marginTop: 8
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>Browser cannot decode this audio stream. The file may be corrupt or encoded in an unsupported format.</span>
          </div>
        ) : (
          <div className="audio-player-wrapper">
            <audio
              ref={audioRef}
              controls
              src={audioUrl}
              preload="auto"
              onLoadedMetadata={handleLoadedMetadata}
              onError={handleAudioError}
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>
    </div>
  );
}
