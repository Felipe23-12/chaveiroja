import { secrets } from 'base44:runtime';

export const CAMPAIGN = 'update-notice-2026-10-20';
export const USER_FIELDS = ['id', 'email', 'full_name', 'legal_name', 'moderation_blocked', 'disabled', 'is_service'];
export const eligibleUser = user => Boolean(user?.id) && user.moderation_blocked !== true && user.disabled !== true && user.is_service !== true;

export async function webSubscriptionAvailable(identity) {
  if (!identity) return false;
  const appId = secrets.get('ONESIGNAL_APP_ID');
  const apiKey = secrets.get('ONESIGNAL_REST_API_KEY');
  if (!appId || !apiKey) throw new Error('WEB_PUSH_NOT_CONFIGURED');
  const response = await fetch(`https://api.onesignal.com/apps/${encodeURIComponent(appId)}/users/by/external_id/${encodeURIComponent(identity.external_id)}`, {
    headers: { Authorization: `Key ${apiKey}` }, signal: AbortSignal.timeout(10000),
  });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error(`WEB_SUBSCRIPTION_LOOKUP_${response.status}`);
  const data = await response.json();
  return (data.subscriptions || []).some(subscription => subscription.enabled === true && ['ChromePush', 'FirefoxPush', 'SafariPush'].includes(subscription.type));
}

export async function pageContext(base44, users) {
  const ids = users.map(user => user.id);
  const [identities, deliveries] = await Promise.all([
    base44.asServiceRole.entities.WebPushIdentity.filter({ user_id: { $in: ids } }, { limit: 1000, fields: ['user_id', 'external_id'] }),
    base44.asServiceRole.entities.UpdateNoticeDelivery.filter({ campaign_key: CAMPAIGN, user_id: { $in: ids } }, { limit: 1000, fields: ['user_id', 'channel', 'status'] }),
  ]);
  if (identities.has_more || deliveries.has_more) throw new Error('AUDIENCE_PAGE_TOO_LARGE');
  return {
    identities: new Map(identities.items.map(identity => [identity.user_id, identity])),
    attempted: new Set(deliveries.items.map(delivery => `${delivery.user_id}:${delivery.channel}`)),
  };
}