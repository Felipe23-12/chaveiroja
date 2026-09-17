import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Image } from "@/components/ui/image";

export default function AdminChatEvidence({ report }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const load = async () => {
    if (!report.locksmith_id) return setMessages([]);
    const rows = await base44.entities.ChatMessage.filter({ locksmith_id: report.locksmith_id }, "created_date");
    const parties = new Set([report.reporter_id, report.reported_id]);
    setMessages(rows.filter((row) => parties.has(row.client_id) || parties.has(row.locksmith_user_id)));
  };
  const toggle = async () => {
    if (!open) await load();
    setOpen((value) => !value);
  };
  return <div className="mt-3"><button type="button" onClick={toggle} className="min-h-[44px] text-sm font-semibold text-primary underline">{open ? "Fechar histórico preservado" : "Ver mensagens preservadas"}</button>{open && <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">{messages.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma mensagem encontrada nesta conversa.</p> : messages.map((message) => <div key={message.id} className="rounded-lg border bg-card p-2 text-sm"><p className="text-[10px] font-semibold text-muted-foreground">{message.sender_name || message.sender_type} · {new Date(message.created_date).toLocaleString("pt-BR")}</p>{message.photo_url && <Image src={message.photo_url} alt="Evidência da conversa" fittingType="fit" className="my-2 h-32 w-full rounded" />}{message.message && <p className="whitespace-pre-wrap break-words">{message.message}</p>}</div>)}</div>}</div>;
}