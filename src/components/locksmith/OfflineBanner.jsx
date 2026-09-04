import React from "react";
import { WifiOff, CloudUpload } from "lucide-react";

/**
 * Aviso compacto de conexão instável: informa que o chamado exibido vem do
 * cache do aparelho e quantas ações estão aguardando envio.
 */
export default function OfflineBanner({ pendingCount = 0 }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 text-xs">
      <WifiOff className="w-4 h-4 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold">Sem conexão — dados salvos no aparelho</p>
        {pendingCount > 0 && (
          <p className="flex items-center gap-1 mt-0.5">
            <CloudUpload className="w-3.5 h-3.5" />
            {pendingCount} ação{pendingCount > 1 ? "ões" : ""} será enviada ao reconectar
          </p>
        )}
      </div>
    </div>
  );
}