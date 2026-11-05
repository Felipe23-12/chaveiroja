import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { signBrowserToken, verifyBrowserToken } from '../../shared/guestBrowserToken.ts';
import { handleGuestCommand } from '../../shared/guestCommandHandler.ts';
const mutations = new Set(['create', 'arrival', 'cancel', 'message', 'case_response']);
const allowed = new Set(['snapshot', 'places', 'opening_options', 'quote', 'create', 'claim_proof', 'cancel_quote', 'arrival', 'cancel', 'message', 'case_response']);
export default async function(req) {
  let entities, row, lock;
  try {
    const client = createClientFromRequest(req);
    entities = client.asServiceRole.entities.GuestBrowserSession;
    const body = await req.json();
    if (!body || JSON.stringify(body).length > 24000) return Response.json({ error: 'Solicitação inválida.' }, { status: 400 });
    if (body.action === 'session' && !body.token) {
      const session = await entities.create({ guest_client_id: 'guest:' + crypto.randomUUID(), expires_at: new Date(Date.now() + 30 * 86400000).toISOString(), rate_window: Date.now(), rate_count: 0 });
      return Response.json({ token: await signBrowserToken(session) });
    }
    if (!allowed.has(body.action)) return Response.json({ error: 'Ação indisponível.' }, { status: 400 });
    const access = await verifyBrowserToken(body.token);
    row = await entities.get(access.sessionId);
    if (!row || row.guest_client_id !== access.clientId || Date.parse(row.expires_at) <= Date.now()) return Response.json({ error: 'Acesso visitante indisponível.' }, { status: 403 });
    const now = Date.now();
    if (!row.rate_window || now - row.rate_window >= 60000) {
      const reset = await entities.updateMany({ id: row.id, rate_window: row.rate_window }, { $set: { rate_window: now, rate_count: 1 } });
      if (reset.updated !== 1) return Response.json({ error: 'Tente novamente em instantes.' }, { status: 429 });
    } else {
      const rate = await entities.updateMany({ id: row.id, rate_window: row.rate_window, rate_count: { $lt: 60 } }, { $inc: { rate_count: 1 } });
      if (rate.updated !== 1) return Response.json({ error: 'Aguarde um minuto antes de tentar novamente.' }, { status: 429 });
    }
    if (mutations.has(body.action)) {
      lock = crypto.randomUUID();
      const acquired = await entities.updateMany({ id: row.id, $or: [{ lock_until: { $exists: false } }, { lock_until: null }, { lock_until: { $lte: new Date(now).toISOString() } }] }, { $set: { lock_nonce: lock, lock_until: new Date(now + 120000).toISOString() } });
      if (acquired.updated !== 1) { lock = null; return Response.json({ error: 'Outra ação está sendo processada. Aguarde e confira o chamado antes de tentar novamente.' }, { status: 409 }); }
      row = await entities.get(row.id);
    }
    const state = { clientId: row.guest_client_id, expiresAt: row.expires_at, sessionId: row.session_id, requestId: row.request_id, lastMessageId: row.last_message_id };
    const { state: next, data } = await handleGuestCommand(client, state, body);
    // Only mutations advance state; simultaneous reads never overwrite newer state.
    if (mutations.has(body.action)) {
      const patch = {};
      if (next.sessionId) patch.session_id = next.sessionId;
      if (next.requestId) patch.request_id = next.requestId;
      if (next.lastMessageId) patch.last_message_id = next.lastMessageId;
      if (Object.keys(patch).length) await entities.update(row.id, patch);
    }
    return Response.json(data);
  } catch (error) {
    const suppliedStatus = Number(error.status || error.response?.status);
    const status = error.code === 'GUEST_LOGIN_REQUIRED' ? 403 : [400, 401, 403, 404, 409, 422, 429, 500, 502, 503, 504].includes(suppliedStatus) ? suppliedStatus : 400;
    return Response.json({ error: error.message || 'Não foi possível continuar.', code: error.code }, { status });
  }
  finally {
    if (entities && row && lock) await entities.updateMany({ id: row.id, lock_nonce: lock }, { $unset: { lock_nonce: '', lock_until: '' } }).catch(() => {});
  }
}
