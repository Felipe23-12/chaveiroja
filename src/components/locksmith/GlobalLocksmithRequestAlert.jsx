import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Bell, Check, X, MapPin, Clock, AlertCircle, Volume2, VolumeX, Wrench } from "lucide-react";

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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

/**
 * Alerta global flutuante: aparece em qualquer tela do chaveiro quando há
 * solicitações pendentes (status "ringing") direcionadas a ele. Permite
 * aceitar ou recusar sem precisar estar no Painel do Chaveiro.
 */
export default function GlobalLocksmithRequestAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locksmithId, setLocksmithId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [accepting, setAccepting] = useState(null);
  const mutedRef = useRef(false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const isChaveiro = accountType === "chaveiro";

  // Encontra o perfil do chaveiro pelo created_by_id
  useEffect(() => {
    if (!isChaveiro || !user?.id) return;
    base44.entities.Locksmith
      .filter({ created_by_id: user.id })
      .then((list) => {
        if (list.length > 0) setLocksmithId(list[0].id);
      })
      .catch(() => {});
  }, [isChaveiro, user?.id]);

  // Assina solicitações pendentes (status ringing) direcionadas ao chaveiro
  useEffect(() => {
    if (!locksmithId) return;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ locksmith_id: locksmithId, status: "ringing" }, "-created_date")
        .then((list) => setRequests(list))
        .catch(() => {});
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [locksmithId]);

  // Som + vibração enquanto houver solicitações pendentes
  useEffect(() => {
    if (requests.length === 0) return;
    playBeep();
    setTimeout(playBeep, 250);
    setTimeout(playBeep, 500);
    if (navigator.vibrate) navigator.vibrate([400, 200, 400]);

    const soundTimer = setInterval(() => {
      if (mutedRef.current) return;
      playBeep();
      setTimeout(playBeep, 250);
      setTimeout(playBeep, 500);
    }, 5000);

    let vibrateTimer;
    if (navigator.vibrate) {
      vibrateTimer = setInterval(() => {
        if (!mutedRef.current) navigator.vibrate([400, 200, 400]);
      }, 5000);
    }

    return () => {
      clearInterval(soundTimer);
      if (vibrateTimer) clearInterval(vibrateTimer);
    };
  }, [requests.length > 0]);

  const handleAccept = async (reqId, extra = 0) => {
    setAccepting(reqId);
    try {
      const req = requests.find((r) => r.id === reqId);
      if (!req) return;
      const newPrice = Math.round(((req.price || 0) + extra) * 100) / 100;
      await base44.entities.ServiceRequest.update(reqId, {
        status: "accepted",
        accepted_at: new Date().toISOString(),
        price: newPrice,
        extra_cost: extra,
      });
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
      navigate("/painel-chaveiro");
    } catch (e) {
      // erro silencioso
    } finally {
      setAccepting(null);
    }
  };

  const handleReject = async (reqId) => {
    setAccepting(reqId);
    try {
      await base44.entities.ServiceRequest.update(reqId, { status: "cancelled" });
      setRequests((prev) => prev.filter((r) => r.id !== reqId));
    } catch (e) {
      // erro silencioso
    } finally {
      setAccepting(null);
    }
  };

  if (!isChaveiro || requests.length === 0) return null;

  const primary = requests[0];
  const isUrgent = true; // sempre chama atenção enquanto pendente

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] md:left-64 animate-alert-slide">
      <div
        className={`mx-2 mt-2 rounded-2xl border-2 shadow-2xl overflow-hidden ${
          isUrgent ? "border-red-500 bg-red-50 animate-alert-flash" : "border-primary bg-primary/5"
        }`}
      >
        {/* Cabeçalho */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 ${
            isUrgent ? "bg-red-500 text-white animate-alert-blink" : "bg-primary text-primary-foreground"
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 animate-bounce" />
            <span className="font-heading font-bold text-sm">
              {requests.length === 1 ? "Nova solicitação!" : `${requests.length} solicitações!`}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setMuted((m) => !m)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title={muted ? "Ativar som" : "Silenciar"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setExpanded((e) => !e)}
              className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
              title={expanded ? "Recolher" : "Expandir"}
            >
              {expanded ? <X className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Corpo */}
        {expanded && (
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {requests.map((req, idx) => (
              <RequestCard
                key={req.id}
                request={req}
                onAccept={handleAccept}
                onReject={handleReject}
                accepting={accepting === req.id}
                showDivider={idx > 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({ request, onAccept, onReject, accepting, showDivider }) {
  const [extraCost, setExtraCost] = useState("");
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - start) / 1000), 1000);
    return () => clearInterval(timer);
  }, [request.id]);

  const isUrgent = elapsed > 30;
  const hasCarKey = request.key_value != null;

  const handleAccept = () => {
    const extra = Number(extraCost) || 0;
    onAccept(request.id, extra);
  };

  return (
    <div className={showDivider ? "pt-3 border-t border-border" : ""}>
      <div className="flex items-start gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Wrench className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-sm text-foreground">
            {request.service_type}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3 shrink-0" /> {request.address}
          </p>
        </div>
        <div className={`flex items-center gap-1 text-xs font-medium ${isUrgent ? "text-red-600" : "text-muted-foreground"}`}>
          <Clock className="w-3 h-3" />
          <span className="tabular-nums">{formatElapsed(elapsed)}</span>
        </div>
      </div>

      {/* Resumo financeiro */}
      <div className="bg-card rounded-lg p-2.5 border border-border mb-2">
        {hasCarKey ? (
          <div className="space-y-0.5 text-xs">
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
            <div className="flex justify-between border-t border-border pt-1 mt-1">
              <span className="font-semibold text-foreground">Total</span>
              <span className="font-bold text-foreground">R$ {request.price?.toFixed(2)}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Valor do serviço</span>
            <span className="font-heading font-bold text-base text-foreground">
              R$ {request.price?.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {isUrgent && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-100 p-2 rounded-lg mb-2 animate-alert-blink">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Responda rápido — a solicitação pode expirar!</span>
        </div>
      )}

      {/* Custos adicionais */}
      <div className="mb-2.5">
        <label className="text-xs text-muted-foreground">Custos adicionais (opcional)</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={extraCost}
          onChange={(e) => setExtraCost(e.target.value)}
          placeholder="R$ 0,00"
          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-sm"
        />
      </div>

      {/* Botões de ação — grandes e responsivos */}
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/30"
        >
          {accepting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Aceitando...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Aceitar
            </>
          )}
        </button>
        <button
          onClick={() => onReject(request.id)}
          disabled={accepting}
          className="h-12 px-4 rounded-xl border-2 border-border bg-card text-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-accent active:scale-95 transition-all disabled:opacity-50"
        >
          <X className="w-5 h-5" />
          Recusar
        </button>
      </div>
    </div>
  );
}