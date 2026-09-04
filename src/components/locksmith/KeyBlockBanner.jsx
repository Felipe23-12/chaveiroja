import React from "react";
import { Ban, Clock } from "lucide-react";

/**
 * Aviso de bloqueio temporário do modo aplicativo após 3 cancelamentos
 * de solicitações de confecção de chave (carro ou moto).
 */
export default function KeyBlockBanner({ block }) {
  if (!block?.blocked) return null;
  const h = Math.floor(block.minutesLeft / 60);
  const m = block.minutesLeft % 60;
  return (
    <div className="p-4 rounded-2xl border-2 border-red-300 bg-red-50 space-y-1.5 mb-4">
      <div className="flex items-center gap-2 text-red-700">
        <Ban className="w-5 h-5" />
        <p className="font-heading font-semibold text-sm">Modo aplicativo bloqueado</p>
      </div>
      <p className="text-xs text-red-700">
        Você cancelou {block.cancelCount} solicitações de confecção de chave. Para
        proteger os chaveiros, novas solicitações ficam bloqueadas por 3 horas.
      </p>
      <p className="text-xs font-medium text-red-800 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Liberação em {h > 0 ? `${h}h ` : ""}
        {m}min
      </p>
    </div>
  );
}