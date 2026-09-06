import { base44 } from "@/api/base44Client";

/**
 * Débito pendente do cliente: taxa de cancelamento registrada mas ainda não paga
 * (o cliente confirmou o cancelamento com taxa e saiu do app antes de pagar).
 * Retorna { request, fee } ou null.
 */
export async function getClientDebt(userId) {
  if (!userId) return null;
  const list = await base44.entities.ServiceRequest.filter(
    { created_by_id: userId, status: "cancelled", cancelled_by: "cliente" },
    "-created_date",
    20
  );
  const pending = list.find((r) => Number(r.cancellation_fee) > 0 && r.payment_status !== "paid");
  if (!pending) return null;
  return { request: pending, fee: Number(pending.cancellation_fee) };
}