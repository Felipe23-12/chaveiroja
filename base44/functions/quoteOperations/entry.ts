import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { loadServiceAreas, isAreaAvailable } from '../../shared/serviceAreas.ts';
import { clientRegistrationComplete } from '../../shared/registrationEligibility.ts';
import { verifiedCpf } from '../../shared/verifiedCpf.ts';
import { clientDebt } from '../../shared/paymentVerification.ts';
import { getClientCancelBlock } from '../../shared/cancellationRules.ts';

// Desbloquear apenas quando o modo orçamento estiver pronto para lançamento.
const ENABLED = false;
const CAR_KEY = 'Confecção de Chave de Carro';
const REPAIR = 'Reparo de Fechadura Automotiva';
const PARTS = ['ignicao', 'porta_malas', 'porta', 'chave_quebrada'];
const PART_LABELS = { ignicao: 'Ignição', porta_malas: 'Porta-malas', porta: 'Porta', chave_quebrada: 'Chave quebrada' };
const money = value => Number.isFinite(Number(value)) && Number(value) >= 1 && Number(value) <= 100000 && Math.abs(Math.round(Number(value) * 100) - Number(value) * 100) < 0.000001 ? Number(value) : null;
const km = (a, b) => {
  const rad = n => n * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const hasLink = text => /(?:https?:\/\/|www\.|\b\S+\.(?:com|net|org|io|br)\b)/i.test(text || '');

async function startService(base44, quote, price) {
  if (quote.service_request_id) return quote;
  const locksmith = await base44.asServiceRole.entities.Locksmith.get(quote.locksmith_id);
  const areas = await loadServiceAreas(base44);
  if (!locksmith?.online || !isAreaAvailable(areas, locksmith.lat, locksmith.lng) || !isAreaAvailable(areas, quote.customer_lat, quote.customer_lng)) throw new Error('O chaveiro ou o endereço não está mais disponível na área de atendimento.');
  const account = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_user_id: quote.locksmith_user_id });
  if (account[0]?.status !== 'active') throw new Error('O chaveiro precisa conectar o Mercado Pago antes de iniciar o atendimento.');
  if (await clientDebt(base44, quote.client_id)) throw new Error('O cliente precisa quitar o débito pendente antes de iniciar outro atendimento.');
  const service = quote.service_type === CAR_KEY ? CAR_KEY : 'Abertura Automotiva';
  const detail = quote.service_type === REPAIR ? `Reparo automotivo — ${PART_LABELS[quote.repair_part]}. ` : '';
  const now = new Date().toISOString();
  const values = {
    created_by_id: quote.client_id, service_type: service, status: 'accepted',
    address: quote.address, description: `${detail}${quote.description || ''}`.trim(),
    vehicle_info: quote.vehicle_info, customer_lat: quote.customer_lat, customer_lng: quote.customer_lng,
    locksmith_id: locksmith.id, locksmith_user_id: quote.locksmith_user_id, locksmith_name: locksmith.name,
    locksmith_lat: locksmith.lat, locksmith_lng: locksmith.lng,
    accepted_at: now, price, urgency: 'normal',
    distance_km: Math.round(km({ lat: locksmith.lat, lng: locksmith.lng }, { lat: quote.customer_lat, lng: quote.customer_lng }) * 10) / 10,
    payment_status: 'pending', cash_received: false, client_confirmed: false, locksmith_confirmed: false,
    cancellation_fee: 0, review_claimed: false,
    pricing_calculation: { total: price, lines: [{ label: 'Valor negociado no modo orçamento', value: price }], notes: [quote.service_type === REPAIR ? `Reparo: ${PART_LABELS[quote.repair_part]}` : 'Confecção de chave de carro'] },
  };
  const request = await base44.asServiceRole.entities.ServiceRequest.create(values);
  if (request.created_by_id !== quote.client_id) {
    await base44.asServiceRole.entities.ServiceRequest.delete(request.id);
    throw new Error('Não foi possível atribuir o atendimento ao cliente.');
  }
  await base44.asServiceRole.entities.ServiceRequestContext.create({ request_id: request.id, client_id: quote.client_id, service_type: service, address: quote.address, latitude: quote.customer_lat, longitude: quote.customer_lng, place_type: 'vehicle' });
  return await base44.asServiceRole.entities.QuoteRequest.update(quote.id, { status: 'accepted', accepted_price: price, service_request_id: request.id });
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (!ENABLED) return Response.json({ error: 'O modo orçamento está pausado.' }, { status: 423 });
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    const locksmith = user.account_type === 'chaveiro';
    if (action === 'list') {
      const items = locksmith ? await base44.entities.QuoteRequest.filter({ locksmith_user_id: user.id }, '-created_date', 50) : await base44.entities.QuoteRequest.filter({ client_id: user.id }, '-created_date', 50);
      const daily = locksmith ? [] : await base44.entities.QuoteRequest.filter({ client_id: user.id, day_key: today() }, '-created_date', 4);
      return Response.json({ items, remaining: Math.max(0, 3 - daily.length) });
    }
    if (action === 'create') {
      if (locksmith || user.role === 'admin' || !clientRegistrationComplete(user, await verifiedCpf(base44, user.id))) return Response.json({ error: 'Complete seu cadastro de cliente para solicitar orçamentos.' }, { status: 403 });
      if (await clientDebt(base44, user.id)) return Response.json({ error: 'Quite o débito pendente antes de pedir um orçamento.' }, { status: 409 });
      const block = await getClientCancelBlock(base44, user.id);
      if (block.blocked) return Response.json({ error: block.message }, { status: 403 });
      const data = body.data || {};
      const addr = String(data.address || '').trim(), vehicle = String(data.vehicle_info || '').trim(), description = String(data.description || '').trim();
      const lat = Number(data.customer_lat), lng = Number(data.customer_lng);
      if (![CAR_KEY, REPAIR].includes(data.service_type) || (data.service_type === REPAIR && !PARTS.includes(data.repair_part)) || addr.length < 8 || addr.length > 300 || vehicle.length < 5 || vehicle.length > 160 || description.length < 8 || description.length > 1000 || hasLink(addr) || hasLink(vehicle) || hasLink(description) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return Response.json({ error: 'Confira o serviço, o veículo, o endereço e a descrição (sem links).' }, { status: 400 });
      const daily = await base44.asServiceRole.entities.QuoteRequest.filter({ client_id: user.id, day_key: today() }, '-created_date', 4);
      if (daily.length >= 3) return Response.json({ error: 'Limite de 3 orçamentos por dia atingido.' }, { status: 429 });
      const areas = await loadServiceAreas(base44);
      if (!isAreaAvailable(areas, lat, lng)) return Response.json({ error: 'Endereço fora da área de atendimento.' }, { status: 403 });
      const profiles = await base44.asServiceRole.entities.Locksmith.filter({ online: true }, '-updated_date', 500);
      const targets = profiles.filter(l => l.created_by_id && l.available !== false && !l.inactive_deactivated && (l.work_mode !== 'livre' || l.receive_app_requests !== false) && !(l.blocked_until && Date.parse(l.blocked_until) > Date.now()) && isAreaAvailable(areas, l.lat, l.lng) && (l.services?.length ? l.services.includes(data.service_type === CAR_KEY ? 'confeccao_chave_carro' : 'abertura_automotiva') : (l.specialties?.length ? l.specialties.includes('Automotivo') : l.specialty === 'Automotivo')))
        .map(l => ({ l, distance: km({ lat: l.lat, lng: l.lng }, { lat, lng }) }))
        .filter(({ l, distance }) => distance <= Math.min(Number(l.service_radius_km || 15), 50)).sort((a,b) => a.distance - b.distance);
      let chosen = null;
      for (const { l } of targets.slice(0, 20)) {
        const accounts = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_user_id: l.created_by_id });
        if (accounts[0]?.status === 'active') { chosen = l; break; }
      }
      if (!chosen) return Response.json({ error: 'Nenhum chaveiro automotivo disponível para este orçamento agora.' }, { status: 409 });
      const quote = await base44.asServiceRole.entities.QuoteRequest.create({ client_id: user.id, locksmith_id: chosen.id, locksmith_user_id: chosen.created_by_id, locksmith_name: chosen.name, service_type: data.service_type, repair_part: data.service_type === REPAIR ? data.repair_part : undefined, address: addr, vehicle_info: vehicle, description, customer_lat: lat, customer_lng: lng, day_key: today(), status: 'requested' });
      return Response.json({ quote });
    }
    const quote = body.quote_id ? await base44.asServiceRole.entities.QuoteRequest.get(body.quote_id) : null;
    if (!quote) return Response.json({ error: 'Orçamento não encontrado.' }, { status: 404 });
    const asClient = quote.client_id === user.id;
    const asLocksmith = quote.locksmith_user_id === user.id && locksmith;
    if (!asClient && !asLocksmith) return Response.json({ error: 'Acesso negado.' }, { status: 403 });
    const states = { accept: ['requested', asLocksmith], offer: ['inspecting', asLocksmith], counter: ['offered', asClient], approve: ['offered', asClient], accept_counter: ['countered', asLocksmith] };
    if (action === 'decline') {
      if ((asClient && !['requested', 'offered'].includes(quote.status)) || (asLocksmith && !['requested', 'inspecting', 'countered'].includes(quote.status))) return Response.json({ error: 'Este orçamento não pode mais ser recusado.' }, { status: 409 });
      return Response.json({ quote: await base44.asServiceRole.entities.QuoteRequest.update(quote.id, { status: 'declined' }) });
    }
    if (!states[action] || !states[action][1]) return Response.json({ error: 'Ação não autorizada.' }, { status: 403 });
    if (quote.status !== states[action][0]) return Response.json({ error: 'O orçamento mudou de estado. Atualize a lista.' }, { status: 409 });
    if (action === 'accept') {
      const profile = await base44.asServiceRole.entities.Locksmith.get(quote.locksmith_id);
      if (!profile?.online || profile.created_by_id !== user.id) return Response.json({ error: 'Fique online para aceitar o orçamento.' }, { status: 403 });
      return Response.json({ quote: await base44.asServiceRole.entities.QuoteRequest.update(quote.id, { status: 'inspecting' }) });
    }
    if (action === 'offer' || action === 'counter') {
      const price = money(body.price);
      if (price == null) return Response.json({ error: 'Informe um valor válido entre R$ 1 e R$ 100.000.' }, { status: 400 });
      return Response.json({ quote: await base44.asServiceRole.entities.QuoteRequest.update(quote.id, action === 'offer' ? { offered_price: price, status: 'offered' } : { counter_price: price, status: 'countered' }) });
    }
    const price = action === 'approve' ? quote.offered_price : quote.counter_price;
    if (money(price) == null) return Response.json({ error: 'Valor do orçamento inválido.' }, { status: 409 });
    return Response.json({ quote: await startService(base44, quote, price) });
  } catch (error) {
    return Response.json({ error: error.message || 'Não foi possível processar o orçamento.' }, { status: 500 });
  }
}