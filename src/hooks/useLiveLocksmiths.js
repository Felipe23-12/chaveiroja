import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { loadScoreMap, withScores } from '@/lib/locksmithScore';
import { loadPublicLocksmiths } from '@/lib/publicLocksmiths';
import { safeUnsubscribe } from '@/lib/safeUnsubscribe';
import { useServiceAreas, isAreaAvailable } from '@/lib/serviceAreas';
import { useAuth } from '@/lib/AuthContext';

export default function useLiveLocksmiths() {
  const coverage = useServiceAreas();
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const client = useQueryClient();
  const queryKey = ['publicLocksmiths', 'app', user?.id];
  const query = useQuery({ queryKey, enabled: isAuthenticated && !isLoadingAuth,
    staleTime: 10000, refetchInterval: 30000, refetchOnWindowFocus: true, retry: 1,
    queryFn: async () => {
      const profiles = await loadPublicLocksmiths();
      const scores = await loadScoreMap().catch(() => new Map());
      return withScores(profiles, scores);
    },
  });
  useEffect(() => {
    const refresh = () => client.invalidateQueries({ queryKey: ['publicLocksmiths', 'app'] });
    const unsub = safeUnsubscribe(base44.entities.Locksmith.subscribe(refresh));
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { unsub(); document.removeEventListener('visibilitychange', onVisible); };
  }, [client, user?.id]);
  const filterCoverage = profiles => profiles.filter(l => isAreaAvailable(coverage.areas, l.lat, l.lng));
  const locksmiths = useMemo(() => coverage.loading || coverage.error ? [] : filterCoverage(query.data || []), [query.data, coverage.areas, coverage.loading, coverage.error]);
  const refresh = async () => {
    if (!isAuthenticated || isLoadingAuth) throw new Error('Aguarde a confirmação do login e tente novamente.');
    if (coverage.loading || coverage.error) throw new Error('Não foi possível confirmar a área de atendimento. Tente novamente.');
    const result = await query.refetch({ throwOnError: true });
    return filterCoverage(result.data || []);
  };
  return { locksmiths, refresh, loading: query.isPending || coverage.loading, error: query.error || coverage.error };
}
