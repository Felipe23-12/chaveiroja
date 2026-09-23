import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, MessageCircle, ArrowLeft, Trash2 } from "lucide-react";
import ChatConversationList from "@/components/locksmith/ChatConversationList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { playNotificationSound } from "@/lib/notificationSound";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import useBlockedUsers from "@/hooks/useBlockedUsers";
import ModerationActions from "@/components/moderation/ModerationActions";
import ChatPhotoButton from "@/components/chat/ChatPhotoButton";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import QuickMessages from "@/components/chat/QuickMessages";
import { hideChatMessage, hideChatConversation, loadHiddenMessageIds } from "@/lib/chatVisibility";
import { markChatConversationRead } from "@/lib/chatReadState";
import { containsLink } from "@/lib/chatMessageValidation";

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
    const load = () => Promise.all([
      base44.entities.ChatMessage.filter({ locksmith_id: me.id }, "created_date"),
      loadHiddenMessageIds(me.created_by_id),
    ]).then(([allMessages, hidden]) => {
          const list = allMessages.filter((message) => !hidden.has(message.id));
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
    const unsubscribeMessages = safeUnsubscribe(base44.entities.ChatMessage.subscribe(load));
    const unsubscribeVisibility = safeUnsubscribe(base44.entities.ChatMessageVisibility.subscribe(load));
    return () => { unsubscribeMessages(); unsubscribeVisibility(); };
  }, [me?.id, me?.created_by_id, blockedIds]);

  // Carrega mensagens da conversa ativa
  useEffect(() => {
    if (!me?.id || !activeTab) return;
    const load = () => Promise.all([
      base44.entities.ChatMessage.filter({ locksmith_id: me.id, client_id: activeTab }, "created_date"),
      loadHiddenMessageIds(me.created_by_id),
    ]).then(([list, hidden]) => {
      setMessages(list.filter((message) => !blockedIds.has(message.client_id) && !hidden.has(message.id)));
      const latest = list[list.length - 1]?.created_date;
      if (latest) markChatConversationRead(me.created_by_id, me.id, activeTab, latest).catch(() => {});
    }).catch(() => {});
    load();
    const unsubscribeMessages = safeUnsubscribe(base44.entities.ChatMessage.subscribe(load));
    const unsubscribeVisibility = safeUnsubscribe(base44.entities.ChatMessageVisibility.subscribe(load));
    return () => { unsubscribeMessages(); unsubscribeVisibility(); };
  }, [me?.id, me?.created_by_id, activeTab, blockedIds]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handlePhotoSend = async (photoUrl) => {
    if (sending || !activeTab || blockedIds.has(activeTab)) return;
    setSending(true);
    try {
      const { data: { message: created } } = await base44.functions.invoke("sendChatMessage", {
        locksmith_id: me.id, client_id: activeTab, message: "Foto", photo_url: photoUrl,
      });
      setMessages((prev) => prev.some((item) => item.id === created.id) ? prev : [...prev, created]);
    } catch (e) {
      toast({ title: "Falha ao enviar foto", description: e.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async (e, quickMessage = "") => {
    e?.preventDefault();
    const msg = quickMessage || text.trim();
    if (!msg || sending || !activeTab || blockedIds.has(activeTab)) return;
    if (containsLink(msg)) {
      toast({ title: "Links não são permitidos", description: "Remova o link para enviar a mensagem.", variant: "destructive" });
      return;
    }
    setSending(true);
    setText("");
    try {
      const { data: { message: created } } = await base44.functions.invoke("sendChatMessage", {
        locksmith_id: me.id, client_id: activeTab, message: msg,
      });
      setMessages((prev) => prev.some((item) => item.id === created.id) ? prev : [...prev, created]);
    } catch (e) {
      setText(msg);
      toast({ title: "Falha ao enviar mensagem", description: e.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleHideMessage = async (messageId) => {
    await hideChatMessage(messageId, me.created_by_id);
    setMessages((list) => list.filter((message) => message.id !== messageId));
  };

  const handleHideConversation = async () => {
    if (!activeTab || !window.confirm("Excluir esta conversa da sua visualização? As mensagens serão preservadas para auditoria.")) return;
    try {
      const all = await base44.entities.ChatMessage.filter({ locksmith_id: me.id, client_id: activeTab });
      await hideChatConversation(all, me.created_by_id);
      setMessages([]);
      setConversations((list) => list.filter((c) => c.id !== activeTab));
      setActiveTab(null);
    } catch (error) {
      toast({ title: "Não foi possível excluir a conversa", description: error.message, variant: "destructive" });
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
        {activeTab && <Button variant="ghost" size="sm" onClick={handleHideConversation} aria-label="Excluir conversa da minha visualização"><Trash2 className="w-4 h-4 mr-1" /> Excluir conversa</Button>}
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
                return <ChatMessageBubble key={m.id} message={m} mine={mine} onHide={handleHideMessage} />;
              })}
              <div ref={scrollRef} />
            </div>

            <QuickMessages audience="locksmith" onSend={(message) => handleSend(null, message)} disabled={sending || blockedIds.has(activeTab)} />
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