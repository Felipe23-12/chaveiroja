import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

export default function useServicePriceQuote(data, enabled, revision = 0) {
  const key = JSON.stringify(data);
  const [state, setState] = useState(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState(null);
    const timer = setTimeout(async () => {
      try {
        const response = await base44.functions.invoke("serviceTrust", { action: "price_quote", data: JSON.parse(key) });
        if (!cancelled) setState({ key, revision, retry, pricing: response.data.pricing });
      } catch (error) {
        if (!cancelled) setState({ key, revision, retry, error: error?.response?.data?.error || error.message || "Não foi possível calcular o valor." });
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, enabled, revision, retry]);
  const current = enabled && state?.key === key && state?.revision === revision && state?.retry === retry ? state : null;
  return { pricing: current?.pricing, error: current?.error, loading: enabled && !current, retry: () => setRetry((value) => value + 1) };
}