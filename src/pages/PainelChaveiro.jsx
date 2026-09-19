import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { fetchMyLocksmith, fetchLocksmithFinancials, mergeLocksmithFinancials, preserveFinancials } from "@/lib/myLocksmith";
import { Wrench, Bell, Check, X, Navigation, Power, Loader2, MapPin, WifiOff, CheckCircle2, Wallet, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePullToRefresh, PullToRefreshIndicator } from "@/components/ui/PullToRefresh";
import LightMap from "@/components/map/LightMap";
import OpenInNavAppsButton from "@/components/map/OpenInNavAppsButton";
import LivreModeDashboard, { LivreModeLocked } from "@/components/locksmith/LivreModeDashboard";
import LocksmithChatConversations from "@/components/locksmith/LocksmithChatConversations";
import PhotoUploader from "@/components/locksmith/PhotoUploader";
import WalletCard from "@/components/locksmith/WalletCard";
import CashReceiptAlert from "@/components/locksmith/CashReceiptAlert";
import WithdrawalSection from "@/components/locksmith/WithdrawalSection";
import MercadoPagoConnectSetup from "@/components/locksmith/MercadoPagoConnectSetup";
import PendingCreditsCard from "@/components/payment/PendingCreditsCard";
import IncomingRequestAlert from "@/components/locksmith/IncomingRequestAlert";
import PendingRequestsList from "@/components/locksmith/PendingRequestsList";
import NearbyRequestsList from "@/components/locksmith/NearbyRequestsList";
import InactivityRevalidationCard from "@/components/locksmith/InactivityRevalidationCard";
import LocksmithScoreCard from "@/components/locksmith/LocksmithScoreCard";
import LocksmithCaseStatus from "@/components/locksmith/LocksmithCaseStatus";
import LocksmithCancellationFlow from "@/components/locksmith/LocksmithCancellationFlow";
import { useToast } from "@/components/ui/use-toast";
import DarkModeToggle from "@/components/DarkModeToggle";
import { haversineKm, stepToward, fetchDrivingRoute, etaMinutes, getPreciseLocation, locationErrorMessage } from "@/lib/geo";
import { SERVICE_CATALOG } from "@/lib/pricing";
import { confirmCashReceived } from "@/lib/payments";
import { saveLastService, getLastService, clearLastService, saveLocksmithProfile, getLocksmithProfile, isOnline, saveLastRoute, getLastRoute, savePendingRequests, getPendingRequests } from "@/lib/offlineCache";
import LoadingCard from "@/components/ui/LoadingCard";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { syncServiceUpdate, flushActionQueue, queuedActionsCount, bindAutoFlush } from "@/lib/offlineActionQueue";
import { playNotificationSound } from "@/lib/notificationSound";
import ServiceStatusBadge, { PHASE_BORDER } from "@/components/locksmith/ServiceStatusBadge";
import ArrivalDeadlineCountdown from "@/components/locksmith/ArrivalDeadlineCountdown";
import UrgencyUpgradeAlert from "@/components/locksmith/UrgencyUpgradeAlert";
import { registerRejection, getRejectBlock, rejectionsToday, DAILY_REJECT_LIMIT } from "@/lib/rejectLimit";
import { isRingingFor, rejectRing, acceptRing } from "@/lib/ringBroadcast";
import UrgentNearbyAlert from "@/components/locksmith/UrgentNearbyAlert";
import GmailConnectCard from "@/components/gmail/GmailConnectCard";
import PartsChecklist from "@/components/locksmith/PartsChecklist";
import { notifyStatusByGmail } from "@/lib/gmailStatusEmail";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import useBlockedUsers from "@/hooks/useBlockedUsers";
import ModerationActions from "@/components/moderation/ModerationActions";
import OpeningConditionCorrection from "@/components/locksmith/OpeningConditionCorrection";
import OpeningChargeSummary from "@/components/client/OpeningChargeSummary";
import KeyTechnicalDetails from "@/components/locksmith/KeyTechnicalDetails";
import QueuedRequestCard from "@/components/locksmith/QueuedRequestCard";
import { filterRingableWhileBusy, getLocksmithQueueState, startNextQueuedRequest } from "@/lib/serviceQueue";
import ClientReviewForm from "@/components/locksmith/ClientReviewForm";
import ClientRatingSummary from "@/components/history/ClientRatingSummary";

// Raio de cobertura para considerar um pedido "na região" do chaveiro (km)
const REGION_RADIUS_KM = 15;

// Distância máxima do endereço do cliente para o chaveiro poder confirmar
// a chegada (100 metros)
const ARRIVAL_RADIUS_KM = 0.1;

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
  const location = useLocation();
  const { user } = useAuth();
  const { blockedIds, loading: blocksLoading } = useBlockedUsers();
  const [locksmiths, setLocksmiths] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [me, setMe] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]); // solicitações aguardando aceitação
  const [active, setActive] = useState(null); // serviço em andamento
  const [queuedRequest, setQueuedRequest] = useState(null); // segundo serviço reservado
  const [arrived, setArrived] = useState(false);
  const [startPhotos, setStartPhotos] = useState([]);
  const [endPhotos, setEndPhotos] = useState([]);
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [online, setOnline] = useState(isOnline());
  const [queuedCount, setQueuedCount] = useState(queuedActionsCount());
  const moveTimer = useRef(null);
  const notifiedIds = useRef(new Set());
  const dismissedCompletedIds = useRef(new Set());
  const promotingQueuedId = useRef(null);
  const { toast } = useToast();
  const [chatFocus, setChatFocus] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [trustScore, setTrustScore] = useState(null);
  const [completedClientReview, setCompletedClientReview] = useState(null);
  const emailedStatus = useRef(new Set());

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

  // Sincronização: envia as atualizações de status feitas offline assim que a
  // conexão voltar (na volta do evento "online" e na abertura do painel).
  useEffect(() => {
    bindAutoFlush((sent) => {
      setQueuedCount(queuedActionsCount());
      toast({
        title: "Atendimento sincronizado",
        description: `${sent} atualização${sent > 1 ? "ões" : ""} enviada${sent > 1 ? "s" : ""} ao servidor.`,
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!online) return;
    flushActionQueue().then((sent) => {
      setQueuedCount(queuedActionsCount());
      if (sent > 0) {
        toast({
          title: "Atendimento sincronizado",
          description: `${sent} atualização${sent > 1 ? "ões" : ""} pendente${sent > 1 ? "s" : ""} enviada${sent > 1 ? "s" : ""}.`,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  // Abre a conversa de chat em tela cheia ao chegar no painel via alerta de mensagem
  useEffect(() => {
    if (location.state?.openChat) {
      setChatFocus(true);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Carrega chaveiros e assina atualizações do selecionado
  useEffect(() => {
    if (!user?.id) return;
    fetchMyLocksmith(user.id).then((mine) => {
      setLocksmiths(mine ? [mine] : []);
      setSelectedId(mine ? mine.id : "");
      setProfileChecked(true);
    });
  }, [user?.id]);

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
      }).then((created) => {
        setLocksmiths([created]);
        setSelectedId(created.id);
        setProfileChecked(true);
      }).catch(() => {});
    } catch (e) {
      /* dados inválidos — ignora */
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const loadMe = () =>
      Promise.all([base44.entities.Locksmith.get(selectedId), fetchLocksmithFinancials(selectedId)])
        .then(([locksmith, financials]) => {
          const merged = mergeLocksmithFinancials(locksmith, financials);
          setMe(merged);
          saveLocksmithProfile(merged);
        })
        .catch(() => {
          // Offline: usa perfil em cache
          const cached = getLocksmithProfile(selectedId);
          if (cached) setMe(cached);
        });
    loadMe();
    const unsub = base44.entities.Locksmith.subscribe((event) => {
      if (event.data?.id === selectedId) loadMe();
    });
    const unsubFinancials = base44.entities.LocksmithFinancials.subscribe((event) => {
      if (event.data?.locksmith_id === selectedId) loadMe();
    });
    const cleanupLocksmith = safeUnsubscribe(unsub);
    const cleanupFinancials = safeUnsubscribe(unsubFinancials);
    return () => {
      cleanupLocksmith();
      cleanupFinancials();
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const load = () => base44.entities.LocksmithScore.filter({ locksmith_id: selectedId }).then((rows) => setTrustScore(rows[0] || null)).catch(() => {});
    load();
    return safeUnsubscribe(base44.entities.LocksmithScore.subscribe(load));
  }, [selectedId]);

  useEffect(() => {
    if (!active) return;
    const heartbeat = () => base44.functions.invoke("serviceTrust", { action: "heartbeat" }).catch(() => {});
    heartbeat();
    const timer = setInterval(heartbeat, 60000);
    return () => clearInterval(timer);
  }, [active?.id]);

  // Escuta "toques" (status ringing) direcionados a este chaveiro (modo app)
  useEffect(() => {
    if (!selectedId) return;
    // O mesmo chamado toca para vários chaveiros próximos ao mesmo tempo;
    // quem recusou volta a receber depois de 2 minutos (regra de rering).
    const load = () =>
      Promise.all([
        base44.entities.ServiceRequest.filter({ ringing_locksmith_ids: selectedId, status: "ringing" }, "-created_date"),
        getLocksmithQueueState(selectedId),
      ])
        .then(([list, queueState]) => {
          const visible = list.filter((r) => !blocksLoading && !blockedIds.has(r.created_by_id) && isRingingFor(r, selectedId));
          const ringing = filterRingableWhileBusy(visible, queueState);
          setPendingRequests(ringing);
          savePendingRequests(ringing);
        })
        .catch(() => {
          // Offline: exibe fila em cache
          if (!isOnline()) setPendingRequests(getPendingRequests());
        });
    load();
    // Reavalia periodicamente para o chamado recusado voltar a tocar no prazo
    const timer = setInterval(load, 15000);
    const unsub = safeUnsubscribe(base44.entities.ServiceRequest.subscribe(() => load()));
    return () => {
      clearInterval(timer);
      unsub();
    };
  }, [selectedId, blockedIds, blocksLoading]);

  // Notificação imediata de novos pedidos: prioritária para solicitações
  // recebidas no modo aplicativo (direcionadas ao chaveiro) e de proximidade
  // para pedidos na região não direcionados a ele.
  useEffect(() => {
    if (!selectedId || !me) return;
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      const r = event.data;
      if (!r || blockedIds.has(r.created_by_id) || notifiedIds.current.has(r.id)) return;

      if ((r.ringing_locksmith_ids || []).includes(selectedId)) {
        // Chamado tocando para este chaveiro (junto com outros próximos)
        if (!isRingingFor(r, selectedId)) return;
        notifiedIds.current.add(r.id);
        playNotificationSound();
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
      if (dist > (me.service_radius_km || REGION_RADIUS_KM)) return;
      notifiedIds.current.add(r.id);
      playNotificationSound();
      toast({
        title: "🔔 Novo pedido na sua região",
        description: `${r.service_type} · ${r.address} · ${dist.toFixed(1)} km de você`,
      });
    });
    return safeUnsubscribe(unsub);
  }, [selectedId, me, blockedIds]);

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
            r.status === "on_the_way"
          );
          const queued = list.find((r) => r.status === "queued") || null;
          setQueuedRequest(queued);
          if (ongoing) {
            saveLastService(ongoing);
            setActive(ongoing);
          } else if (queued && promotingQueuedId.current !== queued.id) {
            promotingQueuedId.current = queued.id;
            startNextQueuedRequest(selectedId, {
              lat: queued.locksmith_lat ?? me?.lat,
              lng: queued.locksmith_lng ?? me?.lng,
            }).then((next) => {
              if (!next) return;
              setQueuedRequest(null);
              saveLastService(next);
              setActive(next);
              toast({ title: "Próxima rota iniciada", description: `Agora siga para ${next.address}.` });
            }).finally(() => {
              promotingQueuedId.current = null;
            });
          } else if (!queued) {
            clearLastService();
            setActive((current) => current?.status === "completed" ? current : null);
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
          // Offline: só restaura do cache se for um serviço realmente em
          // andamento (accepted/on_the_way) e recente (últimas 3h). Isso evita
          // que um serviço antigo concluído/cancelado seja restaurado e faça o
          // mapa do painel piscar e sumir ao recarregar a rede.
          const cached = getLastService();
          if (cached && (cached.status === "accepted" || cached.status === "on_the_way")) {
            const updated = cached.updated_date ? new Date(cached.updated_date).getTime() : 0;
            if (updated && Date.now() - updated < 3 * 60 * 60 * 1000) setActive(cached);
          }
        });
    load();
    const reloadVisible = () => { if (document.visibilityState === "visible" && isOnline()) load(); };
    const unsub = safeUnsubscribe(base44.entities.ServiceRequest.subscribe(() => load()));
    window.addEventListener("focus", reloadVisible);
    window.addEventListener("online", reloadVisible);
    document.addEventListener("visibilitychange", reloadVisible);
    return () => {
      unsub();
      window.removeEventListener("focus", reloadVisible);
      window.removeEventListener("online", reloadVisible);
      document.removeEventListener("visibilitychange", reloadVisible);
    };
  }, [selectedId]);

  // Reseta estado de chegada e sincroniza fotos ao mudar de serviço ativo
  useEffect(() => {
    setArrived(false);
    setStartPhotos(active?.start_photos || []);
    setEndPhotos(active?.end_photos || []);
  }, [active?.id]);

  // Rastreia a posição real do chaveiro via GPS enquanto está a caminho,
  // atualizando o ServiceRequest em tempo real — o cliente acompanha o
  // deslocamento ao vivo, mesmo que o chaveiro navegue com Waze/Maps.
  useEffect(() => {
    if (!active || active.status === "completed" || !navigator.geolocation) return;
    const dest = { lat: active.customer_lat, lng: active.customer_lng };
    // Throttle: o GPS pode disparar várias vezes por segundo; gravar a cada fix
    // satura o banco e estoura o limite de taxa da plataforma. Só gravamos
    // quando o chaveiro moveu >50m E passou >5s desde a última gravação, ou
    // quando chegou ao destino (para marcar a chegada com precisão).
    let lastLat = active.locksmith_lat;
    let lastLng = active.locksmith_lng;
    let lastTime = 0;
    let arrivedFlag = false;
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (arrivedFlag) return;
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const moved = haversineKm({ lat: lastLat, lng: lastLng }, { lat: newLat, lng: newLng });
        const now = Date.now();
        const dist = haversineKm({ lat: newLat, lng: newLng }, dest);
        const shouldUpdate = (moved > 0.05 && now - lastTime > 5000) || dist < ARRIVAL_RADIUS_KM;
        if (!shouldUpdate) return;
        lastLat = newLat;
        lastLng = newLng;
        lastTime = now;
        await syncServiceUpdate(active.id, {
          status: "on_the_way",
          locksmith_lat: newLat,
          locksmith_lng: newLng,
        });
        const emailKey = `rota_${active.id}`;
        if (!emailedStatus.current.has(emailKey)) {
          emailedStatus.current.add(emailKey);
          notifyStatusByGmail(active.id, "on_the_way");
        }
        // Chegada detectada com tolerância de 100 m
        if (dist < ARRIVAL_RADIUS_KM) {
          arrivedFlag = true;
          setArrived(true);
        }
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active?.id, active?.status]);

  const toggleOnline = async () => {
    if (!me) return;
    if (trustBlocked) {
      toast({ title: "Conta suspensa", description: "Aguarde o fim da análise de segurança.", variant: "destructive" });
      return;
    }
    if (!me.online) {
      const block = getRejectBlock(me);
      if (block.blocked) {
        toast({
          title: "Bloqueado temporariamente",
          description: `Você excedeu o limite de ${DAILY_REJECT_LIMIT} recusas por dia. Aguarde ${block.minutesLeft} min.`,
          variant: "destructive",
        });
        return;
      }
      // Modo livre exige mensalidade paga para ficar online
      if (me.work_mode === "livre" && me.monthly_fee_paid !== true) {
        toast({
          title: "Mensalidade pendente",
          description: "Pague a mensalidade do modo livre para ficar online e visível no mapa.",
          variant: "destructive",
        });
        return;
      }
      // Ao ficar online, exige uma posição GPS real; nunca publica o centro padrão.
      setGpsLoading(true);
      try {
        const loc = await getPreciseLocation();
        const updated = await base44.entities.Locksmith.update(me.id, { online: true, lat: loc.lat, lng: loc.lng });
        setMe((prev) => preserveFinancials(prev, updated));
        await base44.functions.invoke("serviceTrust", { action: "sync_online_requests", locksmith_id: me.id });
        toast({ title: "Você está online", description: `Localização atualizada via GPS${loc.accuracy ? ` (precisão de ${Math.round(loc.accuracy)} m)` : ""}.` });
      } catch (error) {
        toast({ title: "Localização necessária", description: locationErrorMessage(error), variant: "destructive" });
        return;
      } finally {
        setGpsLoading(false);
      }
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
    if (!me) return;
    // Corrida entre os chaveiros: o primeiro que aceitar fica com o chamado
    const result = await acceptRing(reqId, me, extra);
    if (result.ok) {
      base44.entities.Locksmith.update(me.id, { last_accepted_at: new Date().toISOString() }).catch(() => {});
      toast({
        title: result.queued ? "Segundo chamado reservado" : "Chamado aceito",
        description: result.queued ? "Ele começará automaticamente após o atendimento atual." : "O atendimento foi confirmado.",
      });
    } else {
      toast({ title: "Não foi possível aceitar", description: result.reason, variant: "destructive" });
      setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
    }
  };

  const handleReject = async (reqId) => {
    const req = pendingRequests.find((r) => r.id === reqId);
    if (!req) return;
    // Não cancela o chamado: ele para de tocar para este chaveiro e volta em
    // 2 minutos, caso nenhum outro chaveiro assuma nesse intervalo.
    await rejectRing(req, selectedId);
    setPendingRequests((prev) => prev.filter((r) => r.id !== reqId));
    if (me) {
      const { count } = await registerRejection(me, reqId);
      const fresh = await base44.entities.Locksmith.get(me.id);
      setMe((prev) => preserveFinancials(prev, fresh));
      toast({
        title: "Chamado recusado",
        description: count % 3 === 0 ? "A cada 3 recusas, seu score diminui 1 ponto." : `${count % 3} de 3 recusas para a próxima redução de score.`,
      });
    }
  };

  // Chaveiro cancela o serviço em andamento a qualquer momento (modo app)
  const handleCancelActive = async () => {
    if (!active) return;
    if (queuedRequest) promotingQueuedId.current = queuedRequest.id;
    try {
      await base44.functions.invoke("serviceTrust", {
        action: "cancel_request",
        request_id: active.id,
        actor: "chaveiro",
      });
      notifyStatusByGmail(active.id, "cancelled");
      dismissedCompletedIds.current.add(active.id);
      const next = await startNextQueuedRequest(active.locksmith_id || me?.id, {
        lat: active.locksmith_lat ?? me?.lat,
        lng: active.locksmith_lng ?? me?.lng,
      });
      clearLastService();
      setQueuedRequest(null);
      setActive(next);
      setStartPhotos([]);
      setEndPhotos([]);
      setArrived(false);
      toast({
        title: next ? "Próxima rota iniciada" : "Chamado cancelado",
        description: next ? `Agora siga para ${next.address}.` : "O serviço foi cancelado e o cliente foi liberado.",
      });
    } catch (e) {
      toast({ title: "Falha ao cancelar", description: e.message || "Tente novamente", variant: "destructive" });
    } finally {
      promotingQueuedId.current = null;
      setCancelOpen(false);
    }
  };

  // Toda atualização de status passa pela fila de sincronização: se estiver sem
  // internet, fica salva no aparelho e é enviada assim que a conexão voltar.
  const updateStatus = async (data) => {
    if (!active) return;
    const updated = await syncServiceUpdate(active.id, data);
    setActive((prev) => ({ ...prev, ...data }));
    setQueuedCount(queuedActionsCount());
    if (!isOnline()) {
      toast({
        title: "Salvo sem conexão",
        description: "A atualização será enviada automaticamente quando a internet voltar.",
      });
    }
    return updated;
  };

  const handleConfirmStart = async () => {
    if (!active || !startPhotos.length) return;
    await updateStatus({ start_photos: startPhotos });
  };

  // Chaveiro confirma que chegou ao local do cliente — só permitido a até 100 m
  // do endereço, validado pelo GPS no momento do clique. Admins em teste podem
  // confirmar a chegada sem a restrição de distância.
  const handleConfirmArrival = async () => {
    if (!active) return;
    const isAdmin = user?.role === "admin";
    if (!navigator.geolocation) {
      if (isAdmin) {
        const response = await base44.functions.invoke("serviceTrust", { action: "locksmith_arrived", request_id: active.id });
        setActive(response.data.request);
        return;
      }
      toast({
        title: "GPS indisponível",
        description: "Ative a localização do aparelho para confirmar a chegada.",
        variant: "destructive",
      });
      return;
    }
    const pos = await new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      )
    );
    if (!pos) {
      if (isAdmin) {
        const response = await base44.functions.invoke("serviceTrust", { action: "locksmith_arrived", request_id: active.id });
        setActive(response.data.request);
        return;
      }
      toast({
        title: "Não foi possível obter sua localização",
        description: "Verifique a permissão de GPS e tente novamente.",
        variant: "destructive",
      });
      return;
    }
    const dist = haversineKm(
      { lat: pos.coords.latitude, lng: pos.coords.longitude },
      { lat: active.customer_lat, lng: active.customer_lng }
    );
    if (dist > ARRIVAL_RADIUS_KM && !isAdmin) {
      toast({
        title: "Você ainda não está no local",
        description: `A confirmação só é liberada a até 100 m do endereço. Você está a ${
          dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`
        } de distância.`,
        variant: "destructive",
      });
      return;
    }
    const response = await base44.functions.invoke("serviceTrust", {
      action: "locksmith_arrived",
      request_id: active.id,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    });
    setActive(response.data.request);
  };

  // Registra as fotos do final do serviço — sinaliza ao cliente que o trabalho acabou
  // e libera a etapa de pagamento. O serviço ainda NÃO é concluído aqui.
  const handleRegisterEnd = async () => {
    if (!active || !endPhotos.length) return;
    await updateStatus({ end_photos: endPhotos });
  };

  const handlePartsChange = async (parts) => {
    await updateStatus({ replaced_parts: parts });
  };

  // Finaliza o serviço — só permitido após o pagamento do cliente ser confirmado.
  const handleFinish = async () => {
    if (!active || active.payment_status !== "paid" || active.client_confirmed !== true) return;
    const finished = active;
    await updateStatus({ status: "completed", locksmith_confirmed: true });
    const next = await startNextQueuedRequest(me?.id, { lat: finished.customer_lat, lng: finished.customer_lng });
    if (next) {
      setQueuedRequest(null);
      setActive(next);
      toast({ title: "Próxima rota iniciada", description: `Agora siga para ${next.address}.` });
    } else {
      clearLastService();
      setCompletedClientReview(null);
      setActive({ ...finished, status: "completed", locksmith_confirmed: true });
    }
  };

  // Chaveiro confirma que recebeu o pagamento em dinheiro
  const handleConfirmCash = async () => {
    if (!active || !me || active.cash_received || active.payment_method !== "dinheiro") return;
    const requestId = active.id;
    const result = await confirmCashReceived({ serviceRequestId: requestId, locksmithId: me.id, amount: active.price });
    if (!result?.success) throw new Error(result?.error || "Não foi possível confirmar o recebimento.");
    setActive((current) => current?.id === requestId ? { ...current, cash_received: true, payment_status: "paid" } : current);
    toast({
      title: "Recebimento confirmado",
      description: "Pagamento registrado. Você já pode finalizar o serviço; a comissão segue a compensação de 15%.",
    });
  };

  const handleRefresh = async () => {
    try {
      const list = await base44.entities.Locksmith.list();
      setLocksmiths(list);
      if (selectedId) {
        await base44.entities.ServiceRequest
          .filter({ ringing_locksmith_ids: selectedId, status: "ringing" }, "-created_date")
          .then((list) => setPendingRequests(list.filter((r) => !blockedIds.has(r.created_by_id) && isRingingFor(r, selectedId))))
          .catch(() => {});
      }
    } catch (e) { /* ignora */ }
  };

  const { pull, refreshing } = usePullToRefresh(handleRefresh);

  const isAppMode = me?.work_mode === "app";
  const canReceiveAppCalls = isAppMode || (me?.work_mode === "livre" && me?.receive_app_requests !== false);
  const rejectBlock = getRejectBlock(me);
  const trustBlocked = trustScore?.banned || (trustScore?.suspended_until && new Date(trustScore.suspended_until).getTime() > Date.now());
  const ring = pendingRequests[0] || null;
  const pendingCount = pendingRequests.length;
  const startDone = (active?.start_photos?.length || 0) > 0;
  const endDone = (active?.end_photos?.length || 0) > 0;
  const paid = active?.payment_status === "paid";
  const locksmithArrived = active?.locksmith_arrived === true;
  const clientArrivedConfirmed = active?.client_arrived_confirmed === true;
  const clientConfirmed = active?.client_confirmed === true;
  const cashPending = active?.payment_method === "dinheiro" && !active?.cash_received && !paid && clientConfirmed && endDone && ["accepted", "on_the_way"].includes(active?.status);
  const phase = !active
    ? "moving"
    : active.status === "completed"
    ? "completed"
    : endDone
    ? (!clientConfirmed
      ? "awaiting_client"
      : paid
      ? "ready_to_finish"
      : "awaiting_payment")
    : startDone
    ? "finishing"
    : clientArrivedConfirmed
    ? "arrived_confirmed"
    : locksmithArrived
    ? "arrived_pending"
    : arrived
    ? "arrived_detected"
    : "moving";
  const phaseLabel =
    phase === "moving"
      ? "A caminho do cliente"
      : phase === "arrived_detected"
      ? "Você chegou no local"
      : phase === "arrived_pending"
      ? "Aguardando cliente confirmar chegada"
      : phase === "arrived_confirmed"
      ? "Iniciar atendimento"
      : phase === "finishing"
      ? "Em atendimento"
      : phase === "awaiting_client"
      ? "Aguardando confirmação do cliente"
      : phase === "awaiting_payment"
      ? "Aguardando pagamento"
      : phase === "ready_to_finish"
      ? "Pagamento confirmado"
      : "Serviço concluído";

  return (
    <div className={`max-w-2xl mx-auto px-4 py-6 md:py-10 ${pendingCount > 0 && canReceiveAppCalls ? "pt-14 md:pt-14" : ""}`}>
      <PullToRefreshIndicator pull={pull} refreshing={refreshing} />
      {/* Banner fixo piscante no topo quando há solicitações pendentes */}
      {pendingCount > 0 && canReceiveAppCalls && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center py-2 pt-safe text-sm font-bold animate-alert-blink shadow-lg md:left-64">
          <Bell className="w-4 h-4 inline mr-2 animate-bounce" />
          {pendingCount === 1 ? "1 solicitação aguardando resposta!" : `${pendingCount} solicitações aguardando resposta!`}
        </div>
      )}

      {cashPending && <CashReceiptAlert key={active.id} request={active} online={online} onConfirm={handleConfirmCash} />}

      {/* Aviso de modo offline — dados do serviço permanecem visíveis */}
      {!online && (() => {
        const cached = getLastService();
        const syncedAt = cached?._cached_at
          ? new Date(cached._cached_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
          : null;
        return (
          <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-warning/10 border border-warning/40 text-warning">
            <WifiOff className="w-4 h-4 shrink-0" />
            <p className="text-sm font-medium">
              Sem conexão — exibindo dados do último serviço em cache
              {syncedAt && ` (atualizado às ${syncedAt})`}.
              {queuedCount > 0
                ? ` ${queuedCount} atualização(ões) na fila para envio quando a internet voltar.`
                : " As atualizações serão sincronizadas quando a internet voltar."}
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive text-destructive-foreground text-sm font-bold animate-pulse">
              <Bell className="w-4 h-4" />
              {pendingCount}
            </div>
          )}
          <DarkModeToggle />
        </div>
      </div>

      {profileChecked && !selectedId && (
        <div className="p-4 rounded-xl border border-warning/40 bg-warning/10 text-warning mb-5">
          <p className="font-medium">Nenhum perfil de chaveiro vinculado a esta conta.</p>
          <p className="text-sm mt-1">
            Acesse <Link to="/modo-trabalho" className="underline font-semibold">Modo de trabalho</Link> para criar o seu perfil profissional.
          </p>
        </div>
      )}

      {!me && selectedId && (
        <LoadingCard label="Carregando seu perfil..." className="mb-5" />
      )}

      {me && (() => {
        const isLivre = me.work_mode === "livre";
        const blockedOnline =
          me.inactive_deactivated === true ||
          (isLivre && me.monthly_fee_paid !== true && !me.online);
        return (
        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card mb-5 fade-in-up">
          <div>
            <p className="font-medium text-foreground">{user?.username || user?.full_name || me.name}</p>
            <p className="text-xs text-muted-foreground">
              Modo {isLivre ? "Livre" : "Aplicativo"} ·{" "}
              <span className={me.online ? "text-success" : "text-muted-foreground"}>
                {me.online ? "Online" : "Offline"}
              </span>
            </p>
            {blockedOnline && (
              <p className="text-xs text-warning mt-1">
                Pague a mensalidade para ficar online e visível no mapa.
              </p>
            )}
          </div>
          <Button
            onClick={toggleOnline}
            variant={me.online ? "destructive" : "default"}
            size="sm"
            disabled={blockedOnline || trustBlocked || gpsLoading}
          >
            {gpsLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Power className="w-4 h-4 mr-1.5" />} {gpsLoading ? "Localizando…" : me.online ? "Sair" : "Entrar"}
          </Button>
        </div>
        );
      })()}

      {me && isAppMode && <LocksmithScoreCard score={trustScore} />}

      {trustBlocked && (
        <div className="p-4 rounded-xl border-2 border-destructive/40 bg-destructive/10 text-destructive mb-5"><p className="font-bold text-sm">Conta temporariamente suspensa</p><p className="text-sm mt-1">Você não receberá chamados até o fim da análise de segurança.</p></div>
      )}

      {/* Perfil desativado automaticamente por 30 dias sem aceitar chamados */}
      {me?.inactive_deactivated && (
        <InactivityRevalidationCard locksmith={me} onRevalidated={setMe} />
      )}

      {/* Bloqueio temporário por excesso de recusas */}
      {me && rejectBlock.blocked && (
        <div className="p-4 rounded-xl border-2 border-destructive/40 bg-destructive/10 text-destructive mb-5">
          <p className="font-bold text-sm">Bloqueado por {rejectBlock.minutesLeft} min</p>
          <p className="text-sm mt-1">
            Você excedeu o limite de {DAILY_REJECT_LIMIT} recusas por dia e não receberá novos chamados
            durante 1 hora.
          </p>
        </div>
      )}

      {me && isAppMode && rejectionsToday(me) > 0 && (
        <p className="text-xs text-muted-foreground mb-5">
          Recusas hoje: {rejectionsToday(me)} · a cada {DAILY_REJECT_LIMIT}, o score cai 1 ponto
        </p>
      )}

      {/* Alerta automático de chamados urgentes na região */}
      {me && !active && <UrgentNearbyAlert locksmith={me} />}

      {/* Conexão da conta Gmail para avisos automáticos ao cliente */}
      {me && (
        <div className="mb-5">
          <GmailConnectCard />
        </div>
      )}

      {/* Recebimentos automáticos via Mercado Pago */}
      {me && (
        <div className="mb-5">
          <MercadoPagoConnectSetup />
        </div>
      )}

      {me && <div className="mb-5"><PendingCreditsCard /></div>}

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
              onWithdrawalMade={() =>
                Promise.all([base44.entities.Locksmith.get(selectedId), fetchLocksmithFinancials(selectedId)]).then(
                  ([locksmith, financials]) => setMe(mergeLocksmithFinancials(locksmith, financials))
                )
              }
            />
          </div>
        </div>
      )}

      {/* Fila de solicitações pendentes — modo app */}
      {pendingCount > 0 && canReceiveAppCalls && !rejectBlock.blocked && !trustBlocked && (
        <PendingRequestsList
          requests={pendingRequests}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      <QueuedRequestCard request={queuedRequest} />

      {/* Serviço em andamento */}
      {active ? (
        <div className="space-y-4 fade-in-up">
          <div className={`p-4 rounded-xl border border-border bg-card border-l-4 ${PHASE_BORDER[phase] || "border-l-blue-500"}`}>
            <div className="flex items-center justify-between gap-2 mb-2">
              <ServiceStatusBadge phase={phase} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{active.service_type}</span>
            </div>
            <p className="text-sm font-medium text-foreground">{phaseLabel}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{active.address}</p>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-xs text-muted-foreground">Valor do atendimento</p>
              <p className="font-heading text-2xl font-bold text-foreground">R$ {Number(active.price || 0).toFixed(2)}</p>
            </div>
            <Button onClick={() => setChatFocus(true)} size="icon" aria-label="Abrir mensagens do cliente">
              <MessageCircle className="h-5 w-5" />
            </Button>
          </div>

          <ArrivalDeadlineCountdown request={active} />

          <KeyTechnicalDetails description={active.description} request={active} />

          <ModerationActions
            targetUserId={active.created_by_id}
            targetType="cliente"
            targetName="Cliente"
            contextType="service"
            requestId={active.id}
            locksmithId={me?.id}
          />

          <UrgencyUpgradeAlert request={active} onResolved={setActive} />
          <LocksmithCaseStatus requestId={active.id} />



          {(phase === "moving" || phase === "arrived_detected" || phase === "arrived_pending") && (
            <>
              <LightMap
                center={{ lat: active.customer_lat, lng: active.customer_lng }}
                height={320}
                markers={[
                  { id: "c", lat: active.customer_lat, lng: active.customer_lng, type: "client", label: "Cliente" },
                  { id: "l", lat: active.locksmith_lat, lng: active.locksmith_lng, type: "locksmith_me", label: "Eu" },
                ]}
                route={
                  active.status !== "completed"
                    ? { from: { lat: active.locksmith_lat, lng: active.locksmith_lng }, to: { lat: active.customer_lat, lng: active.customer_lng } }
                    : null
                }
                routePath={routePath}
                eta={routeEta}
              />
              <OpenInNavAppsButton
                from={{ lat: active.locksmith_lat, lng: active.locksmith_lng }}
                to={{ lat: active.customer_lat, lng: active.customer_lng }}
                className="mt-3"
              />
              {/* Confirmação manual — validada por GPS (até 100 m do endereço) */}
              {phase === "moving" && (
                <>
                  <Button onClick={handleConfirmArrival} variant="outline" className="w-full">
                    <MapPin className="w-4 h-4 mr-1.5" /> Cheguei no local do cliente
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    A confirmação de chegada só é liberada quando você estiver a até 100 m do endereço do cliente.
                  </p>
                </>
              )}
            </>
          )}

          {phase === "arrived_detected" && (
            <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 space-y-3 text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto" />
              <p className="text-sm font-medium text-foreground">Você chegou no local do cliente?</p>
              <p className="text-xs text-muted-foreground">Confirme sua chegada para que o cliente libere o início do serviço.</p>
              <Button onClick={handleConfirmArrival} className="w-full">
                <Check className="w-4 h-4 mr-1.5" /> Confirmar chegada
              </Button>
            </div>
          )}

          {phase === "arrived_pending" && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              <p className="text-sm font-medium text-foreground">Aguardando o cliente confirmar sua chegada</p>
              <p className="text-xs text-muted-foreground">Você poderá iniciar o atendimento assim que o cliente confirmar.</p>
            </div>
          )}

          {phase === "arrived_confirmed" && (
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
            <div className="space-y-3">
              <OpeningConditionCorrection request={active} onApplied={setActive} />
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <PartsChecklist value={active.replaced_parts || []} onChange={handlePartsChange} />
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
            </div>
          )}

          <OpeningChargeSummary request={active} />

          {phase === "awaiting_client" && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-2 text-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              <p className="text-sm font-medium text-foreground">Aguardando o cliente confirmar o serviço</p>
              <p className="text-xs text-muted-foreground">O cliente foi notificado da finalização. O pagamento será liberado após a confirmação.</p>
            </div>
          )}

          {phase === "awaiting_payment" && !cashPending && (
            <div className="p-4 rounded-xl border-2 border-warning/40 bg-warning/10 space-y-3">
              <div className="flex items-center gap-2 text-warning">
                <Loader2 className="w-5 h-5 animate-spin" />
                <p className="font-medium text-sm">Aguardando pagamento do cliente</p>
              </div>
              <p className="text-xs text-muted-foreground">
                O cliente foi notificado para efetuar o pagamento de <strong className="text-foreground">R$ {active.price?.toFixed(2)}</strong>.
                Após a confirmação, você poderá finalizar o serviço.
              </p>

            </div>
          )}

          {phase === "ready_to_finish" && (
            <div className="p-4 rounded-xl border-2 border-success/40 bg-success/10 space-y-3">
              <div className="flex items-center gap-2 text-success">
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
              <div className="p-4 rounded-xl bg-success/10 text-success text-sm flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" /> Serviço concluído com sucesso!
              </div>
              {completedClientReview
                ? <ClientRatingSummary review={completedClientReview} label="Sua avaliação do cliente:" />
                : <ClientReviewForm request={active} onSubmitted={(review) => {
                    setCompletedClientReview(review);
                    toast({ title: "Avaliação enviada", description: "Sua avaliação do cliente foi registrada." });
                  }} />}
              <Button
                onClick={() => {
                  dismissedCompletedIds.current.add(active.id);
                  clearLastService();
                  setCompletedClientReview(null);
                  setActive(null);
                }}
                variant="outline"
                className="w-full"
              >
                Voltar ao painel
              </Button>
            </div>
          )}

          {active.status !== "completed" && (
            <Button
              variant="outline"
              onClick={() => active.locksmith_arrived ? setCancelOpen(true) : handleCancelActive()}
              className="w-full text-destructive border-destructive/40 hover:bg-destructive/5"
            >
              <X className="w-4 h-4 mr-1.5" /> Cancelar chamado
            </Button>
          )}

          <LocksmithCancellationFlow
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            request={active}
            onSubmitted={() => toast({ title: "Justificativa registrada", description: "O cliente foi notificado e o prazo de espera foi iniciado." })}
          />
        </div>
      ) : !me ? null : (
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
            onUpdateMe={async (data) => {
              const updated = await base44.entities.Locksmith.update(me.id, data);
              setMe((prev) => preserveFinancials(prev, updated));
              if (updated.online && updated.receive_app_requests !== false) {
                await base44.functions.invoke("serviceTrust", { action: "sync_online_requests", locksmith_id: updated.id });
              }
              return updated;
            }}
          />
        ) : (
          <div className="space-y-5">
            <LivreModeLocked onPay={() => navigate("/modo-trabalho")} me={me} />
            <LocksmithChatConversations me={me} />
          </div>
        )
      )}

      {/* Tela cheia de chat aberta via alerta de nova mensagem */}
      {chatFocus && me && (
        <div className="fixed inset-0 z-[70] bg-background flex flex-col pb-safe">
          <div className="flex items-center gap-2 p-3 border-b border-border pt-safe">
            <button onClick={() => setChatFocus(false)} className="p-2 rounded-lg hover:bg-accent" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-heading font-semibold text-foreground">Conversas</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <LocksmithChatConversations me={me} />
          </div>
        </div>
      )}
    </div>
  );
}