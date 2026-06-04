// ─── API Configuration ──────────────────────────────────────────────────────────
const API_BASE = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://drasif-app-server-production-e198.up.railway.app";

// ─── Session Storage ───────────────────────────────────────────────────────────

const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";
const USER_ID_KEY = "auth_user_id";

function getSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const userIdRaw = localStorage.getItem(USER_ID_KEY);
  if (!token) return null;
  return {
    token,
    refreshToken: refreshToken || null,
    userId: userIdRaw != null ? Number(userIdRaw) : null,
  };
}

function setSession({ token, refreshToken, userId }) {
  if (token != null) localStorage.setItem(TOKEN_KEY, token);
  if (refreshToken != null) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  else localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (userId != null) localStorage.setItem(USER_ID_KEY, String(userId));
  else localStorage.removeItem(USER_ID_KEY);
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
}

// ─── Auth Token ────────────────────────────────────────────────────────────────

// Back-compat shim: callers that only care about the access token.
function setToken(token) {
  setSession({ token });
}
function clearToken() {
  clearSession();
}

// VITE_API_TOKEN is a long-lived dev fallback. NEVER readable in production.
// Session (if any) always wins over the dev token.
function devToken() {
  if (!import.meta.env.DEV) return null;
  return import.meta.env.VITE_API_TOKEN || null;
}

function getToken() {
  return getSession()?.token || devToken();
}

// ─── Error Type ────────────────────────────────────────────────────────────────

class AuthError extends Error {
  constructor(message = "auth_required") {
    super(message);
    this.name = "AuthError";
    this.code = "auth_required";
  }
}

// ─── 401-aware fetch with single-flight refresh ────────────────────────────────

let refreshInFlight = null;

function refreshSession() {
  if (refreshInFlight) return refreshInFlight;

  const session = getSession();
  if (!session?.refreshToken) {
    return Promise.reject(new AuthError("no_refresh_token"));
  }

  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: session.refreshToken }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.token && data.refresh_token) {
          setSession({
            token: data.token,
            refreshToken: data.refresh_token,
            userId: data.user_id ?? session.userId,
          });
          return data;
        }
      }
      // Any 401 from /api/refresh means the refresh token is dead.
      // The server returns one of: token_reuse_detected | token_expired | invalid_token.
      // We treat them all the same: clear and surface AuthError.
      clearSession();
      throw new AuthError("refresh_failed");
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function apiFetch(method, path, body, { auth = true, _isRetry = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const init = { method, headers };
  if (body !== undefined && body !== null) init.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, init);
  } catch (e) {
    throw e;
  }

  if (res.status === 401 && auth && !_isRetry) {
    // Try to refresh and retry the original request once.
    try {
      await refreshSession();
    } catch {
      throw new AuthError();
    }
    return apiFetch(method, path, body, { auth, _isRetry: true });
  }

  if (!res.ok) {
    let message = `Server error: ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

async function apiGet(endpoint, opts) {
  return apiFetch("GET", endpoint, undefined, opts);
}

async function apiPost(endpoint, body, opts) {
  return apiFetch("POST", endpoint, body, opts);
}

async function apiDelete(endpoint, body, opts) {
  return apiFetch("DELETE", endpoint, body, opts);
}

// ─── Logout ────────────────────────────────────────────────────────────────────

async function logout({ all = false } = {}) {
  const session = getSession();
  let result = { success: true, revoked: 0 };
  if (session?.refreshToken) {
    try {
      const body = all ? { all: true } : { refresh_token: session.refreshToken };
      result = await apiPost("/api/logout", body);
    } catch {
      // best-effort; still clear locally
    }
  }
  clearSession();
  return result;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export {
  API_BASE,
  AuthError,
  getSession,
  setSession,
  clearSession,
  getToken,
  setToken,
  clearToken,
  apiGet,
  apiPost,
  apiDelete,
  logout,
};
