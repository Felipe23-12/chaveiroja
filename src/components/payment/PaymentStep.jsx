import React, { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentMethodSelector from "@/components/payment/PaymentMethodSelector";
import { calculatePaymentBreakdown, createStripePaymentIntent } from "@/lib/payments";
import StripeCardForm from "@/components/payment/StripeCardForm";
import StripePixForm from "@/components/payment/StripePixForm";

export default function PaymentStep({ amount, description, locksmithId, onConfirm, onBack, processing }) {
  const [method, setMethod] = useState("");
  const [stripeData, setStripeData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const breakdown = calculatePaymentBreakdown(amount);

  const handleSelectMethod = async (m) => {
    setMethod(m);
    setStripeData(null);
    setCreateError("");
    setCreating(true);
    try {
      const result = await createStripePaymentIntent({
        amount,
        method: m,
        description,
        locksmithId,
      });
      if (result.error) throw new Error(result.error);
      setStripeData(result);
    } catch (e) {
      const msg = e?.message || "";
      if (msg.includes("pix") && msg.toLowerCase().includes("invalid")) {
        setCreateError("Pagamento via Pix ainda não ativado na conta Stripe. Use cartão por enquanto — ative o Pix no dashboard do Stripe em Settings → Payment methods.");
      } else {
        setCreateError(msg || "Falha ao iniciar pagamento");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">Forma de pagamento</h2>
        <p className="text-sm text-muted-foreground">Pague pelo serviço agora</p>
      </div>

      <PaymentMethodSelector selected={method} onSelect={handleSelectMethod} />

      {creating && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {createError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{createError}</p>}

      {method && stripeData && !creating && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-4">
          {method === "pix" ? (
            <StripePixForm
              pixData={stripeData.pix_data}
              paymentIntentId={stripeData.payment_intent_id}
              onConfirmed={() => onConfirm(method, stripeData.payment_intent_id)}
            />
          ) : (
            <StripeCardForm
              clientSecret={stripeData.client_secret}
              publishableKey={stripeData.publishable_key}
              processing={processing}
              onConfirm={() => onConfirm(method, stripeData.payment_intent_id)}
            />
          )}
        </div>
      )}

      {method && (
        <div className="p-3 rounded-xl bg-muted/50 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor do serviço</span>
            <span className="font-medium text-foreground">R$ {breakdown.amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1.5 border-t border-border">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-heading font-bold text-lg text-foreground">R$ {breakdown.amount.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
      </div>
    </div>
  );
}