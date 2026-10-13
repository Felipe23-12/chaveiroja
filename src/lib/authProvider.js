const KEY = "chaveiroja_auth_provider";

export function markAuthProvider(provider) {
  try { localStorage.setItem(KEY, provider); } catch { /* blocked storage */ }
}

export function getAuthProvider() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function isGoogleAuthSession() {
  return getAuthProvider() === "google";
}

export function clearAuthProvider() {
  try { localStorage.removeItem(KEY); } catch { /* blocked storage */ }
}