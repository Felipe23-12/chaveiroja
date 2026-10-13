export const SCORE_PRIORITY_MS = 60_000;
export const MAX_SCORE = 10;

export function dispatchScore(row: any) {
  if (row?.score == null) return MAX_SCORE;
  const value = Number(row.score);
  return Number.isFinite(value) ? Math.max(0, Math.min(MAX_SCORE, value)) : 0;
}

export function scoreAvailable(row: any, now = Date.now()) {
  return !row?.banned && !(row?.suspended_until && Date.parse(row.suspended_until) > now);
}

export function scoreCanReceive(request: any, row: any, now = Date.now()) {
  return scoreAvailable(row, now) &&
    (!request.score_priority_until || now >= Date.parse(request.score_priority_until) || dispatchScore(row) === MAX_SCORE);
}

export function initialScoreCandidates(candidates: any[]) {
  const best = candidates.filter(item => dispatchScore(item.score) === MAX_SCORE);
  return best.length ? best : candidates;
}
