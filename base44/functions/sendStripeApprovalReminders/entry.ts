import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    if (!verifyInternalCall(req)) {
      const user = await base44.auth.me().catch(() => null);
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const users = await base44.asServiceRole.entities.User.list('id', 500);
    const locksmiths = users.filter((user) => user.account_type === 'chaveiro');
    const accounts = await base44.asServiceRole.entities.StripeConnectAccount.list('-updated_date', 500);
    const pending = locksmiths.filter((user) => {
      const userAccounts = accounts.filter((account) => account.locksmith_id === user.id || account.created_by_id === user.id);
      return !userAccounts.some((account) => account.charges_enabled === true && account.payouts_enabled === true);
    });

    if (body.dry_run === true) {
      return Response.json({ dry_run: true, locksmiths: locksmiths.length, pending: pending.length });
    }

    let sent = 0;
    let failed = 0;
    for (const user of pending) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: 'ChaveiroJá',
          to: user.email,
          subject: 'Conclua a aprovação da sua conta Stripe',
          body: `<p>Olá, ${user.full_name || 'chaveiro'}.</p><p>Sua conta Stripe ainda não está totalmente aprovada para receber pagamentos e repasses pelo ChaveiroJá.</p><p>Abra o aplicativo, acesse o cadastro de recebimentos e conclua as informações solicitadas pelo Stripe.</p><p>Este lembrete será interrompido automaticamente quando pagamentos e repasses estiverem ativos.</p>`
        });
        sent += 1;
      } catch (_) {
        failed += 1;
      }
    }

    return Response.json({ locksmiths: locksmiths.length, pending: pending.length, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}