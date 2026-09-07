import React from "react";
import { MessageCircle, ChevronRight } from "lucide-react";

/** Lista de conversas salvas do chaveiro — cada item abre a conversa individual. */
export default function ChatConversationList({ conversations, onOpen }) {
  return (
    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
      {conversations.map((c) => (
        <button
          key={c.id}
          onClick={() => onOpen(c.id)}
          className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MessageCircle className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{c.name}</p>
            <p className="text-xs text-muted-foreground">
              {c.count} mensagem{c.count === 1 ? "" : "s"} ·{" "}
              {new Date(c.lastDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}