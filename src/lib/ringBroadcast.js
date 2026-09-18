import { base44 } from "@/api/base44Client";
import { canReceiveWhileBusy, getLocksmithQueueState, SECOND_JOB_MAX_DISTANCE_KM } from "@/lib/serviceQueue";

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

/** Aceita o primeiro chamado ou reserva um segundo chamado normal e próximo. */
export async function acceptRing(requestId, locksmith, extra = 0) {
  const [fresh, state] = await Promise.all([
    base44.entities.ServiceRequest.get(requestId),
    getLocksmithQueueState(locksmith.id),
  ]);
  if (fresh.status !== "ringing") return { ok: false, reason: "Outro chaveiro assumiu este atendimento primeiro." };

  if (!canReceiveWhileBusy(fresh, state)) {
    const reason = state.queued
      ? "Você já atingiu o limite de dois chamados."
      : fresh.urgency === "urgent"
      ? "Chamados urgentes não podem entrar como segundo atendimento."
      : `O segundo cliente precisa estar a até ${SECOND_JOB_MAX_DISTANCE_KM} km do atendimento atual.`;
    return { ok: false, reason };
  }

  // A validação de conta Mercado Pago conectada e o aceite em si agora rodam
  // no backend (serviceTrust / accept_request) — o cliente não pode mais
  // pular essa checagem chamando o update direto.
  const queued = Boolean(state.active);
  const result = await base44.functions.invoke("serviceTrust", {
    action: "accept_request",
    request_id: requestId,
    extra,
    queued,
    queued_after_request_id: queued ? state.active.id : undefined,
  });
  if (!result?.ok) {
    const data = result?.data || {};
    return { ok: false, reason: data.error || "Não foi possível aceitar o chamado." };
  }
  await base44.functions.invoke("serviceTrust", {
    action: "score_event", event_type: "accepted", request_id: requestId, locksmith_id: locksmith.id,
  }).catch(() => null);
  return { ok: true, queued: result.data?.queued === true || queued };
}