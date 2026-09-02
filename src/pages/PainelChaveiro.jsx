import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, Bell, Check, X, Navigation, Power, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MapView from "@/components/map/MapView";
import PhotoUploader from "@/components/locksmith/PhotoUploader";
import WalletCard from "@/components/locksmith/WalletCard";
import WithdrawalSection from "@/components/locksmith/WithdrawalSection";
import IncomingRequestAlert from "@/components/locksmith/IncomingRequestAlert";
import PendingRequestsList from "@/components/locksmith/PendingRequestsList";
import { useToast } from "@/components/ui/use-toast";
import { haversineKm, stepToward } from "@/lib/geo";

// Raio de cobertura para considerar um pedido "na região" do chaveiro (km)
const REGION_RADIUS_KM = 15;

// Alerta sonoro curto via Web Audio (não depende de arquivos externos)
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
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // silencioso se o navegador bloquear áudio
  }
}

export default function PainelChaveiro() {
  const [locksmiths, setLocksmiths] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [me, setMe] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]); // solicitações aguardando aceitação
  const [active, setActive] = useState(null); // serviço em andamento
  const [arrived, setArrived] = useState(false);
  const [startPhotos, setStartPhotos] = useState([]);
  const [endPhotos, setEndPhotos] = useState([]);
  const moveTimer = useRef(null);
  const notifiedIds = useRef(new Set());
  const { toast } = useToast();

  const selected = locksmiths.find((l) => l.id === selectedId) || me;

  // Carrega chaveiros e assina atualizações do selecionado
  useEffect(() => {
    base44.entities.Locksmith.list().then((list) => {
      setLocksmiths(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    base44.entities.Locksmith.get(selectedId).then(setMe);
    const unsub = base44.entities.Locksmith.subscribe((event) => {
      if (event.data?.id === selectedId) base44.entities.Locksmith.get(selectedId).then(setMe);
    });
    return unsub;
  }, [selectedId]);

  // Escuta "toques" (status ringing) direcionados a este chaveiro (modo app)
  useEffect(() => {
    if (!selectedId) return;
    const load = () =>
      base44.entities.ServiceRequest.filter({ locksmith_id: selectedId, status: "ringing" }, "-created_date").then(
        (list) => setPendingRequests(list)
      );
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [selectedId]);

  // Notificação imediata de novos pedidos: prioritária para solicitações
  // recebidas no modo aplicativo (direcionadas ao chaveiro) e de proximidade
  // para pedidos na região não direcionados a ele.
  useEffect(() => {
    if (!selectedId || !me) return;
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      const r = event.data;
      if (!r || notifiedIds.current.has(r.id)) return;

      if (r.locksmith_id === selectedId) {
        // Solicitação direcionada: só notifica após o pagamento (status ringing)
        if (r.status !== "ringing") return;
        notifiedIds.current.add(r.id);
        playBeep();
        setTimeout(playBeep, 600);
        setTimeout(playBeep, 1200);
        toast({
          title: "🔔 Nova solicitação para você!",
          description: `${r.service_type} · ${r.address}`,
        });
        return;
      }

      // Alerta de proximidade: apenas novos pedidos com status searching
      if (event.type !== "create") return;
      if (r.status !== "searching") return;
      const dist = haversineKm(
        { lat: me.lat, lng: me.lng },
        { lat: r.customer_lat, lng: r.customer_lng }
      );
      if (dist > REGION_RADIUS_KM) return;
      notifiedIds.current.add(r.id);
      playBeep();
      toast({
        title: "🔔 Novo pedido na sua região",
        description: `${r.service_type} · ${r.address} · ${dist.toFixed(1)} km de você`,
      });
    });
    return unsub;
  }, [selectedId, me]);

  // Assina o serviço em andamento deste chaveiro (aceito / a caminho)
  useEffect(() => {
    if (!selectedId) return;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ locksmith_id: selectedId }, "-created_date")
        .then((list) => {
          const ongoing = list.find((r) => r.status === "accepted" || r.status === "on_the_way");
          setActive(ongoing || null);
        });
    load();
    const unsub = base44.entities.ServiceRequest.subscribe(() => load());
    return unsub;
  }, [selectedId]);

  // Reseta estado de chegada e sincroniza fotos ao mudar de serviço ativo
  useEffect(() => {
    setArrived(false);
    setStartPhotos(active?.start_photos || []);
    setEndPhotos(active?.end_photos || []);
  }, [active?.id]);

  // Simula o deslocamento do chaveiro até o cliente
  useEffect(() => {
    if (!active || active.status === "completed") {
      if (moveTimer.current) clearInterval(moveTimer.current);
      return;
    }
    moveTimer.current = setInterval(async () => {
      const fresh = await base44.entities.ServiceRequest.get(active.id);
      const dest = { lat: fresh.customer_lat, lng: fresh.customer_lng };
      const cur = { lat: fresh.locksmith_lat, lng: fresh.locksmith_lng };
      const dist = haversineKm(cur, dest);
      if (dist < 0.05) {
        setArrived(true);
        if (moveTimer.current) clearInterval(moveTimer.current);
        return;
      }
      const next = stepToward(cur, dest, 0.12);
      await base44.entities.ServiceRequest.update(active.id, {
        status: "on_the_way",
        locksmith_lat: next.lat,
        locksmith_lng: next.lng,
      });
    }, 1500);
    return () => moveTimer.current && clearInterval(moveTimer.current);
  }, [active?.id]);

  const toggleOnline = async () => {
    if (!me) return;
    await base44.entities.Locksmith.update(me.id, { online: !me.online });
  };

  const handleAccept = async (reqId, extra = 0) => {
    const req = pendingRequests.find((r) => r.id === reqId);
    if (!req || !me) return;
    const newPrice = Math.round(((req.price || 0) + extra) * 100) / 100;
    await base44.entities.ServiceRequest.update(reqId, {
      status: "accepted",
      accepted_at: new Date().toISOString(),
      locksmith_lat: me.lat,
      locksmith_lng: me.lng,
      price: newPrice,
      extra_cost: extra,
    });
  };

  const handleReject = async (reqId) => {
    const req = pendingRequests.find((r) => r.id === reqId);
    if (!req) return;
    await base44.entities.ServiceRequest.update(reqId, { status: "cancelled" });
  };

  const handleConfirmStart = async () => {
    if (!active || !startPhotos.length) return;
    await base44.entities.ServiceRequest.update(active.id, { start_photos: startPhotos });
  };

  const handleFinish = async () => {
    if (!active || !endPhotos.length) return;
    await base44.entities.ServiceRequest.update(active.id, {
      end_photos: endPhotos,
      status: "completed",
    });
  };

  const isAppMode = me?.work_mode === "app";
  const ring = pendingRequests[0] || null;
  const pendingCount = pendingRequests.length;
  const startDone = (active?.start_photos?.length || 0) > 0;
  const phase = !active
    ? "moving"
    : active.status === "completed"
    ? "completed"
    : startDone
    ? "finishing"
    : arrived
    ? "arrived"
    : "moving";
  const phaseLabel =
    phase === "moving"
      ? "A caminho do cliente"
      : phase === "arrived"
      ? "Chegou no local!"
      : phase === "finishing"
      ? "Em atendimento"
      : "Serviço concluído";

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 md:py-10 ${pendingCount > 0 && isAppMode ? "pt-14 md:pt-14" : ""}`}>
      {/* Banner fixo piscante no topo quando há solicitações pendentes */}
      {pendingCount > 0 && isAppMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 text-sm font-bold animate-alert-blink shadow-lg md:left-64">
          <Bell className="w-4 h-4 inline mr-2 animate-bounce" />
          {pendingCount === 1 ? "1 solicitação aguardando resposta!" : `${pendingCount} solicitações aguardando resposta!`}
        </div>
      )}

      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-2xl text-foreground">Painel do Chaveiro</h1>
          <p className="text-sm text-muted-foreground">Receba solicitações e atenda em tempo real</p>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-bold animate-pulse">
            <Bell className="w-4 h-4" />
            {pendingCount}
          </div>
        )}
      </div>

      {/* Seleção de perfil */}
      <div className="space-y-1.5 mb-5">
        <Label>Selecione seu perfil</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="Escolha um chaveiro" /></SelectTrigger>
          <SelectContent>
            {locksmiths.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.name} · {l.work_mode === "livre" ? "Livre" : "App"}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {me && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card mb-5">
          <div>
            <p className="font-medium text-foreground">{me.name}</p>
            <p className="text-xs text-muted-foreground">
              Modo {me.work_mode === "livre" ? "Livre" : "Aplicativo"} ·{" "}
              <span className={me.online ? "text-emerald-600" : "text-muted-foreground"}>
                {me.online ? "Online" : "Offline"}
              </span>
            </p>
          </div>
          <Button onClick={toggleOnline} variant={me.online ? "destructive" : "default"} size="sm">
            <Power className="w-4 h-4 mr-1.5" /> {me.online ? "Sair" : "Entrar"}
          </Button>
        </div>
      )}

      {/* Carteira e saque — modo app */}
      {me && isAppMode && (
        <div className="mb-5">
          <WalletCard
            balance={me.wallet_balance}
            pending={me.pending_balance}
            onWithdraw={() => document.getElementById("withdrawal-section")?.scrollIntoView({ behavior: "smooth" })}
          />
          <div id="withdrawal-section" className="mt-3">
            <WithdrawalSection
              locksmith={me}
              onWithdrawalMade={() => base44.entities.Locksmith.get(selectedId).then(setMe)}
            />
          </div>
        </div>
      )}

      {/* Fila de solicitações pendentes — modo app */}
      {pendingCount > 0 && isAppMode && (
        <PendingRequestsList
          requests={pendingRequests}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* Serviço em andamento */}
      {active ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Navigation className="w-4 h-4" />
              <p className="font-medium">{phaseLabel}</p>
            </div>
            <p className="text-sm text-foreground">{active.service_type}</p>
            <p className="text-xs text-muted-foreground">{active.address}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: <span className="font-medium text-foreground">
                {phase === "arrived" ? "No local" : phase === "finishing" ? "Em atendimento" : active.status === "accepted" ? "Aceito" : active.status === "on_the_way" ? "A caminho" : "Concluído"}
              </span>
            </p>
          </div>

          {phase === "moving" && (
            <MapView
              center={{ lat: active.customer_lat, lng: active.customer_lng }}
              height={320}
              markers={[
                { id: "c", lat: active.customer_lat, lng: active.customer_lng, type: "customer", label: "Cliente" },
                { id: "l", lat: active.locksmith_lat, lng: active.locksmith_lng, type: "locksmith", label: "Você", active: active.status === "on_the_way" },
              ]}
              route={
                active.status !== "completed"
                  ? { from: { lat: active.locksmith_lat, lng: active.locksmith_lng }, to: { lat: active.customer_lat, lng: active.customer_lng } }
                  : null
              }
            />
          )}

          {phase === "arrived" && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <p className="text-sm font-medium text-foreground">Registre as fotos do início do serviço</p>
              <PhotoUploader
                label="Fotos da chegada no local"
                photos={startPhotos}
                onChange={setStartPhotos}
              />
              <Button onClick={handleConfirmStart} disabled={!startPhotos.length} className="w-full">
                <Check className="w-4 h-4 mr-1.5" /> Confirmar início do atendimento
              </Button>
            </div>
          )}

          {phase === "finishing" && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-3">
              <p className="text-sm font-medium text-foreground">Registre as fotos do final do serviço</p>
              <PhotoUploader
                label="Fotos do serviço finalizado"
                photos={endPhotos}
                onChange={setEndPhotos}
              />
              <Button onClick={handleFinish} disabled={!endPhotos.length} className="w-full">
                <Check className="w-4 h-4 mr-1.5" /> Finalizar serviço
              </Button>
            </div>
          )}

          {active.status === "completed" && (
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
              <Check className="w-5 h-5" /> Serviço concluído!
            </div>
          )}
        </div>
      ) : (
        pendingCount === 0 && (
          <div className="text-center py-12 rounded-xl border border-dashed border-border">
            {isAppMode ? (
              <>
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {me?.online ? "Aguardando solicitações..." : "Fique online para receber solicitações."}
                </p>
              </>
            ) : (
              <>
                <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No Modo Livre você aparece no mapa dos clientes e negocia pelo chat.
                </p>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}