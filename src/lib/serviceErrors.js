// Keep the server's actionable refusal instead of Axios's generic HTTP message.
export function normalizeServiceError(error) {
  const body = error?.response?.data || error?.data;
  const detail = body && typeof body === 'object' ? body : {};
  const status = Number(error?.response?.status || error?.status || 0);
  const specific = [detail.error, detail.message, detail.detail].find(value => typeof value === 'string' && value.trim());
  const original = typeof error?.message === 'string' ? error.message : '';
  const generic = /request failed with status code|^network error$/i.test(original);
  const message = specific || (!generic && original) || (status === 429 ? 'Aguarde um instante antes de tentar novamente.' : 'Não foi possível continuar. Confira os dados do atendimento e tente novamente.');
  return Object.assign(new Error(message), { name: 'ServiceRequestError', code: detail.code || error?.code, status, response: error?.response });
}
