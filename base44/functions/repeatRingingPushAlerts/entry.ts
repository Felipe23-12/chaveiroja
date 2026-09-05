import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { notifyRingingLocksmiths } from '../../shared/locksmithRingPush.ts';

/**
 * Reforço contínuo do alerta: enquanto um chamado seguir tocando sem ninguém
 * aceitar, reenvia o push nativo aos chaveiros — assim o celular volta a
 * apitar mesmo com o app em segundo plano ou fechado.
 */
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalCall = verifyInternalCall(body);
    const user = internalCall ? null : await base44.auth.me().catch(() => null);
    if (!internalCall && !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!internalCall && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    // Inclui também os chamados em busca (searching): eles seguem aguardando
    // um chaveiro e devem continuar apitando no celular.
    const [ringing, searching] = await Promise.all([
      base44.asServiceRole.entities.ServiceRequest.filter({ status: "ringing" }),
      base44.asServiceRole.entities.ServiceRequest.filter({ status: "searching" }),
    ]);
    const pending = [...(ringing || []), ...(searching || [])];
    let total = 0;
    for (const sr of pending) {
      const res = await notifyRingingLocksmiths(base44, sr, true);
      total += res.notified.length;
    }

    return Response.json({ success: true, requests: pending.length, notified_count: total });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}