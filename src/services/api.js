// ─── API Configuration ──────────────────────────────────────────────────────────

// Dev: use localhost server; Prod: use Railway prod server
const API_BASE = "http://localhost:8080";

// ─── API Client ─────────────────────────────────────────────────────────────────

async function apiPost(endpoint, body) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Server error: ${res.status}`);
  }
  return res;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { API_BASE, apiPost };