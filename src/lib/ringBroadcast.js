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
  // O navegador solicita a permissão de localização ao chaveiro. Uma posição
  // antiga do perfil não pode ser usada como origem da primeira rota.
  if (!navigator.geolocation) return {
    ok: false, code: "GPS_REQUIRED",
    reason: "Ative a localização (GPS) do celular para aceitar o chamado e mostrar sua posição atual ao cliente. Depois toque em Aceitar novamente.",
  };
  let position;
  try {
    position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(
      resolve, reject, { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 }
    ));
  } catch (error) {
    return {
      ok: false, code: "GPS_REQUIRED",
      reason: error?.code === 1
        ? "Permita o acesso à localização para o Chaveiro Já nas configurações do celular e toque em Aceitar novamente."
        : "Ative a localização (GPS) do celular e toque em Aceitar novamente. Precisamos da sua posição atual para mostrar a rota ao cliente.",
    };
  }
  try {
    const { data } = await base44.functions.invoke("serviceTrust", {
      action: "locksmith_location", locksmith_id: locksmith.id,
      lat: position.coords.latitude, lng: position.coords.longitude,
    });
    if (data?.allowed === false) return { ok: false, code: "AREA_UNAVAILABLE", reason: "Sua localização atual está fora da área disponível para atendimento." };
  } catch (error) {
    return { ok: false, code: "GPS_SYNC_FAILED", reason: error?.response?.data?.error || "Não foi possível confirmar sua posição. Verifique a conexão e tente novamente." };
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