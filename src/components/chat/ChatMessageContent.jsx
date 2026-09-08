import React from "react";
import { Image } from "@/components/ui/image";

export default function ChatMessageContent({ message }) {
  return (
    <div className="space-y-1.5">
      {message.photo_url && (
        <a href={message.photo_url} target="_blank" rel="noreferrer" className="block">
          <Image
            src={message.photo_url}
            alt="Foto enviada na conversa"
            fittingType="fit"
            className="w-52 max-w-full h-40 rounded-lg bg-muted"
          />
        </a>
      )}
      {message.message && message.message !== "Foto" && <p className="whitespace-pre-wrap break-words">{message.message}</p>}
      {message.photo_url && message.message === "Foto" && <p className="text-xs opacity-80">Foto</p>}
    </div>
  );
}