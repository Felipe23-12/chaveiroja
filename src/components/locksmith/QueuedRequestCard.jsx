import React from "react";
import { Clock3, MapPin } from "lucide-react";

export default function QueuedRequestCard({ request }) {
  if (!request) return null;
  return (
    <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 mb-4">
      <div className="flex items-center gap-2 text-amber-700 mb-2">
        <Clock3 className="w-5 h-5" />
        <p className="font-bold text-sm">Próximo atendimento confirmado</p>
      </div>
      <p className="text-sm font-medium text-foreground">{request.service_type}</p>
      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
        <MapPin className="w-3.5 h-3.5" /> {request.address}
      </p>
      <p className="text-xs text-amber-700 mt-2">A rota começará automaticamente ao finalizar o atendimento atual.</p>
    </div>
  );
}