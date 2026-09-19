import React from "react";
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ServerPriceSummary({ pricing, showDetails = false }) {
  if (!pricing) return null;
  return <div className="rounded-2xl bg-muted p-4 space-y-3">
    <div className="flex justify-between items-center gap-3">
      <span className="font-heading font-semibold">Valor do serviço</span>
      <span className="font-heading font-bold text-xl text-primary">{money(pricing.price)}</span>
    </div>
    {showDetails && <div className="space-y-1 text-xs text-muted-foreground">
      {(pricing.calculation?.lines || []).map((line, index) => <div key={index} className="flex justify-between gap-3"><span>{line.label}</span><span>{money(line.value)}</span></div>)}
    </div>}
    {pricing.discount > 0 && <p className="text-xs text-success">Desconto de fidelidade incluído: {money(pricing.discount)}</p>}
    <p className="text-xs text-muted-foreground">Este é o valor que será enviado ao chaveiro. Se mudar antes do envio, você precisará confirmar novamente.</p>
  </div>;
}