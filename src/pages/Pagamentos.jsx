import { CreditCard, ShieldCheck } from "lucide-react";
import PaymentAgentPanel from "@/components/payment/PaymentAgentPanel";
import PaymentHistoryList from "@/components/payment/PaymentHistoryList";

export default function Pagamentos() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-6 h-6 text-primary" />
          <h1 className="font-heading font-bold text-2xl text-foreground">Pagamentos</h1>
        </div>
        <p className="text-sm text-muted-foreground">Consulte cobranças e entenda o status das suas transações.</p>
      </div>

      <PaymentHistoryList />

      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-base text-foreground">Dúvidas sobre um pagamento? Pergunte ao assistente</h2>
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="w-4 h-4 shrink-0 text-primary" />
          O assistente possui acesso somente de leitura e nunca solicitará senha, código de segurança ou número completo do cartão.
        </div>
        <PaymentAgentPanel />
      </div>
    </div>
  );
}