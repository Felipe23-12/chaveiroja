import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Bell, Check, X, MapPin, Clock, AlertCircle, Volume2, VolumeX, Wrench, ChevronUp } from "lucide-react";

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
 * Botão flutuante de acesso rápido: aparece sobre qualquer tela do chaveiro
 * quando há solicitações pendentes (status "ringing"). Compacto por padrão
 * (não interrompe o mapa); expande em um card para aceitar/recusar.
 */
export default function GlobalLocksmithRequestAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [locksmithId, setLocksmithId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
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

  // Abre automaticamente quando chega a primeira solicitação
  useEffect(() => {
    if (requests.length > 0) setOpen(true);
  }, [requests.length > 0]);

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

  return (
    <>
      {/* Card expandido — flutua acima do botão, sem ocupar a tela toda */}
      {open && (
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-96 z-[60] animate-alert-slide">
          <div className="rounded-2xl border-2 border-red-500 bg-card shadow-2xl overflow-hidden animate-alert-flash">
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-red-500 text-white animate-alert-blink">
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
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  title="Recolher"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Corpo */}
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
          </div>
        </div>
      )}

      {/* Botão flutuante compacto — sempre visível quando há solicitações */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 pl-3 pr-4 h-12 rounded-full bg-red-500 text-white font-bold text-sm shadow-2xl shadow-red-500/40 hover:bg-red-600 active:scale-95 transition-all animate-alert-blink"
        >
          <div className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-white text-red-600 text-[10px] font-bold flex items-center justify-center border-2 border-red-500">
              {requests.length}
            </span>
          </div>
          <span>Solicitação{requests.length > 1 ? "s" : ""}</span>
        </button>
      )}
    </>
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
      <div className="bg-muted/50 rounded-lg p-2.5 border border-border mb-2">
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
        <div className="flex items-center gap-1.5 text-xs text-red-600 bg-red-100 dark:bg-red-950/40 p-2 rounded-lg mb-2 animate-alert-blink">
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
          className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
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
          className="h-12 px-4 rounded-xl border-2 border-border bg-background text-foreground font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-accent active:scale-95 transition-all disabled:opacity-50"
        >
          <X className="w-5 h-5" />
          Recusar
        </button>
      </div>
    </div>
  );
}