import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeLocalStorage, safeSessionStorage } from '../utils/safeStorage';

// Create Authentication Context
const AuthContext = createContext(null);

// Pure JS SHA-256 fallback for environments where window.crypto.subtle is restricted (e.g. non-localhost HTTP / iOS Safari)
function sha256Sync(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i, j;
  let result = '';
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  hash = hash.slice(0, 8);
  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15],
        w2 = w[i - 2];
      const a = hash[0],
        e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

// SHA-256 helper using standard Web Crypto API with seamless pure-JS fallback
async function hashPassword(password) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      const msgUint8 = new TextEncoder().encode(password);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (cryptoErr) {
    console.warn('[VoxGuard Auth] Web Crypto subtle unavailable, using fallback:', cryptoErr);
  }
  return sha256Sync(password);
}

// Default pre-seeded SIH Judge / Demo account
const DEFAULT_DEMO_EMAIL = 'admin@voxguard.ai';
const DEFAULT_DEMO_PASS = 'VoxGuard2026!';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Initialize and load saved session on app mount
  useEffect(() => {
    async function initAuth() {
      try {
        // Ensure default demo account exists in local database
        const usersDbStr = safeLocalStorage.getItem('voxguard_users_db');
        let usersDb = {};
        if (usersDbStr) {
          try {
            usersDb = JSON.parse(usersDbStr);
          } catch {
            usersDb = {};
          }
        }

        if (!usersDb[DEFAULT_DEMO_EMAIL.toLowerCase()]) {
          const demoHash = await hashPassword(DEFAULT_DEMO_PASS);
          usersDb[DEFAULT_DEMO_EMAIL.toLowerCase()] = {
            id: 'demo-admin',
            name: 'SecOps Admin',
            email: DEFAULT_DEMO_EMAIL,
            passwordHash: demoHash,
            role: 'Security Analyst',
            avatarInitials: 'SA',
            createdAt: new Date().toISOString()
          };
          safeLocalStorage.setItem('voxguard_users_db', JSON.stringify(usersDb));
        }

        // Check for active session in localStorage (remember me) or sessionStorage
        const savedUserStr = safeLocalStorage.getItem('voxguard_auth_user') || safeSessionStorage.getItem('voxguard_auth_user');
        const token = safeLocalStorage.getItem('voxguard_auth_token') || safeSessionStorage.getItem('voxguard_auth_token');

        if (savedUserStr && token) {
          try {
            const parsedUser = JSON.parse(savedUserStr);
            setUser(parsedUser);
          } catch {}
        }
      } catch (err) {
        console.error('Error initializing VoxGuard Auth:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  // Login method
  const login = async (email, password, rememberMe = true) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Special SIH demo login path
    if (cleanEmail === DEFAULT_DEMO_EMAIL.toLowerCase() && password === DEFAULT_DEMO_PASS) {
      const sessionUser = {
        id: 'demo-admin',
        name: 'SecOps Admin',
        email: 'admin@voxguard.ai',
        role: 'Security Analyst',
        avatarInitials: 'SA'
      };

      const dummyToken = `vg_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      const storage = rememberMe ? safeLocalStorage : safeSessionStorage;
      storage.setItem('voxguard_auth_user', JSON.stringify(sessionUser));
      storage.setItem('voxguard_auth_token', dummyToken);

      // Clear the other storage just in case
      if (rememberMe) {
        safeSessionStorage.removeItem('voxguard_auth_user');
        safeSessionStorage.removeItem('voxguard_auth_token');
      } else {
        safeLocalStorage.removeItem('voxguard_auth_user');
        safeLocalStorage.removeItem('voxguard_auth_token');
      }

      setUser(sessionUser);
      return sessionUser;
    }

    // Existing normal login logic
    let usersDb = {};
    try {
      usersDb = JSON.parse(safeLocalStorage.getItem('voxguard_users_db') || '{}');
    } catch {
      usersDb = {};
    }
    const existing = usersDb[cleanEmail];

    if (!existing) {
      throw new Error('Account not found with this email address.');
    }

    const hashedInput = await hashPassword(password);
    if (existing.passwordHash !== hashedInput) {
      throw new Error('Invalid credentials. Please verify your password.');
    }

    const sessionUser = {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      role: existing.role || 'Security Analyst',
      avatarInitials: existing.avatarInitials || existing.name.slice(0, 2).toUpperCase(),
      createdAt: existing.createdAt
    };

    const dummyToken = `vg_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const storage = rememberMe ? safeLocalStorage : safeSessionStorage;
    storage.setItem('voxguard_auth_user', JSON.stringify(sessionUser));
    storage.setItem('voxguard_auth_token', dummyToken);

    // Clear the other storage just in case
    if (rememberMe) {
      safeSessionStorage.removeItem('voxguard_auth_user');
      safeSessionStorage.removeItem('voxguard_auth_token');
    } else {
      safeLocalStorage.removeItem('voxguard_auth_user');
      safeLocalStorage.removeItem('voxguard_auth_token');
    }

    setUser(sessionUser);
    return sessionUser;
  };

  // Signup method
  const signup = async (fullName, email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!cleanName) throw new Error('Please provide your full name.');
    if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please provide a valid email address.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters long.');

    let usersDb = {};
    try {
      usersDb = JSON.parse(safeLocalStorage.getItem('voxguard_users_db') || '{}');
    } catch {
      usersDb = {};
    }
    if (usersDb[cleanEmail]) {
      throw new Error('An account is already registered with this email.');
    }

    const passwordHash = await hashPassword(password);
    const initials = cleanName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'VG';

    const newUser = {
      id: `usr_${Date.now().toString(36)}`,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      role: 'Voice Security Analyst',
      avatarInitials: initials,
      createdAt: new Date().toISOString()
    };

    usersDb[cleanEmail] = newUser;
    safeLocalStorage.setItem('voxguard_users_db', JSON.stringify(usersDb));

    // Auto-login new user
    const dummyToken = `vg_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    safeLocalStorage.setItem('voxguard_auth_user', JSON.stringify(newUser));
    safeLocalStorage.setItem('voxguard_auth_token', dummyToken);

    setUser(newUser);
    setIsNewUser(true);
    return newUser;
  };

  // Reset Password (simulated recovery)
  const resetPassword = async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    let usersDb = {};
    try {
      usersDb = JSON.parse(safeLocalStorage.getItem('voxguard_users_db') || '{}');
    } catch {
      usersDb = {};
    }
    if (!usersDb[cleanEmail]) {
      throw new Error('No registered account found with that email address.');
    }
    // Set a temporary password reset flag
    return { success: true, message: `A password reset link has been dispatched to ${cleanEmail}.` };
  };

  // Logout method
  const logout = () => {
    safeLocalStorage.removeItem('voxguard_auth_user');
    safeLocalStorage.removeItem('voxguard_auth_token');
    safeSessionStorage.removeItem('voxguard_auth_user');
    safeSessionStorage.removeItem('voxguard_auth_token');
    setUser(null);
    setIsNewUser(false);
  };

  const markOnboardingComplete = () => {
    setIsNewUser(false);
    if (user?.email) {
      safeLocalStorage.setItem(`voxguard_onboarded_${user.email}`, 'true');
    }
  };

  const hasSeenOnboarding = () => {
    if (!user?.email) return false;
    return safeLocalStorage.getItem(`voxguard_onboarded_${user.email}`) === 'true';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isNewUser,
        login,
        signup,
        logout,
        resetPassword,
        markOnboardingComplete,
        hasSeenOnboarding,
        demoCredentials: {
          email: DEFAULT_DEMO_EMAIL,
          password: DEFAULT_DEMO_PASS
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
