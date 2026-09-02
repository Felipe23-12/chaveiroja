import React, { useState, useEffect } from "react";
import { Bell, Check, X, MapPin, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function IncomingRequestAlert({ request, onAccept, onReject }) {
  const [elapsed, setElapsed] = useState(0);
  const [extraCost, setExtraCost] = useState("");

  useEffect(() => {
    if (!request) return;
    setElapsed(0);
    setExtraCost("");
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, [request?.id]);

  if (!request) return null;

  const isUrgent = elapsed > 30;
  const hasCarKey = request.key_value != null;

  const handleAccept = () => {
    const extra = Number(extraCost) || 0;
    onAccept(extra);
    setExtraCost("");
  };

  return (
    <div
      className={`rounded-2xl border-2 mb-5 overflow-hidden transition-all ${
        isUrgent ? "border-red-500 bg-red-50" : "border-primary bg-primary/5"
      }`}
    >
      {/* Cabeçalho pulsante */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 ${
          isUrgent ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"
        }`}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 animate-bounce" />
          <span className="font-heading font-bold text-sm">
            {isUrgent ? "⚠️ Solicitação urgente!" : "Nova solicitação!"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-4 space-y-3">
        <div>
          <p className="font-heading font-semibold text-base text-foreground">
            {request.service_type}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" /> {request.address}
          </p>
        </div>

        {/* Resumo financeiro */}
        {hasCarKey ? (
          <div className="space-y-1 text-sm bg-card rounded-lg p-3 border border-border">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor da chave</span>
              <span className="font-medium">R$ {request.key_value?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mão de obra</span>
              <span className="font-medium">R$ {request.labor_cost?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Locomoção ({request.distance_km?.toFixed(1)} km)</span>
              <span className="font-medium">R$ {request.locomotion_cost?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-1">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-foreground">R$ {request.price?.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-card rounded-lg p-3 border border-border">
            <span className="text-sm text-muted-foreground">Valor do serviço</span>
            <span className="font-heading font-bold text-lg text-foreground">
              R$ {request.price?.toFixed(2)}
            </span>
          </div>
        )}

        {/* Aviso de tempo limite */}
        {isUrgent && (
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-100 p-2 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>A solicitação pode expirar — aceite ou recuse o mais rápido possível.</span>
          </div>
        )}

        {/* Custos adicionais */}
        <div>
          <label className="text-xs text-muted-foreground">Custos adicionais (opcional)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={extraCost}
            onChange={(e) => setExtraCost(e.target.value)}
            placeholder="R$ 0,00"
            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-white text-sm"
          />
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button onClick={handleAccept} className="flex-1">
            <Check className="w-4 h-4 mr-1.5" /> Aceitar
          </Button>
          <Button onClick={onReject} variant="outline" className="flex-1">
            <X className="w-4 h-4 mr-1.5" /> Recusar
          </Button>
        </div>
      </div>
    </div>
  );
}