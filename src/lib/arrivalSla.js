// Prazo máximo de chegada do chaveiro ao cliente. Se estourar, o chamado é
// cancelado automaticamente pelo sistema — sem qualquer punição ao cliente.
import { base44 } from "@/api/base44Client";
import { haversineKm } from "@/lib/geo";

export const ARRIVAL_SLA_MINUTES = { normal: 90, urgent: 35 };
export const NIGHT_CAR_KEY_SLA_MINUTES = 60;
export const NIGHT_OPENING_SLA_MINUTES = 55;
export const NIGHT_CAR_KEY_MAX_KM = 25;
export const NIGHT_OPENING_MAX_KM = 20;

// Tolerância extra no modo emergencial: se o chaveiro já está a até 5 km do
// cliente quando o prazo estoura, ele ganha 10 minutos adicionais.
export const NEARBY_TOLERANCE_KM = 5;
export const NEARBY_TOLERANCE_MINUTES = 10;

function saoPauloHour(value) {
  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  return Number(parts.find((part) => part.type === "hour")?.value);
}

function isNightRequest(request) {
  const hour = saoPauloHour(request?.accepted_at || request?.created_date || Date.now());
  return hour >= 18 || hour < 6;
}

export function slaMinutes(request) {
  if (request?.urgency === "urgent") return ARRIVAL_SLA_MINUTES.urgent;
  if (!isNightRequest(request)) return ARRIVAL_SLA_MINUTES.normal;

  const distanceKm = Number(request?.distance_km);
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return ARRIVAL_SLA_MINUTES.normal;
  if (request?.service_type === "Confecção de Chave de Carro" && distanceKm <= NIGHT_CAR_KEY_MAX_KM) {
    return NIGHT_CAR_KEY_SLA_MINUTES;
  }
  if (request?.service_type?.startsWith("Abertura") && distanceKm <= NIGHT_OPENING_MAX_KM) {
    return NIGHT_OPENING_SLA_MINUTES;
  }
  return ARRIVAL_SLA_MINUTES.normal;
}

// Chaveiro está dentro do raio de tolerância (5 km) do cliente?
export function isNearbyForTolerance(request) {
  if (!request?.locksmith_lat || !request?.customer_lat) return false;
  const d = haversineKm(
    { lat: request.locksmith_lat, lng: request.locksmith_lng },
    { lat: request.customer_lat, lng: request.customer_lng }
  );
  return d <= NEARBY_TOLERANCE_KM;
}

// Tolerância aplicada: chamado urgente + chaveiro a até 5 km + prazo original vencido
export function toleranceApplied(request, now = Date.now()) {
  if (request?.urgency !== "urgent" || !request?.accepted_at) return false;
  const base = new Date(request.accepted_at).getTime() + slaMinutes(request) * 60 * 1000;
  return now >= base && isNearbyForTolerance(request);
}

// Retorna o timestamp limite de chegada, ou null se não se aplica
export function arrivalDeadline(request, now = Date.now()) {
  if (!request?.accepted_at) return null;
  if (request.locksmith_arrived) return null;
  if (request.status === "completed" || request.status === "cancelled") return null;
  const base = new Date(request.accepted_at).getTime() + slaMinutes(request) * 60 * 1000;
  if (toleranceApplied(request, now)) {
    return base + NEARBY_TOLERANCE_MINUTES * 60 * 1000;
  }
  return base;
}

// Cancela o chamado por prazo de chegada expirado (sem taxa e sem punição)
export async function autoCancelForDelay(request) {
  if (!request?.id) return;
  const fresh = await base44.entities.ServiceRequest.get(request.id);
  if (fresh.status === "cancelled" || fresh.status === "completed") return;
  if (fresh.locksmith_arrived) return;
  // Chaveiro urgente a até 5 km ainda está na tolerância de 10 min
  const deadline = arrivalDeadline(fresh);
  if (deadline != null && Date.now() < deadline) return;
  await base44.entities.ServiceRequest.update(request.id, {
    status: "cancelled",
    cancelled_by: "sistema",
    cancellation_fee: 0,
    cancellation_locksmith_amount: 0,
    cancellation_app_fee: 0,
    cancellation_reason: `Chaveiro não chegou no prazo de ${slaMinutes(fresh)} minutos`,
  });
}