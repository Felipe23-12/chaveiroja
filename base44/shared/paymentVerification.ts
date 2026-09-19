// Financial decisions never rely on the service's display-only payment_status.
export async function confirmedServicePayment(base44, request, kind = request.status === 'cancelled' ? 'cancellation' : 'service') {
  if (kind === 'service' && request.payment_method === 'dinheiro' && request.cash_received === true) return true;
  const amount = Number(kind === 'cancellation' ? request.cancellation_fee : request.price);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  const payments = await base44.asServiceRole.entities.Payment.filter({ service_request_id: request.id, status: { $in: ['paid', 'captured'] } }, '-created_date', 100);
  return payments.some(p => p.client_id === request.created_by_id && p.locksmith_id === request.locksmith_id &&
    (p.payment_kind || 'service') === kind && Math.round(Number(p.amount) * 100) >= Math.round(amount * 100));
}

export async function clientDebt(base44, userId) {
  for (const status of ['cancelled', 'completed']) {
    for (let offset = 0; ; offset += 100) {
      const rows = await base44.asServiceRole.entities.ServiceRequest.filter({ created_by_id: userId, status }, '-created_date', 100, offset);
      for (const request of rows) {
        if (status === 'cancelled' && !(Number(request.cancellation_fee) > 0)) continue;
        if (await confirmedServicePayment(base44, request)) continue;
        return status === 'cancelled' ? { request, fee: Number(request.cancellation_fee), type: 'cancellation_fee' } : { request, type: 'unpaid_service' };
      }
      if (rows.length < 100) break;
    }
  }
  return null;
}