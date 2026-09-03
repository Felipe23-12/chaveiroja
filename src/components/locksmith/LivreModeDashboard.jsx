import React, { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageCircle, MapPin, Bell, BellOff, Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import RealLocksmithsMap from "@/components/map/RealLocksmithsMap";

/**
 * Dashboard do Modo Livre — exibido quando o chaveiro pagou a mensalidade.
 * Mostra o mapa interativo em tempo real + abas de conversas com clientes.
 * Inclui toggle para receber/não receber solicitações do modo aplicativo.
 */
export default function LivreModeDashboard({ me, onUpdateMe }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  // Carrega todas as conversas (clientes que enviaram mensagens para este chaveiro)
  useEffect(() => {
    if (!me?.id) return;
    const load = () =>
      base44.entities.ChatMessage
        .filter({ locksmith_id: me.id }, "created_date")
        .then((list) => {
          // Agrupa por nome do cliente (sender_type = customer)
          const groups = {};
          list.forEach((m) => {
            if (m.sender_type !== "customer") return;
            const key = m.sender_name || "Cliente";
            if (!groups[key]) groups[key] = { name: key, lastDate: m.created_date, count: 0 };
            groups[key].count++;
            if (new Date(m.created_date) > new Date(groups[key].lastDate)) {
              groups[key].lastDate = m.created_date;
            }
          });
          const sorted = Object.values(groups).sort(
            (a, b) => new Date(b.lastDate) - new Date(a.lastDate)
          );
          setConversations(sorted);
          if (sorted.length > 0 && !activeTab) setActiveTab(sorted[0].name);
        })
        .catch(() => {});
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return unsub;
  }, [me?.id]);

  // Carrega mensagens da conversa ativa
  useEffect(() => {
    if (!me?.id || !activeTab) return;
    const load = () =>
      base44.entities.ChatMessage
        .filter({ locksmith_id: me.id }, "created_date")
        .then((list) => {
          const filtered = list.filter(
            (m) => m.sender_type === "customer"
              ? m.sender_name === activeTab
              : true // mensagens do chaveiro aparecem em todas as conversas
          );
          setMessages(filtered);
        })
        .catch(() => {});
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return unsub;
  }, [me?.id, activeTab]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !activeTab) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: me.id,
        locksmith_name: me.name,
        sender_type: "locksmith",
        sender_name: me.name,
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  const toggleAppRequests = (checked) => {
    onUpdateMe({ receive_app_requests: checked });
  };

  // Estabiliza o me para o mapa — só re-renderiza quando campos relevantes mudam
  const mapMe = useMemo(
    () => ({
      id: me?.id,
      name: me?.name,
      lat: me?.lat,
      lng: me?.lng,
      available: me?.available,
      online: me?.online,
    }),
    [me?.id, me?.name, me?.lat, me?.lng, me?.available, me?.online]
  );

  return (
    <div className="space-y-5 fade-in-up">
      {/* Toggle: receber solicitações do modo aplicativo */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center gap-3">
          {me?.receive_app_requests !== false ? (
            <Bell className="w-5 h-5 text-primary" />
          ) : (
            <BellOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-medium text-foreground text-sm">Solicitações do modo aplicativo</p>
            <p className="text-xs text-muted-foreground">
              {me?.receive_app_requests !== false
                ? "Você recebe alertas de pedidos próximos via app"
                : "Você não recebe solicitações do modo aplicativo"}
            </p>
          </div>
        </div>
        <Switch
          checked={me?.receive_app_requests !== false}
          onCheckedChange={toggleAppRequests}
        />
      </div>

      {/* Mapa interativo em tempo real */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Mapa em tempo real</h3>
        </div>
        <RealLocksmithsMap me={mapMe} />
      </div>

      {/* Abas de conversas com clientes */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="w-4 h-4 text-primary" />
          <h3 className="font-heading font-semibold text-foreground">Conversas com clientes</h3>
          {conversations.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {conversations.length}
            </span>
          )}
        </div>

        {conversations.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-border">
            <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma conversa ainda. Quando clientes iniciarem chat pelo mapa, aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Abas horizontais */}
            <div className="flex gap-1 overflow-x-auto p-2 bg-muted/50 border-b border-border">
              {conversations.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setActiveTab(c.name)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    activeTab === c.name
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Mensagens da conversa ativa */}
            <div className="flex flex-col" style={{ height: 360 }}>
              <div className="flex-1 overflow-y-auto space-y-2 p-3">
                {messages.map((m) => {
                  const mine = m.sender_type === "locksmith";
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

              <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-border">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`Responder para ${activeTab}...`}
                  disabled={sending}
                />
                <Button type="submit" size="icon" disabled={!text.trim() || sending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Tela exibida quando o chaveiro está no modo livre mas não pagou a mensalidade.
 */
export function LivreModeLocked({ onPay }) {
  return (
    <div className="space-y-4 fade-in-up">
      <div className="flex flex-col items-center text-center py-8 rounded-xl border-2 border-amber-300 bg-amber-50">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-foreground mb-1">
          Mensalidade pendente
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-4">
          Pague a mensalidade do modo livre para liberar o mapa interativo em tempo real,
          conversas com clientes e visibilidade no mapa para os clientes.
        </p>
        <Button onClick={onPay} size="lg">
          <CreditCard className="w-4 h-4 mr-2" /> Pagar mensalidade
        </Button>
      </div>
    </div>
  );
}