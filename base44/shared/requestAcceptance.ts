import { requestClientId } from './serviceRequestOwner.ts';
import { canReceiveRequest } from './requestDispatch.ts';
import { scoreAvailable, scoreCanReceive } from './scoreDispatchPolicy.ts';
import { loadServiceAreas, isAreaAvailable } from './serviceAreas.ts';
import { appleReviewUserIds, isAppleReviewRequest } from './appleReviewPolicy.ts';

// O raio e a classificação selecionam destinatários no envio, não revogam um
// convite após a atualização do GPS. Segurança e cobertura seguem atuais.
export async function validateRequestAcceptance(base44, user, request, profileId) {
  const deny = (code, error) => ({ error, code });
  const recipientIds = request.ringing_locksmith_ids || [];
  if (isAppleReviewRequest(request) || !(request.ringing_locksmith_user_ids || []).includes(user.id)) {
    return deny('NOT_RECIPIENT', 'Este chamado não foi direcionado a você.');
  }
  if (profileId !== undefined && (typeof profileId !== 'string' || !recipientIds.includes(profileId))) {
    return deny('NOT_RECIPIENT', 'Este chamado não foi direcionado ao perfil exibido. Atualize o painel.');
  }
  const entities = base44.asServiceRole.entities;
  const { items } = await entities.Locksmith.filter({
    created_by_id: user.id,
    id: profileId || { $in: recipientIds },
  }, { sort: '-updated_date', limit: 1 });
  const locksmith = items[0];
  if (!locksmith) return deny('PROFILE_NOT_FOUND', 'O perfil destinatário não está vinculado à sua conta. Atualize o painel.');
  const clientId = requestClientId(request);
  const [scores, areas, blocks, reviewIds] = await Promise.all([
    entities.LocksmithScore.filter({ locksmith_id: locksmith.id }, { sort: '-updated_date', limit: 1 }),
    loadServiceAreas(base44),
    entities.UserBlock.filter({ active: { $ne: false }, $or: [
      { blocker_id: user.id, blocked_id: clientId },
      { blocker_id: clientId, blocked_id: user.id },
    ] }, { limit: 1 }),
    appleReviewUserIds(base44),
  ]);
  if (reviewIds.includes(user.id)) return deny('NOT_RECIPIENT', 'Este chamado não foi direcionado a você.');
  if (blocks.items.length) return deny('CONTACT_BLOCKED', 'Este atendimento está indisponível por um bloqueio entre as contas.');
  if (!scoreAvailable(scores.items[0]) || locksmith.inactive_deactivated || Date.parse(locksmith.blocked_until || '') > Date.now()) {
    return deny('PROFILE_BLOCKED', 'Seu perfil está suspenso ou desativado para receber chamados.');
  }
  if (!isAreaAvailable(areas, locksmith.lat, locksmith.lng) || !isAreaAvailable(areas, request.customer_lat, request.customer_lng)) {
    return deny('AREA_UNAVAILABLE', 'Este atendimento está fora das áreas liberadas.');
  }
  if (!locksmith.online) return deny('PROFILE_OFFLINE', 'Você está offline. Fique online e tente aceitar novamente.');
  if (!canReceiveRequest(locksmith, request)) return deny('SERVICE_UNAVAILABLE', 'Este serviço não está habilitado no seu modo de trabalho ou nos serviços do seu perfil.');
  if (!scoreCanReceive(request, scores.items[0])) return deny('SCORE_PRIORITY', 'Aguarde o fim da prioridade dos chaveiros com score 10 para aceitar.');
  return { locksmith };
}