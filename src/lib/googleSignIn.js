import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

export function loginWithGoogle(returnTo = '/') {
  // The Base44 SDK opens a popup when the app is embedded in an iframe. Some
  // mobile WebViews block window.open and the SDK then returns without
  // navigating, leaving the sign-in button looking unresponsive. Use a
  // user-initiated top-level navigation in that case instead.
  if (window.self !== window.top) {
    const redirectUrl = new URL(returnTo, window.location.origin).toString();
    const loginUrl = new URL('/api/apps/auth/login', appParams.appBaseUrl || window.location.origin);
    loginUrl.searchParams.set('app_id', appParams.appId);
    loginUrl.searchParams.set('from_url', redirectUrl);

    try {
      window.top.location.assign(loginUrl.toString());
    } catch {
      window.location.assign(loginUrl.toString());
    }
    return;
  }

  return base44.auth.loginWithProvider('google', returnTo);
}
