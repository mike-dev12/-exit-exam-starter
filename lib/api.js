// Helper for talking to the BioPath Django API.
//
//   import { api } from '../lib/api';
//   const data = await api('/dashboard/');                              // GET
//   await api('/mocks/5/submit/', { method: 'POST', body: { ... } });   // POST (JSON)
//
// - Adds the "Authorization: Bearer ..." header for you.
// - If the access token has expired it refreshes it once and retries.
// - If the session is really over it clears it and sends the user to /login.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';

const KEYS = {
  access: 'biopath_access',
  refresh: 'biopath_refresh',
  user: 'biopath_user',
};

const isBrowser = () => typeof window !== 'undefined';

// ------------------------------------------------------------------ session
export function setSession(data) {
  if (!isBrowser() || !data) return;
  if (data.access) localStorage.setItem(KEYS.access, data.access);
  if (data.refresh) localStorage.setItem(KEYS.refresh, data.refresh);
  if (data.user) localStorage.setItem(KEYS.user, JSON.stringify(data.user));
}

export function clearSession() {
  if (!isBrowser()) return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function getAccessToken() {
  return isBrowser() ? localStorage.getItem(KEYS.access) : null;
}

export function getUser() {
  if (!isBrowser()) return null;
  try {
    return JSON.parse(localStorage.getItem(KEYS.user) || 'null');
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return !!getAccessToken();
}

export function logout() {
  clearSession();
  if (isBrowser()) window.location.assign('/login');
}

// ------------------------------------------------------------------- errors
export class ApiError extends Error {
  constructor(status, data) {
    super(extractMessage(data, status));
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Django REST Framework errors look like {"detail": "..."} or
// {"password": ["too short", "too common"], "email": ["..."]}
function extractMessage(data, status) {
  if (!data) return `Request failed (${status}).`;
  if (typeof data === 'string') return data;
  if (data.detail) return String(data.detail);
  const parts = [];
  for (const value of Object.values(data)) {
    if (Array.isArray(value)) parts.push(...value.map(String));
    else if (typeof value === 'string') parts.push(value);
  }
  return parts.length ? parts.join(' ') : `Request failed (${status}).`;
}

// Turn any error into text that is safe to show to the student.
export function formatError(err) {
  if (err instanceof ApiError) return err.message;
  return 'Cannot reach the server. Please check your connection (and that the backend is running).';
}

// ------------------------------------------------------------------ refresh
let refreshing = null; // so several requests refresh the token only once

async function refreshAccess() {
  if (!refreshing) {
    refreshing = (async () => {
      const refresh = localStorage.getItem(KEYS.refresh);
      if (!refresh) return false;
      try {
        const res = await fetch(`${API_URL}/auth/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });
        if (!res.ok) return false;
        const data = await res.json();
        localStorage.setItem(KEYS.access, data.access);
        if (data.refresh) localStorage.setItem(KEYS.refresh, data.refresh);
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// -------------------------------------------------------------------- fetch
async function request(path, { method, body, auth, signal }) {
  const headers = {};
  const init = { method, headers, signal };

  if (auth) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (body instanceof FormData) {
    init.body = body; // the browser sets the multipart header itself
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  return fetch(`${API_URL}${path}`, init);
}

export async function api(path, { method = 'GET', body, auth = true, signal } = {}) {
  let res = await request(path, { method, body, auth, signal });

  if (res.status === 401 && auth && isBrowser()) {
    if (await refreshAccess()) {
      res = await request(path, { method, body, auth, signal });
    }
    if (res.status === 401) {
      logout();
      throw new ApiError(401, { detail: 'Your session has ended. Please sign in again.' });
    }
  }

  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* empty or non-JSON response */
  }
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}
