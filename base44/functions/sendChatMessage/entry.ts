import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { secrets } from 'base44:runtime';
import { requireServiceCoverage, coverageError } from '../../shared/serviceCoverage.ts';
import { isAreaAvailable } from '../../shared/serviceAreas.ts';
import { clientRegistrationComplete } from '../../shared/registrationEligibility.ts';
import { verifiedCpf } from '../../shared/verifiedCpf.ts';
import { appleReviewRole, reviewPairAllowed } from '../../shared/appleReviewPolicy.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Faça login para enviar mensagens.' }, { status: 401 });
    const { locksmith_id, client_id, message, photo_url, customer_lat, customer_lng } = await req.json();
    const text = String(message || '').trim();
    if (!locksmith_id || !text || text.length > 1000) return Response.json({ error: 'Mensagem inválida.' }, { status: 400 });
    if (/https?:\/\/|www\./i.test(text)) return Response.json({ error: 'Links não são permitidos.' }, { status: 400 });
    if (photo_url !== undefined && photo_url !== null && photo_url !== '') {
      const appId = secrets.get('BASE44_APP_ID');
      const prefixes = [
        `https://base44.app/api/apps/${appId}/files/mp/public/${appId}/`,
        `https://media.base44.com/images/public/${appId}/`,
      ];
      const prefix = typeof photo_url === 'string' && prefixes.find(value => photo_url.startsWith(value));
      const filename = prefix ? photo_url.slice(prefix.length) : '';
      if (!appId || !prefix || photo_url.length > 2000 || filename.includes('..') || !/^[a-z0-9_][a-z0-9_. -]*\.(jpe?g|png|webp|gif)$/i.test(filename)) {
        return Response.json({ error: 'Envie uma imagem válida pelo aplicativo.' }, { status: 400 });
      }
    }
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(locksmith_id).catch(() => null);
    if (!locksmith) return Response.json({ error: 'Chaveiro não encontrado.' }, { status: 404 });
    const isLocksmith = locksmith.created_by_id === user.id;
    const pairClientId = isLocksmith ? client_id : user.id;
    if (!await reviewPairAllowed(base44, pairClientId, locksmith.created_by_id)) return Response.json({ error: 'Contas de revisão só podem conversar entre si.' }, { status: 403 });
    const review = appleReviewRole(user);
    if (!isLocksmith && !review) {
      if (user.role !== 'admin' && !clientRegistrationComplete(user, await verifiedCpf(base44, user.id))) {
        const appCalls = await base44.asServiceRole.entities.ServiceRequest.filter({
          created_by_id: user.id, locksmith_id,
          status: { $in: ['queued', 'accepted', 'on_the_way', 'completed'] },
        }, '-created_date', 1);
        if (!appCalls.length) return Response.json({ code: 'REGISTRATION_REQUIRED', error: 'Complete seu cadastro para conversar no Modo Livre. O chat dos seus atendimentos pelo aplicativo continua disponível.' }, { status: 403 });
      }
      const areas = await requireServiceCoverage(base44, customer_lat, customer_lng);
      if (!isAreaAvailable(areas, locksmith.lat, locksmith.lng)) throw coverageError();
    }
    if (isLocksmith && !client_id) return Response.json({ error: 'Cliente não informado.' }, { status: 400 });
    const customerId = isLocksmith ? client_id : user.id;
    const otherUserId = isLocksmith ? customerId : locksmith.created_by_id;
    if (!otherUserId) return Response.json({ error: 'Destinatário sem usuário vinculado.' }, { status: 400 });
    const [blockedBySender, blockedByRecipient] = await Promise.all([
      base44.asServiceRole.entities.UserBlock.filter({ blocker_id: user.id, blocked_id: otherUserId, active: true }),
      base44.asServiceRole.entities.UserBlock.filter({ blocker_id: otherUserId, blocked_id: user.id, active: true }),
    ]);
    if (blockedBySender.length || blockedByRecipient.length) {
      return Response.json({ error: 'O envio de mensagens está bloqueado para esta conversa.' }, { status: 403 });
    }
    if (isLocksmith) {
      const conversation = await base44.asServiceRole.entities.ChatMessage.filter({ locksmith_id, client_id: customerId });
      const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ locksmith_id, created_by_id: customerId });
      if (!conversation.length && !requests.length) return Response.json({ error: 'Conversa não encontrada.' }, { status: 403 });
    }
    const created = await base44.asServiceRole.entities.ChatMessage.create({
      locksmith_id, locksmith_name: locksmith.name, locksmith_user_id: locksmith.created_by_id,
      client_id: customerId, client_name: isLocksmith ? undefined : (user.full_name || 'Cliente'),
      sender_type: isLocksmith ? 'locksmith' : 'customer',
      sender_name: isLocksmith ? locksmith.name : (user.full_name || 'Cliente'),
      sender_user_id: user.id, message: text,
      ...(photo_url ? { photo_url } : {}),
    });
    return Response.json({ message: created });
  } catch (error) {
    if (error.code === 'AREA_UNAVAILABLE') return Response.json({ code: error.code, error: error.message }, { status: 403 });
    return Response.json({ error: error.message || 'Erro ao enviar mensagem.' }, { status: 500 });
  }
}