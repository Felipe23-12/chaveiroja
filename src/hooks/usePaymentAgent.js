import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function usePaymentAgent() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    base44.agents.createConversation({
      agent_name: "payment_support_assistant",
      metadata: { name: "Dúvidas sobre pagamentos", description: "Atendimento financeiro Chaveiro Já" },
    }).then((created) => {
      setConversation(created);
      setMessages(created.messages || []);
    }).catch((e) => setError(e.message || "Não foi possível abrir o assistente."));
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    return safeUnsubscribe(
      base44.agents.subscribeToConversation(conversation.id, (data) => {
        setMessages(data.messages || []);
        setConversation(data);
      })
    );
  }, [conversation?.id]);

  const send = async (content) => {
    const text = content.trim();
    if (!text || !conversation || sending) return;
    setSending(true);
    setError("");
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } catch (e) {
      setError(e.message || "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  };

  return { messages, sending, error, ready: Boolean(conversation), send };
}