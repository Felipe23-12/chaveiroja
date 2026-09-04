import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";

// Tempo que cada chaveiro tem para aceitar antes do chamado passar ao próximo
export const RING_TIMEOUT_MS = 60000;

/**
 * Monta a fila de chaveiros elegíveis, do mais próximo ao mais distante.
 */
export function buildEligibleQueue(locksmiths, service, customerLoc) {
  return locksmiths
    .filter((l) => {
      if (l.services && l.services.length > 0) return l.services.includes(service.id);
      const specs = l.specialties && l.specialties.length > 0 ? l.specialties : [l.specialty];
      return specs.includes(service.specialty);
    })
    .map((l) => ({ l, d: haversineKm(customerLoc, { lat: l.lat, lng: l.lng }) }))
    .sort((a, b) => a.d - b.d);
}

/**
 * Enquanto o chamado estiver "ringing", repassa automaticamente para o próximo
 * chaveiro mais próximo a cada minuto sem resposta. Ao esgotar a fila, reinicia
 * do primeiro — o chamado fica rodando até algum chaveiro aceitar.
 */
export function useRingRotation({ request, queueRef, onRotate, onNoLocksmiths }) {
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!request || request.status !== "ringing") return;
    const queue = queueRef.current || [];
    if (queue.length < 2) return;

    timerRef.current = setTimeout(async () => {
      try {
        const fresh = await base44.entities.ServiceRequest.get(request.id);
        if (fresh.status !== "ringing") return;
        const idx = queue.findIndex((q) => q.l.id === fresh.locksmith_id);
        const next = queue[(idx + 1) % queue.length];
        if (!next || next.l.id === fresh.locksmith_id) {
          onNoLocksmiths?.();
          return;
        }
        await base44.entities.ServiceRequest.update(request.id, {
          locksmith_id: next.l.id,
          locksmith_name: next.l.name,
          locksmith_lat: next.l.lat,
          locksmith_lng: next.l.lng,
          distance_km: Math.round(next.d * 100) / 100,
        });
        onRotate?.(next.l);
      } catch (e) {
        /* silencioso — tenta novamente no próximo ciclo */
      }
    }, RING_TIMEOUT_MS);

    return () => clearTimeout(timerRef.current);
  }, [request?.id, request?.status, request?.locksmith_id]);
}