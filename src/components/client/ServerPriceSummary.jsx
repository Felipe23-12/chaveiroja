import React from "react";
import { useServiceQuoteScope } from '@/components/location/ServiceQuoteScope';
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ServerPriceSummary({ pricing, showDetails = false }) {
  const { allowed } = useServiceQuoteScope();
  if (!allowed || !pricing) return null;
  return <div className="rounded-2xl bg-muted p-4 space-y-3">
    <div className="flex justify-between items-center gap-3">
      <span className="font-heading font-semibold">Valor do serviço</span>
      <span className="font-heading font-bold text-xl text-primary">{money(pricing.price)}</span>
    </div>
    {showDetails && Number(pricing.fields?.fipe_value) > 0 && <div className="space-y-1"><div className="flex justify-between gap-3 text-sm font-medium text-foreground"><span>Valor de referência FIPE do carro</span><span>{money(pricing.fields.fipe_value)}</span></div><p className="text-xs text-muted-foreground">Consulta automatizada independente (Parallelum){pricing.fields.fipe_reference_month ? ` · ${pricing.fields.fipe_reference_month}` : ""}{pricing.fields.fipe_code ? ` · código FIPE ${pricing.fields.fipe_code}` : ""}{pricing.fields.fipe_model ? ` · ${pricing.fields.fipe_model}` : ""}</p><a href="https://www.fipe.org.br/pt-br/indices/veiculos" target="_blank" rel="noopener noreferrer" className="text-xs underline">Conferir no site oficial da FIPE</a></div>}
    {showDetails && <div className="space-y-1 text-xs text-muted-foreground">
      {(pricing.calculation?.lines || []).map((line, index) => <div key={index} className="flex justify-between gap-3"><span>{line.label}</span><span>{money(line.value)}</span></div>)}
      {(pricing.calculation?.notes || []).map((note, index) => <p key={`note-${index}`} className="pt-1">{note}</p>)}
    </div>}
    {pricing.discount > 0 && <p className="text-xs text-success">{pricing.discount_type === 'first_call' ? 'Desconto do primeiro chamado (10%)' : 'Desconto de fidelidade'} incluído: {money(pricing.discount)}</p>}
    <p className="text-xs text-muted-foreground">Este é o valor que será enviado ao chaveiro. Se mudar antes do envio, você precisará confirmar novamente.</p>
  </div>;
}