import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, ShieldCheck, CreditCard } from "lucide-react";

// Formulário de cartão simulado (sem dependência de Stripe.js).
// Coleta os dados para exibição e confirma a pré-autorização localmente.
export default function StripeCardForm({ processing, onConfirm }) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");

  const formatCardNumber = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (val) => {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const digits = cardNumber.replace(/\s/g, "");
    if (digits.length < 13) {
      setError("Número do cartão inválido");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      setError("Validade inválida (MM/AA)");
      return;
    }
    if (cvc.length < 3) {
      setError("CVC inválido");
      return;
    }
    onConfirm();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        Pagamento seguro e criptografado
      </div>

      <div>
        <Label className="text-xs">Número do cartão</Label>
        <div className="relative mt-1">
          <Input
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="0000 0000 0000 0000"
            inputMode="numeric"
            className="pr-10"
          />
          <CreditCard className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Validade</Label>
          <Input
            value={expiry}
            onChange={(e) => setExpiry(formatExpiry(e.target.value))}
            placeholder="MM/AA"
            inputMode="numeric"
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">CVC</Label>
          <Input
            value={cvc}
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="123"
            inputMode="numeric"
            className="mt-1"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={processing} size="lg" className="w-full">
        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
        Pré-autorizar cartão
      </Button>
    </form>
  );
}