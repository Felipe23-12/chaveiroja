import React, { useState } from "react";
import { Lock, ShieldCheck, Loader2, ArrowLeft, QrCode, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PaymentMethodSelector from "@/components/payment/PaymentMethodSelector";
import { calculatePaymentBreakdown } from "@/lib/payments";

function CardForm({ method, processing, onConfirm }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        Pagamento seguro e criptografado
      </div>
      <div>
        <Label className="text-xs">Número do cartão</Label>
        <Input placeholder="0000 0000 0000 0000" inputMode="numeric" className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Validade</Label>
          <Input placeholder="MM/AA" className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">CVV</Label>
          <Input placeholder="123" inputMode="numeric" className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Nome no cartão</Label>
        <Input placeholder="Nome completo" className="mt-1" />
      </div>
      <Button onClick={onConfirm} disabled={processing} size="lg" className="w-full mt-2">
        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
        {method === "credit_card" ? "Pré-autorizar cartão" : "Pré-autorizar débito"}
      </Button>
    </div>
  );
}

function PixForm({ processing, onConfirm }) {
  const [copied, setCopied] = useState(false);
  const pixCode = "00020126360014BR.GOV.BCB.PIX0114chaveiroja@pix.com5204000053039865802BR5913CHAVEIRO JA6009SAO PAULO62070503***6304A1B2";

  const handleCopy = () => {
    navigator.clipboard?.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex flex-col items-center">
        <div className="w-44 h-44 rounded-2xl border-2 border-border bg-white flex items-center justify-center mb-3 relative overflow-hidden">
          <QrCode className="w-32 h-32 text-foreground" />
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
        </div>
        <p className="text-xs text-muted-foreground mb-2">Escaneie o QR Code ou copie o código Pix</p>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-muted/70"
        >
          {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copiado!" : "Copiar código Pix"}
        </button>
      </div>
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-left">
        <p className="text-xs text-amber-800">
          O pagamento Pix será processado ao concluir o serviço. O valor será cobrado automaticamente.
        </p>
      </div>
      <Button onClick={onConfirm} disabled={processing} size="lg" className="w-full">
        {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
        Confirmar e solicitar chaveiro
      </Button>
    </div>
  );
}

export default function PaymentStep({ amount, onConfirm, onBack, processing }) {
  const [method, setMethod] = useState("");
  const breakdown = calculatePaymentBreakdown(amount);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-semibold text-lg text-foreground">Forma de pagamento</h2>
        <p className="text-sm text-muted-foreground">Como deseja pagar pelo serviço?</p>
      </div>

      <PaymentMethodSelector selected={method} onSelect={setMethod} />

      {method && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-4">
          {method === "pix" ? (
            <PixForm processing={processing} onConfirm={() => onConfirm(method)} />
          ) : (
            <CardForm method={method} processing={processing} onConfirm={() => onConfirm(method)} />
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