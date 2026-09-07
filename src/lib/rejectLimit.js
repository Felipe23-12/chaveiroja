import { base44 } from "@/api/base44Client";

export const DAILY_REJECT_LIMIT = 3;
const today = () => new Date().toISOString().slice(0, 10);

export function rejectionsToday(locksmith) {
  if (!locksmith || locksmith.rejections_date !== today()) return 0;
  return locksmith.rejections_today || 0;
}

export function getRejectBlock() {
  return { blocked: false, minutesLeft: 0 };
}

export async function registerRejection(locksmith, requestId) {
  if (!locksmith?.id) return { count: 0, blocked: false };
  const count = rejectionsToday(locksmith) + 1;
  await Promise.all([
    base44.entities.Locksmith.update(locksmith.id, { rejections_today: count, rejections_date: today() }),
    base44.functions.invoke("serviceTrust", { action: "score_event", event_type: "rejected", request_id: requestId, locksmith_id: locksmith.id }),
  ]);
  return { count, blocked: false };
}