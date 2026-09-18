import React, { useEffect, useState } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORK_MODES } from "@/lib/pricing";
import PaymentStep from "@/components/payment/PaymentStep";
import NativeSelectDrawer from "@/components/ui/NativeSelectDrawer";

export default function MonthlySubscriptionConfig({ locksmith, onUpdate }) {
  const [dueDay, setDueDay] = useState(locksmith.monthly_fee_due_day || 1);
  const [showPayment, setShowPayment] = useState(false);
  const fee = WORK_MODES.livre.feeValue;
  useEffect(() => { if (new URLSearchParams(window.location.search).get("mercado_pago") === "retorno") setShowPayment(true); }, []);
  const handlePaymentConfirm = async (method) => {
    await onUpdate({ monthly_fee_paid: true, monthly_fee_last_paid: new Date().toISOString().slice(0, 10), monthly_fee_method: method });
    setShowPayment(false);
  };
  if (showPayment) return <div className="rounded-2xl border border-border bg-card p-4 space-y-4"><h3 className="font-heading font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> Pagamento da mensalidade</h3><PaymentStep amount={fee} description="Mensalidade Chaveiro Já - Modo Livre" locksmithId={locksmith.id} paymentKind="subscription" onConfirm={handlePaymentConfirm} onBack={() => setShowPayment(false)} /></div>;
  return <div className="rounded-2xl border border-border bg-card p-4 space-y-4"><div className="flex items-center justify-between"><h3 className="font-heading font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" /> Mensalidade</h3><span className="font-semibold">R$ {fee.toFixed(2)} / mês</span></div><div><label className="text-sm font-medium mb-1.5 block">Dia de vencimento</label><div className="flex items-center gap-2"><NativeSelectDrawer value={dueDay} onChange={(value) => { setDueDay(value); onUpdate({ monthly_fee_due_day: value }); }} label="Dia de vencimento" placeholder="1" options={Array.from({ length: 28 }, (_, index) => ({ value: index + 1, label: String(index + 1) }))} /><span className="text-sm text-muted-foreground">de cada mês</span></div></div>{locksmith.monthly_fee_paid ? <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">Mensalidade paga</span></div> : <Button onClick={() => setShowPayment(true)} className="w-full">Pagar com Mercado Pago</Button>}</div>;
}