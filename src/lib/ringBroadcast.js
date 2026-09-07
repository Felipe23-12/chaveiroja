import { base44 } from "@/api/base44Client";

// Quantos chaveiros próximos recebem o mesmo chamado ao mesmo tempo
export const BROADCAST_SIZE = 5;

// Tempo até o chamado recusado voltar a tocar para o mesmo chaveiro
export const RERING_DELAY_MS = 2 * 60 * 1000;

/**
 * O chamado está tocando para este chaveiro agora?
 * Se ele recusou, volta a tocar somente após o prazo de rering.
 */
export function isRingingFor(request, locksmithId) {
  if (!request || !locksmithId) return false;
  if (request.status !== "ringing") return false;
  const ids = request.ringing_locksmith_ids || [];
  if (!ids.includes(locksmithId)) return false;
  const rej = (request.rejections || []).find((r) => r.locksmith_id === locksmithId);
  if (!rej) return true;
  return !rej.rering_at || new Date(rej.rering_at).getTime() <= Date.now();
}

/**
 * Registra a recusa do chaveiro: o chamado para de tocar para ele e volta
 * a tocar 2 minutos depois, caso nenhum outro chaveiro tenha assumido.
 */
export async function rejectRing(request, locksmithId) {
  const rering_at = new Date(Date.now() + RERING_DELAY_MS).toISOString();
  const rejections = (request.rejections || []).filter((r) => r.locksmith_id !== locksmithId);
  rejections.push({ locksmith_id: locksmithId, rering_at });
  return base44.entities.ServiceRequest.update(request.id, { rejections });
}

/**
 * Primeiro chaveiro que aceitar fica com o chamado. Retorna false se outro
 * profissional já assumiu.
 */
export async function acceptRing(requestId, locksmith, extra = 0) {
  const fresh = await base44.entities.ServiceRequest.get(requestId);
  if (fresh.status !== "ringing") return false;
  const newPrice = Math.round(((fresh.price || 0) + extra) * 100) / 100;
  await base44.entities.ServiceRequest.update(requestId, {
    status: "accepted",
    accepted_at: new Date().toISOString(),
    locksmith_id: locksmith.id,
    locksmith_name: locksmith.name,
    locksmith_user_id: locksmith.created_by_id,
    locksmith_lat: locksmith.lat,
    locksmith_lng: locksmith.lng,
    ringing_locksmith_ids: [locksmith.id],
    price: newPrice,
    extra_cost: extra,
  });
  await base44.functions.invoke("serviceTrust", {
    action: "score_event",
    event_type: "accepted",
    request_id: requestId,
    locksmith_id: locksmith.id,
  }).catch(() => null);
  return true;
}