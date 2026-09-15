import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { APP_URL, MP_WEBHOOK_URL, fetchPayment, getSellerAccount, syncApprovedPayment } from "../../shared/mercadoPago.ts";

const MP_API = "https://api.mercadopago.com";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    if (body.action === "create_checkout") {
      const kind = body.payment_kind === "subscription" ? "subscription" : body.payment_kind === "cancellation" ? "cancellation" : "service";
      let locksmith;
      let service = null;
      let amount;
      let token;
      if (kind === "subscription") {
        const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
        locksmith = profiles?.[0];
        if (!locksmith || body.locksmith_id !== locksmith.id) return Response.json({ error: "Perfil de chaveiro não encontrado" }, { status: 404 });
        amount = 9.99;
        token = secrets.get("MERCADO_PAGO_ACCESS_TOKEN");
      } else {
        service = await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id).catch(() => null);
        if (!service || service.created_by_id !== user.id || service.locksmith_id !== body.locksmith_id) return Response.json({ error: "Atendimento não encontrado" }, { status: 404 });
        if (service.payment_status === "paid") return Response.json({ error: "Este atendimento já foi pago" }, { status: 409 });
        locksmith = await base44.asServiceRole.entities.Locksmith.get(body.locksmith_id).catch(() => null);
        amount = Number(kind === "cancellation" ? service.cancellation_fee : service.price);
        token = (await getSellerAccount(base44, locksmith.id)).access_token;
      }
      if (!locksmith || Math.round(Number(body.amount) * 100) !== Math.round(amount * 100) || amount < 1) return Response.json({ error: "O valor da cobrança não confere" }, { status: 400 });
      const commission = kind === "subscription" ? 0 : Math.round(amount * 0.15 * 100) / 100;
      const payment = await base44.asServiceRole.entities.Payment.create({
        service_request_id: service?.id || `monthly:${locksmith.id}`,
        locksmith_id: locksmith.id,
        locksmith_name: locksmith.name,
        client_id: user.id,
        client_name: user.full_name || "Cliente",
        amount,
        commission_amount: commission,
        net_amount: Math.round((amount - commission) * 100) / 100,
        method: "credit_card",
        status: "pre_authorized",
        provider: "mercado_pago",
        payment_kind: kind,
        pre_authorized_at: new Date().toISOString(),
      });
      const returnPath = kind === "subscription" ? "/modo-trabalho" : "/";
      const backUrl = `${APP_URL}${returnPath}?mercado_pago=retorno&local_payment_id=${payment.id}`;
      const preferenceBody = {
        items: [{ id: payment.id, title: String(body.description || "Pagamento Chaveiro Já").slice(0, 120), quantity: 1, currency_id: "BRL", unit_price: amount }],
        payer: { email: user.email },
        external_reference: payment.id,
        notification_url: MP_WEBHOOK_URL,
        back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
        auto_return: "approved",
        binary_mode: false,
        payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
        ...(kind !== "subscription" ? { marketplace_fee: commission } : {}),
      };
      const response = await fetch(`${MP_API}/checkout/preferences`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": payment.id },
        body: JSON.stringify(preferenceBody),
      });
      const preference = await response.json();
      if (!response.ok || !preference.init_point) {
        await base44.asServiceRole.entities.Payment.delete(payment.id).catch(() => null);
        return Response.json({ error: preference.message || "Não foi possível abrir o Mercado Pago" }, { status: 400 });
      }
      await base44.asServiceRole.entities.Payment.update(payment.id, { mercado_pago_preference_id: preference.id });
      if (service) await base44.asServiceRole.entities.ServiceRequest.update(service.id, { payment_id: payment.id, payment_status: "pre_authorized" });
      return Response.json({ payment_id: payment.id, checkout_url: preference.init_point });
    }

    if (body.action === "get_status" || body.action === "finalize_payment") {
      const payment = await base44.asServiceRole.entities.Payment.get(body.payment_id).catch(() => null);
      if (!payment || (user.role !== "admin" && payment.client_id !== user.id)) return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
      if (payment.status === "paid") return Response.json({ status: "paid", method: payment.method, already_finalized: true });
      const providerPayment = await fetchPayment(base44, payment, body.provider_payment_id);
      if (!providerPayment) return Response.json({ status: "pending" });
      const result = await syncApprovedPayment(base44, payment, providerPayment);
      return Response.json(result);
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}