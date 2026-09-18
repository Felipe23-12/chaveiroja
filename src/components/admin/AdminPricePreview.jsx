import React from "react";
import { Calculator, Clock3 } from "lucide-react";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const mult = (value) => `×${Number(value || 1).toFixed(2)}`;

export default function AdminPricePreview({ price, service }) {
  if (!price) return null;
  const factors = price.factors || {};
  const rows = [
    ["Horário", factors.timeTier?.label || price.timeTier?.label, factors.timeTier?.multiplier || price.timeTier?.multiplier],
    ["Oferta e demanda", factors.supplyDemand?.label, factors.supplyDemand?.multiplier],
    ["Urgência", factors.urgency?.label || "Normal", factors.urgency?.multiplier || 1],
    ["Região", factors.region?.label, factors.region?.multiplier],
    ["Bairro", factors.neighborhood?.label, factors.neighborhood?.multiplier],
    ["Clima", factors.weather?.label || "Sem acréscimo", factors.weather?.multiplier || 1],
  ].filter(([, detail]) => detail);
  return <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-4">
    <div className="flex items-start gap-2"><Calculator className="mt-0.5 h-4 w-4 text-primary" /><div><h3 className="font-heading font-semibold">Prévia completa do cálculo</h3><p className="text-xs text-muted-foreground">Visível somente para o perfil administrador</p></div></div>
    <div className="flex items-center gap-2 rounded-lg bg-background/70 p-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Cálculo atualizado em {new Date().toLocaleString("pt-BR")}</div>
    {service?.baseRange && <div className="flex justify-between gap-3 text-sm"><span>Faixa de referência do serviço</span><strong>{money(service.baseRange[0])} a {money(service.baseRange[1])}</strong></div>}
    <div className="space-y-1 border-t border-border pt-3 text-sm">
      {rows.map(([label, detail, multiplier]) => <div key={label} className="flex justify-between gap-3"><span>{label} · {detail}</span><strong>{mult(multiplier)}</strong></div>)}
      {factors.onlineLocksmiths != null && <div className="flex justify-between gap-3 text-xs text-muted-foreground"><span>Dados em tempo real</span><span>{factors.onlineLocksmiths} chaveiros online · {factors.activeRequests} chamados ativos</span></div>}
      {factors.combinedMultiplier != null && <div className="flex justify-between gap-3 font-semibold"><span>Multiplicador combinado</span><strong>{mult(factors.combinedMultiplier)}</strong></div>}
    </div>
    <div className="space-y-1 border-t border-border pt-3 text-sm">
      {(price.breakdown || []).map((item, index) => <div key={`${item.label}-${index}`} className="flex justify-between gap-3"><span>{item.label}</span><strong className={item.value < 0 ? "text-success" : ""}>{item.value > 0 && item.isAdjustment ? "+ " : ""}{money(item.value)}</strong></div>)}
      <div className="flex justify-between gap-3 border-t border-border pt-2 text-base font-bold"><span>Total da solicitação</span><strong className="text-primary">{money(price.total)}</strong></div>
    </div>
    {factors.distanceOverThreshold && <p className="text-xs text-muted-foreground">O total inclui {money(price.distanceFee)} de distância excedente acima de 20 km.</p>}
  </div>;
}