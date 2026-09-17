// Valida chamadas internas de workflows com um segredo gerenciado pelo ambiente.
export function verifyInternalCall(body) {
  const expected = process.env.INTERNAL_CALL_TOKEN;
  return !!expected && !!body && body._internal_token === expected;
}