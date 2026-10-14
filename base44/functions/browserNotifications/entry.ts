import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const appId = secrets.get('ONESIGNAL_APP_ID');
    const apiKey = secrets.get('ONESIGNAL_REST_API_KEY');
    if (!appId || !apiKey) return Response.json({ error: 'Notificações web ainda não configuradas.' }, { status: 503 });
    if (body.action === 'health') {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const response = await fetch(`https://api.onesignal.com/apps/${encodeURIComponent(appId)}`, {
        headers: { Authorization: `Key ${apiKey}` }, signal: AbortSignal.timeout(10000),
      });
      return Response.json({ configured: true, provider_accessible: response.ok, provider_status: response.status });
    }
    if (body.action !== 'configure') return Response.json({ error: 'Ação inválida' }, { status: 400 });
    if (user.account_type === 'chaveiro' || user.role === 'admin') return Response.json({ error: 'Disponível para clientes.' }, { status: 403 });
    const identityPage = await base44.asServiceRole.entities.WebPushIdentity.filter({ user_id: user.id }, { limit: 1 });
    let identity = identityPage.items[0];
    if (!identity) {
      const created = await base44.asServiceRole.entities.WebPushIdentity.upsert([
        { user_id: user.id, external_id: `${crypto.randomUUID()}${crypto.randomUUID()}` },
      ], { key: 'user_id' });
      identity = created.records[0];
    }
    return Response.json({ appId, externalId: identity.external_id });
  } catch (error) {
    console.error('browserNotifications:', error.message);
    return Response.json({ error: 'Não foi possível configurar os avisos do navegador.' }, { status: 500 });
  }
}