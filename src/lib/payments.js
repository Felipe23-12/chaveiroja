import { base44 } from "@/api/base44Client";
import { WORK_MODES } from "@/lib/pricing";

export const COMMISSION_RATE = WORK_MODES.app.feeValue; // 0.15

export const PAYMENT_METHODS = [
  { id: "credit_card", label: "Cartão de Crédito", icon: "CreditCard", description: "Pré-autorização agora, cobrança ao concluir" },
  { id: "debit_card", label: "Cartão de Débito", icon: "CreditCard", description: "Pré-autorização agora, cobrança ao concluir" },
  { id: "pix", label: "Pix", icon: "QrCode", description: "Pagamento imediato ao concluir o serviço" },
];

export function calculatePaymentBreakdown(amount) {
  const a = Number(amount) || 0;
  const commission = Math.round(a * COMMISSION_RATE * 100) / 100;
  const net = Math.round((a - commission) * 100) / 100;
  return { amount: a, commission, net };
}

// Pré-autorização: cria registro de Payment
// Cartão → status pre_authorized | Pix → status paid (pagamento imediato simulado)
export async function preAuthorizePayment({ serviceRequestId, amount, method, locksmithId, locksmithName, clientId, clientName }) {
  const breakdown = calculatePaymentBreakdown(amount);
  const isPix = method === "pix";

  const payment = await base44.entities.Payment.create({
    service_request_id: serviceRequestId,
    locksmith_id: locksmithId,
    locksmith_name: locksmithName,
    client_id: clientId,
    client_name: clientName,
    amount: breakdown.amount,
    commission_amount: breakdown.commission,
    net_amount: breakdown.net,
    method,
    status: isPix ? "paid" : "pre_authorized",
    pre_authorized_at: new Date().toISOString(),
    captured_at: isPix ? new Date().toISOString() : null,
  });

  await base44.entities.ServiceRequest.update(serviceRequestId, {
    payment_id: payment.id,
    payment_method: method,
    payment_status: isPix ? "paid" : "pre_authorized",
  });

  // Pix é imediato: credita na carteira do chaveiro agora
  if (isPix) {
    await creditWallet(locksmithId, breakdown.net);
  }

  return payment;
}

// Captura o pagamento ao concluir o serviço (cartão)
export async function capturePayment(paymentId) {
  const payment = await base44.entities.Payment.get(paymentId);
  if (payment.status === "captured" || payment.status === "paid") return payment;

  const updated = await base44.entities.Payment.update(paymentId, {
    status: "captured",
    captured_at: new Date().toISOString(),
  });

  await base44.entities.ServiceRequest.update(payment.service_request_id, {
    payment_status: "captured",
  });

  await creditWallet(payment.locksmith_id, payment.net_amount);
  return updated;
}

// Cancela o pagamento (libera pré-autorização ou estorna Pix)
export async function cancelPayment(paymentId, cancellationFee = 0) {
  const payment = await base44.entities.Payment.get(paymentId);
  if (!payment) return;

  const isPix = payment.method === "pix";
  const newStatus = isPix ? "refunded" : "cancelled";

  await base44.entities.Payment.update(paymentId, { status: newStatus });
  await base44.entities.ServiceRequest.update(payment.service_request_id, {
    payment_status: newStatus,
  });

  // Se Pix já foi pago e há taxa de cancelamento, retem apenas a taxa
  if (isPix && cancellationFee > 0) {
    const refundAmount = Math.max(0, payment.amount - cancellationFee);
    const locksmithShare = payment.net_amount > 0 ? Math.min(payment.net_amount, cancellationFee * 0.8) : 0;
    if (locksmithShare > 0) {
      await creditWallet(payment.locksmith_id, locksmithShare);
    }
    return { refundAmount };
  }
}

// Credita valor líquido na carteira do chaveiro
export async function creditWallet(locksmithId, amount) {
  if (!locksmithId || !amount) return;
  const locksmith = await base44.entities.Locksmith.get(locksmithId);
  const newBalance = Math.round(((locksmith.wallet_balance || 0) + amount) * 100) / 100;
  await base44.entities.Locksmith.update(locksmithId, { wallet_balance: newBalance });
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