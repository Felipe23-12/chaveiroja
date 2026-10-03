const KEY = "chaveiroja_auth_provider";

export function markAuthProvider(provider) {
  localStorage.setItem(KEY, provider);
}

export function getAuthProvider() {
  return localStorage.getItem(KEY);
}

export function isGoogleAuthSession() {
  return getAuthProvider() === "google";
}

export function clearAuthProvider() {
  localStorage.removeItem(KEY);
}