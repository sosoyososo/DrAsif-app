// ─── User Data API ─────────────────────────────────────────────────────────────
// Base path: /api/data/{user_id}
// All calls require auth token (handled by authMiddleware on server)

import { apiGet, apiPost, apiDelete } from "./api";

export async function writeUserData(key, value) {
  return apiPost("/api/data", { key, value });
}

export async function readAllUserData(userId) {
  return apiGet(`/api/data/${userId}`);
}

export async function readUserDataKey(userId, key) {
  return apiGet(`/api/data/${userId}/${key}`);
}

export async function deleteUserDataKey(userId, key) {
  return apiDelete(`/api/data/${userId}/${key}`);
}

export async function clearAllUserData(userId) {
  return apiDelete(`/api/data/${userId}`);
}
