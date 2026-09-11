/**
 * VoxGuard AI - Frontend Analysis & API Communication Service
 * Real-time connection to the FastAPI forensic backend.
 * Zero random numbers. Truthful real model and feature data.
 */

import { validateAudioFile } from './audioService';
import { getExtensionFromMime } from '../utils/audioUtils';

// Base URL configuration: in production, reads VITE_API_BASE_URL.
// In local development, falls back to relative paths routed through Vite dev proxy.
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const configuredBase = (rawBaseUrl && rawBaseUrl.trim())
  ? rawBaseUrl.trim().replace(/\/+$/, '')
  : '';

async function apiRequest(endpoint, options = {}) {
  const primaryUrl = configuredBase ? `${configuredBase}${endpoint}` : endpoint;
  let response;
  try {
    response = await fetch(primaryUrl, options);
  } catch (primaryErr) {
    throw new Error(primaryErr.message || `Unable to connect to VoxGuard inference backend${configuredBase ? ` at ${configuredBase}` : ''}.`);
  }

  if (!response.ok) {
    let errMessage = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errMessage = errJson.detail || errJson.message || JSON.stringify(errJson);
    } catch {
      errMessage = await response.text();
    }
    throw new Error(errMessage);
  }

  return response;
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

  const response = await apiRequest('/api/analyze', {
    method: 'POST',
    body: formData
  });

  return await response.json();
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

  const response = await apiRequest('/api/live/chunk', {
    method: 'POST',
    body: formData,
    signal
  });

  return await response.json();
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
  const response = await apiRequest(endpoint);
  return await response.json();
}

/**
 * Deletes an analysis record.
 */
export async function deleteHistoryRecord(id) {
  const response = await apiRequest(`/api/history/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });
  return await response.json();
}

/**
 * Fetches real aggregate reporting metrics from the SQLite database.
 */
export async function fetchReportsMetrics() {
  const response = await apiRequest('/api/reports/metrics');
  return await response.json();
}

/**
 * Downloads the real audit log report as CSV.
 */
export async function exportReportsCsv() {
  const response = await apiRequest('/api/reports/export');
  const blob = await response.blob();
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
  const response = await apiRequest('/api/speaker/list');
  return await response.json();
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

  const response = await apiRequest('/api/speaker/enroll', {
    method: 'POST',
    body: formData
  });
  return await response.json();
}

/**
 * Removes an enrolled speaker from the vault.
 */
export async function deleteSpeaker(speakerId) {
  const response = await apiRequest(`/api/speaker/${encodeURIComponent(speakerId)}`, {
    method: 'DELETE'
  });
  return await response.json();
}

/**
 * Verifies a test audio sample against an enrolled speaker profile using real biometric cosine similarity.
 */
export async function verifySpeaker(speakerId, audioFile) {
  const formData = new FormData();
  formData.append('speaker_id', speakerId);
  formData.append('file', audioFile, audioFile.name || 'verification_sample.wav');

  const response = await apiRequest('/api/speaker/verify', {
    method: 'POST',
    body: formData
  });
  return await response.json();
}

/**
 * Fetches settings.
 */
export async function fetchSettings() {
  const response = await apiRequest('/api/settings');
  return await response.json();
}

/**
 * Saves settings.
 */
export async function saveSettings(settings) {
  const response = await apiRequest('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  return await response.json();
}
