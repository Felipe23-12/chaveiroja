import { isNativeIOS } from './nativeAuthEnvironment';

export function isNativeAppEnvironment() {
  return isNativeIOS() || Boolean(window.Capacitor?.isNativePlatform?.() || window.ReactNativeWebView || window.gonative || window.median) || /; wv\b|gonative|median/i.test(navigator.userAgent);
}

// Keep the campaign's existing URL useful without intercepting explicit sign-in
// or an OAuth/native return that is already in progress.
export function isGuestWebEntry(pathname, search = '') {
  if (['/', '/atendimento-visitante'].includes(pathname)) return true;
  if (pathname !== '/login/cliente') return false;
  const params = new URLSearchParams(search);
  return !['returnTo', 'login', 'provider', 'native_return', 'access_token'].some(key => params.has(key));
}
