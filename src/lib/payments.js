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
export async function createStripePaymentIntent({ amount, method, description, locksmithId }) {
  try {
    const res = await base44.functions.invoke("stripePayment", {
      action: "create_intent",
      amount,
      method,
      description,
      locksmith_id: locksmithId,
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

// Marca o pagamento como pago e credita a carteira do chaveiro.
// Se o chaveiro tem comissão acumulada de serviços pagos em dinheiro, desconta do líquido.
export async function confirmPaymentPaid(paymentId) {
  if (!paymentId) return;
  const payment = await base44.entities.Payment.get(paymentId);
  if (!payment) return;

  await base44.entities.Payment.update(paymentId, {
    status: "paid",
    captured_at: new Date().toISOString(),
  });

  // Com Stripe Connect, o repasse líquido já é direcionado automaticamente ao chaveiro.
  // A carteira interna continua sendo usada apenas para pagamentos legados sem Connect.
  if (payment.locksmith_id && payment.net_amount) {
    const connect = await base44.entities.StripeConnectAccount.filter({ locksmith_id: payment.locksmith_id }).catch(() => []);
    const connectAtivo = !!connect?.[0]?.stripe_account_id && connect?.[0]?.charges_enabled && connect?.[0]?.payouts_enabled;
    if (!connectAtivo) {
      const locksmith = await base44.entities.Locksmith.get(payment.locksmith_id);
      // Desconta a comissão acumulada de serviços anteriores pagos em dinheiro
      const pendingCash = locksmith.pending_cash_commission || 0;
      const creditAmount = Math.max(0, Math.round((payment.net_amount - pendingCash) * 100) / 100);
      const newBalance = Math.round(((locksmith.wallet_balance || 0) + creditAmount) * 100) / 100;
      const updateData = { wallet_balance: newBalance };
      if (pendingCash > 0) {
        updateData.pending_cash_commission = 0;
      }
      await base44.entities.Locksmith.update(payment.locksmith_id, updateData);
    }
  }

  if (payment.service_request_id) {
    await base44.entities.ServiceRequest.update(payment.service_request_id, {
      payment_status: "paid",
      commission_status: "paid",
    });
  }
}

// Confirma o recebimento em dinheiro pelo chaveiro: marca o pedido como pago
// e acumula a comissão de 15% para descontar do próximo pagamento via app.
export async function confirmCashReceived({ serviceRequestId, locksmithId, amount }) {
  const breakdown = calculatePaymentBreakdown(amount);

  await base44.entities.ServiceRequest.update(serviceRequestId, {
    cash_received: true,
    payment_method: "dinheiro",
    payment_status: "paid",
    commission_status: "paid",
  });

  // Acumula a comissão no campo do chaveiro
  if (locksmithId) {
    const locksmith = await base44.entities.Locksmith.get(locksmithId);
    const newPending = Math.round(((locksmith.pending_cash_commission || 0) + breakdown.commission) * 100) / 100;
    await base44.entities.Locksmith.update(locksmithId, { pending_cash_commission: newPending });
  }

  return { commission: breakdown.commission };
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