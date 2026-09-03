import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, X, MapPin, Clock, AlertCircle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Alerta sonoro curto via Web Audio
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // silencioso
  }
}

export default function IncomingRequestAlert({ request, onAccept, onReject }) {
  const [elapsed, setElapsed] = useState(0);
  const [extraCost, setExtraCost] = useState("");
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Timer + som repetitivo + vibração enquanto a solicitação está pendente
  useEffect(() => {
    if (!request) return;
    setElapsed(0);
    setExtraCost("");
    const start = Date.now();

    const timer = setInterval(() => {
      setElapsed((Date.now() - start) / 1000);
    }, 1000);

    // Som repetitivo: 3 bipes a cada 5 segundos (fica mais rápido após 30s)
    const soundTimer = setInterval(() => {
      if (mutedRef.current) return;
      playBeep();
      setTimeout(playBeep, 250);
      setTimeout(playBeep, 500);
    }, 5000);

    // Vibração no celular: padrão repetitivo
    let vibrateTimer;
    if (navigator.vibrate) {
      navigator.vibrate([400, 200, 400]);
      vibrateTimer = setInterval(() => {
        if (!mutedRef.current) navigator.vibrate([400, 200, 400]);
      }, 5000);
    }

    return () => {
      clearInterval(timer);
      clearInterval(soundTimer);
      if (vibrateTimer) clearInterval(vibrateTimer);
    };
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
          ? "border-red-500 bg-red-50 animate-alert-flash"
          : "border-primary bg-primary/5"
      }`}
    >
      {/* Cabeçalho piscante */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${
          isUrgent
            ? "bg-red-500 text-white animate-alert-blink"
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
          <button
            onClick={() => setMuted((m) => !m)}
            className="p-1 rounded hover:bg-white/20 transition-colors"
            title={muted ? "Ativar som" : "Silenciar"}
          >
            <Volume2 className={`w-4 h-4 ${muted ? "opacity-40" : ""}`} />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span className="tabular-nums">{formatElapsed(elapsed)}</span>
          </div>
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
          <div className="flex items-center gap-2 text-xs text-red-600 bg-red-100 p-2 rounded-lg animate-alert-blink">
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
            className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
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