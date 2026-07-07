// Captures and exposes the Google OAuth provider_token returned by Supabase
// after Google sign-in. Supabase does not persist provider_token across page
// reloads, so we mirror it into sessionStorage while it is in memory.

const KEY = "fenixai.google.provider_token.v1";

export function setGoogleToken(token: string | null | undefined) {
  if (typeof window === "undefined") return;
  try {
    if (token) sessionStorage.setItem(KEY, token);
    else sessionStorage.removeItem(KEY);
  } catch {}
}

export function getGoogleToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearGoogleToken() {
  setGoogleToken(null);
}