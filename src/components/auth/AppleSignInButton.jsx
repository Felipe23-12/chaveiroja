import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { markAuthProvider, clearAuthProvider } from '@/lib/authProvider';

export default function AppleSignInButton({ returnTo = '/', rememberMe = true, disabled = false }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    if (loading || disabled) return;
    setError('');
    setLoading(true);
    try {
      markAuthProvider('apple');
      localStorage.setItem('remember_login', String(rememberMe));
      sessionStorage.setItem('active_login_session', 'true');
      await base44.auth.loginWithProvider('apple', `/login?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (err) {
      clearAuthProvider();
      setError(err?.message || 'Não foi possível entrar com Apple. Tente novamente.');
      setLoading(false);
    }
  };

  return <>
    <Button type="button" variant="outline" className="w-full h-12 text-sm font-medium mb-3" onClick={signIn} disabled={loading || disabled}>
      {loading ? 'Conectando à Apple...' : 'Continuar com Apple'}
    </Button>
    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
  </>;
}