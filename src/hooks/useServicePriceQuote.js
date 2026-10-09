import { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import useServiceCoverage from '@/hooks/useServiceCoverage';
import usePriceQuoteConditions from '@/hooks/usePriceQuoteConditions';

export default function useServicePriceQuote(data, requested, revision = 0) {
  const coverage = useServiceCoverage({ lat: data.customer_lat, lng: data.customer_lng }, data.coordinates_confirmed);
  const enabled = requested && coverage.allowed;
  const key = JSON.stringify(data);
  const [state, setState] = useState(null);
  const [retry, setRetry] = useState(0);
  const recalculate = useCallback(() => setRetry(value => value + 1), []);
  const conditionError = useCallback(error => {
    setState(previous => previous ? { ...previous, error: error?.response?.data?.error || error?.data?.error || error.message || 'Não foi possível verificar as condições do serviço.' } : previous);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await base44.functions.invoke("serviceTrust", { action: "price_quote", data: JSON.parse(key) });
        if (!cancelled) setState({ key, revision, retry, pricing: response.data.pricing });
      } catch (error) {
        if (!cancelled) setState({ key, revision, retry, error: error?.response?.data?.error || error?.data?.error || error.message || "Não foi possível calcular o valor." });
      }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, enabled, revision, retry]);
  const current = enabled && state?.key === key && state?.revision === revision ? state : null;
  const loading = enabled && (!current || current.retry !== retry);
  usePriceQuoteConditions(enabled && !loading, key, current?.pricing?.conditions_fingerprint, recalculate, conditionError);
  // No periodic recalculation: retain the quote until inputs or verified conditions change.
  return { pricing: current?.pricing, error: current?.retry === retry ? current.error : undefined, loading, retry: recalculate };
}