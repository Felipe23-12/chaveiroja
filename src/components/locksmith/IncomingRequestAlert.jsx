import React, { useState, useEffect } from "react";
import { Bell, Check, X, MapPin, Clock, AlertCircle } from "lucide-react";
import KeyTechnicalDetails from "./KeyTechnicalDetails";
import { clientNameFromRequest } from "@/lib/clientName";

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function IncomingRequestAlert({ request, onAccept, onReject }) {
  const [elapsed, setElapsed] = useState(0);
  const [extraCost, setExtraCost] = useState("");

  // O alarme persistente é controlado globalmente; este timer acompanha
  // somente o tempo aguardando resposta no cartão atual.
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
      className={`rounded-2xl border-2 mb-5 overflow-hidden animate-alert-slide ${
        isUrgent
          ? "border-destructive bg-destructive/10 animate-alert-flash"
          : "border-primary bg-primary/5"
      }`}
    >
      {/* Cabeçalho piscante */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          isUrgent
          ? "bg-destructive text-destructive-foreground animate-alert-blink"
          : "bg-primary text-primary-foreground"
        }`}
      >
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 animate-bounce" />
          <span className="font-heading font-bold text-sm">
            {isUrgent ? "⚠️ URGENTE — RESPONDA!" : "Nova solicitação!"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{formatElapsed(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Corpo */}
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-bold text-foreground">Cliente: {clientNameFromRequest(request)}</p>
          <p className="font-heading font-semibold text-base text-foreground">
            {request.service_type}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3.5 h-3.5" /> {request.address}
          </p>
        </div>

        {hasCarKey && request.vehicle_info && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Veículo</p>
            <p className="text-sm font-semibold text-foreground">{request.vehicle_info}</p>
          </div>
        )}

        <KeyTechnicalDetails description={request.description} request={request} />

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
          <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/15 p-2 rounded-lg animate-alert-blink">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>A solicitação pode expirar — aceite ou recuse o mais rápido possível!</span>
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
          <button
            onClick={handleAccept}
            className="flex-1 h-12 rounded-xl bg-success text-success-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-success/90 active:scale-95 transition-all shadow-lg shadow-success/30"
          >
            <Check className="w-5 h-5" /> Aceitar
          </button>
          <button
            onClick={onReject}
            className="flex-1 h-12 rounded-xl border-2 border-border bg-card text-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-accent active:scale-95 transition-all"
          >
            <X className="w-5 h-5" /> Recusar
          </button>
        </div>
      </div>
    </div>
  );
}