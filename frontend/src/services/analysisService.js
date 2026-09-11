/**
 * VoxGuard AI - Frontend Analysis & API Communication Service
 * Real-time connection to the FastAPI forensic backend.
 * Zero random numbers. Truthful real model and feature data.
 */

import { validateAudioFile } from './audioService';
import { getExtensionFromMime } from '../utils/audioUtils';
import { API_BASE_URL, getEndpoint } from './apiConfig';

/**
 * Robust, single-read HTTP fetch wrapper.
 * Guarantees that the Response body stream is read EXACTLY ONCE.
 * Eliminates "Failed to execute 'text' on 'Response': body stream already read" errors.
 */
async function apiRequest(endpoint, options = {}) {
  const primaryUrl = getEndpoint(endpoint);
  let response;
  try {
    response = await fetch(primaryUrl, options);
  } catch (primaryErr) {
    throw new Error(
      primaryErr.message ||
      `Unable to connect to VoxGuard inference backend${API_BASE_URL ? ` at ${API_BASE_URL}` : ''}. Please verify backend service availability.`
    );
  }

  // Handle blob responses if explicitly requested (e.g., CSV export)
  if (options.asBlob) {
    if (!response.ok) {
      const raw = await response.text().catch(() => '');
      let errData;
      try {
        errData = raw ? JSON.parse(raw) : {};
      } catch {
        errData = { message: raw };
      }
      throw new Error(
        errData?.detail ||
        errData?.message ||
        `Request failed with status ${response.status}`
      );
    }
    return await response.blob();
  }

  // Safely consume the Response body stream EXACTLY ONCE as text
  const raw = await response.text().catch(() => '');

  let data;
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    // If HTML was returned (e.g. 404, 502, 504 from gateway or CDN), provide a clean error
    const isHtml = typeof raw === 'string' && (raw.includes('<!DOCTYPE') || raw.includes('<html') || raw.includes('<html>'));
    const message = isHtml
      ? `Backend endpoint returned HTTP ${response.status} (${response.statusText || 'Error'}). Please verify backend availability.`
      : (data?.detail || data?.message || (typeof data === 'string' && data) || `Request failed with status ${response.status}`);

    throw new Error(message);
  }

  return data;
}

/**
 * Executes full end-to-end voice analysis on an audio sample.
 * Pipeline: Audio Preprocessing -> Deepfake CNN -> STT -> Scam Intent -> Speaker Match -> Risk Fusion
 */
export async function analyzeAudio(file, metadata = {}) {
  const validation = validateAudioFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Audio validation failed.');
  }

  const formData = new FormData();
  formData.append('file', file, file.name || `audio_stream_${Date.now()}.wav`);
  if (metadata.duration && !isNaN(metadata.duration) && isFinite(metadata.duration)) {
    formData.append('duration', String(metadata.duration));
  }
  if (metadata.speakerId && metadata.speakerId !== 'none') {
    formData.append('speaker_id', metadata.speakerId);
  }
  if (metadata.sensitivity) {
    formData.append('sensitivity', metadata.sensitivity);
  }

  return await apiRequest('/api/analyze', {
    method: 'POST',
    body: formData
  });
}

/**
 * Sends a live streaming audio chunk (2-3s) for near-real-time threat scoring.
 */
export async function analyzeLiveChunk(chunkBlob, sessionId = 'default-live-session', chunkIndex = 0, signal = null) {
  const ext = getExtensionFromMime(chunkBlob?.type);
  const formData = new FormData();
  formData.append('file', chunkBlob, `live_chunk_${chunkIndex}.${ext}`);
  formData.append('session_id', sessionId);
  formData.append('chunk_index', String(chunkIndex));

  return await apiRequest('/api/live/chunk', {
    method: 'POST',
    body: formData,
    signal
  });
}

export async function sendLiveChunk(chunkBlob, chunkIndex = 0, sessionId = 'default-live-session', signal = null) {
  return analyzeLiveChunk(chunkBlob, sessionId, chunkIndex, signal);
}

/**
 * Fetches persistent audit history records.
 */
export async function fetchHistory(search = '', riskFilter = 'all') {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (riskFilter && riskFilter !== 'all') params.set('risk_filter', riskFilter);

  const endpoint = `/api/history?${params.toString()}`;
  return await apiRequest(endpoint);
}

/**
 * Deletes an analysis record.
 */
export async function deleteHistoryRecord(id) {
  return await apiRequest(`/api/history/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
}

/**
 * Fetches real aggregate reporting metrics from the SQLite database.
 */
export async function fetchReportsMetrics() {
  return await apiRequest('/api/reports/metrics');
}

/**
 * Downloads the real audit log report as CSV.
 */
export async function exportReportsCsv() {
  const blob = await apiRequest('/api/reports/export', { asBlob: true });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voxguard_audit_report_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Lists enrolled trusted biometric speakers.
 */
export async function fetchSpeakers() {
  return await apiRequest('/api/speaker/list');
}

/**
 * Enrolls a new trusted biometric speaker profile.
 */
export async function enrollSpeaker(name, role, department, audioFile) {
  const formData = new FormData();
  formData.append('name', name);
  if (role) formData.append('role', role);
  if (department) formData.append('department', department);
  formData.append('file', audioFile, audioFile.name || 'reference_speech.wav');

  return await apiRequest('/api/speaker/enroll', {
    method: 'POST',
    body: formData
  });
}

/**
 * Removes an enrolled speaker from the vault.
 */
export async function deleteSpeaker(speakerId) {
  return await apiRequest(`/api/speaker/${encodeURIComponent(speakerId)}`, {
    method: 'DELETE'
  });
}

/**
 * Verifies a test audio sample against an enrolled speaker profile using real biometric cosine similarity.
 */
export async function verifySpeaker(speakerId, audioFile) {
  const formData = new FormData();
  formData.append('speaker_id', speakerId);
  formData.append('file', audioFile, audioFile.name || 'verification_sample.wav');

  return await apiRequest('/api/speaker/verify', {
    method: 'POST',
    body: formData
  });
}

/**
 * Fetches settings.
 */
export async function fetchSettings() {
  return await apiRequest('/api/settings');
}

/**
 * Saves settings.
 */
export async function saveSettings(settings) {
  return await apiRequest('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
}

/**
 * Checks backend health, runtime mode (cloud-lite vs full), and neural availability.
 */
export async function checkBackendHealth() {
  return await apiRequest('/health');
}
