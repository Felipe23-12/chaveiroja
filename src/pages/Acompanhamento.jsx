import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, MessageCircle, Navigation, MapPin, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import LightMap from "@/components/map/LightMap";
import QuickMessages from "@/components/chat/QuickMessages";
import { fetchDrivingRoute, etaMinutes, haversineKm } from "@/lib/geo";

export default function Acompanhamento() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [locksmith, setLocksmith] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [routePath, setRoutePath] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [loading, setLoading] = useState(true);
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
            const unsubMsg = base44.entities.ChatMessage.subscribe(() => loadMsgs());
            return unsubMsg;
          }
        })
        .catch(() => setLoading(false));
    const promise = load();
    const unsub = base44.entities.ServiceRequest.subscribe((event) => {
      if (event.data?.id === requestId) {
        base44.entities.ServiceRequest.get(requestId).then(setRequest).catch(() => {});
      }
    });
    return () => {
      unsub();
      if (typeof promise?.then === "function") promise.then((u) => u && u());
    };
  }, [requestId]);

  useEffect(() => {
    base44.auth.me().then((u) => setCustomerName(u?.full_name || "Cliente")).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Busca a rota de carro entre o chaveiro e o cliente (OSRM)
  useEffect(() => {
    if (!request?.locksmith_lat || !request?.customer_lat) return;
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
    if (!text.trim() || sending || !request?.locksmith_id) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: request.locksmith_id,
        locksmith_name: locksmith?.name,
        sender_type: "customer",
        sender_name: customerName,
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  const handleQuickSend = async (msg) => {
    if (sending || !request?.locksmith_id) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: request.locksmith_id,
        locksmith_name: locksmith?.name,
        sender_type: "customer",
        sender_name: customerName,
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: "calc(100vh - 80px)" }}>
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

      {/* Layout: mapa em cima, chat embaixo (mobile) | lado a lado (desktop) */}
      <div className="grid lg:grid-cols-2 gap-4">
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
              request.status !== "completed"
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
        </div>

        {/* Chat em tempo real */}
        <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden" style={{ minHeight: 400 }}>
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
                    {m.message}
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>

          <div className="border-t border-border">
            <QuickMessages onSend={handleQuickSend} disabled={sending} />
            <form onSubmit={handleSend} className="flex gap-2 p-3">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Escreva sua mensagem..."
                disabled={sending}
              />
              <Button type="submit" size="icon" disabled={!text.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}