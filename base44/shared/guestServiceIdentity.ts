import { secrets } from 'base44:runtime';
import { requestCustomerName } from './clientRequestAccess.ts';
import { appleReviewRole } from './appleReviewPolicy.ts';
import { clientRequestsQuery } from './serviceRequestOwner.ts';
const fail = (message, code = 'GUEST_REQUEST_INVALID') => { throw Object.assign(new Error(message), { code }); };
export function guestContact(data) {
  const name = requestCustomerName(data?.customer_name);
  let phone = String(data?.phone || '').replace(/\D/g, '');
  if (phone.startsWith('55') && phone.length >= 12) phone = phone.slice(2);
  if (!name || !/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(phone) || /^(\d)\1+$/.test(phone)) fail('Informe seu nome e um telefone válido com DDD.', 'GUEST_CONTACT_REQUIRED');
  return { name, phone };
}
export async function reserveGuestContact(client, state, data) {
  const { name, phone } = guestContact(data);
  if (data.terms_accepted !== true) fail('Aceite os termos do atendimento para continuar.', 'TERMS_REQUIRED');
  const entities = client.asServiceRole.entities;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secrets.get('INTERNAL_CALL_TOKEN')), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const phoneHash = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('guest-phone:' + phone)))).map(b => b.toString(16).padStart(2, '0')).join('');
  // Phone is an abuse signal, never proof of identity or a lookup credential.
  const existing = await entities.GuestServiceSession.filter({ phone_hash: phoneHash }, 'created_date', 2);
  if (existing.some(row => row.guest_client_id !== state.clientId)) fail('Este telefone já foi utilizado em outro atendimento. Entre na sua conta para continuar.', 'GUEST_LOGIN_REQUIRED');
  const phonePattern = '^\\D*(?:5\\D*5\\D*)?' + phone.split('').join('\\D*') + '\\D*$';
  const accounts = await entities.User.filter({ phone: { $regex: phonePattern } }, '-created_date', 100);
  if (accounts.length >= 100 || accounts.some(account => account.moderation_blocked)) fail('Entre na sua conta para continuar este atendimento.', 'GUEST_LOGIN_REQUIRED');
  // An existing registration is not a previous service. Never link a guest to
  // this account by phone; only a verified sign-in may claim the new request.
  for (const account of accounts) {
    const previous = await entities.ServiceRequest.filter(clientRequestsQuery(account.id), '-created_date', 1);
    if (previous.length) fail('Este telefone já foi utilizado em outro atendimento. Entre na sua conta para continuar.', 'GUEST_LOGIN_REQUIRED');
  }
  if (state.sessionId) {
    const row = await entities.GuestServiceSession.get(state.sessionId);
    if (row.blocked || row.claimed_user_id) fail('Acesso indisponível. Entre na sua conta.', 'GUEST_LOGIN_REQUIRED');
    if (row.phone_hash !== phoneHash) fail('Use o telefone informado neste atendimento.');
    return row;
  }
  const row = existing[0] || await entities.GuestServiceSession.create({ guest_client_id: state.clientId, phone_hash: phoneHash, phone, customer_name: name, terms_accepted_at: new Date().toISOString(), terms_version: '2026-09-28', expires_at: state.expiresAt });
  const canonical = await entities.GuestServiceSession.filter({ phone_hash: phoneHash }, 'created_date', 1);
  if (canonical[0]?.id !== row.id) fail('Para continuar, entre na sua conta.', 'GUEST_LOGIN_REQUIRED');
  return row;
}
export async function claimGuestService(client, state, userId) {
  const entities = client.asServiceRole.entities;
  const user = await entities.User.get(userId);
  if (user.role !== 'user' || (user.account_type && user.account_type !== 'cliente') || user.moderation_blocked || appleReviewRole(user) || user.is_verified !== true) fail('Entre com uma conta de cliente verificada e liberada para vincular este atendimento.');
  const row = await entities.GuestServiceSession.get(state.sessionId);
  if (row.blocked || (row.claimed_user_id && row.claimed_user_id !== userId)) fail('Atendimento indisponível para esta conta.');
  const request = await entities.ServiceRequest.get(state.requestId);
  if (![state.clientId, userId].includes(request.client_id)) fail('Vínculo do atendimento inválido.');
  // Only one verified account can win, even if the same proof is submitted concurrently.
  if (!row.claimed_user_id) {
    const result = await entities.GuestServiceSession.updateMany({ id: row.id, $or: [{ claimed_user_id: { $exists: false } }, { claimed_user_id: null }, { claimed_user_id: '' }] }, { $set: { claimed_user_id: userId } });
    if (result.updated !== 1) {
      const pinned = await entities.GuestServiceSession.get(row.id);
      if (pinned.claimed_user_id !== userId) fail('Atendimento indisponível para esta conta.');
    }
  }
  const updates = [
    ['ServiceRequestContext', { request_id: request.id, client_id: state.clientId }, { client_id: userId }],
    ['ServiceCancellationCase', { request_id: request.id, client_id: state.clientId }, { client_id: userId }],
    ['ClientCancellationEvent', { request_id: request.id, client_id: state.clientId }, { client_id: userId }],
    ['ClientSafetyBlock', { client_id: state.clientId }, { client_id: userId }],
    ['ChatMessage', { client_id: state.clientId }, { client_id: userId }],
    ['ChatMessage', { sender_user_id: state.clientId }, { sender_user_id: userId }],
    ['ConductReport', { reported_id: state.clientId }, { reported_id: userId }],
    ['ReportMessage', { reported_id: state.clientId }, { reported_id: userId }],
    ['ReportMessage', { recipient_id: state.clientId }, { recipient_id: userId }],
    ['UserBlock', { blocked_id: state.clientId }, { blocked_id: userId }],
  ];
  for (const [entity, query, patch] of updates) {
    let result;
    do { result = await entities[entity].updateMany(query, { $set: patch }); } while (result.has_more === true);
  }
  await entities.ServiceRequest.update(request.id, { client_id: userId });
  await entities.User.update(userId, { account_type: 'cliente', ...(user.phone ? {} : { phone: row.phone }), ...(user.legal_name ? {} : { legal_name: row.customer_name }), ...(user.terms_accepted_at ? {} : { terms_accepted_at: row.terms_accepted_at, terms_version: row.terms_version }) });
  return { request_id: request.id, claimed: true };
}