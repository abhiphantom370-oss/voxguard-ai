import { useState, useRef, useCallback, useEffect } from 'react';
import { calculateRMS, calculateDb } from '../utils/audioUtils';

/**
 * Custom hook to manage microphone stream, permission states,
 * mute/unmute control, and Web Audio API AnalyserNode with dB level metering.
 */
export function useMicrophone() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [permissionState, setPermissionState] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [error, setError] = useState(null);
  const [audioLevel, setAudioLevel] = useState({ db: -60, percent: 0 });
  const [analyserNode, setAnalyserNode] = useState(null);

  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Clean up all audio resources
  const stop = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

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

    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    analyserRef.current = null;
    setAnalyserNode(null);
    setIsStreaming(false);
    setIsMuted(false);
    setAudioLevel({ db: -60, percent: 0 });
  }, []);

  // Request microphone permission and initialize Web Audio API
  const start = useCallback(async () => {
    setError(null);
    stop(); // Ensure previous session is completely closed

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone audio capture is not supported by your browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      streamRef.current = stream;
      setPermissionState('granted');

      // Initialize Web Audio API
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      // Resume context if suspended (browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      setAnalyserNode(analyser);

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceNodeRef.current = source;

      setIsStreaming(true);
      setIsMuted(false);

      // Start level monitoring loop with named recursion
      const monitor = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray);

        const rms = calculateRMS(dataArray);
        const { db, percent } = calculateDb(rms);
        setAudioLevel({ db, percent });

        animationFrameRef.current = requestAnimationFrame(monitor);
      };

      animationFrameRef.current = requestAnimationFrame(monitor);
      return stream;
    } catch (err) {
      console.warn('Microphone access failed:', err);
      let userFriendlyMsg = 'Could not access microphone.';

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        userFriendlyMsg = 'Microphone permission denied. Please allow audio access in browser site settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        userFriendlyMsg = 'No microphone device was detected on your system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        userFriendlyMsg = 'Microphone is already in use by another application or process.';
      } else {
        userFriendlyMsg = err.message || userFriendlyMsg;
      }

      setError(userFriendlyMsg);
      stop();
      throw new Error(userFriendlyMsg);
    }
  }, [stop]);

  // Toggle Mute / Unmute
  const toggleMute = useCallback(() => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const nextMuted = !isMuted;
      audioTracks.forEach((track) => {
        track.enabled = !nextMuted;
      });
      setIsMuted(nextMuted);

      if (nextMuted) {
        setAudioLevel({ db: -60, percent: 0 });
      }
    }
  }, [isMuted]);

  // Always clean up on component unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    start,
    stop,
    toggleMute,
    isStreaming,
    isMuted,
    permissionState,
    error,
    audioLevel,
    analyserNode
  };
}
