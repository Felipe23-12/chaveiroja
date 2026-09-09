import React, { useState } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORK_MODES } from "@/lib/pricing";
import PaymentStep from "@/components/payment/PaymentStep";
import NativeSelectDrawer from "@/components/ui/NativeSelectDrawer";
import { getStripePaymentStatus } from "@/lib/payments";

export default function MonthlySubscriptionConfig({ locksmith, onUpdate }) {
  const [dueDay, setDueDay] = useState(locksmith.monthly_fee_due_day || 1);
  const [method, setMethod] = useState(locksmith.monthly_fee_method || "");
  const [showPayment, setShowPayment] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const fee = WORK_MODES.livre.feeValue;

  const saveConfig = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handlePaymentConfirm = async (paymentMethod, stripePaymentIntentId) => {
    setPaying(true);
    setPayError("");
    try {
      const status = await getStripePaymentStatus(stripePaymentIntentId);
      if (status !== "succeeded") throw new Error("Pagamento ainda não confirmado pelo Stripe");
      await onUpdate({
        monthly_fee_paid: true,
        monthly_fee_last_paid: new Date().toISOString().slice(0, 10),
        monthly_fee_method: paymentMethod,
      });
      setShowPayment(false);
    } catch (e) {
      setPayError(e.message || "Falha ao confirmar pagamento");
    } finally {
      setPaying(false);
    }
  };

  if (showPayment) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Pagamento da mensalidade
          </h3>
          <span className="font-semibold text-foreground">R$ {fee.toFixed(2)}</span>
        </div>
        {payError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{payError}</p>}
        <PaymentStep
          amount={fee}
          description="Mensalidade Chaveiro Já - Modo Livre"
          processing={paying}
          onConfirm={handlePaymentConfirm}
          onBack={() => setShowPayment(false)}
          onlineOnly
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Calendar className="w-4 h-4" /> Mensalidade
        </h3>
        <span className="font-semibold text-foreground">R$ {fee.toFixed(2)} / mês</span>
      </div>

      {/* Dia de vencimento */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Dia de vencimento
        </label>
        <div className="flex items-center gap-2">
          <NativeSelectDrawer
            value={dueDay}
            onChange={(v) => {
              setDueDay(v);
              saveConfig("monthly_fee_due_day", v);
            }}
            label="Dia de vencimento"
            placeholder="1"
            options={Array.from({ length: 28 }, (_, i) => i + 1).map((d) => ({
              value: d,
              label: String(d),
            }))}
          />
          <span className="text-sm text-muted-foreground">de cada mês</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Escolha o dia que melhor se encaixa no seu fluxo de caixa.
        </p>
      </div>

      {/* Status / pagar */}
      {locksmith.monthly_fee_paid ? (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Mensalidade paga</span>
          </div>
          {locksmith.monthly_fee_last_paid && (
            <span className="text-xs text-muted-foreground">
              Pago em {new Date(locksmith.monthly_fee_last_paid).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
      ) : (
        <Button onClick={() => setShowPayment(true)} className="w-full">
          Pagar mensalidade
        </Button>
      )}
    </div>
  );
}