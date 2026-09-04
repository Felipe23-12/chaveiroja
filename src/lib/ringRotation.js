import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";

// Tempo que cada chaveiro tem para aceitar antes do chamado passar ao próximo
export const RING_TIMEOUT_MS = 60000;

/**
 * Monta a fila de chaveiros elegíveis, do mais próximo ao mais distante.
 */
export function buildEligibleQueue(locksmiths, service, customerLoc, radiusKm = null) {
  const now = Date.now();
  const queue = locksmiths
    .filter((l) => {
      // Precisa de localização válida para calcular a proximidade
      if (!l.lat || !l.lng) return false;
      // Não toca para quem está bloqueado por excesso de recusas
      if (l.blocked_until && new Date(l.blocked_until).getTime() > now) return false;
      // Chaveiro do modo livre só recebe chamados do app se tiver optado por isso
      if (l.work_mode === "livre" && l.receive_app_requests === false) return false;
      if (l.services && l.services.length > 0) return l.services.includes(service.id);
      const specs = l.specialties && l.specialties.length > 0 ? l.specialties : [l.specialty];
      return specs.includes(service.specialty);
    })
    .map((l) => ({ l, d: haversineKm(customerLoc, { lat: l.lat, lng: l.lng }) }))
    .sort((a, b) => a.d - b.d);

  // Respeita o raio de busca escolhido pelo cliente
  return radiusKm ? queue.filter((q) => q.d <= radiusKm) : queue;
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
          locksmith_user_id: next.l.created_by_id,
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