import { base44 } from "@/api/base44Client";

// Campos financeiros/sensíveis vivem em LocksmithFinancials (entity separada,
// leitura restrita ao próprio dono + admin) desde a correção do C3 — antes
// ficavam soltos no Locksmith, que qualquer usuário logado conseguia ler.
const FINANCIAL_DEFAULTS = {
  wallet_balance: 0,
  pending_balance: 0,
  pending_cash_commission: 0,
  pix_key_type: undefined,
  pix_key_value: undefined,
  bank_name: undefined,
  revalidation_documents: [],
  revalidated_at: undefined,
};

const FINANCIAL_KEYS = [
  "wallet_balance",
  "pending_balance",
  "pending_cash_commission",
  "pix_key_type",
  "pix_key_value",
  "bank_name",
  "revalidation_documents",
  "revalidated_at",
];

/**
 * Depois de um Locksmith.update() que só mudou campos não-financeiros (online,
 * lat/lng, rejections_today, etc.), o registro devolvido não tem os dados
 * financeiros mesclados. Isso preserva os valores financeiros que já estavam
 * no estado anterior em vez de perdê-los / zerá-los na tela.
 */
export function preserveFinancials(previous, fresh) {
  if (!fresh) return fresh;
  const carried = {};
  FINANCIAL_KEYS.forEach((key) => {
    carried[key] = previous ? previous[key] : undefined;
  });
  return { ...fresh, ...carried };
}

export async function fetchLocksmithFinancials(locksmithId) {
  if (!locksmithId) return null;
  const list = await base44.entities.LocksmithFinancials.filter({ locksmith_id: locksmithId });
  return list[0] || null;
}

/** Combina o perfil público do chaveiro com os dados financeiros, no mesmo formato usado antes da separação das entities. */
export function mergeLocksmithFinancials(locksmith, financials) {
  if (!locksmith) return locksmith;
  return {
    ...locksmith,
    ...FINANCIAL_DEFAULTS,
    ...(financials
      ? {
          wallet_balance: financials.wallet_balance || 0,
          pending_balance: financials.pending_balance || 0,
          pending_cash_commission: financials.pending_cash_commission || 0,
          pix_key_type: financials.pix_key_type,
          pix_key_value: financials.pix_key_value,
          bank_name: financials.bank_name,
          revalidation_documents: financials.revalidation_documents || [],
          revalidated_at: financials.revalidated_at,
        }
      : {}),
  };
}

/**
 * Retorna o perfil de chaveiro que pertence ao usuário logado (created_by_id),
 * já com os dados financeiros mesclados.
 * Cada conta só enxerga e opera o próprio perfil — nunca o de outro chaveiro.
 */
export async function fetchMyLocksmith(userId) {
  if (!userId) return null;
  const list = await base44.entities.Locksmith.filter({ created_by_id: userId });
  const locksmith = list[0] || null;
  if (!locksmith) return null;
  const financials = await fetchLocksmithFinancials(locksmith.id);
  return mergeLocksmithFinancials(locksmith, financials);
}
