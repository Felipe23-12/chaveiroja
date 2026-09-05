import React from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Etapa 3: chamado tocando para os chaveiros elegíveis, aguardando aceite. */
export default function RingingStep({ request, serviceLabel, searchRadius, currentRadius, onCancel }) {
  const count = request.ringing_locksmith_ids?.length || 0;
  return (
    <div className="space-y-5 text-center step-enter">
      <div className="flex flex-col items-center py-8">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Bell className="w-8 h-8 text-primary animate-bounce" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
          Tocando nos chaveiros mais próximos...
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          {serviceLabel} · {searchRadius == null ? `raio de ${currentRadius} km` : "todos os chaveiros online"} ·{" "}
          {count} chaveiro{count === 1 ? "" : "s"} recebendo · o primeiro que aceitar atende você
        </p>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Aguardando o profissional aceitar
        </div>
      </div>
      <Button variant="outline" onClick={onCancel} className="w-full">
        Cancelar solicitação
      </Button>
    </div>
  );
}