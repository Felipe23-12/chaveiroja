import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";
import { SERVICE_CATALOG } from "@/lib/pricing";

/**
 * Sincroniza os chamados pendentes com o novo raio de atendimento do chaveiro:
 * assim que ele amplia o raio, os chamados que já estavam abertos mais longe
 * passam a tocar para ele imediatamente (sem esperar um novo pedido).
 */
export function servesRequest(locksmith, request) {
  const svc = SERVICE_CATALOG.find((s) => s.label === request.service_type);
  if (!svc) return true;
  if (locksmith.services && locksmith.services.length > 0) {
    return locksmith.services.includes(svc.id);
  }
  const mine =
    locksmith.specialties && locksmith.specialties.length > 0
      ? locksmith.specialties
      : [locksmith.specialty];
  return mine.includes(svc.specialty);
}

export async function resyncRingingForRadius(locksmith, radiusKm) {
  if (!locksmith?.id || !locksmith.lat || !locksmith.lng || !radiusKm) return 0;

  const [searching, ringing] = await Promise.all([
    base44.entities.ServiceRequest.filter({ status: "searching" }, "-created_date", 100),
    base44.entities.ServiceRequest.filter({ status: "ringing" }, "-created_date", 100),
  ]);

  const candidates = [...searching, ...ringing].filter((r) => {
    if (!r.customer_lat || !r.customer_lng) return false;
    if ((r.ringing_locksmith_ids || []).includes(locksmith.id)) return false;
    if (!servesRequest(locksmith, r)) return false;
    const d = haversineKm(
      { lat: locksmith.lat, lng: locksmith.lng },
      { lat: r.customer_lat, lng: r.customer_lng }
    );
    return d <= radiusKm;
  });

  let added = 0;
  for (const r of candidates) {
    const payload = {
      status: "ringing",
      ringing_locksmith_ids: [...(r.ringing_locksmith_ids || []), locksmith.id],
      ringing_locksmith_user_ids: [
        ...(r.ringing_locksmith_user_ids || []),
        locksmith.created_by_id,
      ].filter(Boolean),
      // Limpa uma recusa antiga para que o chamado volte a tocar de imediato
      rejections: (r.rejections || []).filter((x) => x.locksmith_id !== locksmith.id),
    };
    if (r.status === "searching" || !r.locksmith_id) {
      payload.locksmith_id = locksmith.id;
      payload.locksmith_name = locksmith.name;
      payload.locksmith_user_id = locksmith.created_by_id;
      payload.locksmith_lat = locksmith.lat;
      payload.locksmith_lng = locksmith.lng;
    }
    try {
      await base44.entities.ServiceRequest.update(r.id, payload);
      added += 1;
    } catch (e) {
      /* silencioso — tenta novamente na próxima alteração de raio */
    }
  }
  return added;
}