import { base44 } from "@/api/base44Client";

/**
 * Verifica se um serviço concluído (status "completed") ainda não foi pago.
 * - Em dinheiro: não pago é cash_received !== true.
 * - Qualquer outro método (ou payment_method vazio/nulo, quando o cliente
 *   nem escolheu como pagar): não pago é payment_status !== "paid".
 */
export function isUnpaidCompleted(r) {
  if (!r || r.status !== "completed") return false;
  if (r.payment_method === "dinheiro") return r.cash_received !== true;
  return r.payment_status !== "paid";
}

/**
 * Débito pendente do cliente. Pode ser de dois tipos:
 * 1. "cancellation_fee" — taxa de cancelamento registrada mas ainda não paga
 *    (o cliente confirmou o cancelamento com taxa e saiu do app antes de pagar).
 *    Retorna { request, fee, type: "cancellation_fee" }.
 * 2. "unpaid_service" — serviço concluído pelo chaveiro (status "completed")
 *    cujo pagamento ainda não foi confirmado. Retorna { request, type: "unpaid_service" }.
 * A taxa de cancelamento tem prioridade sobre o serviço não pago (mais restritiva).
 */
export async function getClientDebt(userId) {
  if (!userId) return null;
  const cancelled = await base44.entities.ServiceRequest.filter(
    { created_by_id: userId, status: "cancelled", cancelled_by: "cliente" },
    "-created_date",
    20
  );
  const cancellation = cancelled.find((r) => Number(r.cancellation_fee) > 0 && r.payment_status !== "paid");
  if (cancellation) {
    return { request: cancellation, fee: Number(cancellation.cancellation_fee), type: "cancellation_fee" };
  }
  const completed = await base44.entities.ServiceRequest.filter(
    { created_by_id: userId, status: "completed" },
    "-created_date",
    20
  );
  const unpaid = completed.find(isUnpaidCompleted);
  if (!unpaid) return null;
  return { request: unpaid, type: "unpaid_service" };
}