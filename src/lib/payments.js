import { base44 } from "@/api/base44Client";

export const COMMISSION_RATE = 0.15;

export const PAYMENT_METHODS = [
  { id: "credit_card", label: "Cartão de Crédito", icon: "CreditCard", description: "Pré-autorização agora, cobrança ao concluir" },
  { id: "debit_card", label: "Cartão de Débito", icon: "CreditCard", description: "Pré-autorização agora, cobrança ao concluir" },
  { id: "pix", label: "Pix", icon: "QrCode", description: "Pagamento imediato via QR Code" },
];

export function calculatePaymentBreakdown(amount) {
  const a = Number(amount) || 0;
  const commission = Math.round(a * COMMISSION_RATE * 100) / 100;
  const net = Math.round((a - commission) * 100) / 100;
  return { amount: a, commission, net };
}

// Cria PaymentIntent no Stripe via backend function
export async function createStripePayment({ serviceRequestId, amount, method, locksmithId, locksmithName, clientId, clientName }) {
  const res = await base44.functions.invoke("stripe-create-payment", {
    amount, method, serviceRequestId, locksmithId, locksmithName, clientId, clientName,
  });
  return res.data;
}

// Captura pagamento de cartão ao concluir o serviço
export async function capturePayment(paymentId) {
  const res = await base44.functions.invoke("stripe-capture-payment", { paymentId });
  return res.data;
}

// Verifica status do PIX (polling até confirmação)
export async function checkPixPayment(paymentId) {
  const res = await base44.functions.invoke("stripe-check-payment", { paymentId });
  return res.data;
}

// Cancela pagamento (libera pré-autorização de cartão ou estorna Pix)
export async function cancelPayment(paymentId, cancellationFee = 0) {
  const res = await base44.functions.invoke("stripe-cancel-payment", { paymentId, cancellationFee });
  return res.data;
}

// Solicita saque via Pix: move saldo da carteira para pendente
export async function requestWithdrawal({ locksmithId, locksmithName, amount, pixKeyType, pixKeyValue, bankName }) {
  const locksmith = await base44.entities.Locksmith.get(locksmithId);
  const amt = Number(amount) || 0;

  if (amt <= 0) throw new Error("Valor inválido");
  if (amt > (locksmith.wallet_balance || 0)) {
    throw new Error("Saldo insuficiente para saque");
  }

  const withdrawal = await base44.entities.Withdrawal.create({
    locksmith_id: locksmithId,
    locksmith_name: locksmithName,
    amount: amt,
    pix_key_type: pixKeyType,
    pix_key_value: pixKeyValue,
    bank_name: bankName,
    status: "requested",
    requested_at: new Date().toISOString(),
  });

  const newBalance = Math.round(((locksmith.wallet_balance || 0) - amt) * 100) / 100;
  const newPending = Math.round(((locksmith.pending_balance || 0) + amt) * 100) / 100;
  await base44.entities.Locksmith.update(locksmithId, {
    wallet_balance: newBalance,
    pending_balance: newPending,
  });

  return withdrawal;
}

// Marca saque como concluído (admin processa a transferência Pix manualmente)
export async function completeWithdrawal(withdrawalId) {
  const withdrawal = await base44.entities.Withdrawal.get(withdrawalId);
  if (!withdrawal || withdrawal.status === "completed") return;

  const updated = await base44.entities.Withdrawal.update(withdrawalId, {
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  const locksmith = await base44.entities.Locksmith.get(withdrawal.locksmith_id);
  const newPending = Math.max(0, Math.round(((locksmith.pending_balance || 0) - withdrawal.amount) * 100) / 100);
  await base44.entities.Locksmith.update(withdrawal.locksmith_id, { pending_balance: newPending });

  return updated;
}