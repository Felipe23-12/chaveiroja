import React from "react";
import { Navigation, Clock, MapPin, Wrench, Wallet, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Marcador visual do estado do pedido no painel do chaveiro.
// Cores distintas por macro-estado para evitar confusão durante o atendimento:
// - Em rota: azul
// - Pendente (aguardando cliente/pagamento): âmbar
// - Em atendimento: amarelo (primária)
// - Pronto/Finalizado: verde
const STATUS_CONFIG = {
  moving: { label: "Em rota", className: "bg-blue-500 text-white", icon: Navigation },
  arrived_detected: { label: "No local", className: "bg-amber-500 text-white", icon: MapPin },
  arrived_pending: { label: "Aguardando cliente", className: "bg-amber-500 text-white", icon: Clock },
  arrived_confirmed: { label: "Iniciar atendimento", className: "bg-primary text-primary-foreground", icon: Wrench },
  finishing: { label: "Em atendimento", className: "bg-primary text-primary-foreground", icon: Wrench },
  awaiting_client: { label: "Aguardando cliente", className: "bg-amber-500 text-white", icon: Clock },
  awaiting_payment: { label: "Aguardando pagamento", className: "bg-amber-500 text-white", icon: Wallet },
  ready_to_finish: { label: "Pronto para finalizar", className: "bg-emerald-500 text-white", icon: CheckCircle2 },
  completed: { label: "Finalizado", className: "bg-emerald-600 text-white", icon: CheckCircle2 },
};

export default function ServiceStatusBadge({ phase, className }) {
  const config = STATUS_CONFIG[phase] || STATUS_CONFIG.moving;
  const Icon = config.icon;
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm",
        config.className,
        className
      )}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {config.label}
    </div>
  );
}

// Cor da borda lateral do card, alinhada ao badge (classes literais para o purge do Tailwind)
export const PHASE_BORDER = {
  moving: "border-l-blue-500",
  arrived_detected: "border-l-amber-500",
  arrived_pending: "border-l-amber-500",
  arrived_confirmed: "border-l-primary",
  finishing: "border-l-primary",
  awaiting_client: "border-l-amber-500",
  awaiting_payment: "border-l-amber-500",
  ready_to_finish: "border-l-emerald-500",
  completed: "border-l-emerald-600",
};