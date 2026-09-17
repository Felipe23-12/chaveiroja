import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { notifyRingingLocksmiths } from '../../shared/locksmithRingPush.ts';
import { notifyLocksmithStatus } from '../../shared/locksmithStatusPush.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalCall = verifyInternalCall(req, body);
    const user = internalCall ? null : await base44.auth.me().catch(() => null);
    if (!internalCall && !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!internalCall && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const serviceRequestId = body.service_request_id;

    if (!serviceRequestId) {
      return Response.json({ error: "service_request_id é obrigatório" }, { status: 400 });
    }

    const sr = await base44.asServiceRole.entities.ServiceRequest.get(serviceRequestId);
    if (!sr) {
      return Response.json({ error: "Pedido não encontrado" }, { status: 404 });
    }

    if (body.event_type === 'client_cancelled' || body.event_type === 'arrival_confirmed' || body.event_type === 'cash_payment_selected') {
      return Response.json(await notifyLocksmithStatus(base44, sr, body.event_type, body.dry_run === true));
    }

    // Só notifica pedidos que ainda estão procurando chaveiro
    if (sr.status !== "searching" && sr.status !== "ringing") {
      return Response.json({ skipped: true, reason: `status ${sr.status} não requer notificação` });
    }

    const res = await notifyRingingLocksmiths(base44, sr, body.repeat === true);
    if (res.notified.length === 0 && res.reason) {
      return Response.json({ skipped: true, reason: res.reason });
    }

    return Response.json({ success: true, notified_count: res.notified.length, notified: res.notified });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}