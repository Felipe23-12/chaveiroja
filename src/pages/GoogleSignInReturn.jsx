import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { safeReturnTo } from '@/lib/authReturnTo';
import restoreGoogleSession from '@/lib/restoreGoogleSession';
import LoadingCard from '@/components/ui/LoadingCard';
import { Button } from '@/components/ui/button';

export default function GoogleSignInReturn() {
  const [error, setError] = useState(false);
  const requested = safeReturnTo();
  const returnTo = ['/login', '/register', '/auth/google-return'].includes(requested.split('?')[0]) ? '/' : requested;
  useEffect(() => {
    let cancelled = false;
    const complete = async () => {
      for (let attempt = 0; attempt < 5 && !cancelled; attempt++) {
        try {
          if (await restoreGoogleSession()) {
            const user = await base44.auth.me();
            if (cancelled) return;
            const fallback = user.role === 'admin' ? '/painel-admin' : user.account_type === 'chaveiro' ? '/painel-chaveiro' : '/';
            window.location.replace(returnTo === '/' ? fallback : returnTo);
            return;
          }
        } catch { /* O retorno da autenticação pode ainda estar em andamento. */ }
        if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 1000));
      }
      if (!cancelled) setError(true);
    };
    complete();
    return () => { cancelled = true; };
  }, [returnTo]);

  if (!error) return <div className="max-w-md mx-auto px-4 pt-safe py-10"><LoadingCard label="Concluindo entrada com Google..." /></div>;
  return <main className="min-h-[100dvh] flex items-center justify-center bg-background px-4 pt-safe">
    <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
      <h1 className="font-heading text-xl font-bold">Não foi possível concluir a entrada</h1>
      <p className="mt-2 mb-5 text-sm text-muted-foreground">O Google não retornou uma sessão válida para este aplicativo. Tente novamente.</p>
      <Button className="w-full" onClick={() => base44.auth.loginWithProvider('google', window.location.pathname + window.location.search)}>Tentar novamente com Google</Button>
      <Link className="mt-4 block text-sm text-primary underline" to="/login">Entrar com email e senha</Link>
    </div>
  </main>;
}