import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import GoogleIcon from '@/components/GoogleIcon';
import { markAuthProvider, clearAuthProvider } from '@/lib/authProvider';

export default function GoogleSignInButton({ returnTo = '/' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      markAuthProvider('google');
      localStorage.setItem('remember_login', 'true');
      sessionStorage.setItem('active_login_session', 'true');
      await base44.auth.loginWithProvider('google', `/login?returnTo=${encodeURIComponent(returnTo)}`);
    } catch (err) {
      clearAuthProvider();
      setError(err?.message || 'Não foi possível entrar com Google. Tente novamente.');
      setLoading(false);
    }
  };

  return <>
    <Button type="button" variant="outline" className="w-full h-12 text-sm font-medium" onClick={signIn} disabled={loading}>
      <GoogleIcon className="w-5 h-5 mr-2" />
      {loading ? 'Conectando ao Google...' : 'Continuar com Google'}
    </Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </>;
}