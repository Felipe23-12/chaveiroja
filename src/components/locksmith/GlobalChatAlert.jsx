import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { setChatUnread } from "@/lib/chatUnreadStore";
import { playNotificationSound } from "@/lib/notificationSound";
import { ensureNotificationPermission, notifyClient } from "@/lib/clientNotifications";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import { loadChatReadStates } from "@/lib/chatReadState";
import { loadHiddenMessageIds } from "@/lib/chatVisibility";
import useBlockedUsers from "@/hooks/useBlockedUsers";

/**
 * Alerta flutuante global para o chaveiro: dispara o som de notificação +
 * toast quando chega uma nova mensagem de cliente (em qualquer página) e
 * mostra um botão com o contador de não lidas. O contador é persistido
 * (localStorage) por chaveiro, então mensagens recebidas enquanto o app
 * estava fechado continuam contando.
 */
export default function GlobalChatAlert() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [locksmith, setLocksmith] = useState(null);
  const { blockedIds, loading: blocksLoading } = useBlockedUsers();
  const seenIds = useRef(new Set());
  const initialized = useRef(false);
  const loading = useRef(false);

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
    // Garante a permissão de notificação nativa no celular
    ensureNotificationPermission();
    initialized.current = false;
    seenIds.current.clear();
    setChatUnread(0);
    const load = async () => {
      if (loading.current || blocksLoading) return;
      loading.current = true;
      try {
        const [list, readStates, hidden] = await Promise.all([
          base44.entities.ChatMessage.filter({ locksmith_id: locksmith.id }, "created_date"),
          loadChatReadStates(user.id),
          loadHiddenMessageIds(user.id),
        ]);
          const customerMsgs = list.filter((m) => m.sender_type === "customer" && !blockedIds.has(m.client_id) && !hidden.has(m.id));
          if (!initialized.current) {
            // Primeira carga: conta mensagens recebidas enquanto o chaveiro
            // estava fora (created_date > lastSeen) como não lidas, e marca
            // todas como vistas para a detecção em tempo real das próximas.
            let initialUnread = 0;
            customerMsgs.forEach((m) => {
              seenIds.current.add(m.id);
              const ts = new Date(m.created_date).getTime();
              const persistentReadAt = readStates.get(`${locksmith.id}:${m.client_id}`);
              const readAt = persistentReadAt ? Date.parse(persistentReadAt) : 0;
              if (ts > readAt) initialUnread++;
            });
            initialized.current = true;
            setChatUnread(initialUnread);
          } else {
            const newMsgs = customerMsgs.filter((m) => !seenIds.current.has(m.id));
            newMsgs.forEach((m) => seenIds.current.add(m.id));
            const unreadMsgs = newMsgs.filter((m) => {
              const readAt = readStates.get(`${locksmith.id}:${m.client_id}`);
              return new Date(m.created_date).getTime() > (readAt ? Date.parse(readAt) : 0);
            });
            if (unreadMsgs.length > 0) {
              const latest = unreadMsgs[unreadMsgs.length - 1];
              playNotificationSound();
              if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
              notifyClient(
                `💬 ${latest.sender_name || "Cliente"}`,
                latest.message?.slice(0, 140) || "Nova mensagem recebida"
              );
              toast({
                title: "💬 Nova mensagem de cliente",
                description: `${latest.sender_name || "Cliente"}: ${latest.message?.slice(0, 60) || "..."}`,
              });
            }
            const totalUnread = customerMsgs.filter((m) => {
              const readAt = readStates.get(`${locksmith.id}:${m.client_id}`);
              return new Date(m.created_date).getTime() > (readAt ? Date.parse(readAt) : 0);
            }).length;
            setChatUnread(totalUnread);
          }
      } catch (error) {
        // Recarrega na próxima alteração quando o servidor voltar a responder.
      } finally {
        loading.current = false;
      }
    };
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    const visibilityUnsub = base44.entities.ChatMessageVisibility.subscribe(() => load());
    const readUnsub = base44.entities.ChatReadState.subscribe(() => load());
    return () => { safeUnsubscribe(unsub)(); safeUnsubscribe(visibilityUnsub)(); safeUnsubscribe(readUnsub)(); };
  }, [locksmith?.id, blockedIds, blocksLoading]);

  // Somente detecção/alerta — a abertura das conversas é feita pelo botão
  // flutuante global (LocksmithChatFab), disponível em qualquer tela.
  return null;
}