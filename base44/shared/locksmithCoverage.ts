import { loadServiceAreas, isAreaAvailable } from './serviceAreas.ts';

export async function updateLocksmithLocation(base44, user, body) {
  if (typeof body.locksmith_id !== 'string' || !body.locksmith_id.trim()) return Response.json({ code: 'PROFILE_REQUIRED', error: 'Atualize seu painel antes de entrar online.' }, { status: 400 });
  const profiles = await base44.asServiceRole.entities.Locksmith.filter({ id: body.locksmith_id, created_by_id: user.id }, '-updated_date', 1);
  const locksmith = profiles[0];
  if (!locksmith) return Response.json({ code: 'PROFILE_NOT_FOUND', error: 'O perfil exibido não está mais vinculado à sua sessão. Atualize o painel e entre novamente com sua conta de chaveiro.' }, { status: 404 });
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
    last_activity_at: new Date().toISOString(),
  });
  if (body.go_online === true && !allowed) return Response.json({ code: 'AREA_UNAVAILABLE', error: 'Esta área ainda não está disponível para atendimento. Sua conta continua ativa; entre em uma área liberada.' }, { status: 403 });
  return Response.json({ locksmith: updated, allowed });
}