import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { getSellerAccount, normalizeMercadoPagoPaymentId, safeEqual, syncApprovedPayment } from "../../shared/mercadoPago.ts";

function parseSignature(value) {
  return Object.fromEntries(String(value || "").split(",").map((part) => part.trim().split("=")));
}

async function signatureFor(manifest) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secrets.get("MERCADO_PAGO_WEBHOOK_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const dataId = String(url.searchParams.get("data.id") || body?.data?.id || "").toLowerCase();
    const requestId = req.headers.get("x-request-id") || "";
    const { ts, v1 } = parseSignature(req.headers.get("x-signature"));
    let manifest = "";
    if (dataId) manifest += `id:${dataId};`;
    if (requestId) manifest += `request-id:${requestId};`;
    if (ts) manifest += `ts:${ts};`;
    if (!dataId || !ts || !v1 || !safeEqual(v1, await signatureFor(manifest))) return Response.json({ error: "Invalid signature" }, { status: 401 });
    const topic = url.searchParams.get("type") || body.type || body.topic;
    if (topic !== "payment") return Response.json({ received: true });
    const paymentId = normalizeMercadoPagoPaymentId(dataId);
    const platformToken = secrets.get("MERCADO_PAGO_ACCESS_TOKEN");
    let lookup = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${platformToken}` } });
    let providerPayment = await lookup.json();
    if (!lookup.ok) {
      const sellerUserId = String(body.user_id || url.searchParams.get("user_id") || "");
      const accounts = sellerUserId ? await base44.asServiceRole.entities.MercadoPagoAccount.filter({ mercado_pago_user_id: sellerUserId }) : [];
      if (!accounts?.[0]) return Response.json({ received: true });
      const account = await getSellerAccount(base44, accounts[0].locksmith_id);
      lookup = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${account.access_token}` } });
      providerPayment = await lookup.json();
    }
    if (!lookup.ok) throw new Error(providerPayment.message || "Pagamento não encontrado");
    const payments = providerPayment.external_reference ? await base44.asServiceRole.entities.Payment.filter({ id: String(providerPayment.external_reference) }) : [];
    const localPayment = payments?.[0];
    if (!localPayment) return Response.json({ received: true });
    await syncApprovedPayment(base44, localPayment, providerPayment);
    return Response.json({ received: true });
  } catch (error) {
    const status = error.message === "Identificador Mercado Pago inválido" ? 400 : 500;
    return Response.json({ error: error.message }, { status });
  }
}