import { secrets } from "base44:runtime";
import { pendingCreditUpdate } from "./pendingPaymentCredits.ts";
import { getOrCreateFinancials } from "./locksmithFinancials.ts";

const MP_API = "https://api.mercadopago.com";
const encoder = new TextEncoder();

export function normalizeMercadoPagoPaymentId(value) {
  const paymentId = String(value || "");
  if (!/^\d+$/.test(paymentId)) throw new Error("Identificador Mercado Pago inválido");
  return paymentId;
}

export const APP_URL = "https://woodoo-quick-lock-link.base44.app";
export const MP_CALLBACK_URL = `${APP_URL}/functions/mercadoPagoOAuthCallback`;
export const MP_WEBHOOK_URL = `${APP_URL}/functions/mercadoPagoWebhook`;

function hex(bytes) {
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signValue(value) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secrets.get("MERCADO_PAGO_CLIENT_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

export function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

export async function createOAuthState(userId, locksmithId) {
  const payload = btoa(JSON.stringify({ userId, locksmithId, expiresAt: Date.now() + 10 * 60 * 1000 })).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  return `${payload}.${await signValue(payload)}`;
}

export async function readOAuthState(state) {
  const [payload, signature] = String(state || "").split(".");
  if (!safeEqual(signature, await signValue(payload))) throw new Error("Vínculo expirado ou inválido");
  const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
  const parsed = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
  if (!parsed.userId || !parsed.locksmithId || parsed.expiresAt < Date.now()) throw new Error("Vínculo expirado ou inválido");
  return parsed;
}

async function refreshAccount(base44, account) {
  if (!account.refresh_token) throw new Error("Reconecte a conta Mercado Pago do chaveiro");
  const response = await fetch(`${MP_API}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "refresh_token", client_id: secrets.get("MERCADO_PAGO_CLIENT_ID"), client_secret: secrets.get("MERCADO_PAGO_CLIENT_SECRET"), refresh_token: account.refresh_token }),
  });
  const token = await response.json();
  if (!response.ok) {
    await base44.asServiceRole.entities.MercadoPagoAccount.update(account.id, { status: "expired", updated_at: new Date().toISOString() });
    throw new Error("Reconecte a conta Mercado Pago do chaveiro");
  }
  return await base44.asServiceRole.entities.MercadoPagoAccount.update(account.id, {
    access_token: token.access_token,
    refresh_token: token.refresh_token || account.refresh_token,
    public_key: token.public_key || account.public_key,
    scope: token.scope || account.scope,
    token_expires_at: new Date(Date.now() + Number(token.expires_in || 15552000) * 1000).toISOString(),
    status: "active",
    updated_at: new Date().toISOString(),
  });
}

export async function getSellerAccount(base44, locksmithId, allowUnconnected = false) {
  const rows = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: locksmithId });
  let account = rows?.[0];
  if (!account) {
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(locksmithId).catch(() => null);
    if (locksmith?.created_by_id) {
      const userAccounts = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_user_id: locksmith.created_by_id });
      account = userAccounts?.[0];
    }
  }
  if (!account || account.status !== "active") {
    if (allowUnconnected) return null;
    throw new Error("O chaveiro precisa vincular a conta Mercado Pago antes do pagamento");
  }
  if (Date.parse(account.token_expires_at || 0) < Date.now() + 5 * 60 * 1000) account = await refreshAccount(base44, account);
  return account;
}

export async function fetchPayment(base44, localPayment, providerPaymentId) {
  const token = localPayment.payment_kind === "subscription" || localPayment.collection_mode === "platform_pending"
    ? secrets.get("MERCADO_PAGO_ACCESS_TOKEN")
    : (await getSellerAccount(base44, localPayment.locksmith_id)).access_token;
  let paymentId = providerPaymentId || localPayment.mercado_pago_payment_id;
  if (!paymentId) {
    const search = await fetch(`${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(localPayment.id)}&sort=date_created&criteria=desc`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await search.json();
    paymentId = result.results?.[0]?.id;
  }
  if (!paymentId) return null;
  paymentId = normalizeMercadoPagoPaymentId(paymentId);
  const response = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` } });
  const payment = await response.json();
  if (!response.ok) throw new Error(payment.message || "Pagamento não encontrado no Mercado Pago");
  return payment;
}

export function mapPaymentMethod(payment) {
  if (payment.payment_type_id === "credit_card") return "credit_card";
  if (payment.payment_type_id === "debit_card") return "debit_card";
  return "pix";
}

async function notifyLocksmithPaymentConfirmed(base44, localPayment) {
  let userId = localPayment.locksmith_user_id;
  if (!userId && localPayment.locksmith_id) {
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(localPayment.locksmith_id).catch(() => null);
    userId = locksmith?.created_by_id;
  }
  if (!userId) return;
  const amount = Number(localPayment.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  await base44.asServiceRole.integrations.Core.SendPushNotification({
    user_id: userId,
    title: "Pagamento confirmado",
    content: `O pagamento de ${amount} do cliente foi confirmado no Mercado Pago.`,
    action_label: "Ver financeiro",
    action_url: "/painel-financeiro",
  }).catch(() => null);
}

export async function reconcilePaidPayment(base44, localPayment, method = localPayment.method) {
  if (localPayment.payment_kind === "subscription") {
    await base44.asServiceRole.entities.Locksmith.update(localPayment.locksmith_id, {
      monthly_fee_paid: true,
      monthly_fee_last_paid: new Date().toISOString().slice(0, 10),
      monthly_fee_method: method,
    });
    return { status: "paid", method, payment_id: localPayment.id };
  }

  if (!localPayment.service_request_id) return { status: "paid", method, payment_id: localPayment.id };
  const request = await base44.asServiceRole.entities.ServiceRequest.get(localPayment.service_request_id).catch(() => null);
  if (!request) return { status: "paid", method, payment_id: localPayment.id };
  const isService = localPayment.payment_kind === "service";
  await base44.asServiceRole.entities.ServiceRequest.update(request.id, {
    payment_id: localPayment.id,
    payment_method: method,
    payment_status: "paid",
    commission_status: "paid",
    ...(isService ? { status: "completed", locksmith_confirmed: true } : { status: "cancelled", cancelled_by: "cliente" }),
  });
  if (isService && localPayment.locksmith_id) {
    const queued = await base44.asServiceRole.entities.ServiceRequest.filter({ locksmith_id: localPayment.locksmith_id, status: "queued" }, "accepted_at", 1);
    if (queued[0]) {
      await base44.asServiceRole.entities.ServiceRequest.update(queued[0].id, {
        status: "on_the_way",
        locksmith_lat: request.customer_lat,
        locksmith_lng: request.customer_lng,
      });
    }
  }
  return { status: "paid", method, payment_id: localPayment.id, request_id: request.id, request_status: isService ? "completed" : "cancelled" };
}

export async function syncApprovedPayment(base44, localPayment, providerPayment) {
  localPayment = await base44.asServiceRole.entities.Payment.get(localPayment.id);
  const held = localPayment.collection_mode === "platform_pending";
  if (localPayment.collector_id && String(providerPayment.collector_id) !== localPayment.collector_id) throw new Error("A conta recebedora não confere com a cobrança");
  if (held && providerPayment.currency_id !== "BRL") throw new Error("Moeda do pagamento inválida");
  if (localPayment.mercado_pago_payment_id && String(providerPayment.id) !== localPayment.mercado_pago_payment_id) throw new Error("Pagamento diferente do já confirmado para esta cobrança");
  if (held && Date.parse(providerPayment.date_last_updated) < Date.parse(localPayment.provider_updated_at)) return { status: localPayment.status, method: localPayment.method };
  const statusMap = { approved: "paid", refunded: "refunded", cancelled: "cancelled", rejected: "failed", charged_back: "refunded" };
  const status = statusMap[providerPayment.status] || "pre_authorized";
  const method = mapPaymentMethod(providerPayment);
  const expected = Math.round(Number(localPayment.amount) * 100);
  const received = Math.round(Number(providerPayment.transaction_amount) * 100);
  if (received !== expected || String(providerPayment.external_reference) !== String(localPayment.id)) throw new Error("Pagamento não confere com a cobrança registrada");
  const wasPaid = localPayment.status === "paid";
  if (held) {
    await base44.asServiceRole.entities.Payment.update(localPayment.id, {
      ...pendingCreditUpdate(localPayment, providerPayment),
      ...(providerPayment.date_last_updated ? { provider_updated_at: providerPayment.date_last_updated } : {}),
    });
  } else if (status === "paid") {
    const receivedNet = Number(providerPayment.transaction_details?.net_received_amount);
    if (Number.isFinite(receivedNet)) {
      const providerFee = Math.max(0, Math.round((Number(localPayment.amount) - Number(localPayment.commission_amount || 0) - receivedNet) * 100) / 100);
      await base44.asServiceRole.entities.Payment.update(localPayment.id, { provider_fee_amount: providerFee });
    }
  }
  await base44.asServiceRole.entities.Payment.update(localPayment.id, {
    status,
    method,
    mercado_pago_payment_id: String(providerPayment.id),
    ...(status === "paid" && !localPayment.captured_at ? { captured_at: new Date().toISOString() } : {}),
  });

  const baseCommission = localPayment.payment_kind === "subscription" ? 0 : Math.round(Number(localPayment.amount) * 0.15 * 100) / 100;
  const pendingCashOffset = localPayment.payment_kind === "service"
    ? Math.max(0, Math.round((Number(localPayment.commission_amount || 0) - baseCommission) * 100) / 100)
    : 0;
  if (status === "paid" && !wasPaid && pendingCashOffset > 0 && localPayment.locksmith_id) {
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(localPayment.locksmith_id);
    const financials = await getOrCreateFinancials(base44, locksmith);
    await base44.asServiceRole.entities.LocksmithFinancials.update(financials.id, {
      pending_cash_commission: Math.max(0, Math.round((Number(financials.pending_cash_commission || 0) - pendingCashOffset) * 100) / 100),
    });
  }
  if (status === "paid") {
    const result = await reconcilePaidPayment(base44, { ...localPayment, status, method }, method);
    if (!wasPaid && localPayment.payment_kind === "service") {
      await notifyLocksmithPaymentConfirmed(base44, localPayment);
    }
    return result;
  }
  if (localPayment.service_request_id && localPayment.payment_kind !== "subscription") {
    await base44.asServiceRole.entities.ServiceRequest.update(localPayment.service_request_id, {
      payment_id: localPayment.id,
      payment_method: method,
      payment_status: status === "failed" ? "cancelled" : status,
    });
  }
  return { status, method, payment_id: localPayment.id };
}