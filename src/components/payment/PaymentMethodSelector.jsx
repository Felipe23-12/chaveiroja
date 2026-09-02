import React from "react";
import { CreditCard, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = { CreditCard, QrCode };

const METHODS = [
  { id: "credit_card", label: "Cartão de Crédito", icon: "CreditCard", description: "Pagamento à vista no cartão" },
  { id: "debit_card", label: "Cartão de Débito", icon: "CreditCard", description: "Débito imediato" },
  { id: "pix", label: "Pix", icon: "QrCode", description: "Pagamento imediato via QR Code" },
];

export default function PaymentMethodSelector({ selected, onSelect }) {
  return (
    <div className="space-y-2.5">
      {METHODS.map((m) => {
        const Icon = ICONS[m.icon];
        const isSel = selected === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all",
              isSel ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              isSel ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-medium", isSel ? "text-primary" : "text-foreground")}>{m.label}</p>
              <p className="text-xs text-muted-foreground">{m.description}</p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
              isSel ? "border-primary" : "border-border"
            )}>
              {isSel && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}