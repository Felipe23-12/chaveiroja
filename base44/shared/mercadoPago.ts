import { secrets } from "base44:runtime";

const MP_API = "https://api.mercadopago.com";
const encoder = new TextEncoder();

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

export async function getSellerAccount(base44, locksmithId) {
  const rows = await base44.asServiceRole.entities.MercadoPagoAccount.filter({ locksmith_id: locksmithId });
  let account = rows?.[0];
  if (!account || account.status !== "active") throw new Error("O chaveiro precisa vincular a conta Mercado Pago antes do pagamento");
  if (Date.parse(account.token_expires_at || 0) < Date.now() + 5 * 60 * 1000) account = await refreshAccount(base44, account);
  return account;
}

export async function fetchPayment(base44, localPayment, providerPaymentId) {
  const token = localPayment.payment_kind === "subscription"
    ? secrets.get("MERCADO_PAGO_ACCESS_TOKEN")
    : (await getSellerAccount(base44, localPayment.locksmith_id)).access_token;
  let paymentId = providerPaymentId || localPayment.mercado_pago_payment_id;
  if (!paymentId) {
    const search = await fetch(`${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(localPayment.id)}&sort=date_created&criteria=desc`, { headers: { Authorization: `Bearer ${token}` } });
    const result = await search.json();
    paymentId = result.results?.[0]?.id;
  }
  if (!paymentId) return null;
  const response = await fetch(`${MP_API}/v1/payments/${paymentId}`, { headers: { Authorization: `Bearer ${token}` } });
  const payment = await response.json();
  if (!response.ok) throw new Error(payment.message || "Pagamento não encontrado no Mercado Pago");
  return payment;
}

export function mapPaymentMethod(payment) {
  if (payment.payment_type_id === "credit_card") return "credit_card";
  if (payment.payment_type_id === "debit_card") return "debit_card";
  return "pix";
}

export async function syncApprovedPayment(base44, localPayment, providerPayment) {
  const statusMap = { approved: "paid", refunded: "refunded", cancelled: "cancelled", rejected: "failed" };
  const status = statusMap[providerPayment.status] || "pre_authorized";
  const expected = Math.round(Number(localPayment.amount) * 100);
  const received = Math.round(Number(providerPayment.transaction_amount) * 100);
  if (received !== expected || String(providerPayment.external_reference) !== String(localPayment.id)) throw new Error("Pagamento não confere com a cobrança registrada");
  if (localPayment.status === "paid" && status === "paid") return { status, method: mapPaymentMethod(providerPayment) };

  const baseCommission = localPayment.payment_kind === "subscription" ? 0 : Math.round(Number(localPayment.amount) * 0.15 * 100) / 100;
  const pendingCashOffset = localPayment.payment_kind === "service"
    ? Math.max(0, Math.round((Number(localPayment.commission_amount || 0) - baseCommission) * 100) / 100)
    : 0;
  await base44.asServiceRole.entities.Payment.update(localPayment.id, {
    status,
    method: mapPaymentMethod(providerPayment),
    mercado_pago_payment_id: String(providerPayment.id),
    ...(status === "paid" ? { captured_at: new Date().toISOString() } : {}),
  });
  if (status === "paid" && pendingCashOffset > 0 && localPayment.locksmith_id) {
    const locksmith = await base44.asServiceRole.entities.Locksmith.get(localPayment.locksmith_id);
    await base44.asServiceRole.entities.Locksmith.update(localPayment.locksmith_id, {
      pending_cash_commission: Math.max(0, Math.round((Number(locksmith.pending_cash_commission || 0) - pendingCashOffset) * 100) / 100),
    });
  }
  if (localPayment.payment_kind === "subscription" && status === "paid") {
    await base44.asServiceRole.entities.Locksmith.update(localPayment.locksmith_id, {
      monthly_fee_paid: true,
      monthly_fee_last_paid: new Date().toISOString().slice(0, 10),
      monthly_fee_method: mapPaymentMethod(providerPayment),
    });
  } else if (localPayment.service_request_id) {
    await base44.asServiceRole.entities.ServiceRequest.update(localPayment.service_request_id, {
      payment_id: localPayment.id,
      payment_method: mapPaymentMethod(providerPayment),
      payment_status: status === "paid" ? "paid" : status,
      ...(status === "paid" ? { commission_status: "paid" } : {}),
    });
  }
  return { status, method: mapPaymentMethod(providerPayment) };
}