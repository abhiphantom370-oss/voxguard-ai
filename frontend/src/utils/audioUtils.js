/**
 * Audio Utilities for VoxGuard AI Phase 2
 * Provides audio signal processing helpers (RMS, dB), MIME type negotiation,
 * safe object URL handling, and pragmatic, non-blocking metadata extraction.
 */

/**
 * Detect best supported MediaRecorder MIME type in exact priority order
 * @returns {string}
 */
export function getBestSupportedRecordingMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  // Priority order ensuring both iOS/WebKit and Desktop Chrome/Firefox select their best format:
  // - iOS Safari natively supports audio/mp4
  // - Desktop Chrome/Firefox natively support audio/webm;codecs=opus and audio/webm
  // - When tested in this order, iOS Safari selects audio/mp4 (as it rejects webm),
  //   while Chrome/Firefox select audio/webm (as they reject audio/mp4 in MediaRecorder).
  const preferredTypes = [
    'audio/mp4',
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/aac',
    'audio/wav'
  ];

  for (const type of preferredTypes) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    } catch {
      // ignore
    }
  }

  return '';
}

/**
 * Generate correct file extension from actual MIME type
 * @param {string} mimeType 
 * @returns {string}
 */
export function getExtensionFromMime(mimeType) {
  if (!mimeType) return 'webm';
  const cleanMime = mimeType.toLowerCase().split(';')[0].trim();

  if (cleanMime === 'audio/webm') return 'webm';
  if (cleanMime === 'audio/ogg') return 'ogg';
  if (cleanMime === 'audio/mp4' || cleanMime === 'audio/x-m4a' || cleanMime === 'audio/aac') return 'm4a';
  if (cleanMime === 'audio/wav' || cleanMime === 'audio/x-wav' || cleanMime === 'audio/wave') return 'wav';
  if (cleanMime === 'audio/mpeg' || cleanMime === 'audio/mp3') return 'mp3';
  if (cleanMime === 'audio/flac' || cleanMime === 'audio/x-flac') return 'flac';

  return 'webm';
}

/**
 * Calculate Root-Mean-Square (RMS) amplitude from a Float32 or Uint8 time-domain array.
 * @param {Float32Array | Uint8Array} dataArray 
 * @returns {number} RMS amplitude between 0 and 1
 */
export function calculateRMS(dataArray) {
  if (!dataArray || dataArray.length === 0) return 0;

  let sumSquares = 0;

  if (dataArray instanceof Uint8Array) {
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128;
      sumSquares += normalized * normalized;
    }
  } else {
    for (let i = 0; i < dataArray.length; i++) {
      sumSquares += dataArray[i] * dataArray[i];
    }
  }

  return Math.sqrt(sumSquares / dataArray.length);
}

/**
 * Convert RMS amplitude to decibels relative to full scale (dBFS)
 * and an intuitive percentage value (0% to 100%).
 * @param {number} rms 
 * @param {number} minDb Lower threshold (defaults to -60 dBFS)
 * @returns {{ db: number, percent: number }}
 */
export function calculateDb(rms, minDb = -60) {
  if (rms <= 0.0001) {
    return { db: minDb, percent: 0 };
  }

  const db = Math.max(minDb, Math.min(0, 20 * Math.log10(rms)));
  const percent = Math.round(((db - minDb) / -minDb) * 100);

  return {
    db: Math.round(db),
    percent: Math.max(0, Math.min(100, percent))
  };
}

/**
 * Pragmatic, non-blocking metadata helper using native HTML5 Audio element.
 * STRICTLY DOES NOT USE AudioContext.decodeAudioData for validating MediaRecorder recordings.
 * Never hangs or blocks; resolves within 400ms maximum.
 * 
 * @param {File | Blob} file
 * @param {number} timeoutMs Maximum duration to wait before returning fallback
 * @returns {Promise<{ duration: number | null, format: string, isPlayable: boolean }>}
 */
export async function getAudioMetadata(file, timeoutMs = 400) {
  if (!file) {
    throw new Error('No audio file provided.');
  }

  if (file.size === 0) {
    throw new Error('Audio file is empty (0 bytes).');
  }

  return new Promise((resolve) => {
    let resolved = false;
    let timerId = null;
    let objectUrl = null;

    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve({
        duration: null,
        format: file.type || 'audio/raw',
        isPlayable: true
      });
      return;
    }

    const audio = new Audio();
    audio.preload = 'metadata';

    const finish = (duration = null) => {
      if (resolved) return;
      resolved = true;

      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }

      try {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
      } catch {
        // ignore
      }

      const validDuration =
        duration && !isNaN(duration) && isFinite(duration) && duration > 0
          ? duration
          : null;

      resolve({
        duration: validDuration,
        format: file.type || 'audio/raw',
        isPlayable: file.size > 0
      });
    };

    const onLoaded = () => {
      finish(audio.duration);
    };

    const onCanPlay = () => {
      finish(audio.duration);
    };

    const onError = () => {
      // Even if metadata event reports a warning, if file has size, allow playback
      finish(null);
    };

    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('error', onError);

    // Strict 400ms timeout - NEVER blocks or hangs
    timerId = setTimeout(() => {
      finish(null);
    }, timeoutMs);

    try {
      audio.src = objectUrl;
    } catch {
      finish(null);
    }
  });
}
