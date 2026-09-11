import React, { createContext, useContext, useState, useEffect } from 'react';

// Create Authentication Context
const AuthContext = createContext(null);

// SHA-256 helper using standard Web Crypto API (supported across all modern mobile & desktop browsers)
async function hashPassword(password) {
  const msgUint8 = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
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
        const usersDbStr = localStorage.getItem('voxguard_users_db');
        let usersDb = usersDbStr ? JSON.parse(usersDbStr) : {};

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
          localStorage.setItem('voxguard_users_db', JSON.stringify(usersDb));
        }

        // Check for active session in localStorage (remember me) or sessionStorage
        const savedUserStr = localStorage.getItem('voxguard_auth_user') || sessionStorage.getItem('voxguard_auth_user');
        const token = localStorage.getItem('voxguard_auth_token') || sessionStorage.getItem('voxguard_auth_token');

        if (savedUserStr && token) {
          const parsedUser = JSON.parse(savedUserStr);
          setUser(parsedUser);
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

      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('voxguard_auth_user', JSON.stringify(sessionUser));
      storage.setItem('voxguard_auth_token', dummyToken);

      // Clear the other storage just in case
      if (rememberMe) {
        sessionStorage.removeItem('voxguard_auth_user');
        sessionStorage.removeItem('voxguard_auth_token');
      } else {
        localStorage.removeItem('voxguard_auth_user');
        localStorage.removeItem('voxguard_auth_token');
      }

      setUser(sessionUser);
      return sessionUser;
    }

    // Existing normal login logic
    const usersDb = JSON.parse(localStorage.getItem('voxguard_users_db') || '{}');
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

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('voxguard_auth_user', JSON.stringify(sessionUser));
    storage.setItem('voxguard_auth_token', dummyToken);

    // Clear the other storage just in case
    if (rememberMe) {
      sessionStorage.removeItem('voxguard_auth_user');
      sessionStorage.removeItem('voxguard_auth_token');
    } else {
      localStorage.removeItem('voxguard_auth_user');
      localStorage.removeItem('voxguard_auth_token');
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

    const usersDb = JSON.parse(localStorage.getItem('voxguard_users_db') || '{}');
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
    localStorage.setItem('voxguard_users_db', JSON.stringify(usersDb));

    // Auto-login new user
    const dummyToken = `vg_token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem('voxguard_auth_user', JSON.stringify(newUser));
    localStorage.setItem('voxguard_auth_token', dummyToken);

    setUser(newUser);
    setIsNewUser(true);
    return newUser;
  };

  // Reset Password (simulated recovery)
  const resetPassword = async (email) => {
    const cleanEmail = email.trim().toLowerCase();
    const usersDb = JSON.parse(localStorage.getItem('voxguard_users_db') || '{}');
    if (!usersDb[cleanEmail]) {
      throw new Error('No registered account found with that email address.');
    }
    // Set a temporary password reset flag
    return { success: true, message: `A password reset link has been dispatched to ${cleanEmail}.` };
  };

  // Logout method
  const logout = () => {
    localStorage.removeItem('voxguard_auth_user');
    localStorage.removeItem('voxguard_auth_token');
    sessionStorage.removeItem('voxguard_auth_user');
    sessionStorage.removeItem('voxguard_auth_token');
    setUser(null);
    setIsNewUser(false);
  };

  const markOnboardingComplete = () => {
    setIsNewUser(false);
    if (user?.email) {
      localStorage.setItem(`voxguard_onboarded_${user.email}`, 'true');
    }
  };

  const hasSeenOnboarding = () => {
    if (!user?.email) return false;
    return localStorage.getItem(`voxguard_onboarded_${user.email}`) === 'true';
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
