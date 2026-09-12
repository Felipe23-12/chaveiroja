import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getKeyCancelBlock } from "@/lib/keyCancelBlock";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function useAppCancellationBlock(requestStatus) {
  const [block, setBlock] = useState(null);
  useEffect(() => {
    let disposed = false;
    let loading = false;
    const load = async () => {
      if (disposed || loading || navigator.onLine === false) return;
      loading = true;
      try {
        const user = await base44.auth.me();
        if (disposed) return;
        const next = await getKeyCancelBlock(user.id);
        if (!disposed) setBlock(next);
      } catch (error) {
        // Mantém o último bloqueio conhecido; falha de rede não libera o cliente.
        if (!disposed) console.warn("Não foi possível atualizar o bloqueio por cancelamentos:", error?.message);
      } finally {
        loading = false;
      }
    };
    load();
    const timer = setInterval(load, 60000);
    const unsubscribe = safeUnsubscribe(base44.entities.ClientCancellationEvent.subscribe(load));
    const unsubscribeSafety = safeUnsubscribe(base44.entities.ClientSafetyBlock.subscribe(load));
    window.addEventListener("focus", load);
    window.addEventListener("online", load);
    return () => {
      disposed = true;
      clearInterval(timer);
      unsubscribe();
      unsubscribeSafety();
      window.removeEventListener("focus", load);
      window.removeEventListener("online", load);
    };
  }, [requestStatus]);
  return block;
}