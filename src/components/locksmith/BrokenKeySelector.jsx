import React from "react";
import { KeyRound, AlertTriangle } from "lucide-react";

/**
 * Confirmação obrigatória: a chave está quebrada dentro da fechadura?
 * A resposta "sim" acrescenta uma taxa fixa ao valor do chamado.
 */
export default function BrokenKeySelector({ value, onChange }) {
  const options = [
    { id: false, label: "Não está quebrada", hint: "Perdi a chave ou ela está comigo" },
    {
      id: true,
      label: "Sim, está quebrada na fechadura",
      hint: 'Adicional de retirada incluído no total conforme a tabela vigente',
    },
  ];

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-1.5">
        <KeyRound className="w-4 h-4 text-primary" />
        A chave está quebrada dentro da fechadura?
      </label>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => (
          <button
            key={String(opt.id)}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`text-left p-3 rounded-xl border-2 transition-all ${
              value === opt.id ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <p className="text-sm font-medium text-foreground">{opt.label}</p>
            <p className="text-xs text-muted-foreground">{opt.hint}</p>
          </button>
        ))}
      </div>
      {value == null && (
        <p className="text-xs text-warning mt-1.5 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Confirmação obrigatória para solicitar o chamado.
        </p>
      )}
    </div>
  );
}