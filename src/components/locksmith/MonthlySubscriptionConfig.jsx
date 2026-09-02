import React, { useState } from "react";
import { QrCode, CreditCard, Banknote, Loader2, CheckCircle2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WORK_MODES } from "@/lib/pricing";

const PAYMENT_METHODS = [
  { id: "pix", label: "Pix", icon: QrCode, description: "Pagamento instantâneo" },
  { id: "credit_card", label: "Cartão de crédito", icon: CreditCard, description: "Cobrança automática no vencimento" },
  { id: "debit_card", label: "Cartão de débito", icon: CreditCard, description: "Débito automático no vencimento" },
  { id: "boleto", label: "Boleto bancário", icon: Banknote, description: "Gerado 3 dias antes do vencimento" },
];

export default function MonthlySubscriptionConfig({ locksmith, onUpdate }) {
  const [dueDay, setDueDay] = useState(locksmith.monthly_fee_due_day || 1);
  const [method, setMethod] = useState(locksmith.monthly_fee_method || "");
  const [paying, setPaying] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const fee = WORK_MODES.livre.feeValue;

  const saveConfig = (field, value) => {
    onUpdate({ [field]: value });
  };

  const handlePay = () => {
    if (!method) return;
    setPaying(true);
    setTimeout(() => {
      onUpdate({
        monthly_fee_paid: true,
        monthly_fee_last_paid: new Date().toISOString().slice(0, 10),
      });
      setPaying(false);
      setShowPayment(false);
    }, 1500);
  };

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
          <select
            value={dueDay}
            onChange={(e) => {
              const v = Number(e.target.value);
              setDueDay(v);
              saveConfig("monthly_fee_due_day", v);
            }}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <span className="text-sm text-muted-foreground">de cada mês</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Escolha o dia que melhor se encaixa no seu fluxo de caixa.
        </p>
      </div>

      {/* Método de pagamento */}
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Forma de pagamento
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((m) => {
            const Icon = m.icon;
            const active = method === m.id;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMethod(m.id);
                  saveConfig("monthly_fee_method", m.id);
                }}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>
              </button>
            );
          })}
        </div>
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
      ) : !showPayment ? (
        <Button onClick={() => setShowPayment(true)} disabled={!method} className="w-full">
          Pagar mensalidade
        </Button>
      ) : (
        <div className="space-y-3 p-3 rounded-xl bg-muted">
          <p className="text-sm text-center text-muted-foreground">
            Confirmando pagamento de <strong className="text-foreground">R$ {fee.toFixed(2)}</strong> via{" "}
            <strong className="text-foreground">{PAYMENT_METHODS.find((m) => m.id === method)?.label}</strong>
          </p>
          <Button onClick={handlePay} disabled={paying} className="w-full">
            {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {paying ? "Processando..." : "Confirmar pagamento"}
          </Button>
          <Button variant="ghost" onClick={() => setShowPayment(false)} disabled={paying} className="w-full">
            Cancelar
          </Button>
        </div>
      )}
    </div>
  );
}