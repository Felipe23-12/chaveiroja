import React, { useState, useEffect, useRef } from "react";
import { Clock, AlertCircle, Navigation } from "lucide-react";
import { notifyClient } from "@/lib/clientNotifications";
import { useToast } from "@/components/ui/use-toast";
import {
  ARRIVAL_SLA_MINUTES,
  NEARBY_TOLERANCE_KM,
  NEARBY_TOLERANCE_MINUTES,
  arrivalDeadline,
  toleranceApplied,
} from "@/lib/arrivalSla";

/**
 * Contagem regressiva do prazo de chegada para chamados urgentes.
 * O chaveiro tem até 35 minutos (a partir da aceitação) para chegar no cliente.
 * Se o prazo estourar e ele já estiver a até 5 km, ganha 10 minutos de tolerância.
 */
export default function UrgentArrivalCountdown({ request }) {
  const { toast } = useToast();
  const [now, setNow] = useState(Date.now());
  const notifiedTolerance = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    notifiedTolerance.current = false;
  }, [request?.id]);

  const inTolerance =
    request?.urgency === "urgent" &&
    !request?.locksmith_arrived &&
    request?.status !== "completed" &&
    request?.status !== "cancelled" &&
    toleranceApplied(request, now);

  // Avisa o cliente (notificação nativa + aviso na tela) quando a tolerância começa
  useEffect(() => {
    if (!inTolerance || notifiedTolerance.current) return;
    notifiedTolerance.current = true;
    const msg = `O chaveiro já está a menos de ${NEARBY_TOLERANCE_KM} km e está chegando. Foram concedidos ${NEARBY_TOLERANCE_MINUTES} minutos de tolerância no prazo.`;
    notifyClient("Seu chaveiro está chegando", msg);
    toast({ title: "⏱️ Tolerância de 10 minutos", description: msg });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTolerance]);

  if (!request || request.urgency !== "urgent") return null;

  const deadline = arrivalDeadline(request, now);
  if (deadline == null) return null;

  const tolerance = toleranceApplied(request, now);
  const remainingMs = deadline - now;
  const expired = remainingMs <= 0;
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;

  if (tolerance && !expired) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl border border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-sm font-medium">
        <Navigation className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          Seu chaveiro já está a menos de {NEARBY_TOLERANCE_KM} km e está chegando. Como ele está
          bem próximo, o prazo recebeu uma tolerância de {NEARBY_TOLERANCE_MINUTES} minutos —
          restam {min}:{sec.toString().padStart(2, "0")}.
        </span>
      </div>
    );
  }

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
          ? `Prazo de chegada ultrapassado (limite ${ARRIVAL_SLA_MINUTES.urgent} min)`
          : `Chamado urgente — chegada em até ${min}:${sec.toString().padStart(2, "0")}`}
      </span>
    </div>
  );
}