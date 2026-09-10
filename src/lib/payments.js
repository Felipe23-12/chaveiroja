import { base44 } from "@/api/base44Client";

export const COMMISSION_RATE = 0.15;

export const PAYMENT_METHODS = [
  { id: "credit_card", label: "Cartão de Crédito", icon: "CreditCard", description: "Pagamento à vista no cartão" },
  { id: "debit_card", label: "Cartão de Débito", icon: "CreditCard", description: "Débito imediato" },
  { id: "pix", label: "Pix", icon: "QrCode", description: "Pagamento imediato via QR Code" },
];

export function calculatePaymentBreakdown(amount) {
  const a = Number(amount) || 0;
  const commission = Math.round(a * COMMISSION_RATE * 100) / 100;
  const net = Math.round((a - commission) * 100) / 100;
  return { amount: a, commission, net };
}

// Cria um PaymentIntent no Stripe via backend function.
// Retorna { payment_intent_id, client_secret, publishable_key, pix_data? }
export async function createStripePaymentIntent({ amount, method, description, locksmithId, serviceRequestId }) {
  try {
    const res = await base44.functions.invoke("stripePayment", {
      action: "create_intent",
      amount,
      method,
      description,
      locksmith_id: locksmithId,
      service_request_id: serviceRequestId,
    });
    return res.data;
  } catch (e) {
    // O SDK lança um erro genérico ("Request failed with status code 400");
    // extraímos a mensagem real retornada pelo backend/Stripe para o usuário.
    const data = e?.response?.data || e?.data || e;
    const msg = typeof data === "string" ? data : data?.error || data?.message || e?.message;
    throw new Error(msg || "Falha ao iniciar pagamento");
  }
}

// Consulta o status de um PaymentIntent no Stripe
export async function getStripePaymentStatus(paymentIntentId) {
  const res = await base44.functions.invoke("stripePayment", {
    action: "get_status",
    payment_intent_id: paymentIntentId,
  });
  return res.data?.status;
}

// Cancela um PaymentIntent no Stripe
export async function cancelStripePayment(paymentIntentId) {
  if (!paymentIntentId) return;
  try {
    await base44.functions.invoke("stripePayment", {
      action: "cancel",
      payment_intent_id: paymentIntentId,
    });
  } catch (e) {
    /* ignora */
  }
}

// Cria registro de Payment no banco e vincula ao ServiceRequest
export async function createPaymentRecord({ serviceRequestId, amount, method, locksmithId, locksmithName, clientId, clientName, stripePaymentIntentId }) {
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
    stripe_payment_intent_id: stripePaymentIntentId,
    pre_authorized_at: now,
  });

  await base44.entities.ServiceRequest.update(serviceRequestId, {
    payment_id: payment.id,
    payment_method: method,
    payment_status: "pre_authorized",
  });

  return payment;
}

// Confirma no servidor que o Stripe recebeu e dividiu o pagamento.
export async function confirmPaymentPaid(paymentId) {
  if (!paymentId) return;
  const res = await base44.functions.invoke("stripePayment", {
    action: "finalize_payment",
    payment_id: paymentId,
  });
  return res.data;
}

// Confirma o recebimento fora do app e compensa os 15% no saldo atual;
// qualquer diferença fica reservada para o próximo recebimento online.
export async function confirmCashReceived({ serviceRequestId, locksmithId, amount }) {
  const res = await base44.functions.invoke("stripePayment", {
    action: "confirm_cash",
    service_request_id: serviceRequestId,
    locksmith_id: locksmithId,
    amount,
  });
  return res.data;
}

// Solicita saque via Pix com saldo e duplicidade validados no servidor.
export async function requestWithdrawal({ locksmithId, amount, pixKeyType, pixKeyValue, bankName }) {
  try {
    const res = await base44.functions.invoke("stripePayment", {
      action: "request_withdrawal",
      locksmith_id: locksmithId,
      amount,
      pix_key_type: pixKeyType,
      pix_key_value: pixKeyValue,
      bank_name: bankName,
    });
    return res.data?.withdrawal;
  } catch (e) {
    const data = e?.response?.data || e?.data || e;
    throw new Error(data?.error || data?.message || e?.message || "Erro ao solicitar saque");
  }
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