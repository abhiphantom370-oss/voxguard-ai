/**
 * Audio processing and validation service for VoxGuard AI
 */
import { getAudioMetadata } from '../utils/audioUtils';

export const SUPPORTED_EXTENSIONS = [".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm"];

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

/**
 * Validate an audio file for extension, MIME type, and size limits
 * @param {File | Blob} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAudioFile(file) {
  if (!file) {
    return { valid: false, error: "No file was selected." };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "The selected audio file is empty (0 bytes)."
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: "File size exceeds the 50MB security maximum threshold."
    };
  }

  const name = (file.name || '').toLowerCase();
  const fileType = (file.type || '').toLowerCase();

  // Allow standard extensions
  const hasValidExt = SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));

  // Allow audio mime types produced by browsers or common formats
  const hasValidMime =
    fileType.startsWith('audio/') ||
    fileType === 'video/webm' || // some browsers record audio in webm container with video/webm mime
    fileType === 'application/ogg';

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: "Unsupported audio format. VoxGuard accepts WAV, MP3, M4A, WebM, FLAC, or OGG."
    };
  }

  return { valid: true };
}

/**
 * Inspect file metadata and verify acoustic validity
 * @param {File | Blob} file 
 * @returns {Promise<{ valid: boolean, metadata?: any, error?: string }>}
 */
export async function inspectAudioFile(file) {
  const check = validateAudioFile(file);
  if (!check.valid) {
    return check;
  }

  try {
    const metadata = await getAudioMetadata(file);
    return {
      valid: true,
      metadata
    };
  } catch (err) {
    return {
      valid: false,
      error: err.message || "Unable to decode audio stream. File may be corrupted or encrypted."
    };
  }
}

/**
 * Format bytes into human readable string
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format duration seconds into mm:ss
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
