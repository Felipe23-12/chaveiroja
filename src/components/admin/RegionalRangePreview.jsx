import React from 'react';
import { buildRegionalRange } from '@/lib/regionalPricing';
const money = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export default function RegionalRangePreview({ reference }) {
  if (!reference || ![reference.preco_minimo_brl, reference.preco_medio_brl, reference.preco_maximo_brl].every(v => v !== '' && Number.isFinite(Number(v)) && Number(v) > 0) || Number(reference.preco_minimo_brl) > Number(reference.preco_medio_brl) || Number(reference.preco_medio_brl) > Number(reference.preco_maximo_brl)) return null;
  const capital = buildRegionalRange(reference, 0), interior = buildRegionalRange(reference, 200);
  return <div className="rounded-xl border border-border bg-muted p-4 space-y-2 text-sm">
    <h4 className="font-semibold">Faixa base usada nos novos pedidos</h4>
    <div className="flex flex-wrap justify-between gap-2"><span>Capital e entorno (até 20 km)</span><strong>{money(capital.range[0])} a {money(capital.range[1])}</strong></div>
    <div className="flex flex-wrap justify-between gap-2"><span>Interior (200 km ou mais da capital)</span><strong>{money(interior.range[0])} a {money(interior.range[1])}</strong></div>
    <p className="text-xs text-muted-foreground">Entre 20 e 200 km, a faixa varia gradualmente. A referência é a capital mais próxima das coordenadas do atendimento, não uma delimitação de estados.</p>
    <p className="text-xs text-muted-foreground">Mínimo, média e máximo são referências de base, não o preço final: horário, demanda, urgência, chuva, pisos e adicionais continuam sendo aplicados. Nas aberturas residencial e automotiva, a referência mínima é R$ 50,00.</p>
    {reference.ativo === false && <p className="text-warning text-xs">Faixa inativa: os pedidos usam a faixa geral do serviço.</p>}
  </div>;
}