/**
 * VoxGuard AI - Audio & Secure Context Capability Detection
 * 
 * Inspects browser audio and security primitives WITHOUT instantiating hardware
 * or triggering permission prompts during application startup.
 * Prevents runtime crashes on restricted iOS Safari and insecure LAN contexts.
 */

/**
 * Evaluates device & browser audio capabilities safely.
 * @returns {{
 *   isSecureContext: boolean,
 *   hasMediaDevices: boolean,
 *   hasGetUserMedia: boolean,
 *   hasMediaRecorder: boolean,
 *   hasAudioContext: boolean,
 *   canRecord: boolean,
 *   isInsecureLanHttp: boolean,
 *   secureLanUrl: string,
 *   unsupportedReason: string | null
 * }}
 */
export function checkAudioCapabilities() {
  if (typeof window === 'undefined') {
    return {
      isSecureContext: false,
      hasMediaDevices: false,
      hasGetUserMedia: false,
      hasMediaRecorder: false,
      hasAudioContext: false,
      canRecord: false,
      isInsecureLanHttp: false,
      secureLanUrl: '',
      unsupportedReason: 'Audio APIs unavailable outside browser environment.'
    };
  }

  const isSecure = Boolean(window.isSecureContext);
  const hasMediaDevices = Boolean(navigator && navigator.mediaDevices);
  const hasGetUserMedia = Boolean(hasMediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function');
  const hasMediaRecorder = Boolean(typeof MediaRecorder !== 'undefined');
  const hasAudioContext = Boolean(window.AudioContext || window.webkitAudioContext);

  // Check if accessed over insecure LAN HTTP (e.g. http://192.168.x.x:5175 instead of localhost or https)
  const isLocalhost = Boolean(
    window.location &&
    (window.location.hostname === 'localhost' ||
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname === '[::1]')
  );
  const isHttp = Boolean(window.location && window.location.protocol === 'http:');
  const isInsecureLanHttp = isHttp && !isLocalhost && !isSecure;

  // Build secure URL if running on LAN
  const port = (window.location && window.location.port) ? `:${window.location.port}` : '';
  const host = (window.location && window.location.hostname) ? window.location.hostname : 'localhost';
  const secureLanUrl = `https://${host}${port}${window.location?.pathname || '/'}`;

  let canRecord = true;
  let unsupportedReason = null;

  if (isInsecureLanHttp) {
    canRecord = false;
    unsupportedReason = 'Mobile microphone requires secure HTTPS access. Open the secure VoxGuard URL to enable recording.';
  } else if (!hasGetUserMedia) {
    canRecord = false;
    unsupportedReason = isSecure
      ? 'Microphone recording API (getUserMedia) is not supported by your browser.'
      : 'Microphone access is disabled because this page is not loaded over a secure context (HTTPS/localhost).';
  } else if (!hasMediaRecorder) {
    canRecord = false;
    unsupportedReason = 'MediaRecorder API is not available in your browser.';
  }

  return {
    isSecureContext: isSecure,
    hasMediaDevices,
    hasGetUserMedia,
    hasMediaRecorder,
    hasAudioContext,
    canRecord,
    isInsecureLanHttp,
    secureLanUrl,
    unsupportedReason
  };
}
