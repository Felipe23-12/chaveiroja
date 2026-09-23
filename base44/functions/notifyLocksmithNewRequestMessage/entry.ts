import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { getTwilioConfig, toE164, sendWhatsApp, sendSmsFallback, isWhatsAppUnavailable, PUBLIC_BASE_URL } from '../../shared/twilioMessaging.ts';

const RETRYABLE = ['not_configured', 'no_phone'];

function maskPhone(phone: string) {
  return phone ? `${phone.slice(0, 5)}****${phone.slice(-2)}` : '';
}

function buildMessage(sr: any, client: any) {
  const clientName = client?.legal_name || client?.full_name || 'Cliente';
  const clientPhone = toE164(client?.phone) || 'não informado';
  const mapLink = sr.customer_lat && sr.customer_lng
    ? `https://www.google.com/maps/search/?api=1&query=${sr.customer_lat},${sr.customer_lng}`
    : 'não informada';
  const vars = {
    '1': sr.service_type || 'Serviço de chaveiro',
    '2': sr.address || 'Endereço não informado',
    '3': mapLink,
    '4': clientName,
    '5': clientPhone,
  };
  const text = [
    `ChaveiroJá: ${sr.urgency === 'urgent' ? 'CHAMADO URGENTE' : 'novo chamado'}`,
    `Serviço: ${vars['1']}`,
    `Endereço: ${vars['2']}`,
    `Localização: ${vars['3']}`,
    `Cliente: ${vars['4']} - ${vars['5']}`,
    `Aceite no app: ${PUBLIC_BASE_URL}/painel-chaveiro`,
  ].join('\n');
  return { text, vars };
}

/** Reserva o envio para (chamado, chaveiro). Retorna null se outro processamento já reservou. */
async function claimDelivery(base44: any, data: any) {
  const Delivery = base44.asServiceRole.entities.LocksmithMessageDelivery;
  const existing = await Delivery.filter({ dedupe_key: data.dedupe_key });
  if (existing.some((d: any) => !RETRYABLE.includes(d.status))) return null;
  for (const d of existing) await Delivery.delete(d.id).catch(() => null);
  const mine = await Delivery.create(data);
  const all = await Delivery.filter({ dedupe_key: data.dedupe_key }, 'created_date');
  if (all[0]?.id !== mine.id) {
    await Delivery.delete(mine.id).catch(() => null);
    return null;
  }
  return mine;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const internalCall = verifyInternalCall(req, body);
    const user = internalCall ? null : await base44.auth.me().catch(() => null);
    if (!internalCall && !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!internalCall && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!body.service_request_id && !(body.dry_run === true && body.sample_request)) return Response.json({ error: 'service_request_id é obrigatório' }, { status: 400 });

    const dryRun = body.dry_run === true;
    // Simulação (somente dry_run): usa dados de exemplo sem gravar nada no banco.
    const sample = dryRun && body.sample_request ? body.sample_request : null;
    const sr = sample || await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id).catch(() => null);
    if (!sr) return Response.json({ error: 'Chamado não encontrado' }, { status: 404 });
    if (sr.status !== 'searching' && sr.status !== 'ringing') {
      return Response.json({ skipped: true, reason: `status ${sr.status} não requer aviso` });
    }

    const now = Date.now();
    const cooldown = new Set((sr.rejections || [])
      .filter((r: any) => r.rering_at && new Date(r.rering_at).getTime() > now)
      .map((r: any) => r.locksmith_id));
    const ids = ((sr.ringing_locksmith_ids || []).length > 0 ? sr.ringing_locksmith_ids : (sr.locksmith_id ? [sr.locksmith_id] : []))
      .filter((id: string) => !cooldown.has(id));
    if (ids.length === 0) return Response.json({ skipped: true, reason: 'Nenhum chaveiro atribuído' });

    const client = sample ? body.sample_client : sr.created_by_id ? await base44.asServiceRole.entities.User.get(sr.created_by_id).catch(() => null) : null;
    const { text, vars } = buildMessage(sr, client);
    const cfg = getTwilioConfig();
    const results: any[] = [];

    for (const locksmithId of ids) {
      const locksmith = sample ? body.sample_locksmiths?.[locksmithId] : await base44.asServiceRole.entities.Locksmith.get(locksmithId).catch(() => null);
      if (!locksmith) { results.push({ locksmith_id: locksmithId, status: 'not_found' }); continue; }
      const owner = sample ? null : locksmith.created_by_id ? await base44.asServiceRole.entities.User.get(locksmith.created_by_id).catch(() => null) : null;
      const phone = toE164(locksmith.phone) || toE164(owner?.phone);
      const base = {
        service_request_id: sr.id, locksmith_id: locksmithId, locksmith_user_id: locksmith.created_by_id || '',
        dedupe_key: `${sr.id}:${locksmithId}`, phone, message_text: text, last_event_at: new Date().toISOString(),
      };

      if (dryRun) {
        results.push({ locksmith_id: locksmithId, phone: maskPhone(phone), would_send: Boolean(phone && cfg.configured), configured: cfg.configured, missing_secrets: cfg.missing });
        continue;
      }

      const status = !phone ? 'no_phone' : (!cfg.configured ? 'not_configured' : 'sending');
      const delivery = await claimDelivery(base44, { ...base, status });
      if (!delivery) { results.push({ locksmith_id: locksmithId, status: 'duplicate_skipped' }); continue; }
      if (status !== 'sending') {
        console.warn(`Aviso não enviado (${status}) para chaveiro ${locksmithId}`, cfg.missing);
        results.push({ locksmith_id: locksmithId, status });
        continue;
      }

      const wa = await sendWhatsApp(cfg, phone, text, vars, delivery.id);
      if (wa.ok) {
        await base44.asServiceRole.entities.LocksmithMessageDelivery.update(delivery.id, {
          status: 'whatsapp_sent', whatsapp_sid: wa.sid, whatsapp_status: wa.status || 'queued',
        });
        results.push({ locksmith_id: locksmithId, status: 'whatsapp_sent' });
        continue;
      }

      await base44.asServiceRole.entities.LocksmithMessageDelivery.update(delivery.id, {
        whatsapp_status: 'failed', whatsapp_error_code: wa.code, whatsapp_error_message: wa.message,
        ...(isWhatsAppUnavailable(wa.code) ? {} : { status: 'failed' }),
      });
      if (isWhatsAppUnavailable(wa.code)) {
        const sms = await sendSmsFallback(base44, cfg, delivery, `WhatsApp indisponível (código ${wa.code})`);
        results.push({ locksmith_id: locksmithId, status: sms.ok ? 'sms_sent' : 'failed', error: sms.ok ? undefined : sms.message });
      } else {
        console.error(`Falha WhatsApp chaveiro ${locksmithId}: ${wa.code} ${wa.message}`);
        results.push({ locksmith_id: locksmithId, status: 'failed', error: wa.message });
      }
    }

    return Response.json({ success: true, dry_run: dryRun, ...(dryRun ? { message_preview: text, whatsapp_variables: vars } : {}), configured: cfg.configured, missing_secrets: cfg.missing, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}