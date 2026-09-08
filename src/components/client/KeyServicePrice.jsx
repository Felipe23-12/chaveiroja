import React from "react";
import { Info } from "lucide-react";

const KEY_SERVICES = ["Confecção de Chave de Carro", "Confecção de Chave de Moto"];
const ACCEPTED_STATUSES = ["queued", "accepted", "on_the_way", "completed"];

export default function KeyServicePrice({ request, pending = false }) {
  if (pending) {
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-border bg-muted/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">O valor do serviço será exibido depois que o chaveiro aceitar o chamado.</p>
      </div>
    );
  }

  const accepted = request?.accepted_at || ACCEPTED_STATUSES.includes(request?.status);
  if (!KEY_SERVICES.includes(request?.service_type) || !accepted) return null;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-muted p-4">
      <span className="text-sm text-muted-foreground">Valor do serviço</span>
      <span className="font-heading text-lg font-bold text-foreground">R$ {Number(request.price || 0).toFixed(2)}</span>
    </div>
  );
}