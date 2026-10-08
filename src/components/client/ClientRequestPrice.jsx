import React from 'react';

export default function ClientRequestPrice({ request }) {
  const paid = ['paid', 'captured'].includes(request?.payment_status);
  const amount = Number(request?.price || 0) * (paid ? 1 : 0.67);
  return <div className="rounded-2xl bg-muted p-4 space-y-2">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{paid ? 'Total pago' : 'Prévia parcial (67%)'}</span>
      <span className="font-heading text-lg font-bold text-foreground">{amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
    </div>
    {!paid && <p className="text-xs text-muted-foreground">Esta prévia não é o valor final nem um desconto: os 33% restantes não estão incluídos. O total integral será exibido na tela de pagamento antes de pagar.</p>}
  </div>;
}