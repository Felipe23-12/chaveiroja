import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));

    const week = new Date().toISOString().slice(0, 10);
    let offset = 0;
    let pushSent = 0;
    let emailSent = 0;
    let skipped = 0;
    let failed = 0;
    let eligible = 0;

    while (true) {
      const locksmiths = await base44.asServiceRole.entities.Locksmith.list('id', 25, offset);
      if (!locksmiths.length) break;
      const locksmithIds = locksmiths.map((item) => item.id);
      const userIds = [...new Set(locksmiths.map((item) => item.created_by_id).filter(Boolean))];
      const [accounts, users, deliveries] = await Promise.all([
        base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: { $in: locksmithIds }, status: 'active' }, 'id', 100),
        base44.asServiceRole.entities.User.filter({ id: { $in: userIds } }, 'id', 100),
        base44.asServiceRole.entities.MercadoPagoReminderDelivery.filter({ locksmith_id: { $in: locksmithIds }, week }, 'id', 100),
      ]);
      const connected = new Set(accounts.map((item) => item.locksmith_id));
      const usersById = new Map(users.map((item) => [item.id, item]));
      const deliveriesByLocksmith = new Map(deliveries.map((item) => [item.locksmith_id, item]));

      for (const locksmith of locksmiths) {
        if (connected.has(locksmith.id) || !locksmith.created_by_id) { skipped += 1; continue; }
        const user = usersById.get(locksmith.created_by_id);
        if (!user) { failed += 1; continue; }
        eligible += 1;
        if (body.dry_run === true) continue;
        const previous = deliveriesByLocksmith.get(locksmith.id);
        const update = {};

        if (!previous?.push_sent) {
          try {
            await base44.asServiceRole.integrations.Core.SendPushNotification({
              user_id: user.id,
              title: 'Configure seus recebimentos',
              content: 'Conecte sua conta Mercado Pago para evitar o acúmulo de créditos pendentes na plataforma.',
              action_label: 'Conectar Mercado Pago',
              action_url: '/cadastro/recebimentos'
            });
            update.push_sent = true;
            update.push_error = '';
            pushSent += 1;
          } catch (error) {
            update.push_error = String(error.message || 'Falha no push').slice(0, 400);
            failed += 1;
          }
        }

        if (!previous?.email_sent) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user.email,
              subject: 'Configure seus recebimentos no Chaveiro Já',
              text: `Olá, ${user.full_name || locksmith.name || 'chaveiro'}.\n\nSua conta Mercado Pago ainda não está conectada. Configure o recebimento no aplicativo para evitar o acúmulo de créditos pendentes que precisarão ser repassados posteriormente.\n\nAbra o Chaveiro Já e acesse Cadastro de recebimentos.`
            });
            update.email_sent = true;
            update.email_error = '';
            emailSent += 1;
          } catch (error) {
            update.email_error = String(error.message || 'Falha no e-mail').slice(0, 400);
            failed += 1;
          }
        }

        if (previous) await base44.asServiceRole.entities.MercadoPagoReminderDelivery.update(previous.id, update);
        else await base44.asServiceRole.entities.MercadoPagoReminderDelivery.create({ locksmith_id: locksmith.id, locksmith_user_id: user.id, week, ...update });
      }

      offset += locksmiths.length;
      if (locksmiths.length < 25) break;
    }

    return Response.json({ dry_run: body.dry_run === true, eligible, push_sent: pushSent, email_sent: emailSent, skipped, failed });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}