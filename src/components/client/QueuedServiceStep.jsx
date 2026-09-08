import React from "react";
import { Clock3, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import LocksmithMiniProfile from "@/components/locksmith/LocksmithMiniProfile";
import KeyServicePrice from "@/components/client/KeyServicePrice";

export default function QueuedServiceStep({ request, locksmith, onCancel }) {
  return (
    <div className="space-y-5 step-enter">
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Clock3 className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-foreground">Chaveiro reservou seu chamado</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm">
          O chaveiro está finalizando outro atendimento próximo e depois irá até você. Sua rota começará automaticamente.
        </p>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 text-sm">
        <CheckCircle2 className="w-5 h-5 shrink-0" /> Seu chamado está confirmado como o próximo da fila.
      </div>
      <KeyServicePrice request={request} />
      <LocksmithMiniProfile locksmith={locksmith} />
      <p className="text-xs text-muted-foreground text-center">{request.service_type} · {request.address}</p>
      <Button variant="outline" onClick={onCancel} className="w-full text-destructive border-destructive/40">
        Cancelar solicitação
      </Button>
    </div>
  );
}