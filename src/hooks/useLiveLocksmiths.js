import { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { loadScoreMap, withScores } from "@/lib/locksmithScore";
import { safeUnsubscribe } from "@/lib/safeUnsubscribe";
import { useServiceAreas, isAreaAvailable } from '@/lib/serviceAreas';

export default function useLiveLocksmiths() {
  const [locksmiths, setLocksmiths] = useState([]);
  const coverage = useServiceAreas();

  useEffect(() => {
    let active = true;

    const load = async () => {
      const { data } = await base44.functions.invoke('serviceTrust', { action: 'public_locksmiths' });
      const profiles = data.items;
      if (!active) return;
      setLocksmiths(withScores(profiles, new Map()));
      const scores = await loadScoreMap().catch(() => new Map());
      if (active) setLocksmiths(withScores(profiles, scores));
    };

    const onEvent = () => load().catch(() => {});

    const refresh = () => load().catch(() => {});
    refresh();
    const unsubscribe = safeUnsubscribe(base44.entities.Locksmith.subscribe(onEvent));
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      active = false;
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return useMemo(() => coverage.loading || coverage.error ? [] : locksmiths.filter(l => isAreaAvailable(coverage.areas, l.lat, l.lng)), [locksmiths, coverage.areas, coverage.loading, coverage.error]);
}