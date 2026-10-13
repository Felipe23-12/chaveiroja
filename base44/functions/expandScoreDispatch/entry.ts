import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { refreshRequestDispatch } from '../../shared/requestDispatch.ts';
import { notifyRingingLocksmiths } from '../../shared/locksmithRingPush.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internal = verifyInternalCall(req, body);
    const user = internal ? null : await base44.auth.me().catch(() => null);
    if (!internal && user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!body.request_id) return Response.json({ error: 'Informe o chamado' }, { status: 400 });
    const result = await refreshRequestDispatch(base44, body.request_id);
    const push = result.request ? await notifyRingingLocksmiths(base44, result.request, true) : { notified: [] };
    return Response.json({ success: true, added: result.added, notified: push.notified.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
