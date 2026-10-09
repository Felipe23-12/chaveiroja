import { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import useServiceCoverage from '@/hooks/useServiceCoverage';

export default function useServicePriceQuote(data, requested, revision = 0) {
  const coverage = useServiceCoverage({ lat: data.customer_lat, lng: data.customer_lng }, data.coordinates_confirmed);
  const enabled = requested && coverage.allowed;
  const key = JSON.stringify(data);
  const [state, setState] = useState(null);
  const [retry, setRetry] = useState(0);
  const pending = useRef(0);
  const lastStarted = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => {
      if (document.visibilityState !== 'hidden' && pending.current === 0 && Date.now() - lastStarted.current > 1000) {
        lastStarted.current = Date.now();
        setRetry(value => value + 1);
      }
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [enabled]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      pending.current += 1;
      lastStarted.current = Date.now();
      try {
        const response = await base44.functions.invoke("serviceTrust", { action: "price_quote", data: JSON.parse(key) });
        if (!cancelled) setState({ key, revision, retry, pricing: response.data.pricing });
      } catch (error) {
        if (!cancelled) setState({ key, revision, retry, error: error?.response?.data?.error || error?.data?.error || error.message || "Não foi possível calcular o valor." });
      } finally {
        pending.current -= 1;
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, enabled, revision, retry]);
  const current = enabled && state?.key === key && state?.revision === revision ? state : null;
  // Keep the matching preview during background refresh; submission still revalidates the price on the server.
  return { pricing: current?.pricing, error: current?.retry === retry ? current.error : undefined, loading: enabled && (!current || current.retry !== retry), retry: () => setRetry((value) => value + 1) };
}