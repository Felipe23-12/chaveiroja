import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AccountBasicsForm from '@/components/profile/AccountBasicsForm';
import AccountCpfForm from '@/components/profile/AccountCpfForm';
import AccountPasswordForm from '@/components/profile/AccountPasswordForm';

export default function MeusDados() {
  const { user: current, checkUserAuth } = useAuth();
  const [user, setUser] = useState(current);
  const [error, setError] = useState('');
  useEffect(() => { base44.auth.me().then(setUser).catch(e => setError(e.message || 'Não foi possível carregar os dados.')); }, []);
  const saved = (fresh) => { setUser(fresh); checkUserAuth(); };
  return <main className="min-h-[100dvh] bg-background px-4 pb-8 pt-[calc(1.5rem+env(safe-area-inset-top))]">
    <div className="mx-auto max-w-xl space-y-5">
      <Link to={user?.account_type === 'chaveiro' ? '/painel-chaveiro' : '/'} className="text-sm font-medium underline">Voltar ao painel</Link>
      <h1 className="font-heading text-2xl font-bold">Meus dados</h1>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!user ? <p>Carregando dados...</p> : <>
        <AccountCpfForm user={user} onSaved={saved} />
        <AccountBasicsForm user={user} onSaved={saved} />
        <section className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h2 className="font-heading font-semibold">Email da conta</h2>
          <p className="text-sm break-all">{user.email}</p>
          <p className="text-sm text-muted-foreground">A troca de email não está disponível neste app: a autenticação atual não documenta confirmação do novo endereço para contas existentes. O email atual permanece inalterado.</p>
        </section>
        <AccountPasswordForm user={user} />
      </>}
    </div>
  </main>;
}