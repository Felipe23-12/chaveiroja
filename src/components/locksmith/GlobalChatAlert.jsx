import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { setChatUnread, incrementChatUnread } from "@/lib/chatUnreadStore";
import { playNotificationSound } from "@/lib/notificationSound";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

const lastSeenKey = (id) => `chat_last_seen_${id}`;

/**
 * Alerta flutuante global para o chaveiro: dispara o som de notificação +
 * toast quando chega uma nova mensagem de cliente (em qualquer página) e
 * mostra um botão com o contador de não lidas. O contador é persistido
 * (localStorage) por chaveiro, então mensagens recebidas enquanto o app
 * estava fechado continuam contando.
 */
export default function GlobalChatAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [locksmith, setLocksmith] = useState(null);
  const [unread, setUnread] = useState(0);
  const seenIds = useRef(new Set());
  const initialized = useRef(false);

  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const isChaveiro = accountType === "chaveiro";

  // Encontra o perfil do chaveiro: pelo created_by_id (dono) ou, como fallback,
  // pelo nome que bate com o full_name do usuário. Cobre perfis criados em
  // onboarding ou por admin, onde created_by_id pode não bater com o user.
  useEffect(() => {
    if (!isChaveiro || !user?.id) return;
    let active = true;
    base44.entities.Locksmith
      .list()
      .then((list) => {
        if (!active) return;
        const mine =
          list.find((l) => l.created_by_id === user.id) ||
          list.find((l) => (l.name || "").trim() === (user.full_name || "").trim());
        if (mine) setLocksmith(mine);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isChaveiro, user?.id, user?.full_name]);

  // Assina mensagens de clientes direcionadas a este chaveiro (qualquer modo)
  useEffect(() => {
    if (!locksmith?.id) return;
    const key = lastSeenKey(locksmith.id);
    let lastSeen = 0;
    try { lastSeen = parseInt(localStorage.getItem(key) || "0", 10) || 0; } catch (e) {}

    const load = () =>
      base44.entities.ChatMessage
        .filter({ locksmith_id: locksmith.id }, "created_date")
        .then((list) => {
          const customerMsgs = list.filter((m) => m.sender_type === "customer");
          if (!initialized.current) {
            // Primeira carga: conta mensagens recebidas enquanto o chaveiro
            // estava fora (created_date > lastSeen) como não lidas, e marca
            // todas como vistas para a detecção em tempo real das próximas.
            let initialUnread = 0;
            customerMsgs.forEach((m) => {
              seenIds.current.add(m.id);
              const ts = new Date(m.created_date).getTime();
              if (ts > lastSeen) initialUnread++;
            });
            initialized.current = true;
            if (initialUnread > 0) {
              setUnread(initialUnread);
              setChatUnread(initialUnread);
            }
          } else {
            const newMsgs = customerMsgs.filter((m) => !seenIds.current.has(m.id));
            if (newMsgs.length > 0) {
              newMsgs.forEach((m) => seenIds.current.add(m.id));
              const latest = newMsgs[newMsgs.length - 1];
              playNotificationSound();
              if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
              toast({
                title: "💬 Nova mensagem de cliente",
                description: `${latest.sender_name || "Cliente"}: ${latest.message?.slice(0, 60) || "..."}`,
              });
              setUnread((prev) => prev + newMsgs.length);
              incrementChatUnread(newMsgs.length);
            }
          }
        })
        .catch(() => {});
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return safeUnsubscribe(unsub);
  }, [locksmith?.id]);

  // Zera o contador e persiste lastSeen quando o chaveiro está no painel
  useEffect(() => {
    if (!locksmith?.id) return;
    if (location.pathname === "/painel-chaveiro") {
      setUnread(0);
      setChatUnread(0);
      try { localStorage.setItem(lastSeenKey(locksmith.id), String(Date.now())); } catch (e) {}
    }
  }, [location.pathname, locksmith?.id]);

  if (!isChaveiro || !locksmith || unread === 0) return null;

  return (
    <button
      onClick={() => {
        setUnread(0);
        setChatUnread(0);
        try { localStorage.setItem(lastSeenKey(locksmith.id), String(Date.now())); } catch (e) {}
        navigate("/painel-chaveiro", { state: { openChat: true } });
      }}
      className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 pl-3 pr-4 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-2xl active:scale-95 transition-all animate-alert-slide"
    >
      <div className="relative">
        <MessageCircle className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-alert-blink">
          {unread > 9 ? "9+" : unread}
        </span>
      </div>
      <span>Mensagens</span>
    </button>
  );
}