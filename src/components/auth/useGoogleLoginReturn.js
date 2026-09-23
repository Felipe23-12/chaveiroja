import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { isGoogleAuthSession } from '@/lib/authProvider';
import restoreGoogleSession from '@/lib/restoreGoogleSession';

export default function useGoogleLoginReturn(returnTo, enabled = true) {
  const { user, isAuthenticated, checkUserAuth } = useAuth();
  const checkAuthRef = useRef(checkUserAuth);
  checkAuthRef.current = checkUserAuth;
  useEffect(() => {
    if (!enabled || !isAuthenticated || !user) return;
    const loginPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
    const requestedPath = returnTo.split('?')[0];
    const fallback = user.role === 'admin' ? '/painel-admin' : user.account_type === 'chaveiro' ? '/painel-chaveiro' : '/';
    const destination = returnTo !== '/' && !loginPaths.includes(requestedPath) ? returnTo : fallback;
    sessionStorage.setItem('active_login_session', 'true');
    window.location.replace(destination);
  }, [user, isAuthenticated, returnTo, enabled]);

  useEffect(() => {
    if (!enabled || isAuthenticated) return;
    let disposed = false, checking = false, timer;
    const resume = async (attempt = 0) => {
      if (disposed || document.hidden || checking) return;
      clearTimeout(timer);
      checking = true;
      try {
        const authenticated = await restoreGoogleSession();
        if (disposed) return;
        if (authenticated) await checkAuthRef.current();
        else if (isGoogleAuthSession() && attempt < 4) timer = setTimeout(() => resume(attempt + 1), 1000);
      } finally { checking = false; }
    };
    const onResume = () => resume();
    const onStorage = (event) => { if (['base44_access_token', 'token'].includes(event.key) && event.newValue) onResume(); };
    window.addEventListener('focus', onResume);
    window.addEventListener('pageshow', onResume);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onResume);
    onResume();
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener('focus', onResume);
      window.removeEventListener('pageshow', onResume);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onResume);
    };
  }, [enabled, isAuthenticated]);
}