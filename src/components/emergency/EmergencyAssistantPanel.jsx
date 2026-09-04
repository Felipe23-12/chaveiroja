import { useEffect, useRef, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import EmergencyAgentMessage from "@/components/emergency/EmergencyAgentMessage";

export default function EmergencyAssistantPanel({ messages, sending, error, onSend, onClose }) {
  const [text, setText] = useState("");
  const endRef = useRef(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
  const submit = (event) => {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };
  return (
    <section className="fixed z-50 bottom-24 right-4 left-4 sm:left-auto sm:w-96 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
      <header className="flex items-center justify-between gap-3 bg-foreground text-background px-4 py-3">
        <div><h2 className="font-heading font-bold text-sm">Ajuda de emergência</h2><p className="text-xs opacity-75">Assistente Chaveiro Já</p></div>
        <button onClick={onClose} aria-label="Fechar assistente" className="p-2 rounded-lg hover:bg-background/10"><X className="w-4 h-4" /></button>
      </header>
      <div className="h-80 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && <div className="rounded-2xl bg-muted p-3 text-sm text-foreground">Olá! Você está em segurança agora? Conte brevemente o que aconteceu com a fechadura ou chave.</div>}
        {messages.map((message, index) => <EmergencyAgentMessage key={message.id || index} message={message} />)}
        {sending && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-border p-3 pb-safe">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Descreva sua emergência" className="flex-1 min-w-0 rounded-xl border border-input bg-background px-3 text-sm" />
        <button disabled={sending || !text.trim()} aria-label="Enviar mensagem" className="min-w-[44px] min-h-[44px] rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"><Send className="w-4 h-4" /></button>
      </form>
    </section>
  );
}