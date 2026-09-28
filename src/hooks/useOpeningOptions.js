import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
export default function useOpeningOptions(vehicle, enabled) {
  const key = JSON.stringify({ make: vehicle?.make, model: vehicle?.model, year: vehicle?.year, version: vehicle?.version || '' });
  const [state, setState] = useState(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await base44.functions.invoke('serviceTrust', { action: 'opening_options', vehicle: JSON.parse(key) });
        if (!cancelled) setState({ key, ...data });
      } catch (e) { if (!cancelled) setState({ key, error: e?.response?.data?.error || 'Não foi possível consultar as opções de abertura.' }); }
    };
    const timer = setTimeout(load, 250);
    const interval = setInterval(load, 30000);
    return () => { cancelled = true; clearTimeout(timer); clearInterval(interval); };
  }, [key, enabled, revision]);
  return { ...(enabled && state?.key === key ? state : {}), loading: enabled && state?.key !== key, retry: () => setRevision(v => v + 1) };
}
