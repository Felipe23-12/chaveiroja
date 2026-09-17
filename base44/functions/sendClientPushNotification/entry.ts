import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';

// Envia notificação push ao CLIENTE quando o andamento do chamado muda.
// Toca no celular do cliente mesmo com o app fechado / tela bloqueada.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!verifyInternalCall(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const serviceRequestId = body.service_request_id;
    if (!serviceRequestId) {
      return Response.json({ error: 'service_request_id é obrigatório' }, { status: 400 });
    }

    const sr = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    if (!sr) return Response.json({ error: 'Pedido não encontrado' }, { status: 404 });

    const clientUserId = sr.created_by_id;
    if (!clientUserId) return Response.json({ skipped: true, reason: 'Pedido sem cliente vinculado' });

    const locksmith = sr.locksmith_name || 'O chaveiro';
    let key = null;
    let title = '';
    let content = '';

    if ((sr.description || '').includes('Ajuste no local confirmado pelo chaveiro') && !(sr.client_push_sent || []).includes('condition_adjustment')) {
      key = 'condition_adjustment';
      const charged = (sr.description || '').includes('Adicional único de R$ 25,00 aplicado');
      title = charged ? 'Valor do chamado atualizado' : 'Condição do chamado atualizada';
      content = charged
        ? 'O chaveiro anexou fotos comprobatórias e aplicou o adicional único de R$ 25,00.'
        : 'O chaveiro anexou fotos da condição encontrada. Nenhum novo adicional foi aplicado.';
    } else if (sr.status === 'cancelled') {
      key = 'cancelled';
      title = '❌ Chamado cancelado';
      content = sr.cancellation_reason || 'Seu chamado foi cancelado.';
    } else if (sr.status === 'completed') {
      key = 'completed';
      title = '✅ Serviço concluído';
      content = `${sr.service_type} finalizado. Avalie o atendimento!`;
    } else if ((sr.end_photos || []).length > 0 && !sr.client_confirmed) {
      key = 'service_done';
      title = '🔧 Serviço finalizado';
      content = `${locksmith} finalizou o serviço. Confirme e efetue o pagamento.`;
    } else if (sr.locksmith_arrived && !sr.client_arrived_confirmed) {
      key = 'arrived';
      title = '📍 O chaveiro chegou!';
      content = `${locksmith} está no local. Confirme a chegada no app.`;
    } else if (sr.status === 'on_the_way') {
      key = 'on_the_way';
      title = '🚗 Chaveiro a caminho';
      content = `${locksmith} está indo até você. Acompanhe em tempo real.`;
    } else if (sr.status === 'accepted') {
      key = 'accepted';
      title = '🔔 Chamado aceito';
      content = `${locksmith} aceitou seu chamado de ${sr.service_type}.`;
    }

    if (!key) return Response.json({ skipped: true, reason: `status ${sr.status} não gera aviso` });

    const alreadySent = sr.client_push_sent || [];
    if (alreadySent.includes(key)) {
      return Response.json({ skipped: true, reason: `aviso ${key} já enviado` });
    }

    await base44.asServiceRole.integrations.Core.SendPushNotification({
      user_id: clientUserId,
      title,
      content,
      action_label: 'Abrir chamado',
      action_url: `/acompanhamento/${serviceRequestId}`,
    });

    await base44.asServiceRole.entities.ServiceRequest.update(serviceRequestId, {
      client_push_sent: [...alreadySent, key],
    });

    return Response.json({ success: true, key, user_id: clientUserId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}