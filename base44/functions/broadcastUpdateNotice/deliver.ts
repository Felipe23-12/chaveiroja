import { sendWebPush } from '../../shared/webPushNotification.ts';
import { escapeHtml } from '../../shared/escapeHtml.ts';
import { CAMPAIGN, eligibleUser } from './audience.ts';

const TITLE = 'Atualize o Chaveiro Já';
const CONTENT = 'Saiu uma nova versão do app. Atualize agora na Play Store ou na App Store para continuar usando o Chaveiro Já.';

export async function deliverNotice(base44, user, channel) {
  // Claim BEFORE the external call. Even ambiguous network failures are never retried,
  // since native push and email do not offer an idempotency key.
  const delivery = await base44.asServiceRole.entities.UpdateNoticeDelivery.create({
    campaign_key: CAMPAIGN, user_id: user.id, channel, status: 'attempting', attempted_at: new Date().toISOString(),
  });
  let status = 'sent';
  let errorCode = '';
  try {
    const current = await base44.asServiceRole.entities.User.get(user.id);
    if (!eligibleUser(current)) { status = 'skipped'; errorCode = 'USER_INELIGIBLE'; }
    else if (channel === 'native_push') {
      const result = await base44.asServiceRole.integrations.Core.SendPushNotification({ user_id: current.id, title: TITLE, content: CONTENT, action_label: 'Abrir aplicativo', action_url: '/' });
      if (result?.success === false || result?.error) throw new Error('NATIVE_PUSH_REJECTED');
    } else if (channel === 'web_push') {
      const result = await sendWebPush(base44, { userId: current.id, title: TITLE, content: CONTENT, path: '/', eventId: `${CAMPAIGN}:${current.id}` });
      if (!result.sent) { status = 'skipped'; errorCode = result.reason || 'NO_WEB_SUBSCRIPTION'; }
    } else {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(current.email || '')) { status = 'skipped'; errorCode = 'NO_VALID_EMAIL'; }
      else {
        const result = await base44.asServiceRole.integrations.Core.SendEmail({
          to: current.email, from_name: 'Chaveiro Já', template_name: 'UpdateNotice',
          variables: {
            first_name: escapeHtml(String(current.legal_name || current.full_name || 'usuário').trim().split(/\s+/)[0]),
            android_url: 'https://play.google.com/store/apps/details?id=com.base6a975d266a8000184833026a.app',
            ios_url: 'https://apps.apple.com/br/app/id6814332317',
          },
        });
        if (result?.success === false || result?.error) throw new Error('EMAIL_REJECTED');
      }
    }
  } catch (error) {
    status = 'failed';
    // Do not store provider responses containing addresses, tokens or personal data.
    errorCode = `DELIVERY_ERROR_${Number(error?.status || error?.response?.status) || 'UNKNOWN'}`;
  }
  await base44.asServiceRole.entities.UpdateNoticeDelivery.update(delivery.id, { status, error_code: errorCode, completed_at: new Date().toISOString() });
  return status;
}