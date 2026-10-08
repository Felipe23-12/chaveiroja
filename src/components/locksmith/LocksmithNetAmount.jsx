import React from 'react';
import { getServiceDeductions } from '@/lib/paymentDeductions';

export default function LocksmithNetAmount({ request, className = '' }) {
  const { netAmount } = getServiceDeductions(request, null, true);
  const travel = request?.pricing_calculation?.distance_pricing;
  const travelFee = Number(travel?.fee ?? request?.locomotion_cost) || 0;
  const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return <div className={className}>
    <p className="text-xs text-muted-foreground">Seu valor após a taxa de 15%</p>
    <p className="font-heading text-xl font-bold text-foreground">{netAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
    <p className="text-xs text-muted-foreground">Comissão do aplicativo já descontada.</p>
    {request?.service_type === 'Abertura Automotiva' && travelFee > 0 && <div className="mt-2 rounded-lg border border-border p-2 text-xs space-y-1">
      <p className="font-semibold">Adicional de deslocamento incluído no chamado</p>
      {travel ? <p>{Number(travel.excess_km).toLocaleString('pt-BR')} km excedentes ao limite de {Number(travel.threshold_km).toLocaleString('pt-BR')} km · cobrança de {money(travel.rate_per_km)} por km excedente.</p> : <p>Consulte a distância e a tarifa na tabela vigente; este chamado foi criado antes do detalhamento por km.</p>}
      <p>Adicional calculado: {money(travelFee)}. Já integra o serviço; não somar novamente. A comissão e os descontos do chamado também se aplicam a esse valor.</p>
    </div>
  </div>;
}