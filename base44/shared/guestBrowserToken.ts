import { secrets } from 'base44:runtime';
const encoder = new TextEncoder();
const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function key() {
  const secret = secrets.get('INTERNAL_CALL_TOKEN');
  if (!secret) throw new Error('Atendimento visitante temporariamente indisponível.');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signBrowserToken(session) {
  const payload = encode(encoder.encode(JSON.stringify({ scope: 'guest-browser-v1', sessionId: session.id, clientId: session.guest_client_id, expiresAt: Date.parse(session.expires_at) })));
  return payload + '.' + encode(new Uint8Array(await crypto.subtle.sign('HMAC', await key(), encoder.encode(payload))));
}
export async function verifyBrowserToken(token) {
  try {
    if (typeof token !== 'string' || token.length > 2000) throw new Error();
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra || !await crypto.subtle.verify('HMAC', await key(), decode(signature), encoder.encode(payload))) throw new Error();
    const data = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (data.scope !== 'guest-browser-v1' || typeof data.sessionId !== 'string' || !data.sessionId || typeof data.clientId !== 'string' || !data.clientId.startsWith('guest:') || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now()) throw new Error();
    return data;
  } catch { throw new Error('O acesso visitante expirou ou é inválido. Entre na sua conta para continuar.'); }
}
