import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

const waitMinutes = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();

async function scoreFor(base44, locksmith) {
  const rows = await base44.asServiceRole.entities.LocksmithScore.filter({ locksmith_id: locksmith.id });
  if (rows[0]) return rows[0];
  return await base44.asServiceRole.entities.LocksmithScore.create({
    locksmith_id: locksmith.id,
    locksmith_user_id: locksmith.created_by_id,
    score: 10,
    accepted_count: 0,
    rejected_count: 0,
    abandonment_count: 0,
    banned: false,
  });
}

async function notify(base44, userId, title, content, requestId) {
  if (!userId) return;
  await base44.asServiceRole.integrations.Core.SendPushNotification({
    user_id: userId,
    title,
    content,
    action_label: 'Abrir chamado',
    action_url: `/acompanhamento/${requestId}`,
  }).catch(() => null);
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const action = body.action;

    if (action === 'score_event') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      const locksmith = profiles.find((item) => item.id === body.locksmith_id) || profiles[0];
      if (!request || !locksmith) return Response.json({ error: 'Chamado ou perfil não encontrado' }, { status: 404 });
      const eventType = body.event_type;
      const allowed = eventType === 'accepted'
        ? request.locksmith_user_id === user.id && ['accepted', 'on_the_way', 'completed'].includes(request.status)
        : (request.ringing_locksmith_user_ids || []).includes(user.id);
      if (!allowed || !['accepted', 'rejected'].includes(eventType)) return Response.json({ error: 'Evento inválido' }, { status: 403 });
      const existing = await base44.asServiceRole.entities.LocksmithScoreEvent.filter({ request_id: request.id, locksmith_id: locksmith.id, event_type: eventType });
      const score = await scoreFor(base44, locksmith);
      if (existing.length) return Response.json({ success: true, score: score.score, duplicate: true });
      let nextScore = Number(score.score ?? 10);
      const update = {};
      if (eventType === 'accepted') {
        nextScore += 0.5;
        update.accepted_count = Number(score.accepted_count || 0) + 1;
      } else {
        const rejected = Number(score.rejected_count || 0) + 1;
        update.rejected_count = rejected;
        if (rejected % 3 === 0) nextScore -= 1;
      }
      update.score = Math.max(0, Math.round(nextScore * 10) / 10);
      await base44.asServiceRole.entities.LocksmithScoreEvent.create({ request_id: request.id, locksmith_id: locksmith.id, locksmith_user_id: user.id, event_type: eventType, points: eventType === 'accepted' ? 0.5 : (update.rejected_count % 3 === 0 ? -1 : 0) });
      await base44.asServiceRole.entities.LocksmithScore.update(score.id, update);
      return Response.json({ success: true, score: update.score });
    }

    if (action === 'heartbeat') {
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      if (!profiles[0]) return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
      const score = await scoreFor(base44, profiles[0]);
      await base44.asServiceRole.entities.LocksmithScore.update(score.id, { last_heartbeat_at: new Date().toISOString() });
      return Response.json({ success: true });
    }

    if (action === 'open_case') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request || request.locksmith_user_id !== user.id || !request.locksmith_arrived) return Response.json({ error: 'Confirme sua chegada antes de justificar o cancelamento' }, { status: 403 });
      const existing = await base44.asServiceRole.entities.ServiceCancellationCase.filter({ request_id: request.id });
      if (existing.some((item) => !['resolved', 'cancelled'].includes(item.status))) return Response.json({ error: 'Já existe uma análise em andamento' }, { status: 409 });
      const reason = body.reason;
      if (!['address_incorrect', 'threat', 'client_cancelled'].includes(reason)) return Response.json({ error: 'Motivo inválido' }, { status: 400 });
      if (reason === 'threat' && String(body.report || '').trim().length < 20) return Response.json({ error: 'Descreva o ocorrido com detalhes' }, { status: 400 });
      if (reason === 'client_cancelled' && !body.evidence_photo) return Response.json({ error: 'A foto do local é obrigatória' }, { status: 400 });
      const status = reason === 'address_incorrect' ? 'waiting_address' : reason === 'threat' ? 'threat_suspended' : 'waiting_client';
      const deadline = reason === 'address_incorrect' ? waitMinutes(6) : reason === 'threat' ? waitMinutes(48 * 60) : waitMinutes(5);
      const item = await base44.asServiceRole.entities.ServiceCancellationCase.create({ request_id: request.id, client_id: request.created_by_id, locksmith_id: request.locksmith_id, locksmith_user_id: user.id, reason, report: body.report, evidence_photo: body.evidence_photo, status, deadline });
      if (reason === 'threat') {
        const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
        const score = await scoreFor(base44, profiles[0]);
        await base44.asServiceRole.entities.LocksmithScore.update(score.id, { suspended_until: deadline });
        await base44.asServiceRole.entities.Locksmith.update(request.locksmith_id, { online: false });
        await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'cancelled', cancelled_by: 'chaveiro', cancellation_reason: 'Relato de ameaça ou agressão em análise' });
        await notify(base44, request.created_by_id, 'Atendimento em análise', 'O chaveiro relatou uma situação de segurança. Informe sua versão no aplicativo.', request.id);
      } else {
        const text = reason === 'address_incorrect' ? 'O chaveiro está no endereço informado e aguardará 6 minutos. Encontre-o no local.' : 'O chaveiro informou que você cancelou. Confirme ou negue em até 5 minutos.';
        await notify(base44, request.created_by_id, 'Confirmação necessária', text, request.id);
      }
      return Response.json({ success: true, case: item, deadline });
    }

    if (action === 'resolve_case') {
      const item = await base44.asServiceRole.entities.ServiceCancellationCase.get(body.case_id);
      if (!item || item.locksmith_user_id !== user.id || item.status !== 'waiting_address') return Response.json({ error: 'Análise não encontrada' }, { status: 404 });
      await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { status: 'resolved', resolved_at: new Date().toISOString() });
      return Response.json({ success: true });
    }

    if (action === 'client_response') {
      const item = await base44.asServiceRole.entities.ServiceCancellationCase.get(body.case_id);
      if (!item || item.client_id !== user.id) return Response.json({ error: 'Análise não encontrada' }, { status: 404 });
      if (item.reason === 'threat') {
        if (String(body.report || '').trim().length < 10) return Response.json({ error: 'Informe sua versão' }, { status: 400 });
        await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { client_response: 'reported', client_report: body.report });
      } else if (item.reason === 'client_cancelled' && body.response === 'confirmed') {
        await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { client_response: 'confirmed', status: 'cancelled', resolved_at: new Date().toISOString() });
        const request = await base44.asServiceRole.entities.ServiceRequest.get(item.request_id);
        const fixed = { 'Confecção de Chave de Carro': request.urgency === 'urgent' ? 220 : 150, 'Confecção de Chave de Moto': request.urgency === 'urgent' ? 150 : 100 }[request.service_type];
        const fee = fixed || Math.round(Number(request.price || 0) * 25) / 100;
        await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'cancelled', cancelled_by: 'cliente', cancellation_fee: fee, cancellation_locksmith_amount: Math.round(fee * 80) / 100, cancellation_app_fee: Math.round(fee * 20) / 100, payment_status: 'pending' });
      } else if (item.reason === 'client_cancelled' && body.response === 'denied') {
        const deadline = waitMinutes(10);
        await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { client_response: 'denied', status: 'monitoring_service', deadline });
        await notify(base44, item.locksmith_user_id, 'Cliente não confirmou cancelamento', 'Encontre o cliente e conclua o atendimento. Abandonar o local gera bloqueio.', item.request_id);
      } else return Response.json({ error: 'Resposta inválida' }, { status: 400 });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}