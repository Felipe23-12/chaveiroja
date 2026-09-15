import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { scoreFor, penalizeLocksmithCancellation, recordClientCancellation, getClientCancelBlock, clientCancellationQuote } from '../../shared/cancellationRules.ts';
import { validatedLocation } from '../../shared/cancellationSafety.ts';

const waitMinutes = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();

const serviceProfiles = {
  'Abertura Residencial': { id: 'abertura_residencial', specialty: 'Residencial' },
  'Abertura Automotiva': { id: 'abertura_automotiva', specialty: 'Automotivo' },
  'Abertura Fechadura Tetra': { id: 'abertura_tetra', specialty: 'Residencial' },
  'Abertura Fechadura Eletrônica': { id: 'abertura_eletronica', specialty: 'Residencial' },
  'Confecção de Chave de Carro': { id: 'confeccao_chave_carro', specialty: 'Automotivo' },
  'Confecção de Chave de Moto': { id: 'confeccao_chave_moto', specialty: 'Automotivo' },
};

function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function canReceiveRequest(locksmith, request) {
  const service = serviceProfiles[request.service_type];
  if (!service) return false;
  if (locksmith.services?.length) return locksmith.services.includes(service.id);
  const specialties = locksmith.specialties?.length ? locksmith.specialties : [locksmith.specialty];
  return specialties.includes(service.specialty);
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

    if (action === 'client_block_status') {
      return Response.json(await getClientCancelBlock(base44, user.id));
    }

    if (action === 'sync_online_requests') {
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      const locksmith = profiles.find((item) => item.id === body.locksmith_id) || profiles[0];
      const receivesAppCalls = locksmith?.work_mode === 'app' || (locksmith?.work_mode === 'livre' && locksmith.receive_app_requests !== false);
      if (!locksmith || locksmith.online !== true || !receivesAppCalls || !locksmith.lat || !locksmith.lng) {
        return Response.json({ added: 0 });
      }
      const scoreRows = await base44.asServiceRole.entities.LocksmithScore.filter({ locksmith_id: locksmith.id });
      const score = scoreRows[0];
      if (score?.banned || (score?.suspended_until && Date.parse(score.suspended_until) > Date.now())) {
        return Response.json({ added: 0 });
      }
      const requests = await base44.asServiceRole.entities.ServiceRequest.filter({ status: 'ringing' }, '-created_date', 100);
      let added = 0;
      for (const item of requests) {
        if ((item.ringing_locksmith_ids || []).includes(locksmith.id) || !item.customer_lat || !item.customer_lng || !canReceiveRequest(locksmith, item)) continue;
        const distance = distanceKm({ lat: locksmith.lat, lng: locksmith.lng }, { lat: item.customer_lat, lng: item.customer_lng });
        if (distance > Math.min(Number(locksmith.service_radius_km || 15), 100)) continue;
        const fresh = await base44.asServiceRole.entities.ServiceRequest.get(item.id);
        if (!fresh || fresh.status !== 'ringing' || (fresh.ringing_locksmith_ids || []).includes(locksmith.id)) continue;
        await base44.asServiceRole.entities.ServiceRequest.update(fresh.id, {
          ringing_locksmith_ids: [...(fresh.ringing_locksmith_ids || []), locksmith.id],
          ringing_locksmith_user_ids: [...new Set([...(fresh.ringing_locksmith_user_ids || []), locksmith.created_by_id])],
          rejections: (fresh.rejections || []).filter((rejection) => rejection.locksmith_id !== locksmith.id),
        });
        added += 1;
      }
      return Response.json({ added });
    }

    if (action === 'create_request') {
      if (body.data?.service_type === 'Confecção de Chave de Carro') {
        const vehicle = String(body.data.vehicle_info || '').trim();
        const toyota = /^toyota(?:\s|$)/i.test(vehicle);
        const landRover2020 = /^land\s*rover(?:\s|$)/i.test(vehicle) && /Ano\s+(20(?:2\d|[3-9]\d)|2[1-9]\d{2})/i.test(vehicle);
        if (landRover2020 && !/Alarme:\s*(?:trancado|não trancado)/i.test(vehicle)) {
          return Response.json({ error: 'Informe se a Land Rover está trancada no alarme.' }, { status: 400 });
        }
        const alarmLocked = landRover2020 && /Alarme:\s*trancado/i.test(vehicle);
        const minimum = 380 + (toyota ? 700 : 0) + (alarmLocked ? 8000 : 0);
        if (!Number.isFinite(Number(body.data.price)) || Number(body.data.price) < minimum) {
          return Response.json({ error: alarmLocked
            ? 'Land Rover 2020 ou mais nova trancada no alarme exige o adicional de R$ 8.000,00.'
            : toyota
              ? 'A confecção Toyota é de alta complexidade: mínimo de R$ 380,00 mais R$ 700,00 de adicional, mesmo após descontos.'
              : 'O valor mínimo da confecção de chave de carro é R$ 380,00, mesmo após descontos.' }, { status: 400 });
        }
      }
      const block = await getClientCancelBlock(base44, user.id);
      if (block.blocked) return Response.json({ error: `${block.message} Liberação em ${block.minutesLeft} min.`, ...block }, { status: 403 });
      const data = body.data || {};
      if (!data.service_type || !String(data.address || '').trim()) return Response.json({ error: 'Informe o serviço e o endereço' }, { status: 400 });
      const allowed = ['service_type', 'address', 'description', 'urgency', 'locksmith_id', 'locksmith_name', 'locksmith_user_id', 'ringing_locksmith_ids', 'ringing_locksmith_user_ids', 'customer_lat', 'customer_lng', 'locksmith_lat', 'locksmith_lng', 'price', 'key_value', 'fipe_value', 'key_type', 'vehicle_info', 'labor_cost', 'locomotion_cost', 'distance_km', 'extra_cost', 'discount_applied', 'discount_amount', 'pricing_calculation'];
      const values = Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
      const location = validatedLocation(data);
      const detail = location.place_type === 'condominium' ? `Bloco/torre: ${location.building} · Unidade: ${location.unit}` : '';
      if (detail) values.description = [values.description, detail].filter(Boolean).join(' — ');
      const request = await base44.entities.ServiceRequest.create({ ...values, status: 'ringing' });
      await base44.asServiceRole.entities.ServiceRequestContext.create({ ...location, request_id: request.id, client_id: user.id });
      return Response.json({ request });
    }

    if (action === 'score_event') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      const locksmith = profiles.find((item) => item.id === body.locksmith_id) || profiles[0];
      if (!request || !locksmith) return Response.json({ error: 'Chamado ou perfil não encontrado' }, { status: 404 });
      const eventType = body.event_type;
      const allowed = eventType === 'accepted'
        ? request.locksmith_user_id === user.id && ['accepted', 'queued', 'on_the_way', 'completed'].includes(request.status)
        : (request.ringing_locksmith_user_ids || []).includes(user.id);
      if (!allowed || !['accepted', 'rejected'].includes(eventType)) return Response.json({ error: 'Evento inválido' }, { status: 403 });
      const existing = await base44.asServiceRole.entities.LocksmithScoreEvent.filter({ request_id: request.id, locksmith_id: locksmith.id, event_type: eventType });
      const score = await scoreFor(base44, locksmith);
      if (existing.length) return Response.json({ success: true, score: score.score, duplicate: true });
      let nextScore = Number(score.score ?? 10);
      const update = {};
      if (eventType === 'accepted') {
        update.accepted_count = Number(score.accepted_count || 0) + 1;
      } else {
        const rejected = Number(score.rejected_count || 0) + 1;
        update.rejected_count = rejected;
        if (rejected % 3 === 0) nextScore -= 1;
      }
      update.score = Math.max(0, Math.min(10, Math.round(nextScore * 10) / 10));
      await base44.asServiceRole.entities.LocksmithScoreEvent.create({ request_id: request.id, locksmith_id: locksmith.id, locksmith_user_id: user.id, event_type: eventType, points: eventType === 'accepted' ? 0 : (update.rejected_count % 3 === 0 ? -1 : 0) });
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

    if (action === 'cancel_quote') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request || request.created_by_id !== user.id) return Response.json({ error: 'Chamado não encontrado' }, { status: 403 });
      return Response.json(await clientCancellationQuote(base44, request));
    }

    if (action === 'cancel_request') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.status === 'completed') return Response.json({ error: 'Um chamado concluído não pode ser cancelado' }, { status: 409 });

      const actor = body.actor;
      const isClient = actor === 'cliente' && request.created_by_id === user.id;
      const isLocksmith = actor === 'chaveiro' && request.locksmith_user_id === user.id;
      if (!isClient && !isLocksmith) return Response.json({ error: 'Você não pode cancelar este chamado' }, { status: 403 });
      if (request.status === 'cancelled') {
        await recordClientCancellation(base44, request, request.updated_date);
        await penalizeLocksmithCancellation(base44, request);
        return Response.json({ success: true, request, duplicate: true });
      }

      const update = { status: 'cancelled', cancelled_by: actor };
      if (isClient) {
        const quote = await clientCancellationQuote(base44, request);
        if (!quote.free && body.confirmed_fee !== true) return Response.json({ error: 'Confirme a taxa de cancelamento para continuar', requires_fee: true, ...quote }, { status: 409 });
        update.cancellation_fee = quote.fee;
        update.cancellation_locksmith_amount = quote.locksmithAmount;
        update.cancellation_app_fee = quote.appFee;
        if (quote.fee > 0) update.payment_status = 'pending';
      }

      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, update);
      await recordClientCancellation(base44, updated);
      await penalizeLocksmithCancellation(base44, { ...updated, accepted_at: request.accepted_at || (['accepted', 'queued', 'on_the_way'].includes(request.status) ? request.created_date : null) });
      return Response.json({ success: true, request: updated });
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
        const cancelled = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'cancelled', cancelled_by: 'chaveiro', cancellation_reason: 'Relato de ameaça ou agressão em análise' });
        await penalizeLocksmithCancellation(base44, cancelled);
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
        if (['completed', 'cancelled'].includes(request.status)) return Response.json({ success: true });
        const quote = await clientCancellationQuote(base44, request);
        const cancelled = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'cancelled', cancelled_by: 'cliente', cancellation_fee: quote.fee, cancellation_locksmith_amount: quote.locksmithAmount, cancellation_app_fee: quote.appFee, ...(quote.fee > 0 ? { payment_status: 'pending' } : {}) });
        await recordClientCancellation(base44, cancelled);
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