import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { APP_URL, MP_WEBHOOK_URL, fetchPayment, getSellerAccount, reconcilePaidPayment, syncApprovedPayment } from "../../shared/mercadoPago.ts";
import { readPendingCredits } from "../../shared/pendingPaymentCredits.ts";

const MP_API = "https://api.mercadopago.com";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();

    if (body.action === "get_pending_credits") {
      const page = body.page ?? 0;
      if (!Number.isInteger(page) || page < 0 || page > 10000) return Response.json({ error: "Página inválida" }, { status: 400 });
      const credits = await readPendingCredits(base44, user, page);
      return credits ? Response.json(credits) : Response.json({ error: "Acesso exclusivo para chaveiros e administradores" }, { status: 403 });
    }

    if (body.action === "create_checkout") {
      const kind = body.payment_kind === "subscription" ? "subscription" : body.payment_kind === "cancellation" ? "cancellation" : "service";
      let locksmith;
      let service = null;
      let amount;
      let token;
      let collectionMode = kind === "subscription" ? "platform_subscription" : "seller_split";
      let collectorId;
      if (kind === "subscription") {
        const profiles = await base44.asServiceRole.entities.Locksmith.filter({ created_by_id: user.id });
        locksmith = profiles?.[0];
        if (!locksmith || body.locksmith_id !== locksmith.id) return Response.json({ error: "Perfil de chaveiro não encontrado" }, { status: 404 });
        amount = 9.99;
        token = secrets.get("MERCADO_PAGO_ACCESS_TOKEN");
      } else {
        service = await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id).catch(() => null);
        if (!service || service.created_by_id !== user.id || service.locksmith_id !== body.locksmith_id) return Response.json({ error: "Atendimento não encontrado" }, { status: 404 });
        const existingPayments = await base44.asServiceRole.entities.Payment.filter({ service_request_id: service.id });
        const paidPayment = existingPayments.find((p) => p.status === "paid" || p.status === "captured");
        if (paidPayment) return Response.json({ status: "paid", already_paid: true, payment_id: paidPayment.id, method: paidPayment.method });
        locksmith = await base44.asServiceRole.entities.Locksmith.get(body.locksmith_id).catch(() => null);
        if (!locksmith) return Response.json({ error: "Chaveiro não encontrado" }, { status: 404 });
        amount = Number(kind === "cancellation" ? service.cancellation_fee : service.price);
        const account = await getSellerAccount(base44, locksmith.id, true);
        if (account) {
          token = account.access_token;
          collectorId = String(account.mercado_pago_user_id);
        } else {
          collectionMode = "platform_pending";
          token = secrets.get("MERCADO_PAGO_ACCESS_TOKEN");
          const receiverResponse = await fetch(`${MP_API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
          const receiver = await receiverResponse.json();
          if (!receiverResponse.ok || !receiver.id) return Response.json({ error: "Não foi possível validar a conta recebedora da plataforma" }, { status: 503 });
          collectorId = String(receiver.id);
        }
      }
      if (!locksmith || !Number.isFinite(amount) || Math.round(Number(body.amount) * 100) !== Math.round(amount * 100) || amount < 1) return Response.json({ error: "O valor da cobrança não confere" }, { status: 400 });
      if (service) {
        const existingPayments = await base44.asServiceRole.entities.Payment.filter({ service_request_id: service.id, provider: "mercado_pago", payment_kind: kind }, "-created_date", 20);
        const existing = existingPayments.find((item) => item.status === "paid" || item.status === "pre_authorized");
        if (existing?.status === "paid") return Response.json({ ...(await reconcilePaidPayment(base44, existing)), already_paid: true });
        if (existing) {
          const providerPayment = await fetchPayment(base44, existing).catch(() => null);
          if (providerPayment) {
            const synced = await syncApprovedPayment(base44, existing, providerPayment);
            if (synced.status === "paid") return Response.json({ ...synced, already_paid: true });
          }
          if (existing.mercado_pago_preference_id) {
            const preferenceResponse = await fetch(`${MP_API}/checkout/preferences/${encodeURIComponent(existing.mercado_pago_preference_id)}`, { headers: { Authorization: `Bearer ${token}` } });
            const preference = await preferenceResponse.json();
            if (preferenceResponse.ok && preference.init_point) return Response.json({ payment_id: existing.id, checkout_url: preference.init_point, reused: true });
          }
          await base44.asServiceRole.entities.Payment.update(existing.id, { status: "failed" });
        }
      }
      const baseCommission = kind === "subscription" ? 0 : Math.round(amount * 0.15 * 100) / 100;
      const pendingCash = kind === "service" ? Math.max(0, Number(locksmith.pending_cash_commission || 0)) : 0;
      const maxCashOffset = Math.max(0, Math.round((amount - baseCommission - 0.01) * 100) / 100);
      const pendingCashOffset = Math.min(Math.round(pendingCash * 100) / 100, maxCashOffset);
      const commission = Math.round((baseCommission + pendingCashOffset) * 100) / 100;
      const payment = await base44.asServiceRole.entities.Payment.create({
        service_request_id: service?.id || `monthly:${locksmith.id}`,
        locksmith_id: locksmith.id,
        locksmith_user_id: locksmith.created_by_id,
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
        collection_mode: collectionMode,
        ...(collectorId ? { collector_id: collectorId } : {}),
        ...(collectionMode === "platform_pending" ? { transfer_status: "awaiting_payment", pending_transfer_amount: 0 } : {}),
        pre_authorized_at: new Date().toISOString(),
      });
      const returnPath = kind === "subscription" ? "/modo-trabalho" : "/";
      const returnStep = kind === "subscription" ? "" : "step=6&";
      const backUrl = `${APP_URL}${returnPath}?${returnStep}mercado_pago=retorno&local_payment_id=${payment.id}`;
      const preferenceBody = {
        items: [{ id: payment.id, title: String(body.description || "Pagamento Chaveiro Já").slice(0, 120), quantity: 1, currency_id: "BRL", unit_price: amount }],
        payer: { email: user.email },
        external_reference: payment.id,
        notification_url: MP_WEBHOOK_URL,
        back_urls: { success: backUrl, pending: backUrl, failure: backUrl },
        auto_return: "approved",
        binary_mode: false,
        payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
        ...(collectionMode === "seller_split" ? { marketplace_fee: commission } : {}),
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

    // Confirma que um crédito retido na plataforma (platform_pending) foi pago manualmente ao chaveiro.
    if (body.action === "mark_transferred") {
      if (user.role !== "admin") return Response.json({ error: "Acesso exclusivo para administradores" }, { status: 403 });
      const payment = await base44.asServiceRole.entities.Payment.get(body.payment_id).catch(() => null);
      if (!payment || payment.collection_mode !== "platform_pending") return Response.json({ error: "Crédito pendente não encontrado" }, { status: 404 });
      if (payment.transfer_status !== "pending") return Response.json({ error: "Este crédito não está aguardando repasse" }, { status: 409 });
      await base44.asServiceRole.entities.Payment.update(payment.id, {
        transfer_status: "transferred",
        transferred_at: new Date().toISOString(),
      });
      return Response.json({ success: true });
    }

    if (body.action === "get_status" || body.action === "finalize_payment") {
      const payment = await base44.asServiceRole.entities.Payment.get(body.payment_id).catch(() => null);
      if (!payment || (user.role !== "admin" && payment.client_id !== user.id)) return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
      if (payment.status === "paid") return Response.json({ ...(await reconcilePaidPayment(base44, payment)), already_finalized: true });
      const providerPayment = await fetchPayment(base44, payment, body.provider_payment_id);
      if (!providerPayment) return Response.json({ status: "pending" });
      const result = await syncApprovedPayment(base44, payment, providerPayment);
      return Response.json(result);
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Identificador Mercado Pago inválido" ? 400 : 500;
    return Response.json({ error: error.message }, { status });
  }
}