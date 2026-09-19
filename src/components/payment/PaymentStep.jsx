import React, { useState } from "react";
import { ArrowLeft, ExternalLink, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import CashPaymentOption from "@/components/payment/CashPaymentOption";
import { calculatePaymentBreakdown, createMercadoPagoCheckout } from "@/lib/payments";
import useCheckoutConfirmation from '@/hooks/useCheckoutConfirmation';

export default function PaymentStep({ amount, description, locksmithId, serviceRequestId, paymentKind = "service", onConfirm, onCash, onBack, processing, additionalAmount = 0, additionalLabel = "Adicional" }) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const confirmation = useCheckoutConfirmation(serviceRequestId, paymentKind, onConfirm);
  const breakdown = calculatePaymentBreakdown(amount);
  const pay = async () => {
    setCreating(true);
    setError("");
    try {
      const result = await createMercadoPagoCheckout({ amount, description, locksmithId, serviceRequestId, paymentKind });
      if (result?.status === "paid") {
        onConfirm?.(result.method, result.provider_payment_id, result.payment_id);
        setCreating(false);
        return;
      }
      if (!result?.checkout_url) throw new Error("Checkout indisponível.");
      window.location.href = result.checkout_url;
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Falha ao abrir o Mercado Pago.");
      setCreating(false);
    }
  };
  return <div className="space-y-5"><div><h2 className="font-heading font-semibold text-lg">Pagamento pelo Mercado Pago</h2><p className="text-sm text-muted-foreground">Escolha Pix, cartão ou saldo no ambiente seguro do Mercado Pago.</p></div><div className="p-4 rounded-2xl border border-border bg-card space-y-4"><div className="flex items-center gap-3"><div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center"><Wallet className="w-5 h-5 text-primary" /></div><div><p className="font-semibold">Mercado Pago</p><p className="text-xs text-muted-foreground">Pix, cartão ou saldo Mercado Pago</p></div></div>{(error || confirmation.error) && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error || confirmation.error}</p>}{confirmation.pending && <div className="space-y-2"><p className="text-sm text-muted-foreground">Aguardando confirmação. O Pix gerado neste pagamento pode ser pago em qualquer banco. Não pague novamente.</p><Button variant="outline" className="w-full" onClick={confirmation.check} disabled={confirmation.checking || processing}>{confirmation.checking && <Loader2 className="w-4 h-4 animate-spin" />}Já paguei — verificar pagamento</Button></div>}<Button onClick={pay} disabled={creating || processing} className="w-full" size="lg">{creating || processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Pagar R$ {breakdown.amount.toFixed(2)}</Button><p className="text-xs text-muted-foreground flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Seus dados de pagamento são tratados pelo Mercado Pago.</p></div>{onCash && <CashPaymentOption amount={breakdown.amount} onSelect={onCash} disabled={creating || processing} />}<div className="p-3 rounded-xl bg-muted/50 space-y-1.5"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Valor do serviço</span><span className="font-medium">R$ {Math.max(0, breakdown.amount - Number(additionalAmount || 0)).toFixed(2)}</span></div>{Number(additionalAmount || 0) > 0 && <div className="flex justify-between text-sm"><span className="text-warning">{additionalLabel}</span><span className="font-medium text-warning">R$ {Number(additionalAmount).toFixed(2)}</span></div>}<div className="flex justify-between text-sm pt-1.5 border-t border-border"><span className="font-medium">Total</span><span className="font-heading font-bold text-lg">R$ {breakdown.amount.toFixed(2)}</span></div></div><Button variant="outline" onClick={onBack} className="w-full"><ArrowLeft className="w-4 h-4" /> Voltar</Button></div>;
}