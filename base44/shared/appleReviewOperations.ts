import { appleReviewRole, appleReviewAccounts, isAppleReviewRequest } from './appleReviewPolicy.ts';
const SERVICES = ['Abertura Residencial', 'Abertura Automotiva', 'Abertura Fechadura Tetra', 'Abertura Fechadura Eletrônica', 'Confecção de Chave de Carro', 'Confecção de Chave de Moto', 'Cópia de Chave'];
const deny = (error, status = 403) => Response.json({ error }, { status });
const pricing = { price: 0, minimum: 0, discount: 0, fields: {}, calculation: { total: 0, lines: [{ label: 'Pagamento simulado para revisão Apple', value: 0 }], notes: ['Sem cobrança, comissão ou repasse real.'] } };
export async function handleAppleReview(base44, user, body) {
  const role = appleReviewRole(user), action = body.action;
  if (action === 'review_status') return Response.json({ enabled: Boolean(role), role });
  let request = null;
  if (body.request_id) request = await base44.asServiceRole.entities.ServiceRequest.get(body.request_id).catch(() => null);
  if (!role && !isAppleReviewRequest(request)) return null;
  if (!role) return deny('Pedidos de revisão são exclusivos das contas de revisão.');
  if (body.request_id && (!isAppleReviewRequest(request) || (role === 'cliente' ? request.created_by_id !== user.id : request.locksmith_user_id !== user.id && !(request.ringing_locksmith_user_ids || []).includes(user.id)))) return deny('Esta conta não pode acessar atendimentos reais ou de outra conta.');
  if (['record_app_access', 'heartbeat', 'score_event'].includes(action)) return Response.json({ success: true });
  if (action === 'client_registration_status') return Response.json({ allowed: role === 'cliente', registration_complete: true, registration_required: false, first_call_available: false, apple_review: true });
  if (action === 'client_block_status') return Response.json({ blocked: false, minutesLeft: 0, cancelCount: 0 });
  if (action === 'client_debt') return Response.json({ debt: null });
  if (action === 'area_status') return Response.json({ allowed: true });
  if (action === 'price_quote') return Response.json({ pricing });
  const accounts = await appleReviewAccounts(base44);
  const profiles = accounts.chaveiro ? await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: accounts.chaveiro.id }, '-created_date', 1) : [];
  const locksmith = profiles[0];
  if (action === 'review_snapshot') {
    const query = role === 'cliente' ? { apple_review: true, created_by_id: user.id } : { apple_review: true, $or: [{ locksmith_user_id: user.id }, { ringing_locksmith_user_ids: user.id }] };
    const rows = await base44.asServiceRole.entities.ServiceRequest.filter(query, '-created_date', 1);
    return Response.json({ request: rows[0] || null, locksmith: locksmith || null });
  }
  if (action === 'locksmith_location') {
    if (role !== 'chaveiro' || !locksmith || body.locksmith_id !== locksmith.id) return deny('Perfil de revisão não encontrado.');
    const update = { last_activity_at: new Date().toISOString() };
    if (body.go_online === true) update.online = true;
    if (body.go_online === false) update.online = false;
    const updated = await base44.asServiceRole.entities.Locksmith.update(locksmith.id, update);
    return Response.json({ locksmith: updated, allowed: true, apple_review: true });
  }
  if (action === 'sync_online_requests') return Response.json({ added: 0 });
  if (action === 'start_next_queued') return Response.json({ request: null });
  if (action === 'create_request') {
    if (role !== 'cliente' || !locksmith || !accounts.chaveiro) return deny('Entre com a conta cliente de revisão e mantenha o perfil chaveiro cadastrado.');
    const data = body.data || {};
    if (!SERVICES.includes(data.service_type) || typeof data.address !== 'string' || !data.address.trim() || data.address.length > 300 || String(data.description || '').length > 1000) return deny('Informe um serviço e um endereço válidos.', 400);
    const ongoing = await base44.asServiceRole.entities.ServiceRequest.filter({ apple_review: true, created_by_id: user.id, status: { $in: ['ringing', 'accepted', 'on_the_way', 'queued'] } }, '-created_date', 1);
    if (ongoing.length) return deny('Conclua ou cancele o pedido de revisão atual antes de criar outro.', 409);
    const lat = Number.isFinite(data.customer_lat) && Math.abs(data.customer_lat) <= 90 ? data.customer_lat : 0;
    const lng = Number.isFinite(data.customer_lng) && Math.abs(data.customer_lng) <= 180 ? data.customer_lng : 0;
    const created = await base44.asServiceRole.entities.ServiceRequest.create({
      created_by_id: user.id, apple_review: true, service_type: data.service_type, address: data.address.trim(), description: String(data.description || ''), customer_name: String(data.customer_name || user.full_name || 'Cliente de revisão').slice(0, 100),
      status: 'ringing', urgency: 'normal', price: 0, customer_lat: lat, customer_lng: lng,
      locksmith_id: locksmith.id, locksmith_name: locksmith.name, locksmith_user_id: accounts.chaveiro.id, locksmith_lat: lat, locksmith_lng: lng,
      ringing_locksmith_ids: [locksmith.id], ringing_locksmith_user_ids: [accounts.chaveiro.id],
      payment_method: 'dinheiro', payment_status: 'pending', cash_received: false, client_confirmed: false, locksmith_confirmed: false, cancellation_fee: 0, cancellation_locksmith_amount: 0, cancellation_app_fee: 0, review_claimed: false, pricing_calculation: pricing.calculation,
    });
    if (created.created_by_id !== user.id) { await base44.asServiceRole.entities.ServiceRequest.delete(created.id); throw new Error('Não foi possível vincular o pedido à conta cliente de revisão.'); }
    return Response.json({ request: created });
  }
  if (!request) return deny('Operação indisponível no modo de revisão.', 400);
  if (action === 'payment_status') return Response.json({ paid: request.cash_received === true });
  if (action === 'cancel_quote') return Response.json({ free: true, fee: 0, locksmithAmount: 0, appFee: 0 });
  if (['submit_review', 'submit_client_review'].includes(action)) return null;
  const update = {};
  const clientActions = ['client_arrival_response', 'client_confirm_service', 'select_cash_payment'];
  const locksmithActions = ['accept_request', 'reject_request', 'locksmith_arrived', 'locksmith_progress'];
  if ((clientActions.includes(action) && role !== 'cliente') || (locksmithActions.includes(action) && role !== 'chaveiro')) return deny('Operação exclusiva do participante correto.');
  if (action === 'accept_request') {
    if (!locksmith?.online || request.status !== 'ringing') return deny('Fique online e selecione um pedido aguardando aceite.', 409);
    if (request.created_by_id !== accounts.cliente?.id || request.locksmith_user_id !== user.id || request.ringing_locksmith_ids?.length !== 1 || request.ringing_locksmith_ids[0] !== locksmith.id || request.ringing_locksmith_user_ids?.length !== 1 || request.ringing_locksmith_user_ids[0] !== user.id) return deny('Distribuição de revisão inválida.');
    Object.assign(update, { status: 'accepted', accepted_at: new Date().toISOString() });
  } else if (action === 'reject_request') {
    if (request.status !== 'ringing') return deny('Pedido não disponível.', 409);
    update.rejections = [{ locksmith_id: locksmith.id, rering_at: new Date(Date.now() + 120000).toISOString() }];
  } else if (action === 'locksmith_arrived') {
    if (!['accepted', 'on_the_way'].includes(request.status)) return deny('Aceite primeiro o pedido.', 409);
    update.locksmith_arrived = true;
  } else if (action === 'client_arrival_response') {
    if (body.confirmed === true && !request.locksmith_arrived) return deny('Aguarde a confirmação do chaveiro.', 409);
    Object.assign(update, body.confirmed === true ? { client_arrived_confirmed: true } : { client_arrived_confirmed: false, locksmith_arrived: false });
  } else if (action === 'locksmith_progress') {
    if (!['accepted', 'on_the_way'].includes(request.status)) return deny('Atendimento não está em andamento.', 409);
    const data = body.data || {};
    for (const field of ['start_photos', 'end_photos']) {
      if (data[field] !== undefined) {
        if (!Array.isArray(data[field]) || !data[field].length || data[field].length > 10 || data[field].some(url => typeof url !== 'string' || url.length > 2000 || !/^https:\/\/(base44\.app|media\.base44\.com)\//.test(url))) return deny('Envie fotos pelo aplicativo.', 400);
        if (field === 'start_photos' && !request.client_arrived_confirmed) return deny('Aguarde o cliente confirmar sua chegada.', 409);
        if (field === 'end_photos' && !request.start_photos?.length) return deny('Registre primeiro o início.', 409);
        update[field] = data[field];
      }
    }
    if (data.status === 'on_the_way') update.status = 'on_the_way';
    if (data.status === 'completed') {
      if (!request.client_confirmed || !request.end_photos?.length || !request.cash_received) return deny('Confirmação do cliente e pagamento simulado obrigatórios.', 409);
      Object.assign(update, { status: 'completed', locksmith_confirmed: true });
    }
    if (!Object.keys(update).length) return deny('Atualização inválida.', 400);
  } else if (action === 'client_confirm_service') {
    if (!request.end_photos?.length || !['accepted', 'on_the_way'].includes(request.status)) return deny('Aguarde a finalização pelo chaveiro.', 409);
    update.client_confirmed = true;
  } else if (action === 'select_cash_payment') {
    if (!request.client_confirmed || !request.end_photos?.length) return deny('Confirme primeiro o serviço.', 409);
    Object.assign(update, { payment_method: 'dinheiro', payment_status: 'pending', cash_received: false });
  } else if (['cancel_request', 'cancel_failed_service'].includes(action)) {
    if (request.status === 'completed') return deny('O pedido já foi concluído.', 409);
    Object.assign(update, { status: 'cancelled', cancelled_by: role, cancellation_fee: 0, cancellation_locksmith_amount: 0, cancellation_app_fee: 0, payment_status: 'cancelled' });
  } else return deny('Operação indisponível no modo de revisão.', 400);
  const updated = await base44.asServiceRole.entities.ServiceRequest.update(request.id, update);
  return Response.json({ request: updated, queued: false, success: true, simulated: true });
}