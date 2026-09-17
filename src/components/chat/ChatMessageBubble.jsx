import React from "react";
import { Trash2 } from "lucide-react";
import ChatMessageContent from "@/components/chat/ChatMessageContent";

export default function ChatMessageBubble({ message, mine, onHide }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`group max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-secondary-foreground"} ${message._pending ? "opacity-60" : ""}`}>
        <ChatMessageContent message={message} />
        {message._error && <div className="mt-0.5 text-[10px]">Falha ao enviar</div>}
        {!message._pending && !message._error && onHide && (
          <button type="button" onClick={() => onHide(message.id)} className="mt-2 flex min-h-[44px] items-center gap-1.5 rounded-lg border border-current/20 px-2 text-xs font-medium" aria-label="Apagar mensagem só para mim">
            <Trash2 className="h-4 w-4" /> Apagar só para mim
          </button>
        )}
      </div>
    </div>
  );
}