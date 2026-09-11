/**
 * Safe Storage Wrapper for VoxGuard AI
 * Prevents SecurityError / QuotaExceededError in private browsing or restricted mobile contexts
 * from crashing the React application.
 */

const memoryStore = new Map();

function isStorageAvailable(type) {
  try {
    if (typeof window === 'undefined') return false;
    const storage = window[type];
    if (!storage) return false;
    const testKey = '__vg_test__';
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocal = isStorageAvailable('localStorage');
const hasSession = isStorageAvailable('sessionStorage');

export const safeLocalStorage = {
  getItem(key) {
    try {
      if (hasLocal) return window.localStorage.getItem(key);
    } catch {}
    return memoryStore.get(`local:${key}`) ?? null;
  },
  setItem(key, val) {
    try {
      if (hasLocal) {
        window.localStorage.setItem(key, val);
        return;
      }
    } catch {}
    memoryStore.set(`local:${key}`, String(val));
  },
  removeItem(key) {
    try {
      if (hasLocal) window.localStorage.removeItem(key);
    } catch {}
    memoryStore.delete(`local:${key}`);
  }
};

export const safeSessionStorage = {
  getItem(key) {
    try {
      if (hasSession) return window.sessionStorage.getItem(key);
    } catch {}
    return memoryStore.get(`session:${key}`) ?? null;
  },
  setItem(key, val) {
    try {
      if (hasSession) {
        window.sessionStorage.setItem(key, val);
        return;
      }
    } catch {}
    memoryStore.set(`session:${key}`, String(val));
  },
  removeItem(key) {
    try {
      if (hasSession) window.sessionStorage.removeItem(key);
    } catch {}
    memoryStore.delete(`session:${key}`);
  }
};
