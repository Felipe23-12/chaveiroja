import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { buildEligibleQueue } from "@/lib/ringRotation";
import { selectScoreBroadcast } from "@/lib/locksmithScore";
import { expandRadius, RADIUS_EXPAND_INTERVAL_MS, MAX_RADIUS_KM } from "@/lib/searchRadius";

/**
 * Enquanto o chamado estiver tocando sem ninguém aceitar, aumenta o raio de
 * busca em 20% a cada 5 minutos e passa a tocar também nos chaveiros que
 * entraram no novo raio.
 */
export function useRadiusExpansion({ request, service, locksmiths, customerLoc, radiusKm, onExpand, enabled = true }) {
  const radiusRef = useRef(radiusKm);

  useEffect(() => {
    radiusRef.current = radiusKm;
  }, [radiusKm, request?.id]);

  useEffect(() => {
    if (!enabled) return;
    if (!request || request.status !== "ringing" || !service) return;

    const timer = setInterval(async () => {
      try {
        const fresh = await base44.entities.ServiceRequest.get(request.id);
        if (fresh.status !== "ringing") return;
        if (radiusRef.current >= MAX_RADIUS_KM) return;

        const next = expandRadius(radiusRef.current);
        radiusRef.current = next;

        const all = buildEligibleQueue(locksmiths, service, customerLoc);
        // Toca para todos os chaveiros elegíveis dentro do novo raio
        const queue = selectScoreBroadcast(all.filter((q) => q.d <= next), fresh.price);
        const ids = queue.map((q) => q.l.id);
        const userIds = queue.map((q) => q.l.created_by_id);
        const added = ids.filter((id) => !(fresh.ringing_locksmith_ids || []).includes(id));

        await base44.entities.ServiceRequest.update(request.id, {
          ringing_locksmith_ids: ids,
          ringing_locksmith_user_ids: userIds,
        });
        onExpand?.({ radiusKm: next, added: added.length });
      } catch (e) {
        /* silencioso — tenta novamente no próximo ciclo */
      }
    }, RADIUS_EXPAND_INTERVAL_MS);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, request?.id, request?.status, service?.id, locksmiths.length]);
}