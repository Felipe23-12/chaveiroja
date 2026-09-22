import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { safeUnsubscribe } from '@/lib/safeUnsubscribe';

export default function useQuoteRequests(enabled) {
  const [items, setItems] = useState([]);
  const [remaining, setRemaining] = useState(3);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const { data } = await base44.functions.invoke('quoteOperations', { action: 'list' });
    setItems(data.items || []); setRemaining(data.remaining ?? 3);
    setLoading(false);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    refresh().catch(e => { setError(e?.response?.data?.error || e.message); setLoading(false); });
    return safeUnsubscribe(base44.entities.QuoteRequest.subscribe(() => refresh().catch(() => {})));
  }, [enabled, refresh]);
  const run = async (action, payload = {}) => {
    if (busy) return false;
    setBusy(true); setError('');
    try {
      await base44.functions.invoke('quoteOperations', { action, ...payload });
      await refresh();
      return true;
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Não foi possível concluir.');
      return false;
    } finally { setBusy(false); }
  };
  return { items, remaining, loading, busy, error, refresh, run };
}