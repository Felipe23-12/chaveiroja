import React from "react";
import { Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CashPaymentOption({ amount, onSelect, disabled }) {
  return (
    <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
          <Banknote className="w-5 h-5 text-emerald-700" />
        </div>
        <div>
          <p className="font-semibold">Dinheiro</p>
          <p className="text-xs text-muted-foreground">Pague em espécie diretamente ao chaveiro</p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={onSelect} disabled={disabled} className="w-full" size="lg">
        <Banknote className="w-4 h-4" /> Pagar R$ {Number(amount || 0).toFixed(2)} em dinheiro
      </Button>
      <p className="text-xs text-muted-foreground">O chaveiro deverá confirmar o recebimento para finalizar o atendimento. A comissão de 15% será descontada do saldo dele conforme as regras do aplicativo.</p>
    </div>
  );
}