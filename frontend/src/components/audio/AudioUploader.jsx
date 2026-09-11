import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, AlertCircle, Loader2 } from 'lucide-react';
import { inspectAudioFile } from '../../services/audioService';

export default function AudioUploader({ onFileSelected, selectedFile }) {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setIsValidating(false);
    };
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleManualSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file) => {
    if (!file) return;

    setIsValidating(true);
    setValidationError('');

    try {
      const inspection = await inspectAudioFile(file);

      if (!inspection.valid) {
        if (isMountedRef.current) {
          setValidationError(inspection.error || 'Invalid audio file.');
        }
        return;
      }

      if (isMountedRef.current && onFileSelected) {
        onFileSelected(file, inspection.metadata);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setValidationError(err.message || 'Error reading audio file.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsValidating(false); // ALWAYS executed
      }
    }
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".wav,.mp3,.flac,.m4a,.ogg,.webm,audio/*"
        style={{ display: 'none' }}
        onChange={handleManualSelect}
      />

      <div
        className={`upload-container ${isDragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isValidating && fileInputRef.current && fileInputRef.current.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload audio file"
      >
        <div className="upload-icon-circle">
          {isValidating ? (
            <Loader2 size={28} className="pulse-dot" style={{ animation: 'spin 1s linear infinite' }} />
          ) : (
            <UploadCloud size={28} />
          )}
        </div>
        <h3 className="upload-title">
          {isValidating
            ? 'Checking Audio File...'
            : selectedFile
            ? 'Replace Selected Audio Sample'
            : 'Drag & Drop Audio Sample Here'}
        </h3>
        <p className="upload-subtitle">
          or <span style={{ color: 'var(--cyan-400)', textDecoration: 'underline' }}>browse file from device</span>
        </p>

        <div className="format-tags">
          <span className="format-pill">WAV</span>
          <span className="format-pill">MP3</span>
          <span className="format-pill">M4A</span>
          <span className="format-pill">WEBM</span>
          <span className="format-pill">FLAC</span>
          <span className="format-pill">OGG</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>• Max 50MB</span>
        </div>
      </div>

      {validationError && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--threat)',
          fontSize: '0.82rem',
          marginTop: 10,
          background: 'var(--threat-bg)',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--threat-border)'
        }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{validationError}</span>
        </div>
      )}
    </div>
  );
}
