import React, { useState } from 'react';
import useAppleReviewSession from '@/hooks/useAppleReviewSession';
import { Button } from '@/components/ui/button';
import LoadingCard from '@/components/ui/LoadingCard';
import ErrorBanner from '@/components/ui/ErrorBanner';
import ReviewRequestForm from '@/components/review/ReviewRequestForm';
import ReviewClientProgress from '@/components/review/ReviewClientProgress';
import ReviewChat from '@/components/review/ReviewChat';
export default function AppleReviewClient() {
  const session = useAppleReviewSession();
  const [newRequest, setNewRequest] = useState(false);
  const request = session.request;
  if (session.loading && !session.error) return <LoadingCard label="Carregando revisão..." />;
  const create = async data => { const result = await session.act('create_request', { data, request_id: undefined }); if (result?.request) setNewRequest(false); };
  return <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
    <h1 className="text-2xl font-bold">Modo de revisão da Apple</h1>
    <p className="rounded-xl bg-primary/10 p-4 text-sm">Atendimento exclusivo entre as duas contas de revisão. Localização livre e pagamento simulado, sem cobrança ou repasse real.</p>
    <ErrorBanner message={session.error} />
    {!request || newRequest ? <ReviewRequestForm busy={session.busy} onSubmit={create} /> : <>
      <ReviewClientProgress request={request} busy={session.busy} act={session.act} />
      {!['ringing', 'cancelled'].includes(request.status) && <ReviewChat request={request} />}
      {['completed', 'cancelled'].includes(request.status) ? <Button className="w-full" onClick={() => setNewRequest(true)}>Novo pedido</Button> : <Button variant="outline" className="w-full text-destructive" disabled={session.busy} onClick={() => session.act('cancel_request')}>Cancelar chamado</Button>}
    </>}
  </div>;
}