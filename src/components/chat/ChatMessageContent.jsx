import React from "react";
import { Image } from "@/components/ui/image";

export default function ChatMessageContent({ message }) {
  const safePhotoUrl = (() => {
    try {
      const url = new URL(message.photo_url);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="space-y-1.5">
      {safePhotoUrl && (
        <a href={safePhotoUrl} target="_blank" rel="noreferrer" className="block">
          <Image
            src={safePhotoUrl}
            alt="Foto enviada na conversa"
            fittingType="fit"
            className="w-52 max-w-full h-40 rounded-lg bg-muted"
          />
        </a>
      )}
      {message.message && message.message !== "Foto" && <p className="whitespace-pre-wrap break-words">{message.message}</p>}
      {safePhotoUrl && message.message === "Foto" && <p className="text-xs opacity-80">Foto</p>}
    </div>
  );
}