import { base44 } from "@/api/base44Client";

// O servidor consulta os pagamentos confirmados e todas as dívidas do usuário autenticado.
export async function getClientDebt(userId) {
  if (!userId) return null;
  const { data } = await base44.functions.invoke('serviceTrust', { action: 'client_debt' });
  return data.debt;
}