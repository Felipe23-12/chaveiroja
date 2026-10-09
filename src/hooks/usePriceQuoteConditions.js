import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function usePriceQuoteConditions(enabled, key, fingerprint, onChange, onError) {
  useEffect(() => {
    if (!enabled || !fingerprint) return;
    let cancelled = false;
    let checking = false;
    let lastChecked = 0;
    const check = async () => {
      if (cancelled || checking || document.visibilityState === 'hidden' || Date.now() - lastChecked < 1000) return;
      checking = true;
      lastChecked = Date.now();
      try {
        const data = JSON.parse(key);
        const response = await base44.functions.invoke('serviceTrust', {
          action: 'price_quote_conditions',
          data: { service_type: data.service_type, customer_lat: data.customer_lat, customer_lng: data.customer_lng },
        });
        if (!cancelled && response.data.fingerprint !== fingerprint) onChange();
      } catch (error) {
        if (!cancelled) onError(error);
      } finally { checking = false; }
    };
    const timer = setInterval(check, 60000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [enabled, key, fingerprint, onChange, onError]);
}