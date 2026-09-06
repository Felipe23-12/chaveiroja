import React from "react";
import { Check } from "lucide-react";

export const SPECIALTY_OPTIONS = ["Residencial", "Automotivo", "Comercial", "Emergencial"];

/**
 * Seleção de múltiplas especialidades do chaveiro.
 * value: array de especialidades · onChange: recebe o novo array
 */
export default function SpecialtiesSelector({ value = [], onChange, label = "Especialidades" }) {
  const toggle = (opt) => {
    const next = value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt];
    onChange(next);
  };

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
      <div className="grid grid-cols-2 gap-2">
        {SPECIALTY_OPTIONS.map((opt) => {
          const active = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`flex items-center justify-between gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                active
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              {opt}
              {active && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        Você pode escolher mais de uma especialidade.
      </p>
    </div>
  );
}