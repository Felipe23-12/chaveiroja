import React from "react";
import { parallelOptions, requiresParallelKey } from "@/lib/vehicleKeyCatalog";

export default function KeyOriginSelector({ value, onChange, catalog, hidePriceDetails = false }) {
  const options = parallelOptions(catalog);
  const parallelOnly = requiresParallelKey(catalog);
  const origins = parallelOnly ? [{ id: "paralela", label: "Paralela" }] : [{ id: "original", label: "Original" }, { id: "paralela", label: "Paralela" }];
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground block">Origem da chave</label>
      <div className={`grid gap-3 ${parallelOnly ? "grid-cols-1" : "grid-cols-2"}`}>
        {origins.map((item) => {
          const unavailable = item.id === "paralela" && options.length === 0;
          return <button
            key={item.id}
            type="button"
            disabled={unavailable}
            onClick={() => onChange(item.id)}
            className={`min-h-[44px] rounded-xl border-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${value === item.id ? "border-primary bg-primary/5" : "border-border"}`}
          >
            {item.label}{unavailable ? " indisponível" : ""}
          </button>;
        })}
      </div>
      {parallelOnly && <p className="text-xs text-muted-foreground">Este veículo não possui alarme original de fábrica. Somente uma chave paralela VVDI ou KD confirmada pode ser solicitada.</p>}
      {(value === "paralela" || parallelOnly) && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {options.length ? `Opções confirmadas: ${options.map((o) => `${o.brand}${o.model ? ` ${o.model}` : ""} — ${o.file}`).join("; ")}.${hidePriceDetails ? "" : " O orçamento usa a opção aplicável."}` : "Não há chave paralela confirmada para este veículo e ano. Esta opção não pode ser solicitada."}
        </div>
      )}
    </div>
  );
}