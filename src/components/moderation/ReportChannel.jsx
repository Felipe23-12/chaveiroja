import React, { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function ReportChannel({ report, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);
  useEffect(() => {
    const load = () => base44.entities.ReportMessage.filter({ report_id: report.id }, "created_date").then(setMessages);
    load();
    return safeUnsubscribe(base44.entities.ReportMessage.subscribe(load));
  }, [report.id]);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    setError("");
    const value = text.trim();
    try {
      const response = await base44.functions.invoke("reportChannel", { action: "sendMessage", reportId: report.id, message: value });
      setMessages((list) => list.some((m) => m.id === response.data.message.id) ? list : [...list, response.data.message]);
      setText("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Não foi possível enviar.");
    } finally {
      setSending(false);
    }
  };
  return <div className="mt-3 rounded-xl border border-border overflow-hidden">
    <div className="h-64 overflow-y-auto space-y-2 bg-muted/20 p-3">
      {messages.map((m) => <div key={m.id} className={`flex ${m.sender_id === currentUser?.id ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.sender_role === "system" ? "bg-amber-100 text-amber-900" : m.sender_id === currentUser?.id ? "bg-primary text-primary-foreground" : "bg-card border"}`}><p className="mb-1 text-[10px] font-semibold opacity-70">{m.sender_name}</p><p className="whitespace-pre-wrap">{m.message}</p></div></div>)}
      <div ref={endRef} />
    </div>
    {error && <p className="border-t bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
    <form onSubmit={send} className="flex gap-2 border-t p-3"><Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva sua mensagem ou defesa..." rows={2} disabled={sending} /><Button type="submit" size="icon" disabled={sending || !text.trim()}><Send /></Button></form>
  </div>;
}