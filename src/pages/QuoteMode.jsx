import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { QUOTE_MODE_ENABLED } from '@/lib/quoteMode';
import { claimCpf } from '@/lib/cpfRegistration';
import { clientRegistrationComplete } from '@/lib/clientRegistration';
import IncompleteClientNotice from '@/components/client/IncompleteClientNotice';
import useQuoteRequests from '@/hooks/useQuoteRequests';
import QuoteRequestForm from '@/components/quote/QuoteRequestForm';
import QuoteCard from '@/components/quote/QuoteCard';

export default function QuoteMode() {
  const { user } = useAuth();
  const locksmith = user?.account_type === 'chaveiro';
  const enabled = QUOTE_MODE_ENABLED && (locksmith || user?.account_type === 'cliente');
  const { items, remaining, loading, busy, error, refresh, run } = useQuoteRequests(enabled);
  if (!enabled) return <Navigate to={locksmith ? '/painel-chaveiro' : '/'} replace />;
  if (!locksmith && !clientRegistrationComplete(user)) return <main className="mx-auto max-w-2xl px-4 py-6"><IncompleteClientNotice /></main>;
  return <main className="mx-auto max-w-2xl space-y-5 px-4 py-6">
    <div><h1 className="font-heading text-2xl font-bold">Modo orçamento</h1><p className="text-sm text-muted-foreground">Confecção de chaves de carro e reparos automotivos. O atendimento começa somente após a aprovação do valor.</p></div>
    {!locksmith && <QuoteRequestForm remaining={remaining} busy={busy} onSubmit={async data => { await claimCpf(user.cpf); return run('create', { data }); }} />}
    {error && <p role="alert" className="text-sm text-destructive">{error} <button className="underline" onClick={() => refresh()}>Tentar novamente</button></p>}
    <section className="space-y-3"><h2 className="font-heading font-semibold">{locksmith ? 'Orçamentos recebidos' : 'Meus orçamentos'}</h2>
      {loading ? <p className="text-muted-foreground">Carregando orçamentos…</p> : items.length ? items.map(quote => <QuoteCard key={quote.id} quote={quote} locksmith={locksmith} busy={busy} onAction={run} />) : <p className="text-sm text-muted-foreground">Nenhum orçamento ainda.</p>}
    </section>
  </main>;
}