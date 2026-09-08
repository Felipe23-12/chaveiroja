const KEY = "chaveiroja_auth_provider";

export function markAuthProvider(provider) {
  localStorage.setItem(KEY, provider);
}

export function isGoogleAuthSession() {
  return localStorage.getItem(KEY) === "google";
}

export function clearAuthProvider() {
  localStorage.removeItem(KEY);
}