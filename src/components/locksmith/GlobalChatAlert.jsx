import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { MessageCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
    osc.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch (e) {
    // silencioso
  }
}

/**
 * Alerta flutuante global para o chaveiro no modo livre: dispara som + toast
 * quando chega uma nova mensagem de cliente (independente da página atual) e
 * mostra um botão com o contador de não lidas que leva ao chat.
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
    const load = () =>
      base44.entities.ChatMessage
        .filter({ locksmith_id: locksmith.id }, "created_date")
        .then((list) => {
          const customerMsgs = list.filter((m) => m.sender_type === "customer");
          if (!initialized.current) {
            // Primeira carga: marca tudo como já visto (não notifica o histórico)
            customerMsgs.forEach((m) => seenIds.current.add(m.id));
            initialized.current = true;
          } else {
            const newMsgs = customerMsgs.filter((m) => !seenIds.current.has(m.id));
            if (newMsgs.length > 0) {
              newMsgs.forEach((m) => seenIds.current.add(m.id));
              const latest = newMsgs[newMsgs.length - 1];
              playBeep();
              if (navigator.vibrate) navigator.vibrate(200);
              toast({
                title: "💬 Nova mensagem de cliente",
                description: `${latest.sender_name || "Cliente"}: ${latest.message?.slice(0, 60) || "..."}`,
              });
              setUnread((prev) => prev + newMsgs.length);
            }
          }
        })
        .catch(() => {});
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return unsub;
  }, [locksmith?.id, locksmith?.work_mode]);

  // Zera o contador quando o chaveiro está visualizando o painel (chat visível)
  useEffect(() => {
    if (location.pathname === "/painel-chaveiro") setUnread(0);
  }, [location.pathname]);

  if (!isChaveiro || !locksmith || unread === 0) return null;

  return (
    <button
      onClick={() => {
        setUnread(0);
        navigate("/painel-chaveiro");
      }}
      className="fixed bottom-20 right-4 z-[60] flex items-center gap-2 pl-3 pr-4 h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-2xl active:scale-95 transition-all"
    >
      <div className="relative">
        <MessageCircle className="w-5 h-5" />
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 9 ? "9+" : unread}
        </span>
      </div>
      <span>Mensagens</span>
    </button>
  );
}