import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { verifyGuestClaimProof } from '../../shared/guestClaimProof.ts';
import { claimGuestService } from '../../shared/guestServiceIdentity.ts';
export default async function(req) {
  try {
    const client = createClientFromRequest(req);
    const user = await client.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Entre na sua conta para vincular o atendimento.' }, { status: 401 });
    const body = await req.json();
    const state = await verifyGuestClaimProof(body.proof);
    const row = await client.asServiceRole.entities.GuestServiceSession.get(state.sessionId);
    if (!row || row.guest_client_id !== state.clientId || row.request_id !== state.requestId || Date.parse(row.expires_at) <= Date.now()) return Response.json({ error: 'Atendimento indisponível para vinculação.' }, { status: 403 });
    return Response.json(await claimGuestService(client, state, user.id));
  } catch (error) { return Response.json({ error: error.message || 'Não foi possível vincular o atendimento.' }, { status: 400 }); }
}
