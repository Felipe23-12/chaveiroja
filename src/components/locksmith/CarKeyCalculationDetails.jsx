import React from "react";
import { Clock3 } from "lucide-react";
import { carKeyComponents, getCarKeyFipeLaborRate } from "@/lib/pricing";
import { manualParallelKeyPrice, parallelKeyPrice, requiresParallelKey } from "@/lib/vehicleKeyCatalog";

const money = (value) => `R$ ${(Number(value) || 0).toFixed(2)}`;
const multiplier = (value) => `×${(Number(value) || 1).toFixed(2)}`;

export default function CarKeyCalculationDetails({ price, fipeValue, year, hasCodedKey, keyValue, keyType, keyOrigin, catalog, make = "", model = "" }) {
  if (!price) return null;
  const original = Number(keyValue) || 250;
  const selected = keyOrigin === "paralela" ? parallelKeyPrice(catalog, original, keyType) : original;
  const components = carKeyComponents({ fipeValue, keyValue: selected, keyType, year, hasCodedKey, make, model, chargeSimpleKeyValue: keyOrigin === "paralela" && manualParallelKeyPrice(catalog, keyType) > 0 });
  const rate = getCarKeyFipeLaborRate(year, hasCodedKey, make, model);
  const factors = price.factors || {};
  const factorRows = [
    ["Oferta e demanda", factors.supplyDemand?.label, factors.supplyDemand?.multiplier],
    ["Urgência", factors.urgency?.label || "Normal", factors.urgency?.multiplier || 1],
    ["Região", factors.region?.label, factors.region?.multiplier],
    ["Bairro", factors.neighborhood?.label, factors.neighborhood?.multiplier],
    ["Clima", factors.weather?.label || "Sem acréscimo", factors.weather?.multiplier || 1],
  ];
  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-4">
      <div><h3 className="font-heading font-semibold text-foreground">Prévia completa do cálculo</h3><p className="text-xs text-muted-foreground">Visível somente para o perfil administrador</p></div>
      <div className="flex items-center gap-2 rounded-lg bg-background/70 p-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />Cálculo atualizado em {new Date().toLocaleString("pt-BR")}</div>
      <div className="space-y-1 text-sm">
        <p className="flex justify-between gap-3"><span>Tabela FIPE</span><strong>{money(fipeValue)}</strong></p>
        <p className="flex justify-between gap-3"><span>Taxa de mão de obra</span><strong>{(rate * 100).toFixed(1)}%</strong></p>
        <p className="flex justify-between gap-3"><span>Mão de obra base</span><strong>{money(components.laborCost)}</strong></p>
        <p className="flex justify-between gap-3"><span>Chave original pesquisada</span><strong>{money(original)}</strong></p>
        <p className="flex justify-between gap-3"><span>Chave selecionada ({keyOrigin})</span><strong>{money(components.keyValue)}</strong></p>
        {keyOrigin === "paralela" && <p className="text-xs text-muted-foreground">{manualParallelKeyPrice(catalog, keyType) > 0 ? "Valor manual definido no catálogo para este tipo de chave." : requiresParallelKey(catalog) ? "Preço confirmado VVDI/KD para veículo sem alarme original." : `35% de redução somente sobre a chave original: ${money(original)} × 65% = ${money(selected)}.`}</p>}
      </div>
      <div className="border-t border-border pt-3 space-y-1 text-sm">{factorRows.map(([label, detail, value]) => <p key={label} className="flex justify-between gap-3"><span>{label}{detail ? ` · ${detail}` : ""}</span><strong>{multiplier(value)}</strong></p>)}<p className="flex justify-between gap-3 font-semibold"><span>Multiplicador combinado da mão de obra</span><strong>{multiplier(factors.combinedMultiplier)}</strong></p></div>
      <div className="border-t border-border pt-3 space-y-1 text-sm">{price.breakdown.map((item) => <p key={item.label} className="flex justify-between gap-3"><span>{item.label}</span><strong>{money(item.value)}</strong></p>)}<p className="flex justify-between gap-3 pt-2 text-base font-bold text-foreground"><span>Total calculado</span><span className="text-primary">{money(price.total)}</span></p></div>
    </div>
  );
}