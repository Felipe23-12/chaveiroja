// O gateway da Base44 valida a assinatura deste token e injeta o cabeçalho
// reservado somente em chamadas originadas pelo motor de workflows.
export function verifyInternalCall(req) {
  const authorization = req?.headers?.get('base44-service-authorization') || '';
  if (!authorization.startsWith('Bearer ')) return false;
  try {
    const token = authorization.slice(7);
    const encoded = token.split('.')[1];
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')));
    return payload?.caller === 'workflow_internal' && Number(payload.exp || 0) * 1000 > Date.now();
  } catch {
    return false;
  }
}