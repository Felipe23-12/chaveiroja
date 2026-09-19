import React, { useState, useEffect, useRef } from "react";
import { Zap, Check, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { playNotificationSound } from "@/lib/notificationSound";

const RESPONSE_MS = 60000;

/**
 * Aviso ao chaveiro de que o cliente pediu para mudar o chamado para URGENTE.
 * Ele tem 1 minuto para aceitar ou recusar — sem resposta, o pedido é aceito
 * automaticamente.
 */
export default function UrgencyUpgradeAlert({ request, onResolved }) {
  const [left, setLeft] = useState(RESPONSE_MS);
  const [saving, setSaving] = useState(false);
  const doneRef = useRef(false);

  const pending = request?.urgency_upgrade_status === "pending" && request?.urgency_upgrade_requested_at;

  useEffect(() => {
    doneRef.current = false;
    if (!pending) return;
    playNotificationSound();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
    const start = new Date(request.urgency_upgrade_requested_at).getTime();
    const tick = () => setLeft(Math.max(0, start + RESPONSE_MS - Date.now()));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [request?.id, pending, request?.urgency_upgrade_requested_at]);

  const resolve = async (accepted) => {
    if (doneRef.current) return;
    doneRef.current = true;
    setSaving(true);
    try {
      const response = await base44.functions.invoke("serviceTrust", {
        action: "resolve_urgency_upgrade",
        request_id: request.id,
        accepted,
      });
      onResolved?.(response.data.request);
    } finally {
      setSaving(false);
    }
  };

  // Aceite automático ao esgotar o tempo
  useEffect(() => {
    if (!pending || left > 0 || doneRef.current) return;
    resolve(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left, pending]);

  if (!pending) return null;

  const sec = Math.ceil(left / 1000);
  const newPrice = request.urgency_upgrade_price || request.price || 0;

  return (
    <div className="p-4 rounded-2xl border-2 border-destructive bg-destructive/10 space-y-3 animate-alert-slide">
      <div className="flex items-center justify-between gap-2 text-destructive">
        <p className="font-bold text-sm flex items-center gap-1.5">
          <Zap className="w-4 h-4" /> Cliente pediu atendimento URGENTE
        </p>
        <span className="text-xs font-bold tabular-nums">{sec}s</span>
      </div>
      <p className="text-sm text-foreground">
        Prazo de chegada passa a ser de 35 minutos e o valor vai para{" "}
        <strong>R$ {newPrice.toFixed(2)}</strong>. Sem resposta em 1 minuto, o pedido é aceito
        automaticamente.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => resolve(true)}
          disabled={saving}
          className="flex-1 h-11 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-success/90 active:scale-95 transition-all"
        >
          <Check className="w-4 h-4" /> Aceitar urgente
        </button>
        <button
          onClick={() => resolve(false)}
          disabled={saving}
          className="flex-1 h-11 rounded-xl border-2 border-border bg-card text-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-accent active:scale-95 transition-all"
        >
          <X className="w-4 h-4" /> Manter normal
        </button>
      </div>
    </div>
  );
}