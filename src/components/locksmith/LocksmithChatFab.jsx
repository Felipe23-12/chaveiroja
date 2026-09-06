import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle, ArrowLeft } from "lucide-react";
import { fetchMyLocksmith } from "@/lib/myLocksmith";
import { useChatUnread, setChatUnread } from "@/lib/chatUnreadStore";
import LocksmithChatConversations from "@/components/locksmith/LocksmithChatConversations";

/**
 * Botão flutuante de mensagens do chaveiro — disponível em QUALQUER tela do app.
 * Abre as conversas com clientes em tela cheia, sem precisar navegar até o painel.
 */
export default function LocksmithChatFab() {
  const { user } = useAuth();
  const [me, setMe] = useState(null);
  const [open, setOpen] = useState(false);
  const unread = useChatUnread();

  const accountType = user?.account_type || (user?.role === "admin" ? "admin" : "cliente");
  const isChaveiro = accountType === "chaveiro";

  useEffect(() => {
    if (!isChaveiro || !user?.id) return;
    let active = true;
    fetchMyLocksmith(user.id)
      .then((mine) => {
        if (active && mine) setMe(mine);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [isChaveiro, user?.id]);

  if (!isChaveiro || !me) return null;

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setChatUnread(0);
          try { localStorage.setItem(`chat_last_seen_${me.id}`, String(Date.now())); } catch (e) {}
        }}
        aria-label="Mensagens dos clientes"
        className="fixed bottom-20 md:bottom-6 right-4 z-[60] flex items-center gap-2 pl-3 pr-4 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-2xl active:scale-95 transition-all"
      >
        <div className="relative">
          <MessageCircle className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-alert-blink">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </div>
        <span>Mensagens</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-background flex flex-col">
          <div className="flex items-center gap-2 p-3 border-b border-border pt-safe">
            <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-accent" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-heading font-semibold text-foreground">Mensagens dos clientes</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <LocksmithChatConversations me={me} />
          </div>
        </div>
      )}
    </>
  );
}