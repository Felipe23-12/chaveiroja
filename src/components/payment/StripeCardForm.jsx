import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

function CardForm({ clientSecret, onConfirm, processing }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || confirming) return;
    setError("");
    setConfirming(true);
    try {
      const cardElement = elements.getElement(CardElement);
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });
      if (result.error) {
        setError(result.error.message || "O cartão não pôde ser confirmado. Confira os dados e tente novamente.");
      } else if (result.paymentIntent.status === "succeeded") {
        await onConfirm();
      } else {
        setError("O pagamento não foi concluído. Tente novamente ou use outro cartão.");
      }
    } finally {
      setConfirming(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        Pagamento seguro e criptografado
      </div>

      <div className="p-3 rounded-lg border border-border bg-white">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#1a1a1a",
                "::placeholder": { color: "#9ca3af" },
              },
              invalid: { color: "#dc2626" },
            },
          }}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={!stripe || processing || confirming} size="lg" className="w-full">
        {processing || confirming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
        {processing || confirming ? "Processando pagamento..." : "Pagar agora"}
      </Button>
    </form>
  );
}

export default function StripeCardForm({ clientSecret, publishableKey, onConfirm, processing }) {
  const [stripePromise, setStripePromise] = useState(null);

  useEffect(() => {
    if (publishableKey) {
      setStripePromise(loadStripe(publishableKey));
    }
  }, [publishableKey]);

  if (!stripePromise) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardForm clientSecret={clientSecret} onConfirm={onConfirm} processing={processing} />
    </Elements>
  );
}