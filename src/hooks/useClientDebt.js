import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getClientDebt } from "@/lib/clientDebt";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

/** Observa em tempo real se o cliente logado tem taxa de cancelamento em aberto. */
export default function useClientDebt() {
  const [debt, setDebt] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const u = await base44.auth.me();
      setDebt(await getClientDebt(u?.id));
    } catch {
      setDebt(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsub = base44.entities.ServiceRequest.subscribe(() => refresh());
    return safeUnsubscribe(unsub);
  }, [refresh]);

  return { debt, loaded, refresh };
}