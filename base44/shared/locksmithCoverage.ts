import { loadServiceAreas, isAreaAvailable } from './serviceAreas.ts';

export async function updateLocksmithLocation(base44, user, body) {
  const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
  const locksmith = profiles.find(p => p.id === body.locksmith_id);
  if (!locksmith) return Response.json({ error: 'Perfil não encontrado' }, { status: 403 });
  const { lat, lng } = body;
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return Response.json({ error: 'Obtenha sua localização pelo GPS.' }, { status: 400 });
  const areas = await loadServiceAreas(base44);
  const allowed = isAreaAvailable(areas, lat, lng);
  if (body.go_online === true) {
    if (locksmith.inactive_deactivated || Date.parse(locksmith.blocked_until || '') > Date.now() || (locksmith.work_mode === 'livre' && locksmith.monthly_fee_paid !== true)) return Response.json({ error: 'Regularize seu perfil para ficar online.' }, { status: 403 });
    const scores = await base44.asServiceRole.entities.LocksmithScore.filter({ locksmith_id: locksmith.id });
    if (scores[0]?.banned || Date.parse(scores[0]?.suspended_until || '') > Date.now()) return Response.json({ error: 'Conta temporariamente suspensa.' }, { status: 403 });
  }
  const updated = await base44.asServiceRole.entities.Locksmith.update(locksmith.id, {
    lat, lng, online: allowed && (body.go_online === true || locksmith.online === true),
  });
  if (body.go_online === true && !allowed) return Response.json({ code: 'AREA_UNAVAILABLE', error: 'Esta área ainda não está disponível para atendimento. Sua conta continua ativa; entre em uma área liberada.' }, { status: 403 });
  return Response.json({ locksmith: updated, allowed });
}