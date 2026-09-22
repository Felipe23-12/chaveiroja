import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { scoreFor, penalizeLocksmithCancellation, recordClientCancellation, getClientCancelBlock, clientCancellationQuote } from '../../shared/cancellationRules.ts';
import { validatedLocation } from '../../shared/cancellationSafety.ts';
import { calculateServerServicePrice } from '../../shared/servicePricing.ts';
import { loadServicePricing } from '../../shared/servicePricingSettings.ts';
import { urgencyServicePrice } from '../../shared/urgencyServicePricing.ts';
import { clientDebt, confirmedServicePayment } from '../../shared/paymentVerification.ts';
import { submitTrustedClientReview, submitTrustedReview } from '../../shared/trustedReviews.ts';
import { clientRegistrationComplete } from '../../shared/registrationEligibility.ts';

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
      // A cotação oficial inclui a tabela administrativa, o calendário e o clima verificado.
      const pricing = await calculateServerServicePrice(base44, user.id, data);
      return Response.json({ pricing });
    }

    if (action === 'client_debt') return Response.json({ debt: await clientDebt(base44, user.id) });
    if (action === 'payment_status') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request || (request.created_by_id !== user.id && request.locksmith_user_id !== user.id && user.role !== 'admin')) return Response.json({ error: 'Acesso negado' }, { status: 403 });
      return Response.json({ paid: await confirmedServicePayment(base44, request) });
    }

    if (action === 'locksmith_arrived') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.locksmith_user_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
      if (!['accepted', 'on_the_way'].includes(request.status)) return Response.json({ error: 'Este chamado não aceita confirmação de chegada' }, { status: 409 });
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && user.role !== 'admin') return Response.json({ error: 'Localização inválida' }, { status: 400 });
      if (user.role !== 'admin') {
        const distance = distanceKm({ lat, lng }, { lat: request.customer_lat, lng: request.customer_lng });
        if (!Number.isFinite(distance) || distance > 0.1) return Response.json({ error: 'A confirmação só é liberada a até 100 m do endereço do cliente.' }, { status: 403 });
      }
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, {
        locksmith_arrived: true,
        ...(Number.isFinite(lat) && Number.isFinite(lng) ? { locksmith_lat: lat, locksmith_lng: lng } : {}),
      });
      return Response.json({ request: updated });
    }

    if (action === 'client_arrival_response') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.created_by_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
      const confirmed = body.confirmed === true;
      if (confirmed && request.locksmith_arrived !== true) return Response.json({ error: 'O chaveiro ainda não confirmou a chegada' }, { status: 409 });
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, confirmed
        ? { client_arrived_confirmed: true }
        : { locksmith_arrived: false, client_arrived_confirmed: false });
      return Response.json({ request: updated });
    }

    if (action === 'locksmith_progress') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.locksmith_user_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
      if (!['accepted', 'on_the_way'].includes(request.status)) return Response.json({ error: 'Atendimento não está em andamento' }, { status: 409 });
      const data = body.data || {};
      const update = {};
      if (data.status === 'on_the_way') update.status = 'on_the_way';
      if (Number.isFinite(Number(data.locksmith_lat)) && Number.isFinite(Number(data.locksmith_lng))) {
        update.locksmith_lat = Number(data.locksmith_lat);
        update.locksmith_lng = Number(data.locksmith_lng);
      }
      if (Array.isArray(data.replaced_parts)) update.replaced_parts = data.replaced_parts.filter((item) => typeof item === 'string').slice(0, 50);
      if (Array.isArray(data.start_photos)) {
        if (request.client_arrived_confirmed !== true) return Response.json({ error: 'Aguarde o cliente confirmar sua chegada' }, { status: 409 });
        update.start_photos = data.start_photos.filter((item) => typeof item === 'string').slice(0, 10);
      }
      if (Array.isArray(data.end_photos)) {
        if (!(request.start_photos || []).length) return Response.json({ error: 'Registre primeiro as fotos do início' }, { status: 409 });
        update.end_photos = data.end_photos.filter((item) => typeof item === 'string').slice(0, 10);
      }
      if (data.status === 'completed') {
        if (request.client_confirmed !== true || !(request.end_photos || []).length || !(await confirmedServicePayment(base44, request))) {
          return Response.json({ error: 'A confirmação do cliente, as fotos finais e o pagamento são obrigatórios' }, { status: 409 });
        }
        update.status = 'completed';
        update.locksmith_confirmed = true;
      }
      if (!Object.keys(update).length) return Response.json({ error: 'Atualização inválida' }, { status: 400 });
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, update);
      return Response.json({ request: updated });
    }

    if (action === 'client_confirm_service') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.created_by_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
      if (!(request.end_photos || []).length || !['accepted', 'on_the_way'].includes(request.status)) return Response.json({ error: 'O chaveiro ainda não registrou a finalização' }, { status: 409 });
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { client_confirmed: true });
      return Response.json({ request: updated });
    }

    if (action === 'select_cash_payment') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.created_by_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
      if (request.client_confirmed !== true || !(request.end_photos || []).length) return Response.json({ error: 'Confirme primeiro a conclusão do serviço' }, { status: 409 });
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { payment_method: 'dinheiro', payment_status: 'pending', cash_received: false });
      return Response.json({ request: updated });
    }

    if (action === 'client_mark_on_the_way') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
      if (request.created_by_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Acesso negado' }, { status: 403 });
      if (request.status !== 'accepted') return Response.json({ request });
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'on_the_way' });
      return Response.json({ request: updated });
    }

    if (action === 'reject_request') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request || request.status !== 'ringing') return Response.json({ error: 'Chamado não disponível' }, { status: 409 });
      if (!(request.ringing_locksmith_user_ids || []).includes(user.id)) return Response.json({ error: 'Este chamado não foi direcionado a você' }, { status: 403 });
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      const locksmith = profiles.find((item) => item.id === body.locksmith_id) || profiles[0];
      if (!locksmith) return Response.json({ error: 'Perfil não encontrado' }, { status: 404 });
      const rejections = (request.rejections || []).filter((item) => item.locksmith_id !== locksmith.id);
      rejections.push({ locksmith_id: locksmith.id, rering_at: new Date(Date.now() + 2 * 60000).toISOString() });
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { rejections });
      return Response.json({ request: updated });
    }

    if (['urgency_upgrade_quote', 'request_urgency_upgrade'].includes(action)) {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request || request.created_by_id !== user.id) return Response.json({ error: 'Chamado não encontrado' }, { status: 403 });
      if (request.urgency === 'urgent' || !['accepted', 'on_the_way'].includes(request.status)) return Response.json({ error: 'Alteração indisponível' }, { status: 409 });
      const pricing = await urgencyServicePrice(base44, request);
      if (action === 'urgency_upgrade_quote') return Response.json({ pricing });
      if (!Number.isFinite(Number(body.price)) || Math.round(Number(body.price) * 100) !== Math.round(pricing.price * 100)) return Response.json({ code: 'PRICE_CHANGED', pricing, error: 'O valor foi atualizado. Confira o novo total e confirme novamente.' }, { status: 409 });
      const price = pricing.price;
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, {
        urgency_upgrade_status: 'pending', urgency_upgrade_requested_at: new Date().toISOString(), urgency_upgrade_price: Math.round(price * 100) / 100,
      });
      return Response.json({ request: updated });
    }

    if (action === 'resolve_urgency_upgrade') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request || request.locksmith_user_id !== user.id) return Response.json({ error: 'Chamado não encontrado' }, { status: 403 });
      if (request.urgency_upgrade_status !== 'pending') return Response.json({ error: 'Solicitação já respondida' }, { status: 409 });
      const accepted = body.accepted === true;
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, accepted
        ? { urgency: 'urgent', price: request.urgency_upgrade_price ?? request.price, urgency_upgrade_status: 'accepted',
            ...(request.pricing_calculation ? { pricing_calculation: { ...request.pricing_calculation,
              total: Math.round((request.pricing_calculation.total + (request.urgency_upgrade_price - request.price)) * 100) / 100,
              lines: [...request.pricing_calculation.lines, { label: 'Alteração para urgente (tabela administrativa)', value: Math.round((request.urgency_upgrade_price - request.price) * 100) / 100 }],
            } } : {}),
          }
        : { urgency_upgrade_status: 'declined' });
      return Response.json({ request: updated });
    }

    if (action === 'opening_condition_correction') {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id);
      if (!request || request.locksmith_user_id !== user.id) return Response.json({ error: 'Chamado não encontrado' }, { status: 403 });
      if (!String(request.service_type || '').startsWith('Abertura') || String(request.description || '').includes('Ajuste no local confirmado pelo chaveiro')) return Response.json({ error: 'Ajuste indisponível' }, { status: 409 });
      const conditions = Array.isArray(body.conditions) ? body.conditions.filter((item) => ['lock_problem', 'broken_key'].includes(item)) : [];
      const photos = Array.isArray(body.photos) ? body.photos.filter((item) => typeof item === 'string').slice(0, 10) : [];
      if (!conditions.length || !photos.length) return Response.json({ error: 'Informe a condição e anexe as fotos' }, { status: 400 });
      const alreadyCharged = /Cliente informou: fechadura com problema|Chave quebrada dentro da fechadura|Adicional único de R\$ [\d.,]+ aplicado/.test(String(request.description || ''));
      const config = await loadServicePricing(base44, request.service_type);
      const fee = alreadyCharged ? 0 : config.values.condition_fee;
      const labels = conditions.map((item) => item === 'lock_problem' ? 'fechadura com problema' : 'chave quebrada dentro da fechadura').join(' e ');
      const note = `Ajuste no local confirmado pelo chaveiro: ${labels}. Prova fotográfica anexada.${fee ? ` Adicional único de R$ ${fee.toFixed(2).replace('.', ',')} aplicado.` : ' Nenhum novo adicional aplicado.'}`;
      const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, {
        price: Math.round((Number(request.price || 0) + fee) * 100) / 100,
        extra_cost: Number(request.extra_cost || 0) + fee,
        ...(request.pricing_calculation && !alreadyCharged ? { pricing_calculation: {
          ...request.pricing_calculation,
          total: Math.round((Number(request.pricing_calculation.total || 0) + fee) * 100) / 100,
          lines: [...request.pricing_calculation.lines, { label: 'Adicional de condição da abertura', value: fee }],
        } } : {}),
        start_photos: [...(request.start_photos || []), ...photos].slice(0, 10),
        description: [request.description, note].filter(Boolean).join(' — '),
      });
      return Response.json({ request: updated });
    }

    if (action === 'create_request') {
      if (!clientRegistrationComplete(user)) return Response.json({ code: 'REGISTRATION_REQUIRED', error: 'Complete seu cadastro: CPF, telefone, nome completo, email confirmado, senha e aceite dos termos são obrigatórios antes de solicitar um chamado.' }, { status: 403 });
      if (await clientDebt(base44, user.id)) return Response.json({ error: 'Quite seu débito pendente antes de solicitar outro atendimento.' }, { status: 409 });
      const data = body.data || {};
      if (!data.service_type || !String(data.address || '').trim()) return Response.json({ error: 'Informe o serviço e o endereço' }, { status: 400 });
      const pricing = await calculateServerServicePrice(base44, user.id, data);
      if (data.expected_price !== undefined && (!Number.isFinite(Number(data.expected_price)) || Math.round(Number(data.expected_price) * 100) !== Math.round(pricing.price * 100))) {
        return Response.json({ code: 'PRICE_CHANGED', error: 'O valor foi atualizado. Confira o novo total e toque em Solicitar chaveiro novamente.' }, { status: 409 });
      }
      if (data.service_type === 'Confecção de Chave de Carro') {
        const vehicle = String(data.vehicle_info || '').trim();
        const landRover2020 = /^land\s*rover(?:\s|$)/i.test(vehicle) && /Ano\s+(20(?:2\d|[3-9]\d)|2[1-9]\d{2})/i.test(vehicle);
        if (landRover2020 && !/Alarme:\s*(?:trancado|não trancado)/i.test(vehicle)) {
          return Response.json({ error: 'Informe se a Land Rover está trancada no alarme.' }, { status: 400 });
        }
        const minimum = pricing.minimum;
        if (pricing.price < minimum) return Response.json({ error: `O valor mínimo desta confecção é R$ ${minimum.toFixed(2)}, conforme a tabela administrativa.` }, { status: 400 });
      }
      const block = user.role === 'admin' ? { blocked: false } : await getClientCancelBlock(base44, user.id);
      if (block.blocked) return Response.json({ error: `${block.message} Liberação em ${block.minutesLeft} min.`, ...block }, { status: 403 });
      const allowed = ['service_type', 'address', 'description', 'urgency', 'customer_lat', 'customer_lng', 'key_value', 'fipe_value', 'key_type', 'vehicle_info', 'labor_cost', 'locomotion_cost', 'distance_km', 'extra_cost', 'discount_applied'];
      const values = Object.fromEntries(allowed.filter((key) => data[key] !== undefined).map((key) => [key, data[key]]));
      Object.assign(values, pricing.fields || {});
      values.price = pricing.price;
      values.discount_amount = pricing.discount;
      values.discount_applied = pricing.discount > 0;
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
      const request = await base44.entities.ServiceRequest.create({ ...values, status: 'ringing', payment_status: 'pending', cash_received: false, client_confirmed: false, locksmith_confirmed: false, cancellation_fee: 0, review_claimed: false });
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
      const contexts = await base44.asServiceRole.entities.ServiceRequestContext.filter({ request_id: request.id, client_id: request.created_by_id }, '-created_date', 1);
      if (!contexts.length || await clientDebt(base44, request.created_by_id)) return Response.json({ error: 'Solicitação não autorizada ou cliente com débito pendente.' }, { status: 409 });
      if (!(request.ringing_locksmith_user_ids || []).includes(user.id)) return Response.json({ error: 'Este chamado não foi direcionado a você.' }, { status: 403 });
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
      const locksmith = profiles?.[0];
      if (!locksmith) return Response.json({ error: 'Perfil de chaveiro não encontrado' }, { status: 404 });
      const accountsByUser = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_user_id: user.id });
      const legacyAccounts = accountsByUser.length ? [] : await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: locksmith.id });
      const account = accountsByUser?.[0] || legacyAccounts?.[0];
      if (account?.status !== 'active') return Response.json({ code: 'MERCADO_PAGO_REQUIRED', error: 'Conecte sua conta Mercado Pago para aceitar chamados. Acesse Cadastro de recebimentos no seu perfil.' }, { status: 403 });
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

    if (action === 'submit_review') return await submitTrustedReview(base44, user, body);
    if (action === 'submit_client_review') return await submitTrustedClientReview(base44, user, body);

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
        const client = await base44.asServiceRole.entities.User.get(request.created_by_id).catch(() => null);
        const report = await base44.asServiceRole.entities.ConductReport.create({
          reporter_id: user.id,
          reporter_name: user.full_name || user.email,
          reported_id: request.created_by_id,
          reported_name: client?.full_name || client?.email || 'Cliente',
          reporter_type: 'chaveiro',
          reported_type: 'cliente',
          context_type: 'service',
          request_id: request.id,
          locksmith_id: request.locksmith_id,
          category: 'violence',
          description: String(body.report || '').trim(),
          photos: body.evidence_photo ? [body.evidence_photo] : [],
          status: 'awaiting_defense',
          defense_deadline: deadline,
        });
        const systemMessage = `Ocorrência de segurança registrada. A parte denunciada pode apresentar sua versão até ${new Date(deadline).toLocaleString('pt-BR')}.`;
        await base44.asServiceRole.entities.ReportMessage.bulkCreate([
          { report_id: report.id, sender_id: user.id, sender_name: 'Administração Chaveiro Já', sender_role: 'system', recipient_id: user.id, reporter_id: user.id, reported_id: request.created_by_id, message: systemMessage },
          { report_id: report.id, sender_id: user.id, sender_name: 'Administração Chaveiro Já', sender_role: 'system', recipient_id: request.created_by_id, reporter_id: user.id, reported_id: request.created_by_id, message: systemMessage },
        ]);
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