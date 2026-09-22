import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { verifiedCpf } from '../../shared/verifiedCpf.ts';
import { penalizeLocksmithCancellation, recordClientCancellation, clientCancellationQuote } from '../../shared/cancellationRules.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!verifyInternalCall(req, body)) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const rows = await base44.asServiceRole.entities.ServiceCancellationCase.list('-created_date', 500);
    const due = rows.filter((item) => item.deadline && new Date(item.deadline).getTime() <= Date.now() && !['resolved', 'cancelled'].includes(item.status));
    if (body.dry_run === true) return Response.json({ checked: rows.length, due: due.length, dry_run: true });
    const processed = [];
    for (const item of due) {
      const request = await base44.asServiceRole.entities.ServiceRequest.get(item.request_id).catch(() => null);
      if (item.status === 'waiting_address') {
        if (request) {
          const cancelled = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'cancelled', cancelled_by: 'chaveiro', cancellation_reason: 'Endereço incorreto; chaveiro aguardou 6 minutos' });
          await penalizeLocksmithCancellation(base44, cancelled);
        }
        await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { status: 'cancelled', resolved_at: new Date().toISOString() });
      } else if (item.status === 'waiting_client') {
        if (request && !['completed', 'cancelled'].includes(request.status)) {
          const amount = await clientCancellationQuote(base44, request);
          const cancelled = await base44.asServiceRole.entities.ServiceRequest.update(request.id, { status: 'cancelled', cancelled_by: 'cliente', cancellation_fee: amount.fee, cancellation_locksmith_amount: amount.locksmithAmount, cancellation_app_fee: amount.appFee, ...(amount.fee > 0 ? { payment_status: 'pending' } : {}), cancellation_reason: 'Cliente não respondeu à confirmação de cancelamento' });
          await recordClientCancellation(base44, cancelled);
        }
        await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { status: 'cancelled', resolved_at: new Date().toISOString() });
      } else if (item.status === 'threat_suspended') {
        const scores = await base44.asServiceRole.entities.LocksmithScore.filter({ locksmith_id: item.locksmith_id });
        if (scores[0]) await base44.asServiceRole.entities.LocksmithScore.update(scores[0].id, { suspended_until: new Date().toISOString() });
        await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { status: 'resolved', resolved_at: new Date().toISOString() });
      } else if (item.status === 'monitoring_service') {
        if (request?.status === 'completed') {
          await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { status: 'resolved', resolved_at: new Date().toISOString() });
        } else {
          const scores = await base44.asServiceRole.entities.LocksmithScore.filter({ locksmith_id: item.locksmith_id });
          const score = scores[0];
          const heartbeat = score?.last_heartbeat_at ? new Date(score.last_heartbeat_at).getTime() : 0;
          if (heartbeat > Date.now() - 7 * 60000) {
            await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { deadline: new Date(Date.now() + 5 * 60000).toISOString() });
          } else if (score) {
            const count = Number(score.abandonment_count || 0) + 1;
            const hours = count === 1 ? 24 : 72;
            const update = { abandonment_count: count, suspended_until: new Date(Date.now() + hours * 3600000).toISOString() };
            if (count >= 3) update.banned = true;
            await base44.asServiceRole.entities.LocksmithScore.update(score.id, update);
            await base44.asServiceRole.entities.Locksmith.update(item.locksmith_id, { online: false, available: count < 3 });
            if (count >= 3) {
              const users = await base44.asServiceRole.entities.User.filter({ id: item.locksmith_user_id });
              const cpf = users[0] ? await verifiedCpf(base44, users[0].id) : null;
              if (cpf) await base44.asServiceRole.entities.BlockedCpf.create({ cpf: String(cpf).replace(/\D/g, ''), reason: 'Três abandonos de atendimento confirmados', locksmith_user_id: item.locksmith_user_id });
              await base44.asServiceRole.entities.User.delete(item.locksmith_user_id).catch(() => null);
            }
            await base44.asServiceRole.entities.ServiceCancellationCase.update(item.id, { status: 'resolved', resolved_at: new Date().toISOString() });
          }
        }
      }
      processed.push(item.id);
    }
    return Response.json({ checked: rows.length, processed });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}