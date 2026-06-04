import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { apiPost, setSession, getSession } from "./api";
import { readAllUserData } from "./userDataApi";
import { StorageService } from "./storage";

// ─── Apple Sign In ─────────────────────────────────────────────────────────────

const APPLE_CLIENT_ID = "com.drasif.diet";

/**
 * Trigger native Apple Sign In and forward credentials to the server.
 * On success: saves the full session (access + refresh + user_id), restores
 * user data from server to localStorage.
 * @param {object} opts
 * @param {(data: object) => void} opts.onSuccess - called with user data on success
 * @param {(err: Error) => void} opts.onError - called on error
 * @returns {Promise<void>}
 */
export async function signInWithApple({ onSuccess, onError }) {
  let result;
  try {
    result = await SignInWithApple.authorize({
      clientId: APPLE_CLIENT_ID,
      scopes: "email name",
    });
  } catch (err) {
    onError?.(err);
    return;
  }

  const { response } = result;

  let authResponse;
  try {
    authResponse = await apiPost("/auth/apple", {
      identityToken: response.identityToken,
      authorizationCode: response.authorizationCode,
      user: response.user,
      fullName: { givenName: response.givenName, familyName: response.familyName },
      email: response.email,
    });
  } catch (err) {
    onError?.(err);
    return;
  }

  if (!authResponse.token) {
    onError?.(new Error(authResponse.error || "authentication failed"));
    return;
  }
  if (!authResponse.refresh_token || authResponse.user_id == null) {
    onError?.(new Error("auth response missing refresh_token or user_id"));
    return;
  }

  // Save the full session — access token, refresh token, user_id.
  // All three are required to support token refresh and user-scoped data routes.
  setSession({
    token: authResponse.token,
    refreshToken: authResponse.refresh_token,
    userId: authResponse.user_id,
  });

  // Restore user data from server to localStorage
  try {
    const { data } = await readAllUserData(getSession().userId);
    if (data && typeof data === "object") {
      StorageService.importAll(data);
    }
  } catch (err) {
    // Non-fatal: user may have no server data yet
    console.warn("Failed to restore user data from server:", err);
  }

  // Server restore complete — localStorage now holds the server's truth,
  // so it's safe to start mirroring local changes back to the server.
  StorageService.markInitialized();

  onSuccess?.({ gender: response.gender });
}
