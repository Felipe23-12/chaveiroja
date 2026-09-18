import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import LoadingCard from "@/components/ui/LoadingCard";
import { CreditCard } from "lucide-react";

const STATUS_MAP = {
  pre_authorized: { label: "Pré-autorizado", variant: "secondary" },
  captured: { label: "Processando", variant: "secondary" },
  paid: { label: "Pago", variant: "success" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "outline" },
  failed: { label: "Falhou", variant: "destructive" },
};

function kindFallback(payment) {
  switch (payment.payment_kind) {
    case "service":
      return "Pagamento de serviço";
    case "subscription":
      return "Assinatura Modo Livre";
    case "cancellation":
      return "Taxa de cancelamento";
    default:
      return "Pagamento";
  }
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function PaymentHistoryList() {
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const user = await base44.auth.me();
        const rows = await base44.entities.Payment.filter({ client_id: user.id }, "-created_date", 50);
        if (active) setPayments(rows);
      } catch (err) {
        if (active) {
          setError(err?.message || "Não foi possível carregar seus pagamentos.");
          setPayments([]);
        }
      }
    })();
    return () => { active = false; };
  }, []);

  if (!payments && !error) {
    return <LoadingCard label="Carregando seus pagamentos..." />;
  }

  if (error && (!payments || payments.length === 0)) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        {error}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">Nenhum pagamento ainda</p>
        <p className="text-xs text-muted-foreground mt-1">Suas cobranças aparecerão aqui assim que você concluir um atendimento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => {
        const status = STATUS_MAP[payment.status] || { label: payment.status || "—", variant: "secondary" };
        const description = payment.description?.trim() ? payment.description : kindFallback(payment);
        return (
          <div key={payment.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{description}</p>
                {payment.locksmith_name && (
                  <p className="text-xs text-muted-foreground truncate">Chaveiro: {payment.locksmith_name}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(payment.created_date)}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-sm font-bold text-foreground">{formatCurrency(payment.amount)}</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}