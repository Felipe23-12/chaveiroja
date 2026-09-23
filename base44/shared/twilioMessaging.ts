// Integração Twilio (WhatsApp + SMS) para avisos de novos chamados aos chaveiros.
// Credenciais somente em secrets; nada disso chega ao frontend.
import { secrets } from 'base44:runtime';

export const PUBLIC_BASE_URL = 'https://woodoo-quick-lock-link.base44.app';
export const STATUS_CALLBACK_URL = `${PUBLIC_BASE_URL}/functions/twilioMessageStatus`;

// Códigos Twilio que indicam que o número não tem WhatsApp / não é destinatário válido.
// 63003: Channel could not find To address · 63024: Invalid message recipient
const WHATSAPP_UNAVAILABLE_CODES = new Set(['63003', '63024']);

export function getTwilioConfig() {
  const cfg = {
    sid: String(secrets.get('TWILIO_ACCOUNT_SID') || ''),
    token: String(secrets.get('TWILIO_AUTH_TOKEN') || ''),
    whatsappFrom: String(secrets.get('TWILIO_WHATSAPP_FROM') || ''),
    smsFrom: String(secrets.get('TWILIO_SMS_FROM') || ''),
    contentSid: String(secrets.get('TWILIO_WHATSAPP_CONTENT_SID') || ''),
  };
  const missing = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM', 'TWILIO_SMS_FROM']
    .filter((name, i) => ![cfg.sid, cfg.token, cfg.whatsappFrom, cfg.smsFrom][i]);
  return { ...cfg, configured: missing.length === 0, missing };
}

export function isWhatsAppUnavailable(code: any) {
  return WHATSAPP_UNAVAILABLE_CODES.has(String(code || ''));
}

/** Converte telefone brasileiro para E.164 (+55...). Retorna '' se inválido. */
export function toE164(phone: any) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^55\d{10,11}$/.test(digits)) return '';
  return `+${digits}`;
}

function plainNumber(value: string) {
  return value.replace(/^whatsapp:/, '');
}

async function twilioCreateMessage(cfg: any, params: Record<string, string>) {
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${cfg.sid}:${cfg.token}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, code: String(data.code || res.status), message: String(data.message || 'Falha no provedor') };
  return { ok: true, sid: data.sid, status: data.status, code: data.error_code ? String(data.error_code) : '' };
}

export function sendWhatsApp(cfg: any, to: string, text: string, variables: Record<string, string>, deliveryId: string) {
  const params: Record<string, string> = {
    From: `whatsapp:${plainNumber(cfg.whatsappFrom)}`,
    To: `whatsapp:${to}`,
    StatusCallback: `${STATUS_CALLBACK_URL}?delivery_id=${deliveryId}&channel=whatsapp`,
  };
  // Mensagens iniciadas pela empresa exigem template aprovado (Content SID).
  if (cfg.contentSid) {
    params.ContentSid = cfg.contentSid;
    params.ContentVariables = JSON.stringify(variables);
  } else {
    params.Body = text;
  }
  return twilioCreateMessage(cfg, params);
}

/** Envia o SMS de reserva uma única vez e registra o resultado real do provedor. */
export async function sendSmsFallback(base44: any, cfg: any, delivery: any, reason: string) {
  const fresh = await base44.asServiceRole.entities.LocksmithMessageDelivery.get(delivery.id);
  if (fresh.sms_sid || fresh.sms_status) return { skipped: true, reason: 'SMS já enviado' };
  await base44.asServiceRole.entities.LocksmithMessageDelivery.update(delivery.id, {
    status: 'sms_sending', sms_status: 'sending', fallback_reason: reason, last_event_at: new Date().toISOString(),
  });
  const res = await twilioCreateMessage(cfg, {
    From: plainNumber(cfg.smsFrom),
    To: fresh.phone,
    Body: fresh.message_text,
    StatusCallback: `${STATUS_CALLBACK_URL}?delivery_id=${delivery.id}&channel=sms`,
  });
  const update = res.ok
    ? { status: 'sms_sent', sms_sid: res.sid, sms_status: res.status || 'queued' }
    : { status: 'failed', sms_status: 'failed', sms_error_code: res.code, sms_error_message: res.message };
  await base44.asServiceRole.entities.LocksmithMessageDelivery.update(delivery.id, { ...update, last_event_at: new Date().toISOString() });
  return res;
}

function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i += 1) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** Validação oficial de assinatura Twilio (HMAC-SHA1 da URL + parâmetros ordenados). */
export async function isValidTwilioSignature(token: string, url: string, params: URLSearchParams, signature: string) {
  const keys = Array.from(new Set(params.keys())).sort();
  let data = url;
  for (const key of keys) data += key + params.get(key);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(token), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data)));
  let bin = '';
  for (const b of sig) bin += String.fromCharCode(b);
  return safeEqual(btoa(bin), signature || '');
}