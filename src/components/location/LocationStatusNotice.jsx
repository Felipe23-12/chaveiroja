import React from "react";
import { Crosshair, Loader2, MapPinOff } from "lucide-react";

export default function LocationStatusNotice({ status, error, accuracy, onRetry }) {
  if (status === "ready" && (!accuracy || accuracy <= 100)) return null;
  const locating = status === "locating";
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${locating ? "border-border bg-muted/50" : "border-amber-300 bg-amber-50 text-amber-900"}`}>
      {locating ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" /> : <MapPinOff className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{locating ? "Buscando localização precisa…" : error || `Precisão atual aproximada: ${accuracy} m.`}</p>
        {!locating && <p className="mt-0.5 text-xs">Ative a localização precisa do Android ou informe o endereço manualmente.</p>}
      </div>
      {!locating && onRetry && <button type="button" onClick={onRetry} className="min-h-[44px] shrink-0 rounded-lg px-3 font-semibold text-foreground active:bg-amber-100"><Crosshair className="mr-1 inline h-4 w-4" />Tentar</button>}
    </div>
  );
}