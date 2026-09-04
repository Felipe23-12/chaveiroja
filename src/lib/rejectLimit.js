// Limite de recusas do chaveiro: até 6 chamados recusados por dia. Na 7ª recusa
// ele fica 1 hora bloqueado (offline e sem receber novos chamados).
import { base44 } from "@/api/base44Client";

export const DAILY_REJECT_LIMIT = 6;
export const REJECT_BLOCK_HOURS = 1;

const today = () => new Date().toISOString().slice(0, 10);

export function rejectionsToday(locksmith) {
  if (!locksmith || locksmith.rejections_date !== today()) return 0;
  return locksmith.rejections_today || 0;
}

// { blocked, minutesLeft }
export function getRejectBlock(locksmith) {
  const until = locksmith?.blocked_until ? new Date(locksmith.blocked_until).getTime() : 0;
  if (!until || until <= Date.now()) return { blocked: false, minutesLeft: 0 };
  return { blocked: true, minutesLeft: Math.max(1, Math.ceil((until - Date.now()) / 60000)) };
}

// Registra uma recusa e aplica o bloqueio quando passa do limite.
// Retorna { count, blocked }
export async function registerRejection(locksmith) {
  if (!locksmith?.id) return { count: 0, blocked: false };
  const count = rejectionsToday(locksmith) + 1;
  const data = { rejections_today: count, rejections_date: today() };
  const blocked = count > DAILY_REJECT_LIMIT;
  if (blocked) {
    data.blocked_until = new Date(Date.now() + REJECT_BLOCK_HOURS * 60 * 60 * 1000).toISOString();
    data.online = false;
  }
  await base44.entities.Locksmith.update(locksmith.id, data);
  return { count, blocked };
}