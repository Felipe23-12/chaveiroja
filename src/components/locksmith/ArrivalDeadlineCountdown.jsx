import React, { useState, useEffect, useRef } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { arrivalDeadline, slaMinutes, autoCancelForDelay } from "@/lib/arrivalSla";

/**
 * Contagem regressiva do prazo de chegada do chaveiro:
 * 1h30 no modo normal e 35 minutos no modo urgente (a partir da aceitação).
 * Ao estourar o prazo, o chamado é cancelado automaticamente pelo sistema,
 * sem qualquer punição ao cliente.
 */
export default function ArrivalDeadlineCountdown({ request }) {
  const [now, setNow] = useState(Date.now());
  const cancelledRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
  }, [request?.id]);

  const deadline = arrivalDeadline(request);
  const expired = deadline != null && deadline - now <= 0;

  useEffect(() => {
    if (!expired || cancelledRef.current) return;
    cancelledRef.current = true;
    autoCancelForDelay(request).catch(() => {});
  }, [expired, request?.id]);

  if (deadline == null) return null;

  const limit = slaMinutes(request);
  const totalSec = Math.max(0, Math.floor((deadline - now) / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  const urgent = request.urgency === "urgent";

  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium ${
        expired
          ? "border-red-500 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 animate-alert-blink"
          : urgent
          ? "border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
          : "border-border bg-muted/50 text-foreground"
      }`}
    >
      {expired ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Clock className="w-4 h-4 shrink-0" />}
      <span>
        {expired
          ? `Prazo de chegada de ${limit} min ultrapassado — chamado cancelado automaticamente, sem cobrança`
          : `${urgent ? "Chamado urgente" : "Prazo de chegada"} — ${min}:${sec
              .toString()
              .padStart(2, "0")} restantes (limite ${limit} min)`}
      </span>
    </div>
  );
}