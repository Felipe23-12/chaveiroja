import { clientRequestAccess, requestCustomerName } from './clientRequestAccess.ts';
import { clientRequestsQuery } from './serviceRequestOwner.ts';
import { clientDebt } from './paymentVerification.ts';
import { getClientCancelBlock } from './cancellationRules.ts';
import { requireServiceCoverage } from './serviceCoverage.ts';
import { calculateServerServicePrice } from './servicePricing.ts';
import { loadDispatchCandidates } from './requestDispatch.ts';
import { initialScoreCandidates, SCORE_PRIORITY_MS, dispatchScore } from './scoreDispatchPolicy.ts';
import { validatedLocation } from './cancellationSafety.ts';
import { notifyRingingLocksmiths } from './locksmithRingPush.ts';

// guest is supplied only by the private, platform-authenticated actor, never HTTP input.
export async function createServiceRequest(base44, user, data, guest = false) {
  const access = guest ? { allowed: true, registration_complete: false } : await clientRequestAccess(base44, user);
  if (!access.allowed) return Response.json({ code: 'REGISTRATION_REQUIRED', error: 'Entre na sua conta para solicitar pelo modo aplicativo.' }, { status: 403 });
  if (await clientDebt(base44, user.id)) return Response.json({ error: 'Quite seu débito pendente antes de solicitar outro atendimento.' }, { status: 409 });
  const customerName = requestCustomerName(data.customer_name || user.legal_name || user.full_name);
  if (!customerName) return Response.json({ code: 'NAME_REQUIRED', error: 'Informe seu nome para solicitar o atendimento.' }, { status: 400 });
  if (data.location_context?.coordinates_confirmed !== true || !Number.isFinite(data.customer_lat) || !Number.isFinite(data.customer_lng) || Math.abs(data.customer_lat) > 90 || Math.abs(data.customer_lng) > 180) return Response.json({ error: 'Confirme a localização do atendimento.' }, { status: 400 });
  const location = validatedLocation(data);
  if (!access.registration_complete) {
    const active = await base44.asServiceRole.entities.ServiceRequest.filter({ ...clientRequestsQuery(user.id), ...(guest ? {} : { status: { $in: ['ringing', 'searching', 'accepted', 'queued', 'on_the_way'] } }) }, '-created_date', 1);
    if (active.length) {
      if (!guest) return Response.json({ error: 'Você já possui um chamado em andamento. Acompanhe esse atendimento antes de solicitar outro.' }, { status: 409 });
      const contexts = await base44.asServiceRole.entities.ServiceRequestContext.filter({ request_id: active[0].id }, '-created_date', 1);
      if (!contexts.length) await base44.asServiceRole.entities.ServiceRequestContext.create({ ...location, request_id: active[0].id, client_id: user.id });
      return Response.json({ request: active[0] });
    }
  }
  if (!data.service_type || !String(data.address || '').trim()) return Response.json({ error: 'Informe o serviço e o endereço' }, { status: 400 });
  const areas = await requireServiceCoverage(base44, data.customer_lat, data.customer_lng);
  const pricing = await calculateServerServicePrice(base44, user.id, data);
  if (data.expected_price !== undefined && (!Number.isFinite(Number(data.expected_price)) || Math.round(Number(data.expected_price) * 100) !== Math.round(pricing.price * 100))) return Response.json({ code: 'PRICE_CHANGED', error: 'O valor foi atualizado. Confira o novo total e toque em Solicitar chaveiro novamente.' }, { status: 409 });
  if (data.service_type === 'Confecção de Chave de Carro') {
    const vehicle = String(data.vehicle_info || '').trim();
    if (/^land\s*rover(?:\s|$)/i.test(vehicle) && /Ano(?:-modelo)?\s+(20(?:2\d|[3-9]\d)|2[1-9]\d{2})/i.test(vehicle) && !/Alarme:\s*(?:trancado|não trancado)/i.test(vehicle)) return Response.json({ error: 'Informe se a Land Rover está trancada no alarme.' }, { status: 400 });
    if (pricing.price < pricing.minimum) return Response.json({ error: `O valor mínimo desta confecção é R$ ${pricing.minimum.toFixed(2)}, conforme a tabela administrativa.` }, { status: 400 });
  }
  const block = user.role === 'admin' ? { blocked: false } : await getClientCancelBlock(base44, user.id);
  if (block.blocked) return Response.json({ error: `${block.message} Liberação em ${block.minutesLeft} min.`, ...block }, { status: 403 });
  const allowed = ['service_type', 'address', 'description', 'urgency', 'customer_lat', 'customer_lng', 'key_value', 'fipe_value', 'key_type', 'vehicle_info', 'labor_cost', 'locomotion_cost', 'distance_km', 'extra_cost', 'discount_applied'];
  const values = Object.fromEntries(allowed.filter(key => data[key] !== undefined).map(key => [key, data[key]]));
  Object.assign(values, pricing.fields || {}, { customer_name: customerName, price: pricing.price, discount_amount: pricing.discount, discount_applied: pricing.discount > 0, pricing_calculation: pricing.calculation });
  if (pricing.discount_type) values.discount_type = pricing.discount_type;
  const now = Date.now();
  values.search_radius_km = Math.max(1, Math.min(100, Number(data.search_radius_km) || 100));
  values.auto_expand_radius = data.auto_expand_radius === true;
  values.search_radius_updated_at = new Date(now).toISOString();
  const initialCandidates = await loadDispatchCandidates(base44, { ...data, ...values, client_id: user.id, search_radius_km: 100 }, areas, now, 500);
  if (guest && !initialCandidates.length) return Response.json({ error: 'Não há chaveiro disponível para este serviço na sua região. Tente novamente mais tarde.' }, { status: 409 });
  if (guest && values.auto_expand_radius) {
    while (values.search_radius_km < 100 && !initialCandidates.some(item => item.distance <= values.search_radius_km)) values.search_radius_km = Math.min(100, Math.ceil(values.search_radius_km * 1.2));
  }
  values.initial_locksmith_distances = initialCandidates.map(item => ({ locksmith_id: item.locksmith.id, distance_km: item.distance }));
  const candidates = initialScoreCandidates(initialCandidates.filter(item => item.distance <= values.search_radius_km).slice(0, 100));
  if (candidates.some(item => dispatchScore(item.score) === 10)) values.score_priority_until = new Date(now + SCORE_PRIORITY_MS).toISOString();
  values.ringing_locksmith_ids = candidates.map(item => item.locksmith.id);
  values.ringing_locksmith_user_ids = [...new Set(candidates.map(item => item.locksmith.created_by_id))];
  if (location.place_type === 'condominium') values.description = [values.description, `Bloco/torre: ${location.building} · Unidade: ${location.unit}`].filter(Boolean).join(' — ');
  if (!guest && !access.registration_complete && customerName !== user.full_name) await base44.auth.updateMe({ full_name: customerName });
  const request = await base44.asServiceRole.entities.ServiceRequest.create({ ...values, client_id: user.id, apple_review: false, status: 'ringing', payment_status: 'pending', cash_received: false, client_confirmed: false, locksmith_confirmed: false, cancellation_fee: 0, review_claimed: false });
  await base44.asServiceRole.entities.ServiceRequestContext.create({ ...location, request_id: request.id, client_id: user.id });
  await notifyRingingLocksmiths(base44, request);
  return Response.json({ request });
}