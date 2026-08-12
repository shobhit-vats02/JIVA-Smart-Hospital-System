import type { ApiEnvelope } from '@/types';

/**
 * Access/refresh token storage keys in localStorage.
 * Kept separate from the theme key.
 */
const ACCESS_KEY = 'jiva_access';
const REFRESH_KEY = 'jiva_refresh';
const SESSION_KEY = 'jiva_session';

export const tokenStore = {
  getAccess: () => (typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY)),
  setAccess: (t: string | null) => {
    if (typeof window === 'undefined') return;
    if (t) localStorage.setItem(ACCESS_KEY, t);
    else localStorage.removeItem(ACCESS_KEY);
  },
  getRefresh: () => (typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY)),
  setRefresh: (t: string | null) => {
    if (typeof window === 'undefined') return;
    if (t) localStorage.setItem(REFRESH_KEY, t);
    else localStorage.removeItem(REFRESH_KEY);
  },
  getSession: () => {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setSession: (s: unknown) => {
    if (typeof window === 'undefined') return;
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  },
  clear: () => {
    tokenStore.setAccess(null);
    tokenStore.setRefresh(null);
    tokenStore.setSession(null);
  },
};

/** Resolve the base API URL (server-side proxy via /api rewrite). */
function baseURL() {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  }
  // In the browser, call through Next's /api proxy to the backend.
  return '/api';
}

async function refreshAccess(role: string, id: string) {
  // The refresh token lives in an HttpOnly cookie set by the server and is sent
  // automatically on this same-origin request (through the Next /api proxy).
  // We only send role + id; we never store the refresh token in localStorage.
  const res = await fetch(`${baseURL()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, id }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as ApiEnvelope<{ user: unknown; accessToken: string }>;
  if (!json.success || !json.data) return null;
  tokenStore.setAccess(json.data.accessToken);
  return json.data;
}

/**
 * Core request helper. Attaches the bearer token, and transparently retries
 * once after a 401 by refreshing the access token.
 */
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
  _retried = false
): Promise<ApiEnvelope<T>> {
  const access = tokenStore.getAccess();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (access) headers.Authorization = `Bearer ${access}`;

  const res = await fetch(`${baseURL()}${path}`, { ...options, headers });

  // Attempt token refresh on 401 for authenticated requests.
  if (res.status === 401 && !_retried) {
    const session = tokenStore.getSession() as { user?: { id: string; role: string } } | null;
    if (session?.user?.id) {
      const refreshed = await refreshAccess(session.user.role, session.user.id);
      if (refreshed) {
        return api<T>(path, options, true);
      }
    }
    tokenStore.clear();
  }

  const json = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!res.ok) {
    const error: ApiEnvelope<T> =
      json ??
      ({
        success: false,
        data: null as unknown as T,
        message: `Request failed (${res.status})`,
      } as ApiEnvelope<T>);
    throw new Error(error.message || 'Request failed');
  }
  return json ?? { success: true, data: null as unknown as T, message: '' };
}

export const apiHelpers = { login: (p: unknown) => api('/auth/login', { method: 'POST', body: JSON.stringify(p) }) };
