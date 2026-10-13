/** Identidade do cliente, independente de quem executou a gravação no servidor. */
export function requestClientId(request: any): string | undefined {
  if (typeof request?.client_id === 'string' && request.client_id.trim()) return request.client_id;
  const legacy = request?.created_by_id;
  return typeof legacy === 'string' && legacy && !legacy.startsWith('service_') ? legacy : undefined;
}

/** Inclui o histórico antigo sem permitir que o autor técnico substitua o cliente. */
export function clientRequestsQuery(clientId: string) {
  return { $or: [
    { client_id: clientId },
    { client_id: { $in: [null, ''] }, created_by_id: clientId },
  ] };
}
