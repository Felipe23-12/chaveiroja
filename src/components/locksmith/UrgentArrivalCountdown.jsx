import React, { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";

const URGENT_SLA_MINUTES = 35;

/**
 * Contagem regressiva do prazo de chegada para chamados urgentes.
 * O chaveiro tem até 35 minutos (a partir da aceitação) para chegar no cliente.
 * Some quando o chamado não é urgente, já chegou, ou está concluído/cancelado.
 */
export default function UrgentArrivalCountdown({ request }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!request || request.urgency !== "urgent") return null;
  if (!request.accepted_at) return null;
  if (request.locksmith_arrived) return null;
  if (request.status === "completed" || request.status === "cancelled") return null;

  const deadline = new Date(request.accepted_at).getTime() + URGENT_SLA_MINUTES * 60 * 1000;
  const remainingMs = deadline - now;
  const expired = remainingMs <= 0;
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium ${
        expired
          ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-alert-blink"
          : "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
      }`}
    >
      {expired ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0" />}
      <span>
        {expired
          ? `Prazo de chegada ultrapassado (limite ${URGENT_SLA_MINUTES} min)`
          : `Chamado urgente — chegada em até ${min}:${sec.toString().padStart(2, "0")}`}
      </span>
    </div>
  );
}