import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, MessageCircle, Navigation, MapPin, Clock, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LightMap from "@/components/map/LightMap";
import QuickMessages from "@/components/chat/QuickMessages";
import ArrivalDeadlineCountdown from "@/components/locksmith/ArrivalDeadlineCountdown";
import CancelServiceButton from "@/components/locksmith/CancelServiceButton";
import CancellationCaseNotice from "@/components/client/CancellationCaseNotice";
import { fetchDrivingRoute, etaMinutes, haversineKm } from "@/lib/geo";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import useBlockedUsers from "@/hooks/useBlockedUsers";
import ModerationActions from "@/components/moderation/ModerationActions";
import ChatPhotoButton from "@/components/chat/ChatPhotoButton";
import ChatMessageContent from "@/components/chat/ChatMessageContent";
import KeyServicePrice from "@/components/client/KeyServicePrice";

export default function Acompanhamento() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [locksmith, setLocksmith] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [arrivalUpdating, setArrivalUpdating] = useState(false);
  const [arrivalError, setArrivalError] = useState("");
  const [finishUpdating, setFinishUpdating] = useState(false);
  const [finishError, setFinishError] = useState("");
  const { blockedIds } = useBlockedUsers();
  const scrollRef = useRef(null);

  // Carrega a solicitação e assina atualizações em tempo real
  useEffect(() => {
    if (!requestId) return;
    const load = () =>
      base44.entities.ServiceRequest
        .get(requestId)
        .then((r) => {
          setRequest(r);
          setLoading(false);
          if (r?.locksmith_id) {
            base44.entities.Locksmith.get(r.locksmith_id).then(setLocksmith).catch(() => {});
            const loadMsgs = () =>
              base44.entities.ChatMessage
                .filter({ locksmith_id: r.locksmith_id }, "created_date")
                .then(setMessages)
                .catch(() => {});
            loadMsgs();
            return safeUnsubscribe(base44.entities.ChatMessage.subscribe(() => loadMsgs()));
          }
        })
        .catch(() => setLoading(false));
    const promise = load();
    const unsub = safeUnsubscribe(
      base44.entities.ServiceRequest.subscribe((event) => {
        if (event.data?.id === requestId) {
          base44.entities.ServiceRequest.get(requestId).then((updated) => {
            if (updated.status === "cancelled") {
              navigate("/", { replace: true });
              return;
            }
            setRequest(updated);
          }).catch(() => {});
        }
      })
    );
    return () => {
      unsub();
      if (typeof promise?.then === "function") promise.then((u) => typeof u === "function" && u()).catch(() => {});
    };
  }, [requestId]);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setCustomerId(u?.id || "");
      setCustomerName(u?.full_name || "Cliente");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Busca a rota de carro entre o chaveiro e o cliente (OSRM)
  useEffect(() => {
    if (request?.status === "queued" || !request?.locksmith_lat || !request?.customer_lat) return;
    const from = { lat: request.locksmith_lat, lng: request.locksmith_lng };
    const to = { lat: request.customer_lat, lng: request.customer_lng };
    setRoutePath(null);
    setRouteEta(null);
    fetchDrivingRoute(from, to).then((r) => {
      if (r) {
        setRoutePath(r.coordinates);
        setRouteEta(etaMinutes(r.duration));
      }
    });
  }, [request?.locksmith_lat, request?.locksmith_lng, request?.customer_lat, request?.customer_lng]);

  const distanceKm = useMemo(() => {
    if (!request?.locksmith_lat || !request?.customer_lat) return null;
    return haversineKm(
      { lat: request.locksmith_lat, lng: request.locksmith_lng },
      { lat: request.customer_lat, lng: request.customer_lng }
    );
  }, [request?.locksmith_lat, request?.locksmith_lng, request?.customer_lat, request?.customer_lng]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!text.trim() || sending || !request?.locksmith_id || blockedIds.has(request?.locksmith_user_id || locksmith?.created_by_id)) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: request.locksmith_id,
        locksmith_name: locksmith?.name,
        locksmith_user_id: request.locksmith_user_id || locksmith?.created_by_id,
        client_id: customerId,
        client_name: customerName,
        sender_type: "customer",
        sender_name: customerName,
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  const handlePhotoSend = async (photoUrl) => {
    if (sending || !request?.locksmith_id || blockedIds.has(request?.locksmith_user_id || locksmith?.created_by_id)) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: request.locksmith_id,
        locksmith_name: locksmith?.name,
        locksmith_user_id: request.locksmith_user_id || locksmith?.created_by_id,
        client_id: customerId,
        client_name: customerName,
        sender_type: "customer",
        sender_name: customerName,
        message: "Foto",
        photo_url: photoUrl,
      });
    } finally {
      setSending(false);
    }
  };

  const handleQuickSend = async (msg) => {
    if (sending || !request?.locksmith_id || blockedIds.has(request?.locksmith_user_id || locksmith?.created_by_id)) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: request.locksmith_id,
        locksmith_name: locksmith?.name,
        locksmith_user_id: request.locksmith_user_id || locksmith?.created_by_id,
        client_id: customerId,
        client_name: customerName,
        sender_type: "customer",
        sender_name: customerName,
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  const updateArrival = async (confirmed) => {
    if (!request || arrivalUpdating) return;
    setArrivalUpdating(true);
    setArrivalError("");
    try {
      const updated = await base44.entities.ServiceRequest.update(request.id, confirmed
        ? { client_arrived_confirmed: true }
        : { locksmith_arrived: false });
      setRequest(updated);
    } catch (error) {
      setArrivalError(error?.message || "Não foi possível registrar sua resposta. Tente novamente.");
    } finally {
      setArrivalUpdating(false);
    }
  };

  const confirmFinishedService = async () => {
    if (!request || finishUpdating) return;
    setFinishUpdating(true);
    setFinishError("");
    try {
      if (!request.client_confirmed) {
        await base44.entities.ServiceRequest.update(request.id, { client_confirmed: true });
      }
      navigate("/", { replace: true });
    } catch (error) {
      setFinishError(error?.message || "Não foi possível confirmar o serviço. Tente novamente.");
      setFinishUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10 text-center">
        <p className="text-sm text-muted-foreground">Solicitação não encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/")} className="mt-4">Voltar ao início</Button>
      </div>
    );
  }

  const statusLabel = {
    queued: "Chaveiro finalizando outro chamado próximo",
    accepted: "Chaveiro aceitou — preparando saída",
    on_the_way: "A caminho do seu endereço",
    completed: "Serviço concluído",
    ringing: "Aguardando o chaveiro aceitar",
  }[request.status] || request.status;

  return (
    <div className="px-4 py-4 md:py-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-lg text-foreground truncate">
            Acompanhamento · {request.service_type}
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-primary" /> {statusLabel}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold shrink-0">
          {locksmith?.name?.charAt(0) || "?"}
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <ArrivalDeadlineCountdown request={request} />
        <CancellationCaseNotice requestId={request.id} />
        <KeyServicePrice request={request} />
        {request.end_photos?.length > 0 && request.status !== "completed" && (
          <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50 space-y-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-semibold text-sm">O chaveiro finalizou o serviço</p>
            </div>
            <p className="text-xs text-emerald-800">Confirme a conclusão para seguir diretamente ao pagamento pelo Mercado Pago.</p>
            {finishError && <p className="text-xs font-medium text-destructive">{finishError}</p>}
            <Button onClick={confirmFinishedService} disabled={finishUpdating} className="w-full">
              {finishUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {request.client_confirmed ? "Ir para pagamento" : "Confirmar serviço e pagar"}
            </Button>
          </div>
        )}
        {request.locksmith_arrived && !request.client_arrived_confirmed && (
          <div className="p-4 rounded-2xl border-2 border-primary bg-primary/5 space-y-3">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-5 h-5" />
              <p className="font-medium text-sm">O chaveiro informou que chegou!</p>
            </div>
            <p className="text-xs text-muted-foreground">Confirme somente se o profissional já estiver no local.</p>
            {arrivalError && <p className="text-xs font-medium text-destructive">{arrivalError}</p>}
            <Button onClick={() => updateArrival(true)} disabled={arrivalUpdating} className="w-full">
              {arrivalUpdating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              Confirmar chegada do chaveiro
            </Button>
            <Button onClick={() => updateArrival(false)} disabled={arrivalUpdating} variant="outline" className="w-full text-destructive border-destructive/40">
              <AlertTriangle className="w-4 h-4 mr-1.5" /> Ele ainda não chegou
            </Button>
          </div>
        )}
        <ModerationActions targetUserId={request.locksmith_user_id || locksmith?.created_by_id} targetType="chaveiro" targetName={request.locksmith_name || locksmith?.name} contextType="service" requestId={request.id} locksmithId={request.locksmith_id} />
      </div>

      {/* Atendimento reunido: mapa, preço e ações permanecem visíveis; chat abre sobre a tela */}
      <div className="space-y-4">
        {/* Mapa de rastreamento */}
        <div className="space-y-3">
          <LightMap
            center={{ lat: request.customer_lat, lng: request.customer_lng }}
            height={320}
            markers={[
              { id: "c", lat: request.customer_lat, lng: request.customer_lng, type: "customer", label: "Você" },
              {
                id: "l",
                lat: request.locksmith_lat,
                lng: request.locksmith_lng,
                type: "locksmith",
                label: locksmith?.name?.split(" ")[0],
                active: request.status === "on_the_way",
              },
            ]}
            route={
              request.status !== "completed" && request.status !== "queued"
                ? { from: { lat: request.locksmith_lat, lng: request.locksmith_lng }, to: { lat: request.customer_lat, lng: request.customer_lng } }
                : null
            }
            routePath={routePath}
            eta={routeEta}
          />
          {/* Info bar */}
          <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">{request.address}</span>
            </div>
            <div className="flex items-center gap-3 text-xs font-medium">
              {distanceKm != null && (
                <span className="flex items-center gap-1 text-foreground">
                  <Navigation className="w-3.5 h-3.5" /> {distanceKm.toFixed(1)} km
                </span>
              )}
              {routeEta && (
                <span className="flex items-center gap-1 text-primary">
                  <Clock className="w-3.5 h-3.5" /> {routeEta} min
                </span>
              )}
            </div>
          </div>
          <CancelServiceButton request={request} />
        </div>

        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex h-12 items-center gap-2 rounded-full bg-primary px-4 font-heading text-sm font-bold text-primary-foreground shadow-2xl active:scale-[0.98] md:bottom-6"
          aria-label="Abrir mensagens com o chaveiro"
        >
          <MessageCircle className="h-5 w-5" /> Mensagens
        </button>

        {/* Chat em tempo real aberto sem sair do acompanhamento */}
        {chatOpen && (
        <div className="fixed inset-0 z-[80] flex flex-col bg-background pt-safe pb-safe">
          <div className="flex items-center gap-2 border-b border-border p-3">
            <button onClick={() => setChatOpen(false)} className="rounded-lg p-2 hover:bg-accent" aria-label="Fechar mensagens">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <MessageCircle className="h-5 w-5 text-primary" />
            <p className="font-heading font-semibold text-foreground">Chat com {locksmith?.name || "chaveiro"}</p>
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
            <MessageCircle className="w-4 h-4 text-primary" />
            <p className="font-medium text-sm text-foreground">Chat com {locksmith?.name || "chaveiro"}</p>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> online
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 p-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Envie uma mensagem para o chaveiro.
                </p>
              </div>
            )}
            {messages.map((m) => {
              if (m.sender_type === "system") {
                return (
                  <div key={m.id} className="flex justify-center">
                    <div className="max-w-[90%] px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-800 text-xs text-center font-medium">
                      {m.message}
                    </div>
                  </div>
                );
              }
              const mine = m.sender_type === "customer";
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary text-secondary-foreground rounded-bl-sm"
                    }`}
                  >
                    <ChatMessageContent message={m} />
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          <div className="border-t border-border">
            <QuickMessages onSend={handleQuickSend} disabled={sending || blockedIds.has(request?.locksmith_user_id || locksmith?.created_by_id)} />
            <form onSubmit={handleSend} className="flex gap-2 p-3">
              <ChatPhotoButton onUploaded={handlePhotoSend} disabled={sending || blockedIds.has(request?.locksmith_user_id || locksmith?.created_by_id)} />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva sua mensagem..."
                disabled={sending || blockedIds.has(request?.locksmith_user_id || locksmith?.created_by_id)}
              />
              <Button type="submit" size="icon" disabled={!text.trim() || sending || blockedIds.has(request?.locksmith_user_id || locksmith?.created_by_id)}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}