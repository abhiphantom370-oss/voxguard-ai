/**
 * VoxGuard AI - API Configuration & Service Architecture
 * Centralized backend URL configuration.
 * When VITE_API_BASE_URL is configured (e.g., https://voxguard-ai-44gw.onrender.com),
 * all API requests target that production domain directly.
 * When empty or unset during local development, relative /api paths are preserved
 * so the local Vite development proxy seamlessly routes requests to http://127.0.0.1:8000.
 */

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = (
  rawBaseUrl && rawBaseUrl.trim()
    ? rawBaseUrl.trim().replace(/\/+$/, '')
    : ''
);

export const ENDPOINTS = {
  HEALTH: API_BASE_URL ? `${API_BASE_URL}/health` : '/health',
  ANALYZE_VOICE: API_BASE_URL ? `${API_BASE_URL}/api/analyze` : '/api/analyze',
  LIVE_CHUNK: API_BASE_URL ? `${API_BASE_URL}/api/live/chunk` : '/api/live/chunk',
  SPEAKER_LIST: API_BASE_URL ? `${API_BASE_URL}/api/speaker/list` : '/api/speaker/list',
  SPEAKER_ENROLL: API_BASE_URL ? `${API_BASE_URL}/api/speaker/enroll` : '/api/speaker/enroll',
  SPEAKER_VERIFY: API_BASE_URL ? `${API_BASE_URL}/api/speaker/verify` : '/api/speaker/verify',
  HISTORY: API_BASE_URL ? `${API_BASE_URL}/api/history` : '/api/history',
  REPORTS_METRICS: API_BASE_URL ? `${API_BASE_URL}/api/reports/metrics` : '/api/reports/metrics',
  REPORTS_EXPORT: API_BASE_URL ? `${API_BASE_URL}/api/reports/export` : '/api/reports/export',
  SETTINGS: API_BASE_URL ? `${API_BASE_URL}/api/settings` : '/api/settings'
};

/**
 * Returns full URL if API_BASE_URL is present, or clean relative path for local proxy.
 */
export function getEndpoint(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
}

export const BACKEND_STATUS = {
  CONNECTED: true,
  STATUS_MESSAGE: API_BASE_URL
    ? `VoxGuard Cloud-Lite Backend Connected (${API_BASE_URL})`
    : "Local FastAPI Backend Connected (via Vite Proxy)"
};
