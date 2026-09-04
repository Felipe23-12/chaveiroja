// Prazo máximo de chegada do chaveiro ao cliente. Se estourar, o chamado é
// cancelado automaticamente pelo sistema — sem qualquer punição ao cliente.
import { base44 } from "@/api/base44Client";

export const ARRIVAL_SLA_MINUTES = { normal: 90, urgent: 35 };

export function slaMinutes(request) {
  return request?.urgency === "urgent"
    ? ARRIVAL_SLA_MINUTES.urgent
    : ARRIVAL_SLA_MINUTES.normal;
}

// Retorna o timestamp limite de chegada, ou null se não se aplica
export function arrivalDeadline(request) {
  if (!request?.accepted_at) return null;
  if (request.locksmith_arrived) return null;
  if (request.status === "completed" || request.status === "cancelled") return null;
  return new Date(request.accepted_at).getTime() + slaMinutes(request) * 60 * 1000;
}

// Cancela o chamado por prazo de chegada expirado (sem taxa e sem punição)
export async function autoCancelForDelay(request) {
  if (!request?.id) return;
  const fresh = await base44.entities.ServiceRequest.get(request.id);
  if (fresh.status === "cancelled" || fresh.status === "completed") return;
  if (fresh.locksmith_arrived) return;
  await base44.entities.ServiceRequest.update(request.id, {
    status: "cancelled",
    cancelled_by: "sistema",
    cancellation_fee: 0,
    cancellation_locksmith_amount: 0,
    cancellation_app_fee: 0,
    cancellation_reason: `Chaveiro não chegou no prazo de ${slaMinutes(fresh)} minutos`,
  });
}