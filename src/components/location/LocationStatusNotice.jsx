import React, { useEffect, useState } from "react";
import { Crosshair, Loader2, MapPinOff } from "lucide-react";

export default function LocationStatusNotice({ status, error, accuracy, hasFix, onRetry }) {
  // O hook agora expõe hasFix; se o consumidor passar, usamos. Caso contrário
  // (telas que ainda passam só status/error/accuracy), acompanhamos internamente
  // quando o status fica "ready" pela primeira vez — assim não dependemos de
  // mudanças nos componentes que já usam este aviso.
  const [internalFix, setInternalFix] = useState(false);
  useEffect(() => {
    if (status === "ready") setInternalFix(true);
  }, [status]);
  const fixed = hasFix !== undefined ? hasFix : internalFix;

  // Antes da primeira leitura: mostra "Buscando localização precisa…" (locating).
  // Depois da primeira leitura (fixed): a localização já é utilizável, então o
  // aviso amber de baixa precisão só reaparece de forma discreta se a precisão
  // for muito ruim (acima de 1000 m) — sem dar sensação de tela travada carregando.
  const locating = status === "locating";
  if (!locating && status !== "fallback") {
    const lowAccuracy = !fixed || (accuracy && accuracy > 1000);
    if (!lowAccuracy) return null;
  }
  const poor = fixed && accuracy && accuracy > 1000;
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${locating ? "border-border bg-muted/50" : "border-warning/40 bg-warning/10 text-warning"}`}>
      {locating ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-primary" /> : <MapPinOff className="mt-0.5 h-4 w-4 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{locating ? "Buscando localização precisa…" : error || (poor ? `Precisão atual aproximada: ${accuracy} m.` : "Ative a localização precisa ou informe o endereço manualmente.")}</p>
        {!locating && <p className="mt-0.5 text-xs">Ative a localização precisa do Android ou informe o endereço manualmente.</p>}
      </div>
      {!locating && onRetry && <button type="button" onClick={onRetry} className="min-h-[44px] shrink-0 rounded-lg px-3 font-semibold text-foreground active:bg-warning/15"><Crosshair className="mr-1 inline h-4 w-4" />Tentar</button>}
    </div>
  );
}