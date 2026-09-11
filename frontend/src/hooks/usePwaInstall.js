import { useState, useEffect, useCallback } from 'react';

// Global reference for the beforeinstallprompt event
let globalDeferredPrompt = null;
const listeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent default mini-infobar or auto prompt
    e.preventDefault();
    globalDeferredPrompt = e;
    listeners.forEach((listener) => listener(globalDeferredPrompt));
  });

  window.addEventListener('appinstalled', () => {
    globalDeferredPrompt = null;
    listeners.forEach((listener) => listener(null));
    console.log('[VoxGuard PWA] App successfully installed to home screen.');
  });
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(globalDeferredPrompt);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode (installed PWA)
    const checkStandalone = () => {
      try {
        const isDisplayStandalone = Boolean(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)')?.matches);
        const isIosStandalone = Boolean(typeof window !== 'undefined' && window.navigator && window.navigator.standalone === true);
        setIsStandalone(Boolean(isDisplayStandalone || isIosStandalone));
      } catch {
        setIsStandalone(false);
      }
    };

    // Check if device is iOS (iPhone/iPad)
    const checkIos = () => {
      try {
        const ua = (typeof window !== 'undefined' && window.navigator?.userAgent?.toLowerCase()) || '';
        const isApple = /iphone|ipad|ipod/.test(ua) || (Boolean(window.navigator?.platform === 'MacIntel') && (window.navigator?.maxTouchPoints || 0) > 1);
        setIsIos(Boolean(isApple));
      } catch {
        setIsIos(false);
      }
    };

    checkStandalone();
    checkIos();

    const updatePrompt = (prompt) => setDeferredPrompt(prompt);
    listeners.add(updatePrompt);

    return () => {
      listeners.delete(updatePrompt);
    };
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        globalDeferredPrompt = null;
        setDeferredPrompt(null);
      }
    } else if (isIos) {
      setShowIosGuide(true);
    } else {
      setShowIosGuide(true);
    }
  }, [deferredPrompt, isIos]);

  return {
    isStandalone,
    canInstall: !isStandalone && (Boolean(deferredPrompt) || isIos),
    isIos,
    triggerInstall,
    showIosGuide,
    closeIosGuide: () => setShowIosGuide(false)
  };
}
