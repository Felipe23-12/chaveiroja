import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';

// Disparo manual (via botão no painel admin) de push para chaveiros sem conta Mercado Pago
// conectada. Diferente do lembrete semanal automático (sendMercadoPagoConnectionReminders),
// este só roda quando um admin clica no botão — sem cron, sem dedupe.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const admin = await base44.auth.me();
    if (!admin || admin.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let offset = 0;
    let eligible = 0;
    let sent = 0;
    let failed = 0;

    while (true) {
      const locksmiths = await base44.asServiceRole.entities.Locksmith.list('id', 25, offset);
      if (!locksmiths.length) break;
      const locksmithIds = locksmiths.map((item) => item.id);
      const userIds = [...new Set(locksmiths.map((item) => item.created_by_id).filter(Boolean))];
      const [accounts, users] = await Promise.all([
        base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: { $in: locksmithIds }, status: 'active' }, 'id', 100),
        base44.asServiceRole.entities.User.filter({ id: { $in: userIds } }, 'id', 100),
      ]);
      const connected = new Set(accounts.map((item) => item.locksmith_id));
      const usersById = new Map(users.map((item) => [item.id, item]));

      for (const locksmith of locksmiths) {
        if (connected.has(locksmith.id) || !locksmith.created_by_id) continue;
        const user = usersById.get(locksmith.created_by_id);
        if (!user) { failed += 1; continue; }
        eligible += 1;
        try {
          await base44.asServiceRole.integrations.Core.SendPushNotification({
            user_id: user.id,
            title: 'Conecte sua conta Mercado Pago',
            content: 'Para aceitar serviços, você precisa conectar sua conta do Mercado Pago.',
            action_label: 'Fazer Agora',
            action_url: '/cadastro/recebimentos',
          });
          sent += 1;
        } catch (error) {
          failed += 1;
        }
      }

      offset += locksmiths.length;
      if (locksmiths.length < 25) break;
    }

    return Response.json({ eligible, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
