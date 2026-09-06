import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import EmergencyAgentMessage from "@/components/emergency/EmergencyAgentMessage";
import usePaymentAgent from "@/hooks/usePaymentAgent";

export default function PaymentAgentPanel() {
  const { messages, sending, error, ready, send } = usePaymentAgent();
  const [text, setText] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    send(text);
    setText("");
  };
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="h-[min(55vh,30rem)] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <div className="max-w-[85%] rounded-2xl bg-muted p-3 text-sm text-foreground">Olá! Posso consultar seus pagamentos e explicar cada status. Como posso ajudar?</div>}
        {messages.map((message, index) => <EmergencyAgentMessage key={message.id || index} message={message} />)}
        {sending && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3 pb-safe">
        <input value={text} onChange={(e) => setText(e.target.value)} disabled={!ready || sending} placeholder="Ex.: Meu pagamento foi confirmado?" className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-input bg-background px-3 text-sm" />
        <button disabled={!ready || sending || !text.trim()} aria-label="Enviar pergunta" className="min-w-[44px] min-h-[44px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>
    </div>
  );
}