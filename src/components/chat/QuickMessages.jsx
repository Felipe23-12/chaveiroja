import React from "react";

const QUICK_MESSAGES = {
  customer: ["Está chegando?", "Boa noite!", "Daqui a quanto tempo você chega?", "Está perto de mim?"],
  locksmith: ["Estou chegando", "Estou a caminho", "Chego em 10 minutos"],
};

export default function QuickMessages({ onSend, disabled, audience = "customer" }) {
  const messages = QUICK_MESSAGES[audience] || QUICK_MESSAGES.customer;
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 pt-3 border-t border-border scrollbar-thin">
      {messages.map((q) => (
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