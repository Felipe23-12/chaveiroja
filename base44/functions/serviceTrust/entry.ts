import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { scoreFor, penalizeLocksmithCancellation, recordClientCancellation, getClientCancelBlock, clientCancellationQuote } from '../../shared/cancellationRules.ts';
import { validatedLocation } from '../../shared/cancellationSafety.ts';
import { calculateServerServicePrice } from '../../shared/servicePricing.ts';

const waitMinutes = (minutes) => new Date(Date.now() + minutes * 60000).toISOString();

const serviceProfiles = {
  'Abertura Residencial': { id: 'abertura_residencial', specialty: 'Residencial' },
  'Abertura Automotiva': { id: 'abertura_automotiva', specialty: 'Automotivo' },
  'Abertura Fechadura Tetra': { id: 'abertura_tetra', specialty: 'Residencial' },
  'Abertura Fechadura Eletrônica': { id: 'abertura_eletronica', specialty: 'Residencial' },
  'Confecção de Chave de Carro': { id: 'confeccao_chave_carro', specialty: 'Automotivo' },
  'Confecção de Chave de Moto': { id: 'confeccao_chave_moto', specialty: 'Automotivo' },
  'Cópia de Chave': { id: 'copia_chave', specialty: 'Residencial' },
};

function distanceKm(a, b) {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(Number(b.lat) - Number(a.lat));
  const dLng = rad(Number(b.lng) - Number(a.lng));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(Number(a.lat))) * Math.cos(rad(Number(b.lat))) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function canReceiveRequest(locksmith, request) {
  const profile = serviceProfiles[request?.service_type];
  if (!profile || locksmith.available === false || locksmith.inactive_deactivated === true) return false;
  if (locksmith.work_mode === 'livre' && locksmith.receive_app_requests === false) return false;
  if (locksmith.blocked_until && Date.parse(locksmith.blocked_until) > Date.now()) return false;
  const services = Array.isArray(locksmith.services) ? locksmith.services : [];
  if (services.length && !services.includes(profile.id)) return false;
  const specialties = Array.isArray(locksmith.specialties) ? locksmith.specialties : [];
  return specialties.length ? specialties.includes(profile.specialty) : locksmith.specialty === profile.specialty;
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
      if (user.role === 'admin') return Response.json({ blocked: false, minutesLeft: 0, cancelCount: 0, unlockAt: null, reason: null, message: null });
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

    if (action === 'price_quote') {
      const data = body.data || {};
      if (!data.service_type) return Response.json({ error: 'Informe o serviço' }, { status: 400 });
      return Response.json({ pricing: await calculateServerServicePrice(base44, user.id, data) });
    }

    if (action === 'create_request') {
      const data = body.data || {};
      if (!data.service_type || !String(data.address || '').trim()) return Response.json({ error: 'Informe o serviço e o endereço' }, { status: 400 });
      const pricing = await calculateServerServicePrice(base44, user.id, data);
      if (data.service_type === 'Confecção de Chave de Carro') {
        const vehicle = String(data.vehicle_info || '').trim();
        const toyota = /^toyota(?:\s|$)/i.test(vehicle);
        const highComplexityToyota = toyota && /\b(?:corolla|rav\s*4|sw\s*4)\b/i.test(vehicle);
        const toyotaComplexityFee = toyota ? (highComplexityToyota ? 700 : 300) : 0;
        const landRover2020 = /^land\s*rover(?:\s|$)/i.test(vehicle) && /Ano\s+(20(?:2\d|[3-9]\d)|2[1-9]\d{2})/i.test(vehicle);
        if (landRover2020 && !/Alarme:\s*(?:trancado|não trancado)/i.test(vehicle)) {
          return Response.json({ error: 'Informe se a Land Rover está trancada no alarme.' }, { status: 400 });
        }
        const alarmLocked = landRover2020 && /Alarme:\s*trancado/i.test(vehicle);
        const minimum = 380 + toyotaComplexityFee + (alarmLocked ? 8000 : 0);
        if (pricing.price < minimum) {
          return Response.json({ error: alarmLocked
            ? 'Land Rover 2020 ou mais nova trancada no alarme exige o adicional de R$ 8.000,00.'
            : highComplexityToyota
              ? 'Corolla, RAV4 e SW4 são de alta complexidade: mínimo de R$ 380,00 mais R$ 700,00 de adicional, mesmo após descontos.'
              : toyota
                ? 'Este modelo Toyota é de média complexidade: mínimo de R$ 380,00 mais R$ 300,00 de adicional, mesmo após descontos.'
                : 'O valor mínimo da confecção de chave de carro é R$ 380,00, mesmo após descontos.' }, { status: 400 });
        }
      }
      const block = user.role === 'admin' ? { blocked: false } : await getClientCancelBlock(base44, user.id);
      if (block.blocked) return Response.json({ error: `${block.message} Liberação em ${block.minutesLeft} min.`, ...block }, { status: 403 });
      const allowed = ['service_type', 'address', 'description', 'urgency', 'customer_lat', 'customer_lng', 'key_value', 'fipe_value', 'key_type', 'vehicle_info', 'labor_cost', 'locomotion_cost', 'distance_km', 'extra_cost', 'discount_applied'];
      const values = Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
      values.price = pricing.price;
      values.discount_amount = pricing.discount;
      values.pricing_calculation = pricing.calculation;

      const customerLat = Number(data.customer_lat);
      const customerLng = Number(data.customer_lng);
      const online = Number.isFinite(customerLat) && Number.isFinite(customerLng)
        ? await base44.asServiceRole.entities.Locksmith.filter({ online: true }, '-updated_date', 500)
        : [];
      const candidates = online
        .filter((locksmith) => locksmith.created_by_id && locksmith.lat && locksmith.lng && canReceiveRequest(locksmith, data))
        .map((locksmith) => ({ locksmith, distance: distanceKm({ lat: Number(locksmith.lat), lng: Number(locksmith.lng) }, { lat: customerLat, lng: customerLng }) }))
        .filter((item) => Number.isFinite(item.distance) && item.distance <= Math.min(Number(item.locksmith.service_radius_km || 15), 100))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 100);
      values.ringing_locksmith_ids = candidates.map((item) => item.locksmith.id);
      values.ringing_locksmith_user_ids = [...new Set(candidates.map((item) => item.locksmith.created_by_id))];

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
      if (user.role === 'admin') return Response.json({ free: true, fee: 0, fixed: false, locksmithAmount: 0, appFee: 0, cancelCount: 0, freeRemaining: 3 });
      return Response.json(await clientCancellationQuote(base44, request));
    }

    if (action === 'cancel_request') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.status === 'completed') return Response.json({ error: 'Um chamado concluído não pode ser cancelado' }, { status: 409 });

      const isAdmin = user.role === 'admin';
      const isClient = request.created_by_id === user.id;
      const isLocksmith = request.locksmith_user_id === user.id;
      const actor = isClient ? 'cliente' : isLocksmith ? 'chaveiro' : isAdmin && ['cliente', 'chaveiro'].includes(body.actor) ? body.actor : null;
      if (!actor) return Response.json({ error: 'Você não pode cancelar este chamado' }, { status: 403 });
      if (request.status === 'cancelled') {
        return Response.json({ success: true, request, duplicate: true });
      }

      const update = { status: 'cancelled', cancelled_by: actor };
      if (isClient && !isAdmin) {
        const quote = await clientCancellationQuote(base44, request);
        if (!quote.free && body.confirmed_fee !== true) return Response.json({ error: 'Confirme a taxa de cancelamento para continuar', requires_fee: true, ...quote }, { status: 409 });
        update.cancellation_fee = quote.fee;
        update.cancellation_locksmith_amount = quote.locksmithAmount;
        update.cancellation_app_fee = quote.appFee;
        if (quote.fee > 0) update.payment_status = 'pending';
      }

      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, update);
      // Apenas um cancelamento efetivamente feito pelo cliente autenticado gera evento de bloqueio.
      if (isClient && !isAdmin) await recordClientCancellation(base44, updated);
      if (isLocksmith && !isAdmin) await penalizeLocksmithCancellation(base44, { ...updated, accepted_at: request.accepted_at || (['accepted', 'queued', 'on_the_way'].includes(request.status) ? request.created_date : null) });
      return Response.json({ success: true, request: updated });
    }

    if (action === 'accept_request') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.status !== 'ringing') return Response.json({ error: 'Outro chaveiro assumiu este atendimento primeiro.' }, { status: 409 });
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      const locksmith = profiles?.[0];
      if (!locksmith) return Response.json({ error: 'Perfil de chaveiro não encontrado' }, { status: 404 });
      const accountsByUser = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_user_id: user.id });
      const legacyAccounts = accountsByUser.length ? [] : await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: locksmith.id });
      const account = accountsByUser?.[0] || legacyAccounts?.[0];
      if (account?.status !== 'active') return Response.json({ error: 'Conecte sua conta Mercado Pago para aceitar chamados. Acesse Cadastro de recebimentos no seu perfil.' }, { status: 403 });
      const queued = body.queued === true;
      const now = new Date().toISOString();
      const extra = Number(body.extra || 0);
      const newPrice = Math.round((Number(request.price || 0) + extra) * 100) / 100;
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, {
        status: queued ? 'queued' : 'accepted',
        accepted_at: now,
        queued_at: queued ? now : undefined,
        queued_after_request_id: queued ? body.queued_after_request_id : undefined,
        locksmith_id: locksmith.id,
        locksmith_name: locksmith.name,
        locksmith_user_id: locksmith.created_by_id,
        locksmith_lat: locksmith.lat,
        locksmith_lng: locksmith.lng,
        ringing_locksmith_ids: [locksmith.id],
        ringing_locksmith_user_ids: [locksmith.created_by_id],
        price: newPrice,
        extra_cost: Number(request.extra_cost || 0) + extra,
      });
      return Response.json({ success: true, request: updated, queued });
    }

    if (action === 'submit_review') {
      const locksmithId = body.locksmith_id;
      const rating = Number(body.rating);
      if (!locksmithId || !Number.isFinite(rating) || rating < 1 || rating > 5) {
        return Response.json({ error: 'Informe o chaveiro e uma nota entre 1 e 5.' }, { status: 400 });
      }
      const workMode = body.work_mode;
      if (workMode === 'app') {
        if (!body.service_request_id) return Response.json({ error: 'Você só pode avaliar um atendimento concluído seu.' }, { status: 403 });
        const sr = await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id).catch(() => null);
        if (!sr || sr.created_by_id !== user.id || sr.locksmith_id !== locksmithId || sr.status !== 'completed') {
          return Response.json({ error: 'Você só pode avaliar um atendimento concluído seu.' }, { status: 403 });
        }
      } else {
        const msgs = await base44.asServiceRole.entities.ChatMessage.filter({ locksmith_id: locksmithId, client_id: user.id });
        if (!msgs.length) return Response.json({ error: 'Você só pode avaliar um chaveiro com quem já conversou.' }, { status: 403 });
      }
      await base44.asServiceRole.entities.Review.create({
        locksmith_id: locksmithId,
        locksmith_name: body.locksmith_name,
        customer_name: body.customer_name || 'Cliente',
        rating,
        comment: body.comment,
        service_type: body.service_type,
        work_mode: workMode,
      });
      const reviews = await base44.asServiceRole.entities.Review.filter({ locksmith_id: locksmithId });
      const avg = reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / reviews.length;
      await base44.asServiceRole.entities.Locksmith.update(locksmithId, {
        rating: Math.round(avg * 10) / 10,
        reviews_count: reviews.length,
      });
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
        const isAdmin = user.role === 'admin';
        const quote = isAdmin ? { fee: 0, locksmithAmount: 0, appFee: 0 } : await clientCancellationQuote(base44, request);
        const cancelled = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'cancelled', cancelled_by: 'cliente', cancellation_fee: quote.fee, cancellation_locksmith_amount: quote.locksmithAmount, cancellation_app_fee: quote.appFee, ...(quote.fee > 0 ? { payment_status: 'pending' } : {}) });
        if (!isAdmin) await recordClientCancellation(base44, cancelled);
      } else if (item.reason === 'client_cancelled' && body.response === 'denied') {
        const deadline = waitMinutes(10);
        await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { client_response: 'denied', status: 'monitoring_service', deadline });
        await notify(base44, item.locksmith_user_id, 'Cliente não confirmou cancelamento', 'Encontre o cliente e conclua o atendimento. Abandonar o local gera bloqueio.', item.request_id);
      } else return Response.json({ error: 'Resposta inválida' }, { status: 400 });
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    const status = /Preço|Desconto|Serviço inválido|Dados do veículo|Catálogo|veículo|concessionária|Consulta de preço/.test(error.message || '') ? 400 : 500;
    return Response.json({ error: error.message || 'Erro interno' }, { status });
  }
}