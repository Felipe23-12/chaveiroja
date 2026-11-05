import React from 'react';
import { Button } from '@/components/ui/button';
import ClientRequestPrice from '@/components/client/ClientRequestPrice';
import GuestRegistrationPrompt from '@/components/guest/GuestRegistrationPrompt';
import GuestServiceMap from '@/components/guest/GuestServiceMap';
import GuestServiceChat from '@/components/guest/GuestServiceChat';
import GuestServiceActions from '@/components/guest/GuestServiceActions';
import GuestCaseNotice from '@/components/guest/GuestCaseNotice';
const labels = { searching: 'Procurando chaveiro', ringing: 'Aguardando aceite de um chaveiro', queued: 'Aguardando o atendimento anterior do chaveiro', accepted: 'Seu chamado foi aceito', on_the_way: 'Atendimento em andamento', completed: 'Atendimento concluído', cancelled: 'Atendimento cancelado' };
export default function GuestServiceTracking({ guest }) {
  const request = guest.snapshot.request;
  const finished = request.status === 'completed' || (request.end_photos || []).length > 0;
  return <div className="mx-auto max-w-2xl space-y-5">
    <header className="space-y-2"><p className="text-sm text-muted-foreground">Chamado #{request.id.slice(-6)}</p><h1 className="font-heading text-2xl font-bold" aria-live="polite">{labels[request.status] || 'Seu atendimento'}</h1><p>{request.service_type}</p><p className="text-sm text-muted-foreground">{request.address}</p>{request.locksmith_name && <p className="font-medium">Chaveiro: {request.locksmith_name}</p>}{request.cancellation_reason && <p className="text-sm">{request.cancellation_reason}</p>}</header>
    <ClientRequestPrice request={request} />
    {request.cancellation_fee > 0 && <p className="text-sm">Taxa de cancelamento pendente: R$ {request.cancellation_fee.toFixed(2)}. Entre para quitar.</p>}
    {finished || request.status === 'cancelled' ? <GuestRegistrationPrompt finished={finished} /> : <GuestServiceMap request={request} />}
    <GuestCaseNotice guest={guest} />
    <GuestServiceActions guest={guest} request={request} />
    <GuestServiceChat guest={guest} request={request} />
    <p className="text-xs text-muted-foreground">Atualizações a cada 20 segundos enquanto esta página estiver aberta. Não limpe os dados do navegador antes de vincular o chamado.</p>
    <Button variant="outline" onClick={() => guest.refresh().catch(guest.retry)}>Atualizar acompanhamento</Button>
  </div>;
}