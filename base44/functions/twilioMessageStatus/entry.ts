import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { getTwilioConfig, isValidTwilioSignature, isWhatsAppUnavailable, sendSmsFallback, STATUS_CALLBACK_URL } from '../../shared/twilioMessaging.ts';

// Ordem dos estados para ignorar callbacks fora de ordem.
const RANK: Record<string, number> = { queued: 1, accepted: 1, sending: 2, sent: 3, delivered: 4, read: 5, failed: 6, undelivered: 6 };

function overallStatus(channel: string, providerStatus: string) {
  if (providerStatus === 'failed' || providerStatus === 'undelivered') return 'failed';
  if (providerStatus === 'delivered' || providerStatus === 'read') return channel === 'sms' ? 'sms_delivered' : 'whatsapp_delivered';
  return channel === 'sms' ? 'sms_sent' : 'whatsapp_sent';
}

export default async function(req) {
  try {
    const cfg = getTwilioConfig();
    if (!cfg.configured) return Response.json({ error: 'Twilio não configurado' }, { status: 503 });

    const params = new URLSearchParams(await req.text());
    const search = new URL(req.url).search;
    const valid = await isValidTwilioSignature(cfg.token, `${STATUS_CALLBACK_URL}${search}`, params, req.headers.get('X-Twilio-Signature') || '');
    if (!valid) return Response.json({ error: 'Assinatura inválida' }, { status: 403 });

    const query = new URL(req.url).searchParams;
    const deliveryId = query.get('delivery_id') || '';
    const channel = query.get('channel') === 'sms' ? 'sms' : 'whatsapp';
    const base44 = createClientFromRequest(req);
    const Delivery = base44.asServiceRole.entities.LocksmithMessageDelivery;
    const delivery = deliveryId ? await Delivery.get(deliveryId).catch(() => null) : null;
    if (!delivery) return Response.json({ ignored: true });

    const sid = params.get('MessageSid') || '';
    const providerStatus = params.get('MessageStatus') || '';
    const code = params.get('ErrorCode') || '';
    const prefix = channel === 'sms' ? 'sms' : 'whatsapp';
    if (delivery[`${prefix}_sid`] !== sid) return Response.json({ ignored: true, reason: 'SID diferente' });
    if ((RANK[providerStatus] || 0) < (RANK[delivery[`${prefix}_status`]] || 0)) return Response.json({ ignored: true, reason: 'fora de ordem' });

    const failed = providerStatus === 'failed' || providerStatus === 'undelivered';
    const update: Record<string, any> = { [`${prefix}_status`]: providerStatus, last_event_at: new Date().toISOString() };
    if (code) {
      update[`${prefix}_error_code`] = code;
      update[`${prefix}_error_message`] = params.get('ErrorMessage') || `Erro Twilio ${code}`;
    }

    if (channel === 'whatsapp' && failed && isWhatsAppUnavailable(code)) {
      await Delivery.update(delivery.id, update);
      const sms = await sendSmsFallback(base44, cfg, delivery, `WhatsApp indisponível (código ${code})`);
      return Response.json({ fallback: 'sms', ok: sms.ok === true, skipped: sms.skipped === true });
    }

    // Depois do fallback, callbacks do WhatsApp não alteram mais o estado geral.
    if (!(channel === 'whatsapp' && (delivery.sms_sid || delivery.sms_status))) update.status = overallStatus(channel, providerStatus);
    await Delivery.update(delivery.id, update);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}