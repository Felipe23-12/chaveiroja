import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';
import { getOrCreateFinancials } from '../../shared/locksmithFinancials.ts';

const STRIPE_API = "https://api.stripe.com/v1";

function isPaymentIntentId(value) {
  return /^pi_[A-Za-z0-9]+$/.test(String(value || ""));
}

function paymentIntentUrl(value, suffix = "") {
  if (!isPaymentIntentId(value)) throw new Error("Identificador Stripe inválido");
  return `${STRIPE_API}/payment_intents/${encodeURIComponent(String(value))}${suffix}`;
}

function stripeForm(data: Record<string, string | number | boolean>) {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(data)) form.append(key, String(value));
  return form.toString();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action;
    const stripeKey = secrets.get("STRIPE_SECRET_KEY");
    const publishableKey = secrets.get("STRIPE_PUBLISHABLE_KEY");

    if (!stripeKey) {
      return Response.json({ error: 'STRIPE_SECRET_KEY não configurada' }, { status: 500 });
    }

    // Cria a cobrança somente a partir de um atendimento pertencente ao cliente.
    if (action === "create_intent") {
      const { amount, method, description, locksmith_id, service_request_id } = body;
      if (!["credit_card", "debit_card", "pix"].includes(method)) {
        return Response.json({ error: "Forma de pagamento inválida" }, { status: 400 });
      }
      const service = await base44.asServiceRole.entities.ServiceRequest.get(service_request_id).catch(() => null);
      if (!service || service.created_by_id !== user.id || service.locksmith_id !== locksmith_id) {
        return Response.json({ error: "Atendimento não encontrado" }, { status: 404 });
      }
      const existingPayments = await base44.asServiceRole.entities.Payment.filter({ service_request_id: service.id });
      const paidPayment = existingPayments.find((p) => p.status === "paid" || p.status === "captured");
      if (paidPayment) {
        return Response.json({ error: "Este atendimento já foi pago" }, { status: 409 });
      }

      const cents = Math.round(Number(amount) * 100);
      const serviceCents = Math.round(Number(service.price || 0) * 100);
      const cancellationCents = Math.round(Number(service.cancellation_fee || 0) * 100);
      if (cents < 100 || (cents !== serviceCents && cents !== cancellationCents)) {
        return Response.json({ error: "O valor da cobrança não confere com o atendimento" }, { status: 400 });
      }

      const existingPayment = service.payment_id
        ? await base44.asServiceRole.entities.Payment.get(service.payment_id).catch(() => null)
        : null;
      if (existingPayment?.status === "pre_authorized" && existingPayment.method === method && Math.round(Number(existingPayment.amount) * 100) === cents) {
        const existingRes = await fetch(paymentIntentUrl(existingPayment.stripe_payment_intent_id), {
          headers: { "Authorization": `Bearer ${stripeKey}` },
        });
        const existingIntent = await existingRes.json();
        if (existingRes.ok && !["canceled", "succeeded"].includes(existingIntent.status)) {
          return Response.json({
            payment_id: existingPayment.id,
            payment_intent_id: existingIntent.id,
            client_secret: existingIntent.client_secret,
            publishable_key: publishableKey,
            status: existingIntent.status,
          });
        }
      }

      const profile = await base44.asServiceRole.entities.Locksmith.get(locksmith_id).catch(() => null);
      let records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id });
      if (!records?.[0]?.stripe_account_id && profile?.created_by_id) {
        records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: profile.created_by_id });
      }
      const connect = records?.[0];
      if (!profile || !connect?.stripe_account_id || !connect.charges_enabled || !connect.payouts_enabled) {
        return Response.json({ error: "O chaveiro precisa concluir a ativação dos recebimentos antes do pagamento." }, { status: 400 });
      }

      const profileFinancials = await getOrCreateFinancials(base44, profile);
      const baseApplicationFee = Math.round(cents * 0.15);
      const pendingOffset = Math.min(Math.round(Number(profileFinancials.pending_cash_commission || 0) * 100), Math.max(0, cents - baseApplicationFee));
      const params: Record<string, string> = {
        amount: String(cents),
        currency: "brl",
        description: description || "Pagamento Chaveiro Já",
        "payment_method_types[]": method === "pix" ? "pix" : "card",
        "transfer_data[destination]": connect.stripe_account_id,
        application_fee_amount: String(baseApplicationFee + pendingOffset),
        "metadata[client_user_id]": user.id,
        "metadata[service_request_id]": service.id,
        "metadata[pending_cash_offset_cents]": String(pendingOffset),
      };
      const res = await fetch(`${STRIPE_API}/payment_intents`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: stripeForm(params),
      });
      const intent = await res.json();
      if (!res.ok) return Response.json({ error: intent.error?.message || "Erro no Stripe" }, { status: 400 });

      let payment;
      try {
        payment = await base44.asServiceRole.entities.Payment.create({
          service_request_id: service.id,
          locksmith_id,
          locksmith_name: service.locksmith_name || profile.name,
          client_id: user.id,
          client_name: user.full_name || "Cliente",
          amount: cents / 100,
          commission_amount: baseApplicationFee / 100,
          net_amount: (cents - baseApplicationFee) / 100,
          method,
          status: "pre_authorized",
          stripe_payment_intent_id: intent.id,
          pre_authorized_at: new Date().toISOString(),
        });
        await base44.asServiceRole.entities.ServiceRequest.update(service.id, {
          payment_id: payment.id,
          payment_method: method,
          payment_status: "pre_authorized",
        });
      } catch (error) {
        await fetch(paymentIntentUrl(intent.id, "/cancel"), {
          method: "POST",
          headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
        }).catch(() => null);
        throw error;
      }

      return Response.json({
        payment_id: payment.id,
        payment_intent_id: intent.id,
        client_secret: intent.client_secret,
        publishable_key: publishableKey,
        status: intent.status,
        ...(method === "pix" && intent.next_action?.pix_qr_code ? { pix_data: { emv: intent.next_action.pix_qr_code.qr_code, image_url: intent.next_action.pix_qr_code.image_url_png } } : {}),
      });
    }

    // Consulta o status de um PaymentIntent
    if (action === "get_status") {
      const { payment_intent_id } = body;
      if (!isPaymentIntentId(payment_intent_id)) return Response.json({ error: "Identificador Stripe inválido" }, { status: 400 });
      const res = await fetch(paymentIntentUrl(payment_intent_id), {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });

      const intent = await res.json();

      if (!res.ok) {
        return Response.json({ error: intent.error?.message || "Erro no Stripe" }, { status: 400 });
      }
      if (intent.metadata?.client_user_id !== user.id && user.role !== "admin") {
        return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
      }

      return Response.json({ status: intent.status });
    }

    // Confirma o pagamento no servidor e registra a divisão feita pelo Stripe Connect.
    if (action === "finalize_payment") {
      const payment = await base44.asServiceRole.entities.Payment.get(body.payment_id).catch(() => null);
      if (!payment || (user.role !== "admin" && payment.client_id !== user.id)) {
        return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
      }
      if (payment.status === "paid") {
        return Response.json({ success: true, already_finalized: true });
      }
      const statusRes = await fetch(paymentIntentUrl(payment.stripe_payment_intent_id), {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      const intent = await statusRes.json();
      if (!statusRes.ok || intent.status !== "succeeded") {
        return Response.json({ error: "O pagamento ainda não foi confirmado pelo Stripe" }, { status: 400 });
      }
      if (intent.metadata?.client_user_id && intent.metadata.client_user_id !== payment.client_id) {
        return Response.json({ error: "Pagamento não pertence a este cliente" }, { status: 403 });
      }
      if (Number(intent.amount_received || intent.amount) !== Math.round(Number(payment.amount) * 100)) {
        return Response.json({ error: "Valor confirmado pelo Stripe não confere" }, { status: 409 });
      }

      await base44.asServiceRole.entities.Payment.update(payment.id, {
        status: "paid",
        captured_at: new Date().toISOString(),
      });

      const transferredDirectly = !!intent.transfer_data?.destination;
      const pendingOffset = Number(intent.metadata?.pending_cash_offset_cents || 0) / 100;
      if (transferredDirectly && payment.locksmith_id && pendingOffset > 0) {
        const locksmith = await base44.asServiceRole.entities.Locksmith.get(payment.locksmith_id);
        const financials = await getOrCreateFinancials(base44, locksmith);
        await base44.asServiceRole.entities.LocksmithFinancials.update(financials.id, {
          pending_cash_commission: Math.max(0, Math.round((Number(financials.pending_cash_commission || 0) - pendingOffset) * 100) / 100),
        });
      }
      if (!transferredDirectly && payment.locksmith_id && payment.net_amount) {
        const locksmith = await base44.asServiceRole.entities.Locksmith.get(payment.locksmith_id);
        const financials = await getOrCreateFinancials(base44, locksmith);
        const pendingCash = Number(financials.pending_cash_commission || 0);
        const netAmount = Number(payment.net_amount || 0);
        const creditAmount = Math.max(0, Math.round((netAmount - pendingCash) * 100) / 100);
        const pendingAfter = Math.max(0, Math.round((pendingCash - netAmount) * 100) / 100);
        await base44.asServiceRole.entities.LocksmithFinancials.update(financials.id, {
          wallet_balance: Math.round(((financials.wallet_balance || 0) + creditAmount) * 100) / 100,
          pending_cash_commission: pendingAfter,
        });
      }

      if (payment.service_request_id) {
        await base44.asServiceRole.entities.ServiceRequest.update(payment.service_request_id, {
          payment_status: "paid",
          commission_status: "paid",
        });
      }
      return Response.json({ success: true, transferred_directly: transferredDirectly });
    }

    // Cancela somente uma cobrança pertencente ao cliente autenticado.
    if (action === "cancel") {
      const { payment_intent_id } = body;
      if (!isPaymentIntentId(payment_intent_id)) return Response.json({ error: "Identificador Stripe inválido" }, { status: 400 });
      const checkRes = await fetch(paymentIntentUrl(payment_intent_id), {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      const current = await checkRes.json();
      if (!checkRes.ok) return Response.json({ error: current.error?.message || "Cobrança não encontrada" }, { status: 404 });
      if (current.metadata?.client_user_id !== user.id && user.role !== "admin") {
        return Response.json({ error: "Cobrança não encontrada" }, { status: 404 });
      }
      if (current.status === "succeeded") {
        return Response.json({ error: "Um pagamento confirmado não pode ser cancelado por esta tela" }, { status: 409 });
      }
      if (current.status === "canceled") return Response.json({ status: "canceled" });

      const res = await fetch(paymentIntentUrl(payment_intent_id, "/cancel"), {
        method: "POST",
        headers: { "Authorization": `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded" },
      });
      const intent = await res.json();
      if (!res.ok) return Response.json({ error: intent.error?.message || "Erro no Stripe" }, { status: 400 });

      const payments = await base44.asServiceRole.entities.Payment.filter({ stripe_payment_intent_id: payment_intent_id });
      if (payments?.[0]?.id) {
        await base44.asServiceRole.entities.Payment.update(payments[0].id, { status: "cancelled" });
      }
      return Response.json({ status: intent.status });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}