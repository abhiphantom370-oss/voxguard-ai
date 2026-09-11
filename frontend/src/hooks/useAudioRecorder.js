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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported by your browser environment.');
      }

      if (typeof MediaRecorder === 'undefined') {
        throw new Error('MediaRecorder API is not available in your browser.');
      }

      // Detect best supported MIME type in specified priority order
      const detectedMimeType = getBestSupportedRecordingMimeType();

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // If a candidate type is confirmed, pass it; otherwise let browser choose default
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

        const file = new File([blob], fileName, {
          type: realMime,
          lastModified: Date.now()
        });

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

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission denied. On mobile devices, tap the lock/permissions icon in your browser address bar and enable Microphone, then refresh.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device was detected on your system or mobile device.';
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
