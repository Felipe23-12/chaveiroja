import React from "react";
import { Check, X } from "lucide-react";
import IncomingRequestAlert from "@/components/locksmith/IncomingRequestAlert";

// Renderiza a fila de solicitações pendentes. A primeira (mais recente)
// recebe o alerta completo com som/vibração; as demais aparecem em cards
// compactos para aceitar ou recusar rapidamente.
export default function PendingRequestsList({ requests, onAccept, onReject }) {
  if (!requests.length) return null;

  const [primary, ...rest] = requests;

  return (
    <div className="space-y-3">
      {/* Alerta principal (com som e vibração) */}
      <IncomingRequestAlert
        request={primary}
        onAccept={(extra) => onAccept(primary.id, extra)}
        onReject={() => onReject(primary.id)}
      />

      {/* Fila de solicitações adicionais */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-medium text-muted-foreground">
              +{rest.length} na fila
            </p>
          </div>
          {rest.map((req) => (
            <CompactRequestCard
              key={req.id}
              request={req}
              onAccept={onAccept}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompactRequestCard({ request, onAccept, onReject }) {
  const [extraCost, setExtraCost] = React.useState("");
  const [expanded, setExpanded] = React.useState(false);
  const hasCarKey = request.key_value != null;

  const handleAccept = () => {
    const extra = Number(extraCost) || 0;
    onAccept(request.id, extra);
    setExtraCost("");
  };

  return (
    <div className="p-3 rounded-xl border-2 border-amber-300 bg-amber-50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground truncate">
            {request.service_type}
          </p>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            {request.address}
          </p>
          <p className="text-sm font-bold text-foreground mt-1">
            R$ {request.price?.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-xs text-primary font-medium shrink-0 mt-1"
        >
          {expanded ? "Recolher" : "Detalhes"}
        </button>
      </div>

      {expanded && hasCarKey && (
        <div className="mt-2 space-y-1 text-xs bg-white rounded-lg p-2 border border-border">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Valor da chave</span>
            <span>R$ {request.key_value?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mão de obra</span>
            <span>R$ {request.labor_cost?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Locomoção ({request.distance_km?.toFixed(1)} km)</span>
            <span>R$ {request.locomotion_cost?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {expanded && (
        <div className="mt-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={extraCost}
            onChange={(e) => setExtraCost(e.target.value)}
            placeholder="Custos adicionais (R$)"
            className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs"
          />
        </div>
      )}

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleAccept}
          className="flex-1 h-10 rounded-lg bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-600 active:scale-95 transition-all shadow-sm shadow-emerald-500/30"
        >
          <Check className="w-4 h-4" /> Aceitar
        </button>
        <button
          onClick={() => onReject(request.id)}
          className="flex-1 h-10 rounded-lg border border-border bg-white text-foreground text-xs font-bold flex items-center justify-center gap-1 hover:bg-accent active:scale-95 transition-all"
        >
          <X className="w-4 h-4" /> Recusar
        </button>
      </div>
    </div>
  );
}