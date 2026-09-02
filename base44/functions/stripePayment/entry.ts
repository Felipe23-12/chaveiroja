import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

const STRIPE_API = "https://api.stripe.com/v1";

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
      const { amount, method, description } = body;
      const cents = Math.round(Number(amount) * 100);
      if (cents < 100) {
        return Response.json({ error: 'Valor mínimo é R$ 1,00' }, { status: 400 });
      }

      const pmType = method === "pix" ? "pix" : "card";
      const bodyStr = `amount=${cents}&currency=brl&description=${encodeURIComponent(description || "Pagamento Chaveiro Já")}&payment_method_types[]=${pmType}`;

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