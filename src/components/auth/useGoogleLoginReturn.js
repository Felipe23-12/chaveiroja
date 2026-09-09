import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export default function useGoogleLoginReturn(returnTo) {
  const { user, isAuthenticated, checkUserAuth } = useAuth();
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const loginPaths = ['/login', '/register', '/forgot-password', '/reset-password'];
    const requestedPath = returnTo.split('?')[0];
    const fallback = user.role === 'admin' ? '/painel-admin' : user.account_type === 'chaveiro' ? '/painel-chaveiro' : '/';
    const destination = returnTo !== '/' && !loginPaths.includes(requestedPath) ? returnTo : fallback;
    sessionStorage.setItem('active_login_session', 'true');
    window.location.replace(destination);
  }, [user, isAuthenticated, returnTo]);

  useEffect(() => {
    let disposed = false;
    let checking = false;
    const resume = async () => {
      if (document.hidden || checking) return;
      checking = true;
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (authenticated && !disposed) await checkUserAuth();
      } finally {
        checking = false;
      }
    };
    window.addEventListener('focus', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    return () => {
      disposed = true;
      window.removeEventListener('focus', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', resume);
    };
  }, [checkUserAuth]);
}