import React from "react";

const QUICK_MESSAGES = [
  "Estou a caminho",
  "Cheguei no local",
  "Qual o endereço completo?",
  "Qual o problema apresentado?",
  "Já estou finalizando o serviço",
];

export default function QuickMessages({ onSend, disabled }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-3 border-t border-border scrollbar-thin">
      {QUICK_MESSAGES.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSend(q)}
          disabled={disabled}
          className="shrink-0 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}