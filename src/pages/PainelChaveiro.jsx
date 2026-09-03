import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Wrench, Bell, Check, X, Navigation, Power, Loader2, MapPin, WifiOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import NativeSelectDrawer from "@/components/ui/NativeSelectDrawer";
import { usePullToRefresh, PullToRefreshIndicator } from "@/components/ui/PullToRefresh";
import MapView from "@/components/map/MapView";
import LivreModeDashboard, { LivreModeLocked } from "@/components/locksmith/LivreModeDashboard";
import LocksmithChatConversations from "@/components/locksmith/LocksmithChatConversations";
import PhotoUploader from "@/components/locksmith/PhotoUploader";
import WalletCard from "@/components/locksmith/WalletCard";
import WithdrawalSection from "@/components/locksmith/WithdrawalSection";
import StripeConnectSetup from "@/components/locksmith/StripeConnectSetup";
import IncomingRequestAlert from "@/components/locksmith/IncomingRequestAlert";
import PendingRequestsList from "@/components/locksmith/PendingRequestsList";
import NearbyRequestsList from "@/components/locksmith/NearbyRequestsList";
import { useToast } from "@/components/ui/use-toast";
import DarkModeToggle from "@/components/DarkModeToggle";
import { haversineKm, stepToward, fetchDrivingRoute, etaMinutes, getCustomerLocation } from "@/lib/geo";
import { SERVICE_CATALOG } from "@/lib/pricing";
import { confirmCashReceived } from "@/lib/payments";
import { saveLastService, getLastService, clearLastService, saveLocksmithProfile, getLocksmithProfile, isOnline, saveLastRoute, getLastRoute, savePendingRequests, getPendingRequests } from "@/lib/offlineCache";
import LoadingCard from "@/components/ui/LoadingCard";

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
  const navigate = useNavigate();
  const [locksmiths, setLocksmiths] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [me, setMe] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]); // solicitações aguardando aceitação
  const [active, setActive] = useState(null); // serviço em andamento
  const [arrived, setArrived] = useState(false);
  const [startPhotos, setStartPhotos] = useState([]);
  const [endPhotos, setEndPhotos] = useState([]);
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [online, setOnline] = useState(isOnline());
  const moveTimer = useRef(null);
  const notifiedIds = useRef(new Set());
  const { toast } = useToast();

  const selected = locksmiths.find((l) => l.id === selectedId) || me;

  // Monitora status da conexão (online/offline)
  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Carrega chaveiros e assina atualizações do selecionado
  useEffect(() => {
    base44.entities.Locksmith.list().then((list) => {
      setLocksmiths(list);
      if (list.length && !selectedId) setSelectedId(list[0].id);
    });
  }, []);

  // Onboarding: cria o perfil do chaveiro após cadastro (sem confirmação por email)
  useEffect(() => {
    const raw = sessionStorage.getItem("chaveiro_onboarding");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem("chaveiro_onboarding");
      // Garante que o usuário permaneça identificado como CHAVEIRO.
      // O perfil é atualizado antes de criar/usar os dados profissionais.
      base44.auth.updateMe({
        phone: data.phone,
        cpf: data.cpf,
        full_name: data.fullName,
        account_type: "chaveiro",
      }).catch((err) => {
        console.error("Falha ao atualizar tipo da conta do chaveiro", err);
      });
      base44.entities.Locksmith.create({
        name: data.fullName,
        specialty: data.specialty,
        vehicle: data.vehicle,
        bio: data.bio,
        phone: data.phone,
        work_mode: "app",
        available: true,
        online: false,
      }).then(() => {
        base44.entities.Locksmith.list().then((list) => {
          setLocksmiths(list);
          const mine = list.find((l) => l.name === data.fullName);
          if (mine) setSelectedId(mine.id);
        });
      }).catch(() => {});
    } catch (e) {
      /* dados inválidos — ignora */
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    base44.entities.Locksmith.get(selectedId)
      .then((data) => {
        setMe(data);
        saveLocksmithProfile(data);
      })
      .catch(() => {
        // Offline: usa perfil em cache
        const cached = getLocksmithProfile(selectedId);
        if (cached) setMe(cached);
      });
    const unsub = base44.entities.Locksmith.subscribe((event) => {
      if (event.data?.id === selectedId)
        base44.entities.Locksmith.get(selectedId)
          .then((data) => {
            setMe(data);
            saveLocksmithProfile(data);
          })
          .catch(() => {});
    });
    return unsub;
  }, [selectedId]);

  // Escuta "toques" (status ringing) direcionados a este chaveiro (modo app)
  useEffect(() => {
    if (!selectedId) return;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ locksmith_id: selectedId, status: "ringing" }, "-created_date")
        .then((list) => {
          setPendingRequests(list);
          savePendingRequests(list);
        })
        .catch(() => {
          // Offline: exibe fila em cache
          if (!isOnline()) setPendingRequests(getPendingRequests());
        });
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

      // Se o chaveiro desativou solicitações do modo app, ignora alertas de proximidade
      if (me.receive_app_requests === false) return;

      // Alerta de proximidade: apenas novos pedidos com status searching
      if (event.type !== "create") return;
      if (r.status !== "searching") return;

      // Filtra por especialidade: só alerta se o chaveiro atende o serviço
      const svc = SERVICE_CATALOG.find((s) => s.label === r.service_type);
      if (svc) {
        if (me.services && me.services.length > 0) {
          if (!me.services.includes(svc.id)) return;
        } else {
          const mySpecialties = me.specialties && me.specialties.length > 0 ? me.specialties : [me.specialty];
          if (!mySpecialties.includes(svc.specialty)) return;
        }
      }

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

  // Busca a rota de carro entre o chaveiro e o cliente (OSRM) — com cache offline
  useEffect(() => {
    if (!active || !active.locksmith_lat || !active.customer_lat) {
      setRoutePath(null);
      setRouteEta(null);
      return;
    }
    const from = { lat: active.locksmith_lat, lng: active.locksmith_lng };
    const to = { lat: active.customer_lat, lng: active.customer_lng };
    setRoutePath(null);
    setRouteEta(null);
    fetchDrivingRoute(from, to)
      .then((r) => {
        if (r) {
          setRoutePath(r.coordinates);
          setRouteEta(etaMinutes(r.duration));
          saveLastRoute(r.coordinates, etaMinutes(r.duration));
        }
      })
      .catch(() => {
        // Offline: usa a última rota em cache para navegação
        if (!isOnline()) {
          const cached = getLastRoute();
          if (cached?.routePath) {
            setRoutePath(cached.routePath);
            setRouteEta(cached.eta);
          }
        }
      });
  }, [active?.id, active?.locksmith_lat, active?.locksmith_lng, active?.customer_lat, active?.customer_lng]);

  // Assina o serviço em andamento deste chaveiro (aceito / a caminho)
  useEffect(() => {
    if (!selectedId) return;
    const load = () =>
      base44.entities.ServiceRequest
        .filter({ locksmith_id: selectedId }, "-created_date")
        .then((list) => {
          const ongoing = list.find((r) =>
            r.status === "accepted" ||
            r.status === "on_the_way" ||
            r.status === "completed"
          );
          if (ongoing) {
            saveLastService(ongoing);
            setActive(ongoing);
          } else {
            clearLastService();
            setActive(null);
          }
          // Notifica quando o cliente seleciona pagamento em dinheiro (aguardando confirmação)
          if (ongoing?.payment_method === "dinheiro" && !ongoing?.cash_received) {
            const notifyKey = `cash_${ongoing.id}`;
            if (!notifiedIds.current.has(notifyKey)) {
              notifiedIds.current.add(notifyKey);
              playBeep();
              toast({
                title: "💵 Pagamento em dinheiro",
                description: "Confirme o recebimento de R$ " + ongoing.price?.toFixed(2),
              });
            }
          }
          // Notifica quando o pagamento é confirmado (libera a finalização)
          if (ongoing?.payment_status === "paid" && ongoing?.status !== "completed") {
            const notifyKey = `paid_${ongoing.id}`;
            if (!notifiedIds.current.has(notifyKey)) {
              notifiedIds.current.add(notifyKey);
              playBeep();
              toast({
                title: "💰 Pagamento confirmado!",
                description: "Você já pode finalizar o serviço.",
              });
            }
          }
        })
        .catch(() => {
          // Offline: mantém o último serviço em cache para visualização
          const cached = getLastService();
          if (cached) setActive(cached);
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
    if (!me.online) {
      // Ao ficar online, captura a localização real via GPS
      const loc = await getCustomerLocation();
      await base44.entities.Locksmith.update(me.id, {
        online: true,
        lat: loc.lat,
        lng: loc.lng,
      });
      toast({
        title: "Você está online",
        description: "Localização atualizada via GPS.",
      });
    } else {
      await base44.entities.Locksmith.update(me.id, { online: false });
    }
  };

  // Rastreia a localização real do chaveiro enquanto online (GPS contínuo)
  useEffect(() => {
    if (!me || !me.online || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const dist = haversineKm({ lat: me.lat, lng: me.lng }, { lat: newLat, lng: newLng });
        // Só atualiza no banco se moveu mais de 50 metros
        if (dist > 0.05) {
          base44.entities.Locksmith.update(me.id, { lat: newLat, lng: newLng });
        }
      },
      () => { /* silencioso */ },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [me?.id, me?.online]);

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

  // Registra as fotos do final do serviço — sinaliza ao cliente que o trabalho acabou
  // e libera a etapa de pagamento. O serviço ainda NÃO é concluído aqui.
  const handleRegisterEnd = async () => {
    if (!active || !endPhotos.length) return;
    await base44.entities.ServiceRequest.update(active.id, { end_photos: endPhotos });
  };

  // Finaliza o serviço — só permitido após o pagamento do cliente ser confirmado.
  const handleFinish = async () => {
    if (!active || active.payment_status !== "paid") return;
    await base44.entities.ServiceRequest.update(active.id, { status: "completed" });
  };

  // Chaveiro confirma que recebeu o pagamento em dinheiro
  const handleConfirmCash = async () => {
    if (!active || !me) return;
    try {
      await confirmCashReceived({ serviceRequestId: active.id, locksmithId: me.id, amount: active.price });
      toast({
        title: "Recebimento confirmado",
        description: "Pagamento em dinheiro registrado. A comissão será descontada do próximo pagamento via app.",
      });
    } catch (e) {
      toast({ title: "Erro", description: e.message || "Falha ao confirmar recebimento", variant: "destructive" });
    }
  };

  const handleRefresh = async () => {
    try {
      const list = await base44.entities.Locksmith.list();
      setLocksmiths(list);
      if (selectedId) {
        await base44.entities.ServiceRequest
          .filter({ locksmith_id: selectedId, status: "ringing" }, "-created_date")
          .then(setPendingRequests)
          .catch(() => {});
      }
    } catch (e) { /* ignora */ }
  };

  const { pull, refreshing } = usePullToRefresh(handleRefresh);

  const isAppMode = me?.work_mode === "app";
  const ring = pendingRequests[0] || null;
  const pendingCount = pendingRequests.length;
  const startDone = (active?.start_photos?.length || 0) > 0;
  const endDone = (active?.end_photos?.length || 0) > 0;
  const paid = active?.payment_status === "paid";
  const phase = !active
    ? "moving"
    : active.status === "completed"
    ? "completed"
    : endDone
    ? (paid ? "ready_to_finish" : "awaiting_payment")
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
      : phase === "awaiting_payment"
      ? "Aguardando pagamento"
      : phase === "ready_to_finish"
      ? "Pagamento confirmado"
      : "Serviço concluído";

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 md:py-10 ${pendingCount > 0 && isAppMode ? "pt-14 md:pt-14" : ""}`}>
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      {/* Banner fixo piscante no topo quando há solicitações pendentes */}
      {pendingCount > 0 && isAppMode && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white text-center py-2 pt-safe text-sm font-bold animate-alert-blink shadow-lg md:left-64">
          <Bell className="w-4 h-4 inline mr-2 animate-bounce" />
          {pendingCount === 1 ? "1 solicitação aguardando resposta!" : `${pendingCount} solicitações aguardando resposta!`}
        </div>
      )}

      {/* Aviso de modo offline — dados do serviço permanecem visíveis */}
      {!online && (() => {
        const cached = getLastService();
        const syncedAt = cached?._cached_at
          ? new Date(cached._cached_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : null;
        return (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800">
            <WifiOff className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium">
              Sem conexão — exibindo dados do último serviço em cache
              {syncedAt && ` (atualizado às ${syncedAt})`}.
              As atualizações serão sincronizadas quando a internet voltar.
            </p>
          </div>
        );
      })()}

      <div className="flex items-center gap-2 mb-6 fade-in-up">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h1 className="font-heading font-bold text-2xl text-foreground">Painel do Chaveiro</h1>
          <p className="text-sm text-muted-foreground">Receba solicitações e atenda em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-sm font-bold animate-pulse">
              <Bell className="w-4 h-4" />
              {pendingCount}
            </div>
          )}
          <DarkModeToggle />
        </div>
      </div>

      {/* Seleção de perfil */}
      <div className="space-y-1.5 mb-5">
        <Label>Selecione seu perfil</Label>
        <NativeSelectDrawer
          value={selectedId}
          onChange={setSelectedId}
          options={locksmiths.map((l) => ({
            value: l.id,
            label: `${l.name} · ${l.work_mode === "livre" ? "Livre" : "App"}`,
          }))}
          label="Selecione seu perfil"
          placeholder="Escolha um chaveiro"
        />
      </div>

      {!me && selectedId && (
        <LoadingCard label="Carregando seu perfil..." className="mb-5" />
      )}

      {me && (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card mb-5 fade-in-up">
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

      {/* Recebimentos automáticos via Stripe Connect */}
      {me && isAppMode && (
        <div className="mb-5">
          <StripeConnectSetup />
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
        <div className="space-y-4 fade-in-up">
          <div className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Navigation className="w-4 h-4" />
              <p className="font-medium">{phaseLabel}</p>
            </div>
            <p className="text-sm text-foreground">{active.service_type}</p>
            <p className="text-xs text-muted-foreground">{active.address}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: <span className="font-medium text-foreground">
                {phase === "arrived" ? "No local" : phase === "finishing" ? "Em atendimento" : phase === "awaiting_payment" ? "Aguardando pagamento" : phase === "ready_to_finish" ? "Pagamento confirmado" : active.status === "accepted" ? "Aceito" : active.status === "on_the_way" ? "A caminho" : "Concluído"}
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
              routePath={routePath}
              eta={routeEta}
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
              <Button onClick={handleRegisterEnd} disabled={!endPhotos.length} className="w-full">
                <Check className="w-4 h-4 mr-1.5" /> Registrar finalização do serviço
              </Button>
            </div>
          )}

          {phase === "awaiting_payment" && (
            <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="font-medium text-sm">Aguardando pagamento do cliente</p>
              </div>
              <p className="text-xs text-muted-foreground">
                O cliente foi notificado para efetuar o pagamento de <strong className="text-foreground">R$ {active.price?.toFixed(2)}</strong>.
                Após a confirmação, você poderá finalizar o serviço.
              </p>
              {active.payment_method === "dinheiro" && !active.cash_received && (
                <Button onClick={handleConfirmCash} className="w-full">
                  <Check className="w-4 h-4 mr-1.5" /> Recebi em dinheiro (R$ {active.price?.toFixed(2)})
                </Button>
              )}
            </div>
          )}

          {phase === "ready_to_finish" && (
            <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="w-5 h-5" />
                <p className="font-medium text-sm">Pagamento confirmado!</p>
              </div>
              <p className="text-xs text-muted-foreground">Você já pode finalizar o serviço.</p>
              <Button onClick={handleFinish} className="w-full">
                <Check className="w-4 h-4 mr-1.5" /> Finalizar serviço
              </Button>
            </div>
          )}

          {active.status === "completed" && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-border bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Valor do serviço</p>
                <p className="font-heading font-bold text-2xl text-foreground">R$ {active.price?.toFixed(2)}</p>
                {active.payment_method && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Forma de pagamento: <span className="font-medium text-foreground">
                      {active.payment_method === "dinheiro" ? "Dinheiro" :
                       active.payment_method === "credit_card" ? "Cartão de Crédito" :
                       active.payment_method === "debit_card" ? "Cartão de Débito" :
                       active.payment_method === "pix" ? "Pix" : "—"}
                    </span>
                  </p>
                )}
              </div>
              <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Serviço concluído com sucesso!
              </div>
            </div>
          )}
        </div>
      ) : (
        isAppMode ? (
          <>
            {me?.online && (
              <NearbyRequestsList locksmith={me} />
            )}
            {pendingCount === 0 && (
              <div className="text-center py-12 rounded-xl border border-dashed border-border">
                <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {me?.online ? "Aguardando solicitações..." : "Fique online para receber solicitações."}
                </p>
              </div>
            )}
          </>
        ) : me?.monthly_fee_paid ? (
          <LivreModeDashboard
            me={me}
            onUpdateMe={(data) => base44.entities.Locksmith.update(me.id, data).then(setMe)}
          />
        ) : (
          <div className="space-y-5">
            <LivreModeLocked onPay={() => navigate("/modo-trabalho")} />
            <LocksmithChatConversations me={me} />
          </div>
        )
      )}
    </div>
  );
}