import React from "react";
import { Ban, Clock } from "lucide-react";

/**
 * Aviso de bloqueio temporário do modo aplicativo após 3 cancelamentos
 * no mesmo dia, em qualquer serviço do modo aplicativo.
 */
export default function KeyBlockBanner({ block }) {
  if (!block?.blocked) return null;
  const h = Math.floor(block.minutesLeft / 60);
  const m = block.minutesLeft % 60;
  return (
    <div className="p-4 rounded-2xl border-2 border-destructive/40 bg-destructive/10 space-y-1.5 mb-4">
      <div className="flex items-center gap-2 text-destructive">
        <Ban className="w-5 h-5" />
        <p className="font-heading font-semibold text-sm">Modo aplicativo bloqueado</p>
      </div>
      <p className="text-xs text-destructive">
        {block.message || "O limite de 3 cancelamentos no mesmo dia foi atingido. Novas solicitações no modo aplicativo ficam bloqueadas por 6 horas, mesmo se o dia virar."}
      </p>
      <p className="text-xs font-medium text-destructive flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Liberação em {h > 0 ? `${h}h ` : ""}
        {m}min
      </p>
    </div>
  );
}