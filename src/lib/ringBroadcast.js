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
  const response = await base44.functions.invoke("serviceTrust", {
    action: "reject_request",
    request_id: request.id,
    locksmith_id: locksmithId,
  });
  return response.data.request;
}

/** Aceita o primeiro chamado ou reserva um segundo chamado normal e próximo. */
export async function acceptRing(requestId, locksmith) {
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
  // Tenta atualizar a posição antes do aceite para a primeira rota usar o GPS atual.
  // Se o GPS estiver indisponível, mantém o fluxo de aceite e o rastreamento
  // atualizará o mapa assim que o aparelho entregar uma posição válida.
  if (!queued && navigator.geolocation) {
    try {
      const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
        resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 6000 }
      ));
      await base44.functions.invoke("serviceTrust", {
        action: "locksmith_location", locksmith_id: locksmith.id,
        lat: position.coords.latitude, lng: position.coords.longitude,
      });
    } catch (error) {
      console.warn("GPS indisponível no aceite; aguardando primeira posição de rastreamento", error);
    }
  }
  let result;
  try {
    result = await base44.functions.invoke("serviceTrust", {
      action: "accept_request",
      request_id: requestId,
      queued,
      queued_after_request_id: queued ? state.active.id : undefined,
    });
  } catch (err) {
    const data = err?.response?.data || err?.data || err;
    return { ok: false, code: data?.code, reason: data?.error || err?.message || "Não foi possível aceitar o chamado." };
  }
  await base44.functions.invoke("serviceTrust", {
    action: "score_event", event_type: "accepted", request_id: requestId, locksmith_id: locksmith.id,
  }).catch(() => null);
  return { ok: true, request: result?.data?.request, queued: result?.data?.queued === true || queued };
}