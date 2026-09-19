import { fetchPayment, syncApprovedPayment } from './mercadoPago.ts';

// Recuperação limitada e rotativa caso a notificação do provedor não chegue.
// Consulta cobranças existentes; nunca cria cobranças ou confirma por relato do cliente.
export async function reconcilePendingMercadoPago(base44, dryRun = false) {
  const payments = await base44.asServiceRole.entities.Payment.filter(
    { provider: 'mercado_pago', status: 'pre_authorized' }, 'updated_date', 20,
  );
  if (dryRun) return { checked: 0, candidates: payments.length, dry_run: true };
  let confirmed = 0;
  const errors = [];
  for (const payment of payments) {
    try {
      const providerPayment = await fetchPayment(base44, payment);
      if (providerPayment) {
        const result = await syncApprovedPayment(base44, payment, providerPayment);
        if (result.status === 'paid') confirmed += 1;
      }
    } catch (error) {
      errors.push({ payment_id: payment.id, error: error.message });
    }
    // Rotaciona o lote sem sobrescrever um status confirmado por outro processo.
    await base44.asServiceRole.entities.Payment.updateMany(
      { id: payment.id, status: 'pre_authorized' },
      { $set: { description: payment.description || '' } },
    );
  }
  return { checked: payments.length, confirmed, errors };
}