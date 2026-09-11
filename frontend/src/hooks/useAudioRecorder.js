import { useState, useRef, useCallback, useEffect } from 'react';
import { getBestSupportedRecordingMimeType, getExtensionFromMime } from '../utils/audioUtils';

/**
 * Custom hook managing audio recording using HTML5 MediaRecorder.
 * Implements strict MIME type detection, dynamic extension mapping,
 * start/stop/cancel lifecycle, and track release.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedFile, setRecordedFile] = useState(null);
  const [selectedMimeType, setSelectedMimeType] = useState('');
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const isCancelledRef = useRef(false);
  const stopRecordingRef = useRef(null);

  // Stop stream tracks cleanly
  const stopStreamTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  // Stop timer cleanly
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    setError(null);
    setRecordedFile(null);
    chunksRef.current = [];
    isCancelledRef.current = false;
    setRecordingTime(0);

    try {
      // 1. Validate secure context
      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Mobile microphone requires secure HTTPS access. Open the secure VoxGuard URL to enable recording.');
      }

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        throw new Error('Microphone recording is not supported by your browser environment.');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not available in your browser.');
      }

      // 2. Request microphone permission with audio constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Handle stream unexpectedly ended (phone call, iOS app switcher)
      stream.getAudioTracks().forEach((track) => {
        track.onended = () => {
          console.warn('[VoxGuard] Audio track ended unexpectedly.');
          if (stopRecordingRef.current) {
            stopRecordingRef.current();
          } else {
            stopStreamTracks();
            stopTimer();
            setIsRecording(false);
          }
        };
      });

      // 3. Negotiate best supported MIME type
      const detectedMimeType = getBestSupportedRecordingMimeType();

      let mediaRecorder;
      if (detectedMimeType) {
        try {
          mediaRecorder = new MediaRecorder(stream, { mimeType: detectedMimeType });
        } catch (initErr) {
          console.warn('Failed to init MediaRecorder with detected type, falling back to default:', initErr);
          mediaRecorder = new MediaRecorder(stream);
        }
      } else {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;

      // Track the actual MIME type initialized by the browser
      const activeMime = mediaRecorder.mimeType || detectedMimeType || 'audio/webm';
      setSelectedMimeType(activeMime);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopStreamTracks();
        stopTimer();
        setIsRecording(false);

        if (isCancelledRef.current) {
          chunksRef.current = [];
          setRecordedFile(null);
          return;
        }

        // Use the EXACT MIME type produced by the MediaRecorder
        const realMime = mediaRecorder.mimeType || activeMime;
        const blob = new Blob(chunksRef.current, { type: realMime });

        // Generate the extension dynamically from the real MIME type
        const extension = getExtensionFromMime(realMime);
        const fileName = `recorded_voice_${Date.now()}.${extension}`;

        let file;
        try {
          file = new File([blob], fileName, {
            type: realMime,
            lastModified: Date.now()
          });
        } catch {
          file = blob;
          file.name = fileName;
          file.lastModified = Date.now();
        }

        setRecordedFile(file);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error event:', event);
        setError('An unexpected error occurred during audio recording.');
        stopStreamTracks();
        stopTimer();
        setIsRecording(false);
      };

      // Start recording with 250ms chunks
      mediaRecorder.start(250);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Unable to start audio recording:', err);
      let message = 'Failed to initiate microphone recording.';

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        message = 'Mobile microphone requires secure HTTPS access. Open the secure VoxGuard URL to enable recording.';
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone access is required for voice recording. Enable microphone permission for VoxGuard in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device was detected on your device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        message = 'Microphone is already in use by another application or process.';
      } else {
        message = err.message || message;
      }

      setError(message);
      stopStreamTracks();
      stopTimer();
      setIsRecording(false);
      throw new Error(message);
    }
  }, [stopStreamTracks, stopTimer]);

  // Stop recording and save audio
  const stopRecording = useCallback(() => {
    isCancelledRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    } else {
      stopStreamTracks();
      stopTimer();
      setIsRecording(false);
    }
  }, [stopStreamTracks, stopTimer]);

  useEffect(() => {
    stopRecordingRef.current = stopRecording;
  });

  // Cancel recording and discard audio
  const cancelRecording = useCallback(() => {
    isCancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    } else {
      stopStreamTracks();
      stopTimer();
      setIsRecording(false);
    }
    chunksRef.current = [];
    setRecordedFile(null);
    setRecordingTime(0);
  }, [stopStreamTracks, stopTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // ignore
        }
      }
      stopStreamTracks();
      stopTimer();
    };
  }, [stopStreamTracks, stopTimer]);

  return {
    isRecording,
    recordingTime,
    recordedFile,
    selectedMimeType,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearRecordedFile: () => setRecordedFile(null)
  };
}
