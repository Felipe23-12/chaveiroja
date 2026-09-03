import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

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
    osc.frequency.value = 760;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch (e) {
    /* silencioso */
  }
}

/**
 * Abas de conversas com clientes + resposta, para o chaveiro no modo livre.
 * Extraído do LivreModeDashboard para permitir uso mesmo com a mensalidade
 * pendente — assim o chaveiro sempre consegue verificar e responder clientes.
 */
export default function LocksmithChatConversations({ me }) {
  const [conversations, setConversations] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const lastCustomerCountRef = useRef(null);
  const { toast } = useToast();

  // Carrega todas as conversas (clientes que enviaram mensagens para este chaveiro)
  useEffect(() => {
    if (!me?.id) return;
    const load = () =>
      base44.entities.ChatMessage
        .filter({ locksmith_id: me.id }, "created_date")
        .then((list) => {
          const groups = {};
          let customerTotal = 0;
          list.forEach((m) => {
            if (m.sender_type !== "customer") return;
            customerTotal++;
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

          // Notificação em tempo real de novas mensagens de cliente
          if (lastCustomerCountRef.current !== null && customerTotal > lastCustomerCountRef.current) {
            playBeep();
            if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
            toast({
              title: "💬 Nova mensagem de cliente",
              description: "Você recebeu uma nova mensagem. Abra as conversas para responder.",
            });
          }
          lastCustomerCountRef.current = customerTotal;
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

  return (
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
  );
}