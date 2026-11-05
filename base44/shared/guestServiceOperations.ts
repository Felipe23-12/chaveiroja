import { clientCancellationQuote, recordClientCancellation } from './cancellationRules.ts';
import { requireServiceCoverage } from './serviceCoverage.ts';
export function guestOpeningData(data) {
  const allowed = ['Abertura Residencial', 'Abertura Automotiva', 'Abertura Fechadura Tetra', 'Abertura Fechadura Eletrônica'];
  if (!data || !allowed.includes(data.service_type) || typeof data.address !== 'string' || data.address.length > 500 || !data.address.trim() || data.location_context?.coordinates_confirmed !== true || ![data.customer_lat, data.customer_lng].every(Number.isFinite)) throw new Error('Selecione o serviço e confirme o endereço do atendimento.');
  const input = data.pricing_inputs || {};
  const car = data.service_type === 'Abertura Automotiva';
  if (!['lock_problem', car ? 'key_inside' : 'lost_key'].includes(input.opening_reason) || (!car && typeof input.broken_key !== 'boolean')) throw new Error('Responda às perguntas sobre a abertura.');
  const vehicle = input.vehicle && typeof input.vehicle === 'object' ? input.vehicle : {};
  const fields = ['make','model','year','version','opening_target','opening_method','factory_seat_opening'];
  const safeVehicle = Object.fromEntries(fields.filter(k => ['string','number','boolean'].includes(typeof vehicle[k])).map(k => [k, typeof vehicle[k] === 'string' ? vehicle[k].slice(0, 120) : vehicle[k]]));
  const locks = Array.isArray(input.locks) ? input.locks.slice(0,20).map(l => ({ model: String(l?.model || 'simples').slice(0,30), miolo: l?.miolo === true })) : [];
  const reason = input.opening_reason === 'lock_problem' ? 'Cliente informou: fechadura com problema' : car ? 'Cliente informou: chave dentro do veículo' : 'Cliente informou: perdeu a chave';
  const vehicleInfo = car ? `${safeVehicle.opening_target === 'moto_seat' ? 'Abertura de banco de moto' : safeVehicle.opening_method === 'lishi' ? 'Abertura Lishi profissional' : 'Abertura simples'} · ${safeVehicle.make || ''} ${safeVehicle.model || ''} · Ano-modelo ${safeVehicle.year || ''}${safeVehicle.version ? ` · Versão ${safeVehicle.version}` : ''}` : '';
  const lockInfo = car ? '' : locks.map(l => `${l.model}${l.miolo ? ' (trocar miolo)' : ''}`).join('; ');
  return { service_type: data.service_type, address: data.address.trim(), customer_lat: data.customer_lat, customer_lng: data.customer_lng, urgency: data.urgency === 'urgent' ? 'urgent' : 'normal', search_radius_km: 10, auto_expand_radius: true, location_context: { place_type: data.location_context.place_type, building: String(data.location_context.building || '').slice(0,80), unit: String(data.location_context.unit || '').slice(0,80), vehicle_plate: String(data.location_context.vehicle_plate || '').slice(0,8), coordinates_confirmed: true }, description: [reason, !car && input.broken_key ? 'Chave quebrada dentro da fechadura' : '', lockInfo, String(data.description || '').slice(0,1000)].filter(Boolean).join(' — '), vehicle_info: vehicleInfo, expected_price: data.expected_price, pricing_inputs: { vehicle: safeVehicle, locks, broken_key_in_lock: input.opening_reason === 'lock_problem' || input.broken_key === true } };
}
export async function guestServiceAction(client, state, body) {
  const entities = client.asServiceRole.entities;
  const request = await entities.ServiceRequest.get(state.requestId);
  if (request.client_id !== state.clientId) throw new Error('Acesso ao atendimento indisponível.');
  if (body.action === 'cancel_quote') return await clientCancellationQuote(client, request);
  if (body.action === 'arrival') {
    if (!['accepted','on_the_way'].includes(request.status) || (body.confirmed === true && !request.locksmith_arrived)) throw new Error('O chaveiro ainda não confirmou a chegada.');
    await entities.ServiceRequest.update(request.id, body.confirmed === true ? { client_arrived_confirmed: true } : { locksmith_arrived: false, client_arrived_confirmed: false });
  } else if (body.action === 'cancel') {
    if (request.status === 'completed') throw new Error('Um chamado concluído não pode ser cancelado.');
    if (request.status === 'cancelled') return { success: true };
    const quote = await clientCancellationQuote(client, request);
    if (!quote.free && (body.confirmed_fee !== true || Number(body.confirmed_fee_amount) !== quote.fee)) throw new Error('Confira e confirme a taxa antes de cancelar.');
    const result = await entities.ServiceRequest.updateMany({ id: request.id, status: request.status, updated_date: request.updated_date }, { $set: { status: 'cancelled', cancelled_by: 'cliente', cancellation_fee: quote.fee, cancellation_locksmith_amount: quote.locksmithAmount, cancellation_app_fee: quote.appFee, ...(quote.fee > 0 ? { payment_status: 'pending' } : {}) } });
    if (result.updated !== 1) throw new Error('O atendimento foi atualizado. Confira e tente novamente.');
    const updated = await entities.ServiceRequest.update(request.id, { cancellation_reason: 'Cancelado pelo cliente' });
    await recordClientCancellation(client, updated);
  } else if (body.action === 'message') {
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text || text.length > 1000 || /https?:\/\/|www\./i.test(text) || !request.locksmith_id || !['accepted','queued','on_the_way'].includes(request.status)) throw new Error('Envie uma mensagem de até 1.000 caracteres, sem links, durante o atendimento.');
    const blocks = await entities.UserBlock.filter({ active: true, $or: [{ blocker_id: state.clientId, blocked_id: request.locksmith_user_id }, { blocker_id: request.locksmith_user_id, blocked_id: state.clientId }] }, '-created_date', 1);
    if (blocks.length) throw new Error('O envio de mensagens está bloqueado para esta conversa.');
    await requireServiceCoverage(client, request.customer_lat, request.customer_lng);
    // Message idempotency is room-owned, not supplied as authoritative identity.
    if (state.lastMessageId === body.message_id) return { success: true };
    await entities.ChatMessage.create({ client_id: state.clientId, client_name: request.customer_name, locksmith_id: request.locksmith_id, locksmith_name: request.locksmith_name, locksmith_user_id: request.locksmith_user_id, sender_type: 'customer', sender_name: request.customer_name, sender_user_id: state.clientId, message: text });
    state.lastMessageId = body.message_id;
  } else if (body.action === 'case_response') {
    const cases = await entities.ServiceCancellationCase.filter({ request_id: request.id, client_id: state.clientId }, '-created_date', 1);
    const item = cases[0];
    if (!item || ['resolved','cancelled'].includes(item.status)) throw new Error('Esta análise já foi encerrada.');
    if (item.reason === 'threat') {
      const report = String(body.report || '').trim();
      if (report.length < 10 || report.length > 2000) throw new Error('Descreva sua versão com 10 a 2.000 caracteres.');
      await entities.ServiceCancellationCase.update(item.id, { client_response: 'reported', client_report: report });
    } else if (item.reason === 'client_cancelled' && body.response === 'denied') await entities.ServiceCancellationCase.update(item.id, { client_response: 'denied', status: 'monitoring_service', deadline: new Date(Date.now() + 600000).toISOString() });
    else if (item.reason === 'client_cancelled' && body.response === 'confirmed') {
      await guestServiceAction(client, state, { action: 'cancel', confirmed_fee: body.confirmed_fee, confirmed_fee_amount: body.confirmed_fee_amount });
      await entities.ServiceCancellationCase.update(item.id, { client_response: 'confirmed', status: 'cancelled', resolved_at: new Date().toISOString() });
    } else throw new Error('Resposta inválida.');
  } else throw new Error('Ação indisponível.');
  return { success: true };
}