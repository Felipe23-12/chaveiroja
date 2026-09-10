import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const STRIPE_API = "https://api.stripe.com/v1";

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

    // Cria um PaymentIntent no Stripe
    if (action === "create_intent") {
      const { amount, method, description, locksmith_id } = body;
      const cents = Math.round(Number(amount) * 100);
      if (cents < 100) {
        return Response.json({ error: 'Valor mínimo é R$ 1,00' }, { status: 400 });
      }

      const pmType = method === "pix" ? "pix" : "card";
      let destinationAccountId = "";
      let profile = null;
      if (locksmith_id) {
        profile = await base44.asServiceRole.entities.Locksmith.get(locksmith_id).catch(() => null);
        let records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id });
        if (!records?.[0]?.stripe_account_id && profile?.created_by_id) {
          records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id: profile.created_by_id });
        }
        const connect = records?.[0];
        if (!connect?.stripe_account_id || !connect.charges_enabled || !connect.payouts_enabled) {
          return Response.json({ error: 'O chaveiro precisa concluir a ativação dos recebimentos antes do pagamento.' }, { status: 400 });
        }
        destinationAccountId = connect.stripe_account_id;
      }

      const baseApplicationFee = Math.round(cents * 0.15);
      const pendingOffset = destinationAccountId
        ? Math.min(Math.round(Number(profile?.pending_cash_commission || 0) * 100), Math.max(0, cents - baseApplicationFee))
        : 0;
      const applicationFee = baseApplicationFee + pendingOffset;
      const params: Record<string, string> = {
        amount: String(cents),
        currency: "brl",
        description: description || "Pagamento Chaveiro Já",
        "payment_method_types[]": pmType,
      };
      if (destinationAccountId) {
        params["transfer_data[destination]"] = destinationAccountId;
        params["application_fee_amount"] = String(applicationFee);
        params["metadata[pending_cash_offset_cents]"] = String(pendingOffset);
      }
      const bodyStr = stripeForm(params);

      const res = await fetch(`${STRIPE_API}/payment_intents`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyStr,
      });

      const intent = await res.json();

      if (!res.ok) {
        return Response.json({ error: intent.error?.message || "Erro no Stripe" }, { status: 400 });
      }

      const result = {
        payment_intent_id: intent.id,
        client_secret: intent.client_secret,
        publishable_key: publishableKey,
        status: intent.status,
      };

      if (method === "pix" && intent.next_action?.pix_qr_code) {
        result.pix_data = {
          emv: intent.next_action.pix_qr_code.qr_code,
          image_url: intent.next_action.pix_qr_code.image_url_png,
        };
      }

      return Response.json(result);
    }

    // Confirma pagamento recebido fora do aplicativo e compensa a comissão.
    if (action === "confirm_cash") {
      const service = await base44.asServiceRole.entities.ServiceRequest.get(body.service_request_id).catch(() => null);
      const locksmith = await base44.asServiceRole.entities.Locksmith.get(body.locksmith_id).catch(() => null);
      if (!service || !locksmith || service.locksmith_id !== locksmith.id || locksmith.created_by_id !== user.id) {
        return Response.json({ error: "Atendimento não encontrado" }, { status: 404 });
      }
      if (service.cash_received === true) {
        return Response.json({ success: true, already_confirmed: true });
      }

      const commission = Math.round(Number(body.amount || service.price || 0) * 0.15 * 100) / 100;
      const available = Math.max(0, Number(locksmith.wallet_balance || 0));
      const deductedNow = Math.min(available, commission);
      const pendingBefore = Math.max(0, Number(locksmith.pending_cash_commission || 0));
      const pendingAfter = Math.round((pendingBefore + commission - deductedNow) * 100) / 100;

      await base44.asServiceRole.entities.Locksmith.update(locksmith.id, {
        wallet_balance: Math.round((available - deductedNow) * 100) / 100,
        pending_cash_commission: pendingAfter,
      });
      await base44.asServiceRole.entities.ServiceRequest.update(service.id, {
        cash_received: true,
        payment_method: "dinheiro",
        payment_status: "paid",
        commission_status: pendingAfter > pendingBefore ? "pending" : "paid",
      });
      return Response.json({ success: true, commission, deducted_now: deductedNow, pending: pendingAfter });
    }

    // Consulta o status de um PaymentIntent
    if (action === "get_status") {
      const { payment_intent_id } = body;
      const res = await fetch(`${STRIPE_API}/payment_intents/${payment_intent_id}`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });

      const intent = await res.json();

      if (!res.ok) {
        return Response.json({ error: intent.error?.message || "Erro no Stripe" }, { status: 400 });
      }

      return Response.json({ status: intent.status });
    }

    // Confirma o pagamento no servidor e registra a divisão feita pelo Stripe Connect.
    if (action === "finalize_payment") {
      const payment = await base44.asServiceRole.entities.Payment.get(body.payment_id).catch(() => null);
      if (!payment || (user.role !== "admin" && payment.client_id !== user.id)) {
        return Response.json({ error: "Pagamento não encontrado" }, { status: 404 });
      }
      const statusRes = await fetch(`${STRIPE_API}/payment_intents/${payment.stripe_payment_intent_id}`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      const intent = await statusRes.json();
      if (!statusRes.ok || intent.status !== "succeeded") {
        return Response.json({ error: "O pagamento ainda não foi confirmado pelo Stripe" }, { status: 400 });
      }

      await base44.asServiceRole.entities.Payment.update(payment.id, {
        status: "paid",
        captured_at: new Date().toISOString(),
      });

      const transferredDirectly = !!intent.transfer_data?.destination;
      const pendingOffset = Number(intent.metadata?.pending_cash_offset_cents || 0) / 100;
      if (transferredDirectly && payment.locksmith_id && pendingOffset > 0) {
        const locksmith = await base44.asServiceRole.entities.Locksmith.get(payment.locksmith_id);
        await base44.asServiceRole.entities.Locksmith.update(payment.locksmith_id, {
          pending_cash_commission: Math.max(0, Math.round((Number(locksmith.pending_cash_commission || 0) - pendingOffset) * 100) / 100),
        });
      }
      if (!transferredDirectly && payment.locksmith_id && payment.net_amount) {
        const locksmith = await base44.asServiceRole.entities.Locksmith.get(payment.locksmith_id);
        const pendingCash = Number(locksmith.pending_cash_commission || 0);
        const netAmount = Number(payment.net_amount || 0);
        const creditAmount = Math.max(0, Math.round((netAmount - pendingCash) * 100) / 100);
        const pendingAfter = Math.max(0, Math.round((pendingCash - netAmount) * 100) / 100);
        await base44.asServiceRole.entities.Locksmith.update(payment.locksmith_id, {
          wallet_balance: Math.round(((locksmith.wallet_balance || 0) + creditAmount) * 100) / 100,
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

    // Cancela um PaymentIntent
    if (action === "cancel") {
      const { payment_intent_id } = body;
      const res = await fetch(`${STRIPE_API}/payment_intents/${payment_intent_id}/cancel`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const intent = await res.json();

      if (!res.ok) {
        return Response.json({ error: intent.error?.message || "Erro no Stripe" }, { status: 400 });
      }

      return Response.json({ status: intent.status });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}