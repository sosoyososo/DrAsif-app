// ─── API Configuration ──────────────────────────────────────────────────────────
const API_BASE = import.meta.env.DEV
  ? "http://localhost:8080"
  : "https://drasif-app-server-production-e198.up.railway.app";

// ─── Auth Token ─────────────────────────────────────────────────────────────────

const TOKEN_KEY = "auth_token";

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || import.meta.env.VITE_API_TOKEN || null;
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── API Client ─────────────────────────────────────────────────────────────────

async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json();
}

async function apiGet(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json();
}

async function apiDelete(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
  });
  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }
  return res.json();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { API_BASE, apiPost, apiGet, apiDelete, setToken, getToken, clearToken };
