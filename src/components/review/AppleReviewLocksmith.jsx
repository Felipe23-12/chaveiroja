import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import useAppleReviewSession from '@/hooks/useAppleReviewSession';
import { Button } from '@/components/ui/button';
import LoadingCard from '@/components/ui/LoadingCard';
import ErrorBanner from '@/components/ui/ErrorBanner';
import ReviewLocksmithProgress from '@/components/review/ReviewLocksmithProgress';
import ReviewChat from '@/components/review/ReviewChat';
import { playNotificationSound } from '@/lib/notificationSound';
export default function AppleReviewLocksmith() {
  const session = useAppleReviewSession();
  const [hidden, setHidden] = useState(null), [cashError, setCashError] = useState(''), [cashBusy, setCashBusy] = useState(false);
  const r = session.request, l = session.locksmith;
  useEffect(() => { if (r?.status === 'ringing' && l?.online) playNotificationSound(); }, [r?.id, r?.status, l?.online]);
  if (session.loading && !session.error) return <LoadingCard label="Carregando revisão..." />;
  const confirmCash = async () => {
    setCashBusy(true); setCashError('');
    try { await base44.functions.invoke('walletOperations', { action: 'confirm_cash', service_request_id: r.id, locksmith_id: l.id }); await session.refresh(); }
    catch (error) { setCashError(error?.response?.data?.error || error.message); }
    finally { setCashBusy(false); }
  };
  return <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <h1 className="text-2xl font-bold">Painel do Chaveiro</h1>
    <p className="rounded-xl bg-primary/10 p-4 text-sm">Modo de revisão da Apple: CPF aprovado, Mercado Pago e GPS não são exigidos. Apenas pedidos do cliente de revisão, sem movimentação financeira real.</p>
    <ErrorBanner message={session.error || cashError} />
    {l ? <div className="flex justify-between items-center rounded-xl border border-border p-4"><p>Modo Aplicativo · {l.online ? 'Online' : 'Offline'}</p><Button disabled={session.busy} onClick={() => session.act('locksmith_location', { request_id: undefined, locksmith_id: l.id, go_online: !l.online })}>{l.online ? 'Sair' : 'Entrar'}</Button></div> : <p>Perfil de chaveiro de revisão não encontrado.</p>}
    {r && hidden !== r.id ? <>
      <ReviewLocksmithProgress request={r} busy={session.busy || cashBusy} online={l?.online} act={session.act} confirmCash={confirmCash} />
      {!['ringing', 'cancelled'].includes(r.status) && <ReviewChat request={r} />}
      {['completed', 'cancelled'].includes(r.status) ? <Button variant="outline" className="w-full" onClick={() => setHidden(r.id)}>Voltar ao painel</Button> : <Button variant="outline" className="w-full text-destructive" disabled={session.busy} onClick={() => session.act('cancel_request')}>Cancelar chamado</Button>}
    </> : <p className="text-center text-muted-foreground py-8">{l?.online ? 'Aguardando solicitações...' : 'Fique online para receber solicitações.'}</p>}
  </div>;
}