import React from "react";
import { Clock3, ShieldCheck } from "lucide-react";

export default function StripeReviewAlert() {
  return (
    <div className="mb-5 rounded-2xl border-2 border-primary bg-secondary p-4 shadow-sm" role="status">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Clock3 className="h-5 w-5" />
        </div>
        <div>
          <p className="font-heading font-bold text-foreground">Conta Stripe em análise</p>
          <p className="mt-1 text-sm text-secondary-foreground">Seu cadastro foi enviado com sucesso — ele não falhou. Você pode continuar usando o aplicativo normalmente enquanto o Stripe conclui a verificação.</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-secondary-foreground"><ShieldCheck className="h-4 w-4" /> Os recebimentos serão liberados automaticamente após a aprovação.</p>
        </div>
      </div>
    </div>
  );
}