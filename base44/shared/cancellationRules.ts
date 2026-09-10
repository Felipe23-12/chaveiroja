const sixHours = 6 * 3600000;
const localDay = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));

async function allRows(entity, query) {
  const rows = [];
  for (let skip = 0; ; skip += 200) {
    const page = await entity.filter(query, 'created_date', 200, skip);
    rows.push(...page);
    if (page.length < 200) return rows;
  }
}

export async function scoreFor(base44, locksmith) {
  const entity = base44.asServiceRole.entities.LocksmithScore;
  const rows = await entity.filter({ locksmith_id: locksmith.id });
  if (rows[0]) {
    const score = Math.max(0, Math.min(10, Number(rows[0].score ?? 10)));
    if (score !== rows[0].score) return await entity.update(rows[0].id, { score });
    return rows[0];
  }
  return await entity.create({ locksmith_id: locksmith.id, locksmith_user_id: locksmith.created_by_id, score: 10, accepted_count: 0, rejected_count: 0, abandonment_count: 0, banned: false });
}

export async function penalizeLocksmithCancellation(base44, request) {
  if (request.cancelled_by !== 'chaveiro' || !request.locksmith_id || !request.accepted_at) return;
  const entity = base44.asServiceRole.entities.LocksmithScoreEvent;
  const query = { request_id: request.id, locksmith_id: request.locksmith_id, event_type: 'cancelled' };
  const existing = await entity.filter(query);
  if (existing.length) return;
  const locksmith = await base44.asServiceRole.entities.Locksmith.get(request.locksmith_id);
  const score = await scoreFor(base44, locksmith);
  await base44.asServiceRole.entities.LocksmithScore.update(score.id, { score: Math.max(0, score.score - 1) });
  await entity.create({ ...query, locksmith_user_id: locksmith.created_by_id, points: -1 });
}

export async function recordClientCancellation(base44, request, cancelledAt = new Date().toISOString()) {
  if (request.cancelled_by !== 'cliente') return;
  const entity = base44.asServiceRole.entities.ClientCancellationEvent;
  const existing = await entity.filter({ request_id: request.id });
  if (!existing.length) await entity.create({ request_id: request.id, client_id: request.created_by_id, cancelled_at: cancelledAt });
}

export function calculateClientBlock(events, now = Date.now()) {
  const days = new Map();
  for (const event of events) {
    const time = Date.parse(event.cancelled_at);
    if (!Number.isFinite(time) || time > now) continue;
    const day = localDay(time);
    days.set(day, [...(days.get(day) || []), time]);
  }
  let unlockAt = 0;
  for (const times of days.values()) {
    if (times.length >= 3) unlockAt = Math.max(unlockAt, Math.max(...times) + sixHours);
  }
  return { blocked: unlockAt > now, minutesLeft: Math.max(0, Math.ceil((unlockAt - now) / 60000)), cancelCount: days.get(localDay(now))?.length || 0, unlockAt: unlockAt > now ? new Date(unlockAt).toISOString() : null };
}

export async function getClientCancelBlock(base44, clientId) {
  // Preserva a hora dos cancelamentos legados antes de futuras alterações de pagamento.
  const since = new Date(Date.now() - 48 * 3600000).toISOString();
  const legacy = await allRows(base44.asServiceRole.entities.ServiceRequest, { created_by_id: clientId, status: 'cancelled', cancelled_by: 'cliente', updated_date: { $gte: since } });
  for (const request of legacy) await recordClientCancellation(base44, request, request.updated_date);
  const events = await allRows(base44.asServiceRole.entities.ClientCancellationEvent, { client_id: clientId, cancelled_at: { $gte: since } });
  return calculateClientBlock(events);
}