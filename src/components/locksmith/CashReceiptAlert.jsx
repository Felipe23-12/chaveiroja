import React, { useRef, useState } from "react";
import { Banknote, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CashReceiptAlert({ request, online, onConfirm }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const amount = Number(request.price || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const confirm = async () => {
    if (submitting.current || !online) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Não foi possível confirmar. Tente novamente.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };
  return (
    <section role="region" aria-label="Confirmar pagamento em dinheiro" className="sticky top-[env(safe-area-inset-top)] z-40 mb-5 rounded-2xl border-2 border-primary bg-card p-4 shadow-lg">
      <div role="status" aria-live="polite" className="flex items-start gap-3">
        <Banknote className="h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 className="font-heading font-bold text-foreground">Cliente escolheu dinheiro</h2>
          <p className="text-xl font-bold text-foreground">{amount}</p>
          <p className="text-xs text-muted-foreground">Confirme somente depois de receber e conferir o valor em mãos.</p>
        </div>
      </div>
      <Button onClick={confirm} disabled={busy || !online} className="mt-3 h-auto min-h-12 w-full whitespace-normal py-3">
        {busy ? <Loader2 className="animate-spin" /> : <Check />}
        {busy ? "Confirmando recebimento..." : `Recebi ${amount} em dinheiro`}
      </Button>
      {!online && <p className="mt-2 text-xs text-muted-foreground">Conecte-se à internet para confirmar o recebimento.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}