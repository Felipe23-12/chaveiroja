import { secrets } from 'base44:runtime';
const encoder = new TextEncoder();
const encode = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function key() {
  const secret = secrets.get('INTERNAL_CALL_TOKEN');
  if (!secret) throw new Error('Acesso visitante temporariamente indisponível.');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
export async function signGuestClaimProof(state) {
  const payload = encode(encoder.encode(JSON.stringify({ scope: 'guest-claim-v1', clientId: state.clientId, sessionId: state.sessionId, requestId: state.requestId, expiresAt: Date.now() + 600000 })));
  const signature = encode(new Uint8Array(await crypto.subtle.sign('HMAC', await key(), encoder.encode(payload))));
  return { proof: payload + '.' + signature };
}
export async function verifyGuestClaimProof(proof) {
  try {
    if (typeof proof !== 'string' || proof.length > 2000) throw new Error();
    const [payload, signature, extra] = proof.split('.');
    if (!payload || !signature || extra || !await crypto.subtle.verify('HMAC', await key(), decode(signature), encoder.encode(payload))) throw new Error();
    const data = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (data.scope !== 'guest-claim-v1' || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + 600000 || typeof data.clientId !== 'string' || !data.clientId.startsWith('guest:') || typeof data.sessionId !== 'string' || !data.sessionId || typeof data.requestId !== 'string' || !data.requestId) throw new Error();
    return { clientId: data.clientId, sessionId: data.sessionId, requestId: data.requestId };
  } catch { throw new Error('A confirmação do atendimento expirou ou é inválida. Retorne ao mesmo navegador e tente novamente.'); }
}
