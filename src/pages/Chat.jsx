import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReviewForm from "@/components/locksmith/ReviewForm";
import QuickMessages from "@/components/chat/QuickMessages";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import useClientDebt from "@/hooks/useClientDebt";
import DebtBlockNotice from "@/components/client/DebtBlockNotice";
import useBlockedUsers from "@/hooks/useBlockedUsers";
import ModerationActions from "@/components/moderation/ModerationActions";
import ChatPhotoButton from "@/components/chat/ChatPhotoButton";
import ChatMessageBubble from "@/components/chat/ChatMessageBubble";
import { hideChatMessage, loadHiddenMessageIds } from "@/lib/chatVisibility";
import { containsLink } from "@/lib/chatMessageValidation";
import { markChatConversationRead } from "@/lib/chatReadState";
import { useToast } from "@/components/ui/use-toast";

export default function Chat() {
  const { locksmithId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  // Taxa de cancelamento em aberto bloqueia o envio de mensagens
  const { debt } = useClientDebt();
  const { blockedIds, loading: blocksLoading } = useBlockedUsers();
  const [locksmith, setLocksmith] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [user, setUser] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!locksmithId) return;
    base44.entities.Locksmith.get(locksmithId).then(setLocksmith);
  }, [locksmithId]);

  useEffect(() => {
    if (!locksmithId || !user?.id) return;
    const load = () => Promise.all([
      base44.entities.ChatMessage.filter({ locksmith_id: locksmithId, client_id: user.id }, "created_date"),
      loadHiddenMessageIds(user.id),
    ]).then(([list, hidden]) => {
      setMessages(list.filter((message) => !hidden.has(message.id)));
      const latest = list[list.length - 1]?.created_date;
      if (latest) markChatConversationRead(user.id, locksmithId, user.id, latest).catch(() => {});
    });
    load();
    const unsubscribeMessages = safeUnsubscribe(base44.entities.ChatMessage.subscribe(load));
    const unsubscribeVisibility = safeUnsubscribe(base44.entities.ChatMessageVisibility.subscribe(load));
    return () => { unsubscribeMessages(); unsubscribeVisibility(); };
  }, [locksmithId, user?.id]);

  useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); setCustomerName(u?.full_name || "Cliente"); }).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    const msg = text.trim();
    if (!msg || sending || debt || blockedIds.has(locksmith?.created_by_id)) return;
    if (containsLink(msg)) {
      toast({ title: "Links não são permitidos", description: "Remova o link para enviar a mensagem.", variant: "destructive" });
      return;
    }
    setSending(true);
    setText("");
    const tempId = `temp-${Date.now()}`;
    // Atualização otimista: exibe a mensagem imediatamente
    setPendingMessages((prev) => [
      ...prev,
      { id: tempId, message: msg, sender_type: "customer", _pending: true },
    ]);
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: locksmithId,
        locksmith_name: locksmith?.name,
        locksmith_user_id: locksmith?.created_by_id,
        client_id: user?.id,
        client_name: customerName,
        sender_type: "customer",
        sender_name: customerName,
        message: msg,
      });
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err) {
      setPendingMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _pending: false, _error: true } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handlePhotoSend = async (photoUrl) => {
    if (sending || debt || blockedIds.has(locksmith?.created_by_id)) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: locksmithId,
        locksmith_name: locksmith?.name,
        locksmith_user_id: locksmith?.created_by_id,
        client_id: user?.id,
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
    if (sending || debt || blockedIds.has(locksmith?.created_by_id)) return;
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    setPendingMessages((prev) => [
      ...prev,
      { id: tempId, message: msg, sender_type: "customer", _pending: true },
    ]);
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: locksmithId,
        locksmith_name: locksmith?.name,
        locksmith_user_id: locksmith?.created_by_id,
        client_id: user?.id,
        client_name: customerName,
        sender_type: "customer",
        sender_name: customerName,
        message: msg,
      });
      setPendingMessages((prev) => prev.filter((m) => m.id !== tempId));
    } catch (err) {
      setPendingMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, _pending: false, _error: true } : m))
      );
    } finally {
      setSending(false);
    }
  };

  const handleHideMessage = async (messageId) => {
    await hideChatMessage(messageId, user?.id);
    setMessages((list) => list.filter((message) => message.id !== messageId));
  };

  if (blocksLoading) return <div className="p-10 text-center text-muted-foreground">Carregando...</div>;
  const blocked = blockedIds.has(locksmith?.created_by_id);
  if (locksmith && blocked) return (
    <div className="max-w-md mx-auto px-4 py-10 space-y-4 text-center">
      <h1 className="font-heading font-bold text-xl">Contato indisponível</h1>
      <p className="text-sm text-muted-foreground">Este perfil e o envio de mensagens estão bloqueados.</p>
      <ModerationActions targetUserId={locksmith.created_by_id} targetType="chaveiro" targetName={locksmith.name} contextType="chat" locksmithId={locksmith.id} />
      <Button variant="outline" onClick={() => navigate("/mapa")}>Voltar ao mapa</Button>
    </div>
  );

  return (
    <div className="mx-auto flex h-[calc(100dvh-7.5rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] max-w-2xl flex-col px-4 py-4 md:h-full md:min-h-[100dvh] md:py-8">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/mapa")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold">
          {locksmith?.name?.charAt(0) || "?"}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{locksmith?.name || "Carregando..."}</p>
          <p className="text-xs text-success flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success" /> online · {locksmith?.specialty}
          </p>
        </div>
        <ModerationActions targetUserId={locksmith?.created_by_id} targetType="chaveiro" targetName={locksmith?.name} contextType="chat" locksmithId={locksmithId} />
        <Button variant="outline" size="sm" onClick={() => setReviewOpen(true)}>
          <Star className="w-4 h-4 mr-1.5" /> Avaliar
        </Button>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar {locksmith?.name}</DialogTitle>
          </DialogHeader>
          <ReviewForm
            locksmithId={locksmithId}
            locksmithName={locksmith?.name}
            workMode={locksmith?.work_mode}
            onSubmitted={() => setReviewOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Confirmação clara de com quem o cliente está conversando */}
      <div className="mb-3 p-3 rounded-xl border-2 border-primary bg-primary/10 text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Você está conversando com</p>
        <p className="font-heading font-bold text-lg text-foreground">{locksmith?.name || "..."}</p>
        {locksmith?.specialty && (
          <p className="text-xs text-muted-foreground">{locksmith.specialty}{locksmith.distance_km ? ` · ${locksmith.distance_km} km` : ""}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Inicie a conversa e negocie o serviço.</p>
          </div>
        )}
        {[...messages, ...pendingMessages].map((m) => {
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
          return <ChatMessageBubble key={m.id} message={m} mine={mine} onHide={handleHideMessage} />;
        })}
        <div ref={scrollRef} />
      </div>

      {debt ? (
        <div className="pt-3 border-t border-border">
          <DebtBlockNotice debt={debt} onPay={() => navigate("/")} />
        </div>
      ) : (
        <>
          <QuickMessages audience="customer" onSend={handleQuickSend} disabled={sending} />
          <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-border">
            <ChatPhotoButton onUploaded={handlePhotoSend} disabled={sending || blocked} />
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
        </>
      )}
    </div>
  );
}