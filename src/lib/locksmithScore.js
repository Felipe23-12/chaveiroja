import { base44 } from "@/api/base44Client";

export const SCORE_START = 10;
export const SCORE_LOW = 3;

export async function loadScoreMap() {
  const rows = await base44.entities.LocksmithScore.list("-score", 500);
  return new Map(rows.map((row) => [row.locksmith_id, row]));
}

export function withScores(locksmiths, scoreMap) {
  return locksmiths.map((locksmith) => ({
    ...locksmith,
    trust_score: Math.max(0, Math.min(SCORE_START, Number(scoreMap.get(locksmith.id)?.score ?? SCORE_START))),
    trust_status: scoreMap.get(locksmith.id) || null,
  }));
}

export function selectScoreBroadcast(queue, requestPrice) {
  const available = queue.filter(({ l }) => {
    const status = l.trust_status;
    return !status?.banned && (!status?.suspended_until || new Date(status.suspended_until) <= new Date());
  });
  const strong = available.filter(({ l }) => (l.trust_score ?? SCORE_START) > SCORE_LOW);
  const recovery = available.filter(({ l }) => (l.trust_score ?? SCORE_START) <= SCORE_LOW).sort((a, b) => b.d - a.d);
  if (Number(requestPrice) >= 150) return (strong.length ? strong : recovery).slice(0, 5);
  return [...strong.slice(0, 3), ...recovery.slice(0, 2)].slice(0, 5);
}