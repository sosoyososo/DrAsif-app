import { SignInWithApple } from "@capacitor-community/apple-sign-in";
import { apiPost } from "./api";

// ─── Apple Sign In ──────────────────────────────────────────────────────────────

const APPLE_CLIENT_ID = "com.drasif.diet";

/**
 * Trigger native Apple Sign In and forward credentials to the server.
 * @param {object} opts
 * @param {(data: object) => void} opts.onSuccess - called with user data on success
 * @param {(err: Error) => void} opts.onError - called on error
 * @returns {Promise<void>}
 */
export async function signInWithApple({ onSuccess, onError }) {
  const result = await SignInWithApple.authorize({
    clientId: APPLE_CLIENT_ID,
    scopes: "email name",
  });
  const { response } = result;

  await apiPost("/auth/apple", {
    identityToken: response.identityToken,
    authorizationCode: response.authorizationCode,
    user: response.user,
    fullName: { givenName: response.givenName, familyName: response.familyName },
    email: response.email,
  });

  onSuccess({ gender: response.gender });
}