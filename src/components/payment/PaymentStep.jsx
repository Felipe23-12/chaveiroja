import React, { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import PaymentMethodSelector from "@/components/payment/PaymentMethodSelector";
import { calculatePaymentBreakdown, createStripePayment } from "@/lib/payments";
import { base44 } from "@/api/base44Client";
import StripeCardForm from "@/components/payment/StripeCardForm";
import StripePixForm from "@/components/payment/StripePixForm";

export default function PaymentStep({ amount, activeRequest, selectedLocksmith, onConfirm, onBack, processing }) {
  const [method, setMethod] = useState("");
  const [stripeData, setStripeData] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const breakdown = calculatePaymentBreakdown(amount);

  const handleSelectMethod = async (m) => {
    setMethod(m);
    setStripeData(null);
    setCreateError("");
    if (!activeRequest) return;
    setCreating(true);
    try {
      const user = await base44.auth.me();
      const result = await createStripePayment({
        serviceRequestId: activeRequest.id,
        amount,
        method: m,
        locksmithId: selectedLocksmith?.id,
        locksmithName: selectedLocksmith?.name,
        clientId: user?.id,
        clientName: user?.full_name,
      });
      setStripeData(result);
    } catch (e) {
      setCreateError(e.message || "Falha ao iniciar pagamento");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">Forma de pagamento</h2>
        <p className="text-sm text-muted-foreground">Como deseja pagar pelo serviço?</p>
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
              paymentId={stripeData.payment_id}
              onConfirmed={() => onConfirm(method)}
            />
          ) : (
            <StripeCardForm
              processing={processing}
              onConfirm={() => onConfirm(method)}
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
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Taxa do app (15%)</span>
            <span className="font-medium text-red-500">- R$ {breakdown.commission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm pt-1.5 border-t border-border">
            <span className="font-medium text-foreground">Você paga</span>
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