import React from "react";
import { Input } from "@/components/ui/input";

const prices = [
  ["original_price", "Chave original"],
  ["parallel_simple_price", "Paralela simples"],
  ["parallel_flip_price", "Paralela canivete / telecomando"],
  ["parallel_proximity_price", "Paralela presença"],
];

export default function ManualKeyPriceFields({ value, onChange }) {
  return (
    <fieldset className="sm:col-span-2 lg:col-span-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-semibold">Valores manuais das chaves</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {prices.map(([name, label]) => (
          <label key={name} className="space-y-1 text-xs text-muted-foreground">
            {label}
            <Input type="number" min="0" step="0.01" inputMode="decimal" placeholder="R$ 0,00" value={value[name] ?? ""} onChange={(event) => onChange({ ...value, [name]: event.target.value })} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}