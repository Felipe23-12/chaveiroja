import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/** O servidor controla os 60s de prioridade e a ampliação de raio após 5min. */
export function useRadiusExpansion({ request, radiusKm, onExpand, enabled = true }) {
  const radiusRef = useRef(radiusKm);
  const onExpandRef = useRef(onExpand);
  useEffect(() => { radiusRef.current = radiusKm; onExpandRef.current = onExpand; }, [radiusKm, onExpand]);
  useEffect(() => {
    if (!enabled || !request?.id || !["ringing", "searching"].includes(request.status)) return;
    let stopped = false;
    let busy = false;
    const refresh = async () => {
      if (busy || stopped) return;
      busy = true;
      try {
        const { data } = await base44.functions.invoke("serviceTrust", {
          action: "refresh_request_dispatch", request_id: request.id,
        });
        const next = data?.request?.search_radius_km;
        if (!stopped && next > radiusRef.current) {
          radiusRef.current = next;
          onExpandRef.current?.({ radiusKm: next, added: data.added || 0 });
        }
      } catch {
        // O workflow no servidor também executa o envio, mesmo com o app fechado.
      } finally { busy = false; }
    };
    const due = Date.parse(request.score_priority_until || "");
    const timeout = Number.isFinite(due) ? setTimeout(refresh, Math.max(0, due - Date.now())) : null;
    const interval = setInterval(refresh, 15000);
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      clearInterval(interval);
      if (timeout !== null) clearTimeout(timeout);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [enabled, request?.id, request?.status, request?.score_priority_until]);
}
