// O gateway da Base44 valida a assinatura deste token e injeta o cabeçalho
// reservado somente em chamadas originadas pelo motor de workflows.
export function verifyInternalCall(req) {
  const authorization = req?.headers?.get('base44-service-authorization') || '';
  // Este cabeçalho reservado contém o JWT assinado e validado pelo gateway.
  return /^Bearer [^.]+\.[^.]+\.[^.]+$/.test(authorization);
}