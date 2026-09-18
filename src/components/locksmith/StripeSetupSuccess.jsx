import React from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Confirmação clara de que a conta de recebimentos foi vinculada com sucesso. */
export default function StripeSetupSuccess({ onContinue }) {
  return (
    <div className="text-center space-y-4 fade-in-up">
      <div className="w-16 h-16 rounded-full bg-success/15 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-9 h-9 text-success" />
      </div>
      <div>
        <p className="font-heading font-bold text-lg text-foreground">Conta vinculada com sucesso!</p>
        <p className="text-sm text-muted-foreground mt-1">
          Seu cadastro de recebimentos foi concluído. Os valores dos atendimentos serão depositados
          automaticamente na sua conta.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-success/10 text-success"><strong>Pagamentos</strong><br />Ativo</div>
        <div className="p-2 rounded-lg bg-success/10 text-success"><strong>Repasses</strong><br />Ativo</div>
      </div>
      <Button className="w-full" onClick={onContinue}>Ir para o painel</Button>
    </div>
  );
}