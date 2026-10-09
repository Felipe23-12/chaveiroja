import { useEffect, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
export default function useAppleReviewSession() {
  const [state, setState] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    const { data } = await base44.functions.invoke('serviceTrust', { action: 'review_snapshot' });
    setState(data);
  }, []);
  useEffect(() => {
    const load = () => refresh().catch(err => setError(err?.response?.data?.error || err.message));
    load(); const timer = setInterval(load, 5000);
    const unsubscribe = base44.entities.ServiceRequest.subscribe(load);
    return () => { clearInterval(timer); unsubscribe(); };
  }, [refresh]);
  const act = async (action, payload = {}) => {
    setBusy(true); setError('');
    try { const { data } = await base44.functions.invoke('serviceTrust', { action, request_id: state?.request?.id, ...payload }); await refresh(); return data; }
    catch (err) { setError(err?.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };
  return { ...state, loading: !state, error, busy, act, refresh };
}