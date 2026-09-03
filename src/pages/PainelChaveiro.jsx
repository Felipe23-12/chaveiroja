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
import RealLocksmithsMap from "@/components/map/RealLocksmithsMap";
import PhotoUploader from "@/components/locksmith/PhotoUploader";
import WalletCard from "@/components/locksmith/WalletCard";
import WithdrawalSection from "@/components/locksmith/WithdrawalSection";
import StripeConnectSetup from "@/components/locksmith/StripeConnectSetup";
import IncomingRequestAlert from "@/components/locksmith/IncomingRequestAlert";
import PendingRequestsList from "@/components/locksmith/PendingRequestsList";
import { useToast } from "@/components/ui/use-toast";
import DarkModeToggle from "@/components/DarkModeToggle";
import { haversineKm, stepToward, fetchDrivingRoute, etaMinutes } from "@/lib/geo";
import { SERVICE_CATALOG } from "@/lib/pricing";
import { confirmCashReceived } from "@/lib/payments";

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
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
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

  // Busca a rota de carro entre o chaveiro e o cliente (OSRM)
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
    fetchDrivingRoute(from, to).then((r) => {
      if (r) {
        setRoutePath(r.coordinates);
        setRouteEta(etaMinutes(r.duration));
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
            (r.status === "completed" && (!r.locksmith_confirmed || r.payment_status !== "paid"))
          );
          setActive(ongoing || null);
          // Notifica quando o cliente solicita confirmação de finalização
          if (ongoing?.client_confirmed && !ongoing?.locksmith_confirmed) {
            const notifyKey = `confirm_${ongoing.id}`;
            if (!notifiedIds.current.has(notifyKey)) {
              notifiedIds.current.add(notifyKey);
              playBeep();
              toast({
                title: "🔔 Cliente solicitou confirmação",
                description: `${ongoing.service_type} · R$ ${ongoing.price?.toFixed(2)}`,
              });
            }
          }
          // Notifica quando o cliente seleciona pagamento em dinheiro
          if (ongoing?.payment_method === "dinheiro" && !ongoing?.cash_received && ongoing?.locksmith_confirmed) {
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
    // Envia email automático de conclusão ao cliente
    try {
      await base44.functions.invoke("sendServiceCompletionEmail", {
        service_request_id: active.id,
      });
    } catch (e) {
      /* não bloqueia o fluxo se o email falhar */
    }
  };

  // Chaveiro confirma a finalização do serviço (após solicitação do cliente)
  const handleConfirmCompletion = async () => {
    if (!active) return;
    await base44.entities.ServiceRequest.update(active.id, { locksmith_confirmed: true });
    toast({
      title: "Finalização confirmada",
      description: "O cliente foi liberado para selecionar a forma de pagamento.",
    });
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
              <Button onClick={handleFinish} disabled={!endPhotos.length} className="w-full">
                <Check className="w-4 h-4 mr-1.5" /> Finalizar serviço
              </Button>
            </div>
          )}

          {active.status === "completed" && (
            <div className="space-y-3">
              {/* Valor do serviço */}
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

              {/* Cliente solicitou confirmação de finalização */}
              {active.client_confirmed && !active.locksmith_confirmed && (
                <div className="p-4 rounded-xl border-2 border-amber-300 bg-amber-50 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Bell className="w-5 h-5" />
                    <p className="font-medium text-sm">Cliente solicitou confirmação de finalização</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O cliente confirmou que o serviço foi finalizado. Confirme para liberar o pagamento.
                  </p>
                  <Button onClick={handleConfirmCompletion} className="w-full">
                    <Check className="w-4 h-4 mr-1.5" /> Confirmar finalização
                  </Button>
                </div>
              )}

              {/* Aguardando cliente selecionar forma de pagamento */}
              {active.locksmith_confirmed && !active.payment_method && (
                <div className="p-4 rounded-xl bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Aguardando cliente selecionar a forma de pagamento…
                </div>
              )}

              {/* Cliente selecionou dinheiro — chaveiro confirma recebimento */}
              {active.locksmith_confirmed && active.payment_method === "dinheiro" && !active.cash_received && (
                <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Check className="w-5 h-5" />
                    <p className="font-medium text-sm">Cliente pagará em dinheiro</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Confirme o recebimento de <strong className="text-foreground">R$ {active.price?.toFixed(2)}</strong> em dinheiro.
                    A comissão de 15% será descontada do seu próximo pagamento via app.
                  </p>
                  <Button onClick={handleConfirmCash} className="w-full">
                    <Check className="w-4 h-4 mr-1.5" /> Recebi em dinheiro
                  </Button>
                </div>
              )}

              {/* Pagamento em dinheiro confirmado */}
              {active.cash_received && (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
                  <Check className="w-5 h-5" /> Pagamento recebido em dinheiro!
                </div>
              )}

              {/* Pagamento via app confirmado */}
              {active.locksmith_confirmed && active.payment_method && active.payment_method !== "dinheiro" && active.payment_status === "paid" && (
                <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm flex items-center gap-2">
                  <Check className="w-5 h-5" /> Pagamento confirmado via app!
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        pendingCount === 0 && (
          isAppMode ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {me?.online ? "Aguardando solicitações..." : "Fique online para receber solicitações."}
              </p>
            </div>
          ) : (
            <RealLocksmithsMap me={me} />
          )
        )
      )}
    </div>
  );
}