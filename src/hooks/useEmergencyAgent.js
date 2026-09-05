import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function useEmergencyAgent() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    if (conversation) return conversation;
    try {
      const created = await base44.agents.createConversation({
        agent_name: "emergency_service_assistant",
        metadata: { name: "Emergência com fechadura", description: "Atendimento emergencial Chaveiro Já" },
      });
      setConversation(created);
      setMessages(created.messages || []);
      return created;
    } catch (e) {
      setError(e.message || "Não foi possível iniciar o atendimento agora. Tente novamente.");
      return null;
    }
  };

  const send = async (content) => {
    const text = content.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    try {
      const active = await start();
      if (!active) return;
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      await base44.agents.addMessage(active, { role: "user", content: text });
      // Fallback: se a assinatura em tempo real falhar (comum em WebView),
      // busca a conversa periodicamente até a resposta do assistente chegar.
      const before = (active.messages || []).length;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        const latest = await base44.agents.getConversation(active.id);
        const msgs = latest.messages || [];
        setMessages(msgs);
        setConversation(latest);
        if (msgs.length > before + 1 && msgs[msgs.length - 1].role === "assistant") break;
      }
    } catch (e) {
      setError(e.message || "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!conversation?.id) return;
    try {
      const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
        setMessages(data.messages || []);
        setConversation(data);
      });
      return safeUnsubscribe(unsubscribe);
    } catch (e) {
      return undefined;
    }
  }, [conversation?.id]);

  return { messages, sending, error, start, send };
}