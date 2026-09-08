import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import ChatConversationList from "@/components/locksmith/ChatConversationList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/lib/notificationSound";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import useBlockedUsers from "@/hooks/useBlockedUsers";
import ModerationActions from "@/components/moderation/ModerationActions";
import ChatPhotoButton from "@/components/chat/ChatPhotoButton";
import ChatMessageContent from "@/components/chat/ChatMessageContent";

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
  const { blockedIds } = useBlockedUsers();

  // Carrega todas as conversas (clientes que enviaram mensagens para este chaveiro)
  useEffect(() => {
    if (!me?.id) return;
    const load = () =>
      base44.entities.ChatMessage
        .filter({ locksmith_id: me.id }, "created_date")
        .then((list) => {
          const groups = {};
          let customerTotal = 0;
          list.filter((m) => !blockedIds.has(m.client_id)).forEach((m) => {
            if (!m.client_id) return;
            if (m.sender_type === "customer") customerTotal++;
            if (m.sender_type !== "customer" && m.sender_type !== "system") return;
            const key = m.client_id;
            if (!groups[key]) groups[key] = { id: key, name: m.client_name || m.sender_name || "Cliente", lastDate: m.created_date, count: 0 };
            groups[key].count++;
            if (new Date(m.created_date) > new Date(groups[key].lastDate)) {
              groups[key].lastDate = m.created_date;
            }
          });
          const sorted = Object.values(groups).sort(
            (a, b) => new Date(b.lastDate) - new Date(a.lastDate)
          );
          setConversations(sorted);

          // Notificação em tempo real de novas mensagens de cliente
          if (lastCustomerCountRef.current !== null && customerTotal > lastCustomerCountRef.current) {
            playNotificationSound();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
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
    return safeUnsubscribe(unsub);
  }, [me?.id, me?.created_by_id, blockedIds]);

  // Carrega mensagens da conversa ativa
  useEffect(() => {
    if (!me?.id || !activeTab) return;
    const load = () =>
      base44.entities.ChatMessage
        .filter({ locksmith_id: me.id, client_id: activeTab }, "created_date")
        .then((list) => setMessages(list.filter((m) => !blockedIds.has(m.client_id))))
        .catch(() => {});
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return safeUnsubscribe(unsub);
  }, [me?.id, me?.created_by_id, activeTab, blockedIds]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handlePhotoSend = async (photoUrl) => {
    if (sending || !activeTab || blockedIds.has(activeTab)) return;
    setSending(true);
    try {
      const activeConv = conversations.find((c) => c.id === activeTab);
      await base44.entities.ChatMessage.create({
        locksmith_id: me.id,
        locksmith_name: me.name,
        locksmith_user_id: me.created_by_id,
        client_id: activeTab,
        client_name: activeConv?.name,
        sender_type: "locksmith",
        sender_name: me.name,
        message: "Foto",
        photo_url: photoUrl,
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || !activeTab || blockedIds.has(activeTab)) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      const activeConv = conversations.find((c) => c.id === activeTab);
      await base44.entities.ChatMessage.create({
        locksmith_id: me.id,
        locksmith_name: me.name,
        locksmith_user_id: me.created_by_id,
        client_id: activeTab,
        client_name: activeConv?.name,
        sender_type: "locksmith",
        sender_name: me.name,
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div id="chat-conversas">
      <div className="flex items-center gap-2 mb-3">
        {activeTab ? (
          <button onClick={() => setActiveTab(null)} className="p-1 -ml-1 rounded-lg hover:bg-accent">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
        ) : (
          <MessageCircle className="w-4 h-4 text-primary" />
        )}
        <h3 className="font-heading font-semibold text-foreground">
          {activeTab ? conversations.find((c) => c.id === activeTab)?.name || "Conversa" : "Conversas com clientes"}
        </h3>
        {!activeTab && conversations.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {conversations.length}
          </span>
        )}
      </div>

      {activeTab && <div className="mb-3"><ModerationActions targetUserId={activeTab} targetType="cliente" targetName={conversations.find((c) => c.id === activeTab)?.name} contextType="chat" locksmithId={me.id} onBlocked={() => setActiveTab(null)} /></div>}

      {conversations.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-border">
          <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma conversa ainda. Quando clientes iniciarem chat pelo mapa, aparecerão aqui.
          </p>
        </div>
      ) : !activeTab ? (
        <ChatConversationList conversations={conversations} onOpen={setActiveTab} />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          {/* Mensagens da conversa ativa */}
          <div className="flex flex-col" style={{ height: 360 }}>
            <div className="flex-1 overflow-y-auto space-y-2 p-3">
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
                      <ChatMessageContent message={m} />
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            <form onSubmit={handleSend} className="flex gap-2 p-3 border-t border-border">
              <ChatPhotoButton onUploaded={handlePhotoSend} disabled={sending || blockedIds.has(activeTab)} />
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Responder para ${conversations.find((c) => c.id === activeTab)?.name || ""}...`}
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