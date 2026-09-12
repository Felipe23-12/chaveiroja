import { detectCancellationPattern, safetyBlockFor } from './cancellationSafety.ts';
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
  let event = existing[0];
  if (!event) {
    const contexts = await base44.asServiceRole.entities.ServiceRequestContext.filter({ request_id: request.id }, 'created_date', 1);
    const context = contexts[0];
    const fields = ['service_type', 'address', 'latitude', 'longitude', 'place_type', 'building', 'unit', 'vehicle_plate'];
    const snapshot = context ? Object.fromEntries(fields.filter((key) => context[key] !== undefined).map((key) => [key, context[key]])) : {};
    event = await entity.create({ ...snapshot, request_id: request.id, client_id: request.created_by_id, cancelled_at: cancelledAt });
  }
  if (event.service_type) await detectCancellationPattern(base44, event);
}

export function calculateClientBlock(events, now = Date.now()) {
  const days = new Map();
  const seen = new Set();
  for (const event of events) {
    if (seen.has(event.request_id)) continue;
    seen.add(event.request_id);
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
  const daily = calculateClientBlock(events);
  const safety = await safetyBlockFor(base44, clientId);
  const message = 'Limite de 3 cancelamentos diários atingido. Novas solicitações ficam bloqueadas por 6 horas.';
  if (!safety || (daily.blocked && Date.parse(daily.unlockAt) >= Date.parse(safety.blocked_until))) return { ...daily, reason: daily.blocked ? 'daily_limit' : null, message: daily.blocked ? message : null };
  return { ...daily, blocked: true, reason: 'safety', unlockAt: safety.blocked_until, minutesLeft: Math.max(0, Math.ceil((Date.parse(safety.blocked_until) - Date.now()) / 60000)), message: 'Novas solicitações bloqueadas por segurança durante 2 horas devido a cancelamentos relacionados ao mesmo atendimento.' };
}

export async function clientCancellationQuote(base44, request) {
  const block = await getClientCancelBlock(base44, request.created_by_id);
  const elapsed = Date.now() - Date.parse(request.accepted_at || request.created_date);
  const started = ['accepted', 'on_the_way', 'queued'].includes(request.status);
  const free = block.cancelCount < 3 || !started || !Number.isFinite(elapsed) || elapsed < 5 * 60000;
  const fixed = { 'Confecção de Chave de Carro': request.urgency === 'urgent' ? 220 : 150, 'Confecção de Chave de Moto': request.urgency === 'urgent' ? 150 : 100 }[request.service_type];
  const fee = free ? 0 : fixed || Math.round(Number(request.price || 0) * 25) / 100;
  return { free, fee, fixed: !!fixed, locksmithAmount: Math.round(fee * 80) / 100, appFee: Math.round(fee * 20) / 100, cancelCount: block.cancelCount, freeRemaining: Math.max(0, 3 - block.cancelCount) };
}