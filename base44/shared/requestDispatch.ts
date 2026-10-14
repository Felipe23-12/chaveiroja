import { filterAppReadyLocksmiths } from './locksmithAppReadiness.ts';
import { requestClientId } from './serviceRequestOwner.ts';
import { loadServiceAreas, isAreaAvailable } from './serviceAreas.ts';
import { appleReviewUserIds, isAppleReviewRequest } from './appleReviewPolicy.ts';
import { dispatchScore, scoreAvailable, scoreCanReceive } from './scoreDispatchPolicy.ts';

const profiles = {
  'Abertura Residencial': { id: 'abertura_residencial', specialty: 'Residencial' },
  'Abertura Automotiva': { id: 'abertura_automotiva', specialty: 'Automotivo' },
  'Abertura Fechadura Tetra': { id: 'abertura_tetra', specialty: 'Residencial' },
  'Abertura Fechadura Eletrônica': { id: 'abertura_eletronica', specialty: 'Residencial' },
  'Confecção de Chave de Carro': { id: 'confeccao_chave_carro', specialty: 'Automotivo' },
  'Confecção de Chave de Moto': { id: 'confeccao_chave_moto', specialty: 'Automotivo' },
};

export function distanceKm(a: any, b: any) {
  const rad = (value: number) => value * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function canReceiveRequest(locksmith: any, request: any, now = Date.now()) {
  const profile = profiles[request?.service_type];
  if (!profile || locksmith.online !== true || locksmith.inactive_deactivated === true) return false;
  if (locksmith.work_mode === 'livre' && locksmith.receive_app_requests === false) return false;
  if (locksmith.blocked_until && Date.parse(locksmith.blocked_until) > now) return false;
  const services = Array.isArray(locksmith.services) ? locksmith.services : [];
  if (services.length) return services.includes(profile.id);
  const specialties = Array.isArray(locksmith.specialties) ? locksmith.specialties : [];
  return specialties.length ? specialties.includes(profile.specialty) : locksmith.specialty === profile.specialty;
}

export async function loadDispatchCandidates(base44: any, request: any, suppliedAreas?: any, now = Date.now()) {
  if (isAppleReviewRequest(request)) return [];
  const entities = base44.asServiceRole.entities;
  const areas = suppliedAreas || await loadServiceAreas(base44);
  if (!isAreaAvailable(areas, request.customer_lat, request.customer_lng)) return [];
  const [online, reviewIds, blocks] = await Promise.all([
    entities.Locksmith.filter({ online: true }, '-updated_date', 500),
    appleReviewUserIds(base44),
    requestClientId(request) ? entities.UserBlock.filter({
      $or: [{ blocker_id: requestClientId(request) }, { blocked_id: requestClientId(request) }],
      active: { $ne: false },
    }, '-created_date', 500) : [],
  ]);
  const blocked = new Set(blocks.map((block: any) =>
    block.blocker_id === requestClientId(request) ? block.blocked_id : block.blocker_id));
  const scoreRows = online.length ? await entities.LocksmithScore.filter({ locksmith_id: { $in: online.map((l: any) => l.id) } }, '-updated_date', 500) : [];
  const scores = new Map(scoreRows.map((row: any) => [row.locksmith_id, row]));
  const searchRadius = Math.max(0, Math.min(100, Number(request.search_radius_km ?? 100)));
  const ready = await filterAppReadyLocksmiths(base44, online);
  return ready.filter((l: any) => l.created_by_id && !blocked.has(l.created_by_id) &&
      !reviewIds.includes(l.created_by_id) && canReceiveRequest(l, request, now) &&
      isAreaAvailable(areas, l.lat, l.lng) && scoreAvailable(scores.get(l.id), now))
    .map((locksmith: any) => ({ locksmith, score: scores.get(locksmith.id),
      distance: distanceKm({ lat: Number(locksmith.lat), lng: Number(locksmith.lng) },
        { lat: Number(request.customer_lat), lng: Number(request.customer_lng) }) }))
    .filter((item: any) => Number.isFinite(item.distance) &&
      item.distance <= Math.min(Number(item.locksmith.service_radius_km || 15), searchRadius))
    .sort((a: any, b: any) => dispatchScore(b.score) - dispatchScore(a.score) || a.distance - b.distance)
    .slice(0, 100);
}

// A gravação condicional não pode reabrir um chamado já aceito/cancelado.
export async function refreshRequestDispatch(base44: any, requestId: string, now = Date.now()) {
  const entity = base44.asServiceRole.entities.ServiceRequest;
  for (let attempt = 0; attempt < 3; attempt++) {
    const request = await entity.get(requestId);
    if (!request || !['ringing', 'searching'].includes(request.status) || isAppleReviewRequest(request)) {
      return { request, added: 0 };
    }
    const patch: any = {};
    const radius = Number(request.search_radius_km ?? 100);
    const radiusSince = Date.parse(request.search_radius_updated_at || request.created_date);
    if (request.auto_expand_radius === true && radius < 100 && now - radiusSince >= 300_000) {
      patch.search_radius_km = Math.min(100, Math.round(radius * 1.2 * 10) / 10);
      patch.search_radius_updated_at = new Date(now).toISOString();
    }
    const candidates = (await loadDispatchCandidates(base44, { ...request, ...patch }, undefined, now))
      .filter((item: any) => scoreCanReceive(request, item.score, now));
    const ids = [...new Set([...(request.ringing_locksmith_ids || []), ...candidates.map((item: any) => item.locksmith.id)])];
    const users = [...new Set([...(request.ringing_locksmith_user_ids || []), ...candidates.map((item: any) => item.locksmith.created_by_id)])];
    const added = ids.length - (request.ringing_locksmith_ids || []).length;
    if (request.score_priority_until && now >= Date.parse(request.score_priority_until) && !request.score_dispatch_expanded_at) {
      patch.score_dispatch_expanded_at = new Date(now).toISOString();
    }
    if (!added && !Object.keys(patch).length) return { request, added: 0 };
    patch.ringing_locksmith_ids = ids;
    patch.ringing_locksmith_user_ids = users;
    const result = await entity.updateMany({
      id: request.id, status: request.status,
      ...(request.updated_date ? { updated_date: request.updated_date } : {}),
    }, { $set: patch });
    if (result?.updated !== 1) continue;
    // Publica um evento sem regravar status ou destinatários que possam ter avançado.
    const updated = await entity.update(request.id, {
      dispatch_refreshed_at: new Date(now).toISOString(),
    }).catch(() => entity.get(request.id));
    return { request: updated, added };
  }
  return { request: await entity.get(requestId), added: 0 };
}
