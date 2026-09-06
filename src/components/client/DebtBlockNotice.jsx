import React from "react";
import { AlertOctagon, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Aviso de débito pendente — bloqueia novos pedidos e mensagens até o pagamento. */
export default function DebtBlockNotice({ debt, onPay }) {
  if (!debt) return null;
  const r = debt.request;
  return (
    <div className="p-4 rounded-2xl border-2 border-red-300 bg-red-50 space-y-3">
      <div className="flex items-start gap-2.5">
        <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="font-heading font-semibold text-red-700">Débito pendente</p>
          <p className="text-sm text-red-700 mt-0.5">
            Você cancelou o serviço <strong>{r.service_type}</strong> após o chaveiro
            {r.locksmith_name ? ` ${r.locksmith_name}` : ""} já ter aceitado, e a taxa de cancelamento de{" "}
            <strong>R$ {debt.fee.toFixed(2)}</strong> não foi paga.
          </p>
          <p className="text-xs text-red-600 mt-1.5">
            Enquanto o débito estiver em aberto, você não pode solicitar serviços no modo aplicativo nem enviar
            mensagens para chaveiros no modo livre.
          </p>
        </div>
      </div>
      {onPay && (
        <Button onClick={onPay} className="w-full bg-red-600 hover:bg-red-700 text-white">
          <CreditCard className="w-4 h-4 mr-2" /> Pagar débito agora
        </Button>
      )}
    </div>
  );
}