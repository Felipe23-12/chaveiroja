import React from 'react';

export default function ClientRequestPrice({ request }) {
  const paid = ['paid', 'captured'].includes(request?.payment_status);
  const amount = Number(request?.price || 0);
  return <div className="rounded-2xl bg-muted p-4 space-y-2">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{paid ? 'Total pago' : 'Valor do serviço'}</span>
      <span className="font-heading text-lg font-bold text-foreground">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
    {!paid && Number(request?.locomotion_cost) > 0 && <p className="text-xs text-muted-foreground">O valor inclui deslocamento acima de {request.pricing_calculation?.distance_pricing?.threshold_km ?? 20} km, calculado pelo chaveiro que aceitou.</p>}
  </div>;
}