import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocksmithMiniProfile from "@/components/locksmith/LocksmithMiniProfile";
import ReviewForm from "@/components/locksmith/ReviewForm";
import ReceiptButton from "@/components/payment/ReceiptButton";

/** Etapa 7: pagamento confirmado — avaliação do chaveiro e recibo */
export default function ReviewStep({ request, locksmith, customerName, onRate, onNewRequest }) {
  return (
    <div className="space-y-5 step-enter">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-1">Pagamento confirmado!</h2>
        <p className="text-sm text-muted-foreground">{request.service_type} · {locksmith?.name}</p>
      </div>

      <LocksmithMiniProfile locksmith={locksmith} />

      <div className="p-4 rounded-2xl border border-border bg-card">
        <p className="text-center text-sm font-medium text-foreground mb-3">Avalie o atendimento do chaveiro</p>
        <ReviewForm
          locksmithId={locksmith?.id}
          locksmithName={locksmith?.name}
          serviceType={request.service_type}
          workMode={locksmith?.work_mode}
          onSubmitted={(r) => onRate(r)}
        />
      </div>

      <ReceiptButton serviceRequest={request} locksmith={locksmith} customerName={customerName} />

      <Button onClick={onNewRequest} variant="outline" className="w-full">
        Solicitar novo serviço
      </Button>
    </div>
  );
}