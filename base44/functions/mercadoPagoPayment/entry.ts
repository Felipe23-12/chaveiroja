import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { secrets } from "base44:runtime";
import { APP_URL, MP_WEBHOOK_URL, fetchPayment, getSellerAccount, reconcilePaidPayment, syncApprovedPayment } from "../../shared/mercadoPago.ts";
import { readPendingCredits } from "../../shared/pendingPaymentCredits.ts";
import { getOrCreateFinancials } from "../../shared/locksmithFinancials.ts";
import { verifyInternalCall } from "../../shared/internalCall.ts";
import { reconcilePendingMercadoPago } from "../../shared/reconcilePendingMercadoPago.ts";

const MP_API = "https://api.mercadopago.com";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    if (body.action === 'reconcile_pending') {
      if (!verifyInternalCall(req, body)) {
        const admin = await base44.auth.me();
        if (!admin || admin.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      return Response.json(await reconcilePendingMercadoPago(base44, body.dry_run === true));
    }
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
      // No split, a tarifa do Mercado Pago também sai da parte do chaveiro.
      // Preservar este saldo evita que a comissão acumulada torne o pagamento impossível.
      const providerCostReserve = kind === "service" && collectionMode === "seller_split"
        ? Math.max(1, Math.round(amount * 0.1 * 100) / 100)
        : 0.01;
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
          if (existing.mercado_pago_preference_id && Number(existing.net_amount || 0) >= providerCostReserve) {
            const preferenceResponse = await fetch(`${MP_API}/checkout/preferences/${encodeURIComponent(existing.mercado_pago_preference_id)}`, { headers: { Authorization: `Bearer ${token}` } });
            const preference = await preferenceResponse.json();
            if (preferenceResponse.ok && preference.init_point) return Response.json({ payment_id: existing.id, checkout_url: preference.init_point, reused: true });
          }
          await base44.asServiceRole.entities.Payment.update(existing.id, { status: "failed" });
        }
      }
      const baseCommission = kind === "subscription" ? 0 : Math.round(amount * 0.15 * 100) / 100;
      const locksmithFinancials = kind === "service" ? await getOrCreateFinancials(base44, locksmith) : null;
      // Outros chamados do mesmo chaveiro já com checkout aberto (pre_authorized) podem ter
      // reservado parte do mesmo débito de comissão em dinheiro — sem descontar isso aqui,
      // dois checkouts concorrentes poderiam abater a mesma dívida duas vezes do chaveiro.
      const reservationCutoff = Date.now() - 24 * 60 * 60 * 1000;
      const reservedByOtherCheckouts = locksmithFinancials
        ? (await base44.asServiceRole.entities.Payment.filter({ locksmith_id: locksmith.id, payment_kind: "service", collection_mode: "seller_split", status: "pre_authorized" }))
            .filter((p) => p.service_request_id !== service?.id && Date.parse(p.pre_authorized_at || p.created_date || 0) >= reservationCutoff)
            .reduce((sum, p) => {
              const otherBase = Math.round(Number(p.amount) * 0.15 * 100) / 100;
              const otherOffset = Math.max(0, Math.round((Number(p.commission_amount || 0) - otherBase) * 100) / 100);
              return sum + otherOffset;
            }, 0)
        : 0;
      const pendingCash = locksmithFinancials ? Math.max(0, Math.round((Number(locksmithFinancials.pending_cash_commission || 0) - reservedByOtherCheckouts) * 100) / 100) : 0;
      const maxCashOffset = Math.max(0, Math.round((amount - baseCommission - providerCostReserve) * 100) / 100);
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
        cash_offset_amount: pendingCashOffset,
        cash_offset_settled: false,
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
      let payment;
      if (body.service_request_id) {
        const service = await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id).catch(() => null);
        if (!service || (user.role !== 'admin' && service.created_by_id !== user.id)) return Response.json({ error: 'Atendimento não encontrado' }, { status: 404 });
        const payments = await base44.asServiceRole.entities.Payment.filter({ service_request_id: service.id, provider: 'mercado_pago', payment_kind: body.payment_kind === 'cancellation' ? 'cancellation' : 'service' }, '-created_date', 20);
        payment = payments.find(p => p.status === 'paid') || payments.find(p => p.status === 'pre_authorized');
        if (!payment) return Response.json({ status: 'pending' });
      } else {
        payment = await base44.asServiceRole.entities.Payment.get(body.payment_id).catch(() => null);
      }
      if (!payment || (user.role !== "admin" && payment.client_id !== user.id)) return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
      if (payment.status === "paid") return Response.json({ ...(await reconcilePaidPayment(base44, payment)), already_finalized: true });
      const providerPayment = await fetchPayment(base44, payment, body.provider_payment_id);
      if (!providerPayment) return Response.json({ status: "pending", payment_id: payment.id });
      const result = await syncApprovedPayment(base44, payment, providerPayment);
      return Response.json(result);
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (error) {
    const status = error.message === "Identificador Mercado Pago inválido" ? 400 : 500;
    return Response.json({ error: error.message }, { status });
  }
}