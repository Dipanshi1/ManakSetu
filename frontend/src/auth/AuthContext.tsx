import { createContext, useContext, useState, type ReactNode } from 'react';

/**
 * Prototype Session Gate
 *
 * NOTE: This is a client-side prototype session gate designed for demonstration
 * and workflow routing only, not production-grade authentication.
 */

export interface SessionUser {
  name: string;
  email: string;
  role: string;
  division?: string;
  initials: string;
}

export const DEFAULT_DEMO_USER: SessionUser = {
  name: 'Priya Nair',
  email: 'priya.nair@standiq.gov.in',
  role: 'Lead Procurement Officer',
  division: 'Urban Infrastructure Division',
  initials: 'PN',
};

interface AuthContextValue {
  isAuthenticated: boolean;
  user: SessionUser | null;
  login: (email?: string, name?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'standiq_demo_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback if sessionStorage access fails
    }
    return null;
  });

  const isAuthenticated = user !== null;

  const login = (email?: string, name?: string) => {
    const cleanEmail = email?.trim() || DEFAULT_DEMO_USER.email;
    const cleanName = name?.trim() || (cleanEmail && cleanEmail !== DEFAULT_DEMO_USER.email
      ? cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : DEFAULT_DEMO_USER.name);

    const nameParts = cleanName.split(' ').filter(Boolean);
    const initials = nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : (nameParts[0]?.[0] || 'U').toUpperCase();

    const newUser: SessionUser = {
      ...DEFAULT_DEMO_USER,
      email: cleanEmail,
      name: cleanName,
      initials,
    };

    setUser(newUser);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch {}
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}

    try {
      localStorage.removeItem('standiq-analysis-store');
      localStorage.removeItem('standiq-hidden-demos');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('decisions-')) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
