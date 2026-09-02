import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

const CARD_OPTIONS = {
  style: {
    base: { fontSize: "16px", color: "#1e293b", "::placeholder": { color: "#94a3b8" } },
    invalid: { color: "#dc2626" },
  },
  hidePostalCode: true,
};

function CardFormInner({ clientSecret, processing, onConfirm }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setError("");
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });
    if (result.error) {
      setError(result.error.message);
    } else if (result.paymentIntent.status === "requires_capture") {
      onConfirm();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        Pagamento seguro e criptografado via Stripe
      </div>
      <div className="p-3.5 rounded-lg border border-border bg-white">
        <CardElement options={CARD_OPTIONS} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={!stripe || processing} size="lg" className="w-full">
        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
        Pré-autorizar cartão
      </Button>
    </form>
  );
}

export default function StripeCardForm({ clientSecret, publishableKey, processing, onConfirm }) {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    if (publishableKey) setStripePromise(loadStripe(publishableKey));
  }, [publishableKey]);

  if (!stripePromise) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardFormInner clientSecret={clientSecret} processing={processing} onConfirm={onConfirm} />
    </Elements>
  );
}