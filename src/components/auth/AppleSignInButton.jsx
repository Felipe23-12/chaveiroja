import React, { useRef, useState } from 'react';
import { appParams } from '@/lib/app-params';
import { markAuthProvider, clearAuthProvider } from '@/lib/authProvider';

export default function AppleSignInButton({ returnTo = '/', rememberMe = true, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const redirectTimer = useRef(null);

  const signIn = () => {
    if (loading || disabled) return;
    setError('');
    setLoading(true);
    try {
      markAuthProvider('apple');
      localStorage.setItem('remember_login', String(rememberMe));
      sessionStorage.setItem('active_login_session', 'true');

      // Navegação direta é mais previsível em WKWebView/iPad que aguardar uma
      // Promise do SDK: loginWithProvider faz redirect e não retorna um resultado.
      const callback = new URL('/login', window.location.origin);
      callback.searchParams.set('returnTo', returnTo);
      callback.searchParams.set('provider', 'apple');
      const base = appParams.appBaseUrl || window.location.origin;
      const loginUrl = new URL('/api/apps/auth/apple/login', base);
      loginUrl.searchParams.set('app_id', appParams.appId);
      loginUrl.searchParams.set('from_url', callback.toString());

      redirectTimer.current = window.setTimeout(() => {
        // Se o wrapper bloquear a navegação, não deixe o botão girando para sempre.
        clearAuthProvider();
        setLoading(false);
        setError('Não foi possível abrir a autenticação da Apple. Tente novamente.');
      }, 10000);
      window.location.assign(loginUrl.toString());
    } catch (err) {
      if (redirectTimer.current) window.clearTimeout(redirectTimer.current);
      clearAuthProvider();
      setError(err?.message || 'Não foi possível entrar com Apple. Tente novamente.');
      setLoading(false);
    }
  };

  const appleButtonUrl = 'https://appleid.cdn-apple.com/appleid/button?height=48&width=375&color=black&border=false&type=continue&border_radius=8&scale=2&locale=pt_BR';

  return <>
    <button
      type="button"
      className="mb-3 block h-12 w-full overflow-hidden rounded-lg bg-black disabled:cursor-not-allowed disabled:opacity-60"
      onClick={signIn}
      disabled={loading || disabled}
      aria-label={loading ? 'Abrindo autenticação da Apple' : 'Continuar com Apple'}
    >
      {loading
        ? <span className="flex h-full items-center justify-center text-sm font-medium text-white">Abrindo Apple...</span>
        : <img src={appleButtonUrl} alt="Continuar com Apple" className="h-12 w-full object-fill" />}
    </button>
    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
  </>;
}