import { base44 } from "@/api/base44Client";

// Indicador visual para escolher a etapa da tela; não autoriza operações financeiras.
// O bloqueio por débito é verificado no servidor por getClientDebt.
export function isUnpaidCompleted(request) {
  if (!request || request.status !== "completed") return false;
  if (request.payment_method === "dinheiro") return request.cash_received !== true;
  return request.payment_status !== "paid";
}

// O servidor consulta os pagamentos confirmados e todas as dívidas do usuário autenticado.
export async function getClientDebt(userId) {
  if (!userId) return null;
  const { data } = await base44.functions.invoke('serviceTrust', { action: 'client_debt' });
  return data.debt;
}