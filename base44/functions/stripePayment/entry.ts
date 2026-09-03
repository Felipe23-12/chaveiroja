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
      if (locksmith_id) {
        const records = await base44.asServiceRole.entities.StripeConnectAccount.filter({ locksmith_id });
        destinationAccountId = records?.[0]?.stripe_account_id || "";
        // Sem conta Stripe Connect ativa: cria um PaymentIntent direto na conta
        // da plataforma. O repasse ao chaveiro é feito via carteira interna ao
        // confirmar o pagamento (confirmPaymentPaid), permitindo cartão mesmo
        // antes da configuração do Stripe Connect.
      }

      const applicationFee = Math.round(cents * 0.15);
      const params: Record<string, string> = {
        amount: String(cents),
        currency: "brl",
        description: description || "Pagamento Chaveiro Já",
        "payment_method_types[]": pmType,
      };
      if (destinationAccountId) {
        params["transfer_data[destination]"] = destinationAccountId;
        params["application_fee_amount"] = String(applicationFee);
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