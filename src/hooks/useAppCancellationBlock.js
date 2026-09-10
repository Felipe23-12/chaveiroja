import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { getKeyCancelBlock } from "@/lib/keyCancelBlock";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";

export default function useAppCancellationBlock(requestStatus) {
  const [block, setBlock] = useState(null);
  useEffect(() => {
    let disposed = false;
    const load = async () => {
      const user = await base44.auth.me();
      const next = await getKeyCancelBlock(user.id);
      if (!disposed) setBlock(next);
    };
    load();
    const timer = setInterval(load, 60000);
    const unsubscribe = safeUnsubscribe(base44.entities.ClientCancellationEvent.subscribe(load));
    window.addEventListener("focus", load);
    return () => { disposed = true; clearInterval(timer); unsubscribe(); window.removeEventListener("focus", load); };
  }, [requestStatus]);
  return block;
}