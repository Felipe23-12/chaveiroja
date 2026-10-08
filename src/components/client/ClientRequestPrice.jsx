import React from 'react';

const isOpeningRequest = (request) => String(request?.service_type || '').trim().toLowerCase().startsWith('abertura');

export default function ClientRequestPrice({ request }) {
  const paid = ['paid', 'captured'].includes(request?.payment_status);
  const opening = isOpeningRequest(request);
  const amount = Number(request?.price || 0) * (paid || !opening ? 1 : 0.67);
  return <div className="rounded-2xl bg-muted p-4 space-y-2">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{paid ? 'Total pago' : opening ? 'Prévia' : 'Valor do serviço'}</span>
      <span className="font-heading text-lg font-bold text-foreground">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
    {!paid && opening && <p className="text-xs text-muted-foreground">Esta é uma prévia e não representa necessariamente o valor final. O total integral será exibido na tela de pagamento antes de pagar.</p>}
  </div>;
}