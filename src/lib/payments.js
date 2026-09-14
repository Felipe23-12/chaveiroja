import { base44 } from "@/api/base44Client";

export const COMMISSION_RATE = 0.15;

export function calculatePaymentBreakdown(amount) {
  const value = Number(amount) || 0;
  const commission = Math.round(value * COMMISSION_RATE * 100) / 100;
  return { amount: value, commission, net: Math.round((value - commission) * 100) / 100 };
}

export async function createMercadoPagoCheckout({ amount, description, locksmithId, serviceRequestId, paymentKind = "service" }) {
  try {
    const response = await base44.functions.invoke("mercadoPagoPayment", {
      action: "create_checkout",
      amount,
      description,
      locksmith_id: locksmithId,
      service_request_id: serviceRequestId,
      payment_kind: paymentKind,
    });
    return response.data;
  } catch (error) {
    const data = error?.response?.data || error?.data || error;
    throw new Error(data?.error || data?.message || error?.message || "Falha ao iniciar pagamento");
  }
}

export async function confirmPaymentPaid(paymentId, providerPaymentId) {
  if (!paymentId) return null;
  const response = await base44.functions.invoke("mercadoPagoPayment", {
    action: "finalize_payment",
    payment_id: paymentId,
    provider_payment_id: providerPaymentId,
  });
  return response.data;
}

export async function requestWithdrawal({ locksmithId, amount, pixKeyType, pixKeyValue, bankName }) {
  try {
    const response = await base44.functions.invoke("stripePayment", { action: "request_withdrawal", locksmith_id: locksmithId, amount, pix_key_type: pixKeyType, pix_key_value: pixKeyValue, bank_name: bankName });
    return response.data?.withdrawal;
  } catch (error) {
    const data = error?.response?.data || error?.data || error;
    throw new Error(data?.error || data?.message || error?.message || "Erro ao solicitar saldo legado");
  }
}

export async function completeWithdrawal(withdrawalId) {
  const withdrawal = await base44.entities.Withdrawal.get(withdrawalId);
  if (!withdrawal || withdrawal.status === "completed") return;
  const updated = await base44.entities.Withdrawal.update(withdrawalId, { status: "completed", completed_at: new Date().toISOString() });
  const locksmith = await base44.entities.Locksmith.get(withdrawal.locksmith_id);
  await base44.entities.Locksmith.update(withdrawal.locksmith_id, { pending_balance: Math.max(0, Math.round(((locksmith.pending_balance || 0) - withdrawal.amount) * 100) / 100) });
  return updated;
}