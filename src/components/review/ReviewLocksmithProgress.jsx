import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import PhotoUploader from '@/components/locksmith/PhotoUploader';
import ReviewServicePhotos from '@/components/review/ReviewServicePhotos';
export default function ReviewLocksmithProgress({ request: r, busy, online, act, confirmCash }) {
  const [start, setStart] = useState([]), [end, setEnd] = useState([]);
  useEffect(() => { setStart(r.start_photos || []); setEnd(r.end_photos || []); }, [r.id]);
  const ongoing = ['accepted', 'on_the_way'].includes(r.status);
  return <section className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h2 className="font-semibold">{r.status === 'ringing' ? 'Nova solicitação para você!' : r.status === 'completed' ? 'Serviço concluído com sucesso!' : r.status === 'cancelled' ? 'Chamado cancelado' : 'Atendimento de revisão'}</h2>
    <p>{r.service_type}</p><p className="text-sm">{r.address}</p><p className="text-sm text-muted-foreground">{r.description}</p>
    <p className="text-sm">R$ 0,00 · Pagamento em dinheiro simulado, sem comissão ou repasse.</p>
    <ReviewServicePhotos request={r} />
    {r.status === 'ringing' && <Button className="w-full" disabled={busy || !online} onClick={() => act('accept_request')}>Aceitar chamado</Button>}
    {ongoing && !r.locksmith_arrived && <Button className="w-full" disabled={busy} onClick={() => act('locksmith_arrived')}>Cheguei no local do cliente</Button>}
    {ongoing && r.locksmith_arrived && !r.client_arrived_confirmed && <p className="text-sm">Aguardando o cliente confirmar sua chegada</p>}
    {ongoing && r.client_arrived_confirmed && !r.start_photos?.length && <><PhotoUploader label="Fotos da chegada no local" photos={start} onChange={setStart} /><Button className="w-full" disabled={busy || !start.length} onClick={() => act('locksmith_progress', { data: { start_photos: start } })}>Confirmar início do atendimento</Button></>}
    {ongoing && !!r.start_photos?.length && !r.end_photos?.length && <><PhotoUploader label="Fotos do serviço finalizado" photos={end} onChange={setEnd} /><Button className="w-full" disabled={busy || !end.length} onClick={() => act('locksmith_progress', { data: { end_photos: end } })}>Registrar finalização do serviço</Button></>}
    {ongoing && !!r.end_photos?.length && !r.client_confirmed && <p className="text-sm">Aguardando o cliente confirmar o serviço</p>}
    {ongoing && r.client_confirmed && !r.cash_received && <Button className="w-full" disabled={busy} onClick={confirmCash}>Confirmar recebimento simulado</Button>}
    {ongoing && r.client_confirmed && r.cash_received && <Button className="w-full" disabled={busy} onClick={() => act('locksmith_progress', { data: { status: 'completed' } })}>Finalizar serviço</Button>}
  </section>;
}