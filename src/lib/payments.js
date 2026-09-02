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

// Cria registro de Payment diretamente via SDK (sem backend function)
// Retorna dados simulados no formato que os formulários esperam.
export async function createStripePayment({ serviceRequestId, amount, method, locksmithId, locksmithName, clientId, clientName }) {
  const breakdown = calculatePaymentBreakdown(amount);
  const now = new Date().toISOString();

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
    status: "pre_authorized",
    pre_authorized_at: now,
  });

  await base44.entities.ServiceRequest.update(serviceRequestId, {
    payment_id: payment.id,
    payment_method: method,
    payment_status: "pre_authorized",
  });

  if (method === "pix") {
    return {
      payment_id: payment.id,
      pix_data: {
        emv: "00020126360014BR.GOV.BCB.PIX0116chaveiroja@pix5204000053039865802BR5913CHAVEIRO JA6009SAO PAULO62070503***6304ABCD",
        image_url: null,
      },
    };
  }

  return {
    payment_id: payment.id,
    client_secret: "simulated_secret_" + payment.id,
    publishable_key: "simulated",
  };
}

// Captura o pagamento ao concluir o serviço — credita a carteira do chaveiro
export async function capturePayment(paymentId) {
  if (!paymentId) return;
  const payment = await base44.entities.Payment.get(paymentId);
  if (!payment) return;

  const updated = await base44.entities.Payment.update(paymentId, {
    status: "captured",
    captured_at: new Date().toISOString(),
  });

  // Credita o valor líquido na carteira do chaveiro
  if (payment.locksmith_id && payment.net_amount) {
    const locksmith = await base44.entities.Locksmith.get(payment.locksmith_id);
    const newBalance = Math.round(((locksmith.wallet_balance || 0) + payment.net_amount) * 100) / 100;
    await base44.entities.Locksmith.update(payment.locksmith_id, { wallet_balance: newBalance });
  }

  if (payment.service_request_id) {
    await base44.entities.ServiceRequest.update(payment.service_request_id, {
      payment_status: "captured",
      commission_status: "paid",
    });
  }

  return updated;
}

// Verifica status do PIX (simulado: confirma automaticamente após 6 segundos)
export async function checkPixPayment(paymentId) {
  if (!paymentId) return { status: "pending" };
  const payment = await base44.entities.Payment.get(paymentId);
  if (!payment) return { status: "pending" };

  const elapsed = (Date.now() - new Date(payment.pre_authorized_at).getTime()) / 1000;
  if (elapsed >= 6) {
    await base44.entities.Payment.update(paymentId, {
      status: "paid",
      captured_at: new Date().toISOString(),
    });
    if (payment.service_request_id) {
      await base44.entities.ServiceRequest.update(payment.service_request_id, {
        payment_status: "paid",
      });
    }
    return { status: "paid", success: true };
  }
  return { status: "pending" };
}

// Cancela pagamento (libera pré-autorização ou estorna Pix)
export async function cancelPayment(paymentId, cancellationFee = 0) {
  if (!paymentId) return;
  const payment = await base44.entities.Payment.get(paymentId);
  if (!payment) return;

  const isPix = payment.method === "pix";
  const newStatus = isPix ? "refunded" : "cancelled";
  await base44.entities.Payment.update(paymentId, { status: newStatus });

  if (payment.service_request_id) {
    await base44.entities.ServiceRequest.update(payment.service_request_id, {
      payment_status: newStatus,
    });
  }

  return { success: true };
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