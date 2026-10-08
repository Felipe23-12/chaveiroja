import React from 'react';
import { getServiceDeductions } from '@/lib/paymentDeductions';

export default function LocksmithNetAmount({ request, className = '' }) {
  const { netAmount } = getServiceDeductions(request, null, true);
  return <div className={className}>
    <p className="text-xs text-muted-foreground">Seu valor após a taxa de 15%</p>
    <p className="font-heading text-xl font-bold text-foreground">{netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
    <p className="text-xs text-muted-foreground">Comissão do aplicativo já descontada.</p>
  </div>;
}