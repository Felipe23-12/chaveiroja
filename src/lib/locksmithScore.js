import { base44 } from "@/api/base44Client";

export const SCORE_START = 10;
export const SCORE_LOW = 3;

export async function loadScoreMap() {
  const rows = await base44.entities.LocksmithScore.list("-updated_date", 500);
  const map = new Map();
  for (const row of rows) if (!map.has(row.locksmith_id)) map.set(row.locksmith_id, row);
  return map;
}

export function withScores(locksmiths, scoreMap) {
  return locksmiths.map((locksmith) => ({
    ...locksmith,
    trust_score: Math.max(0, Math.min(SCORE_START, Number(scoreMap.get(locksmith.id)?.score ?? SCORE_START))),
    trust_status: scoreMap.get(locksmith.id) || null,
  }));
}

export function selectScoreBroadcast(queue, _requestPrice, includeLowerScores = false) {
  const available = queue.filter(({ l }) => !l.trust_status?.banned &&
    (!l.trust_status?.suspended_until || new Date(l.trust_status.suspended_until) <= new Date()));
  const best = available.filter(({ l }) => (l.trust_score ?? SCORE_START) === SCORE_START);
  return !includeLowerScores && best.length ? best : available;
}
