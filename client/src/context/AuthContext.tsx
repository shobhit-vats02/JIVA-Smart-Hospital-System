'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, tokenStore } from '@/lib/api';
import type { ApiEnvelope, User, Role } from '@/types';

interface LoginPayload {
  role: Role;
  identifier: string;
  password: string;
  remember?: boolean;
}

interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  gender: string;
  age?: number;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: { name: string; phone: string; relation: string };
}

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount.
  useEffect(() => {
    const session = tokenStore.getSession();
    const token = tokenStore.getAccess();
    if (session?.user && token) {
      setUser(session.user);
      setAccessToken(token);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const res = (await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })) as ApiEnvelope<{ user: User; accessToken: string }>;

    const { user: u, accessToken: t } = res.data;
    tokenStore.setAccess(t);
    // The refresh token lives in the HttpOnly cookie; we intentionally do NOT
    // store it here. Clearing any stale value keeps refresh consistent.
    tokenStore.setRefresh(null);
    tokenStore.setSession({ user: u, accessToken: t });
    setUser(u);
    setAccessToken(t);
    return u;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = (await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })) as ApiEnvelope<{ user: User; accessToken: string }>;
    const { user: u, accessToken: t } = res.data;
    tokenStore.setAccess(t);
    tokenStore.setSession({ user: u, accessToken: t });
    setUser(u);
    setAccessToken(t);
    return u;
  }, []);

  const logout = useCallback(async () => {
    if (user) {
      try {
        await api('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ role: user.role, id: user.id }),
        });
      } catch {
        // ignore network errors on logout
      }
    }
    tokenStore.clear();
    setUser(null);
    setAccessToken(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, accessToken, loading, isAuthenticated: !!user && !!accessToken, login, register, logout }),
    [user, accessToken, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
