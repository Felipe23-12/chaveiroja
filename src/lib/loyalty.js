import { base44 } from "@/api/base44Client";

export const POINTS_PER_DISCOUNT = 5;
export const DISCOUNT_RATE = 0.10;

// Busca o saldo de pontos de fidelidade do cliente: serviços concluídos,
// descontos já ganhos e disponíveis.
export async function getClientLoyalty(userId) {
  if (!userId) return null;
  const [completed, used] = await Promise.all([
    base44.entities.ServiceRequest.filter({
      created_by_id: userId,
      status: "completed",
    }),
    base44.entities.ServiceRequest.filter({
      created_by_id: userId,
      discount_applied: true,
    }),
  ]);

  const completedCount = completed.length;
  const earned = Math.floor(completedCount / POINTS_PER_DISCOUNT);
  const usedCount = used.length;
  const available = Math.max(0, earned - usedCount);
  const progress = completedCount % POINTS_PER_DISCOUNT;

  return {
    completedCount,
    earned,
    usedCount,
    available,
    progress,
    next: POINTS_PER_DISCOUNT,
  };
}

// Calcula o valor com desconto de fidelidade aplicado
export function applyLoyaltyDiscount(price, minimumTotal = 0) {
  const p = Number(price) || 0;
  const discount = Math.round(p * DISCOUNT_RATE * 100) / 100;
  const final = Math.max(minimumTotal, Math.round((p - discount) * 100) / 100);
  const amount = Math.max(0, Math.round((p - final) * 100) / 100);
  return { amount, final };
}