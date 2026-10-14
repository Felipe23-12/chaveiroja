import { secrets } from 'base44:runtime';

export async function webPushEventId(eventId) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`chaveiroja:web:${eventId}`));
  const bytes = new Uint8Array(digest).slice(0, 16);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Only trusted server operations call this helper. Recipient and content come
// from the saved request/message, never from a caller-chosen recipient.
export async function sendWebPush(base44, { userId, title, content, path, eventId }) {
  const appId = secrets.get('ONESIGNAL_APP_ID');
  const apiKey = secrets.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) return { skipped: true, reason: 'web_not_configured' };
  const page = await base44.asServiceRole.entities.WebPushIdentity.filter({ user_id: userId }, { limit: 1 });
  const identity = page.items[0];
  if (!identity) return { skipped: true, reason: 'browser_not_registered' };
  if (!/^\/(?:chat|acompanhamento)\/[a-zA-Z0-9_-]+$/.test(path)) throw new Error('Destino da notificação inválido');
  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
    body: JSON.stringify({
      app_id: appId,
      include_aliases: { external_id: [identity.external_id] },
      target_channel: 'push', isAnyWeb: true, isAndroid: false, isIos: false,
      headings: { en: title, pt: title }, contents: { en: content, pt: content },
      data: { path },
      idempotency_key: await webPushEventId(eventId),
      ttl: 3600,
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`OneSignal recusou o envio (${response.status})`);
  return result.id ? { sent: true } : { skipped: true, reason: 'no_subscribed_browser' };
}