import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Chat() {
  const { locksmithId } = useParams();
  const navigate = useNavigate();
  const [locksmith, setLocksmith] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!locksmithId) return;
    base44.entities.Locksmith.get(locksmithId).then(setLocksmith);
    const load = () =>
      base44.entities.ChatMessage.filter({ locksmith_id: locksmithId }, "created_date").then(setMessages);
    load();
    const unsub = base44.entities.ChatMessage.subscribe(() => load());
    return unsub;
  }, [locksmithId]);

  useEffect(() => {
    base44.auth.me().then((u) => setCustomerName(u?.full_name || "Cliente")).catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    const msg = text.trim();
    setText("");
    try {
      await base44.entities.ChatMessage.create({
        locksmith_id: locksmithId,
        locksmith_name: locksmith?.name,
        sender_type: "customer",
        sender_name: customerName,
        message: msg,
      });
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
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Inicie a conversa e negocie o serviço.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.sender_type === "customer";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-sm ${
                  mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"
                }`}
              >
                {m.message}
              </div>
            </div>
          );
        })}
        <div ref={scrollRef} />
      </div>

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
    </div>
  );
}