import { base44 } from "@/api/base44Client";

/**
 * Retorna o perfil de chaveiro que pertence ao usuário logado (created_by_id).
 * Cada conta só enxerga e opera o próprio perfil — nunca o de outro chaveiro.
 */
export async function fetchMyLocksmith(userId) {
  if (!userId) return null;
  const list = await base44.entities.Locksmith.filter({ created_by_id: userId });
  return list[0] || null;
}