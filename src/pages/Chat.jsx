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

export default function Chat() {
  const { locksmithId } = useParams();
  const navigate = useNavigate();
  // Taxa de cancelamento em aberto bloqueia o envio de mensagens
  const { debt } = useClientDebt();
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
    const load = () =>
      base44.entities.ChatMessage.filter({ locksmith_id: locksmithId, client_id: user.id }, "created_date").then(setMessages);
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return safeUnsubscribe(unsub);
  }, [locksmithId, user?.id]);

  useEffect(() => {
    base44.auth.me().then((u) => { setUser(u); setCustomerName(u?.full_name || "Cliente"); }).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending || debt) return;
    setSending(true);
    const msg = text.trim();
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

  const handleQuickSend = async (msg) => {
    if (sending || debt) return;
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 flex flex-col" style={{ height: "calc(100vh - 0px)" }}>
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
        <Button variant="ghost" size="icon" onClick={() => navigate("/mapa")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-semibold">
          {locksmith?.name?.charAt(0) || "?"}
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{locksmith?.name || "Carregando..."}</p>
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> online · {locksmith?.specialty}
          </p>
        </div>
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
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
                  m._error
                    ? "bg-destructive/20 text-destructive rounded-br-sm"
                    : mine
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm"
                } ${m._pending ? "opacity-60" : ""}`}
              >
                {m.message}
                {m._error && <div className="text-[10px] mt-0.5">Falha ao enviar</div>}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {debt ? (
        <div className="pt-3 border-t border-border">
          <DebtBlockNotice debt={debt} onPay={() => navigate("/")} />
        </div>
      ) : (
        <>
          <QuickMessages onSend={handleQuickSend} disabled={sending} />
          <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-border">
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