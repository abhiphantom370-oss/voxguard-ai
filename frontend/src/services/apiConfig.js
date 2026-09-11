/**
 * VoxGuard AI - API Configuration & Service Architecture
 * Supports local proxy development and deployed HTTPS backend via VITE_API_BASE_URL.
 */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const isPageHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';

export const API_BASE_URL = (
  rawBaseUrl && rawBaseUrl.trim()
    ? rawBaseUrl.trim().replace(/\/+$/, '')
    : (isPageHttps ? '' : 'http://localhost:8000')
);

export const ENDPOINTS = {
  HEALTH: `${API_BASE_URL}/health`,
  ANALYZE_VOICE: `${API_BASE_URL}/api/analyze`,
  LIVE_CHUNK: `${API_BASE_URL}/api/live/chunk`,
  SPEAKER_LIST: `${API_BASE_URL}/api/speaker/list`,
  SPEAKER_ENROLL: `${API_BASE_URL}/api/speaker/enroll`,
  HISTORY: `${API_BASE_URL}/api/history`,
  REPORTS_METRICS: `${API_BASE_URL}/api/reports/metrics`,
  REPORTS_EXPORT: `${API_BASE_URL}/api/reports/export`,
  SETTINGS: `${API_BASE_URL}/api/settings`
};

export const BACKEND_STATUS = {
  CONNECTED: true,
  STATUS_MESSAGE: "FastAPI PyTorch & Faster-Whisper Inference Engine Connected"
};
