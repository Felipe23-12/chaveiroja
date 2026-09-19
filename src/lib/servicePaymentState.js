// Indicador visual para escolher a etapa da tela; decisões financeiras ficam no servidor.
export function isUnpaidCompleted(request) {
  if (!request || request.status !== "completed") return false;
  if (request.payment_method === "dinheiro") return request.cash_received !== true;
  return request.payment_status !== "paid";
}