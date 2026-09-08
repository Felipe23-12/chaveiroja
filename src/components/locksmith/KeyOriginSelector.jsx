import React from "react";
import { parallelOptions } from "@/lib/vehicleKeyCatalog";

export default function KeyOriginSelector({ value, onChange, catalog }) {
  const options = parallelOptions(catalog);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground block">Origem da chave</label>
      <div className="grid grid-cols-2 gap-3">
        {[{ id: "original", label: "Original" }, { id: "paralela", label: "Paralela" }].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`min-h-[44px] rounded-xl border-2 text-sm font-medium ${value === item.id ? "border-primary bg-primary/5" : "border-border"}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {value === "paralela" && (
        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {options.length ? `Arquivos confirmados: ${options.map((o) => o.brand).join(", ")}. O orçamento usa a opção de maior valor.` : "Não há arquivo paralelo confirmado para este veículo e ano."}
        </div>
      )}
    </div>
  );
}