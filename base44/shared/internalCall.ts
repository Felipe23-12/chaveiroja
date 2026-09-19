import { secrets } from 'base44:runtime';

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return result === 0;
}

export function verifyInternalCall(req, body = {}) {
  const providedToken = String(body?._internal_token || '');
  const expectedToken = String(secrets.get('INTERNAL_CALL_TOKEN') || '');
  return safeEqual(providedToken, expectedToken);
}