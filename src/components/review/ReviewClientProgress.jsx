import React from 'react';
import { Button } from '@/components/ui/button';
import ReviewServicePhotos from '@/components/review/ReviewServicePhotos';
export default function ReviewClientProgress({ request, busy, act }) {
  const r = request;
  const labels = { ringing: 'Aguardando o chaveiro de revisão aceitar', accepted: 'Pedido aceito', on_the_way: 'Chaveiro a caminho', completed: 'Serviço concluído com sucesso!', cancelled: 'Chamado cancelado' };
  return <section className="rounded-xl border border-border bg-card p-4 space-y-3">
    <h2 className="font-semibold">{r.service_type}</h2><p className="text-sm">{r.address}</p>
    <p role="status" className="font-medium">{labels[r.status] || r.status}</p>
    <p className="text-sm text-muted-foreground">Pagamento em dinheiro simulado: R$ 0,00. Não entregue dinheiro.</p>
    <ReviewServicePhotos request={r} />
    {r.locksmith_arrived && !r.client_arrived_confirmed && !['cancelled', 'completed'].includes(r.status) && <Button className="w-full" disabled={busy} onClick={() => act('client_arrival_response', { confirmed: true })}>Sim, o chaveiro chegou</Button>}
    {r.client_arrived_confirmed && !r.end_photos?.length && !['cancelled', 'completed'].includes(r.status) && <p className="text-sm">Aguardando o chaveiro registrar as fotos do atendimento.</p>}
    {!!r.end_photos?.length && !r.client_confirmed && r.status !== 'cancelled' && <Button className="w-full" disabled={busy} onClick={() => act('client_confirm_service')}>Confirmar serviço e pagar</Button>}
    {r.client_confirmed && !r.cash_received && r.status !== 'cancelled' && <><Button className="w-full" disabled={busy} onClick={() => act('select_cash_payment')}>Pagamento em dinheiro simulado</Button><p className="text-sm">O chaveiro confirma o recebimento simulado no painel, sem cobrança.</p></>}
    {r.cash_received && r.status !== 'completed' && <p className="text-sm">Pagamento simulado confirmado. Aguardando o chaveiro finalizar.</p>}
  </section>;
}