import { useEffect, useRef, useState } from 'react';
import { fetchDrivingRoute, etaMinutes } from '@/lib/geo';

export default function useLiveDrivingRoute(request) {
  const latest = useRef(request);
  latest.current = request;
  const refreshRef = useRef(() => {});
  const [result, setResult] = useState(null);
  const enabled = ['accepted', 'on_the_way'].includes(request?.status);
  const key = `${request?.id}:${request?.customer_lat}:${request?.customer_lng}:${enabled}`;
  useEffect(() => {
    if (!enabled) { refreshRef.current = () => {}; return; }
    let stopped = false, running = false, timer, lastOrigin;
    const refresh = async () => {
      if (stopped || running || document.visibilityState === 'hidden') return;
      clearTimeout(timer);
      const current = latest.current;
      const origin = `${current?.locksmith_lat}:${current?.locksmith_lng}`;
      if ([current?.locksmith_lat, current?.locksmith_lng, current?.customer_lat, current?.customer_lng].every(Number.isFinite) && origin !== lastOrigin) {
        running = true;
        const route = await fetchDrivingRoute(
          { lat: current.locksmith_lat, lng: current.locksmith_lng },
          { lat: current.customer_lat, lng: current.customer_lng }
        );
        if (!stopped && route) {
          lastOrigin = origin;
          setResult({ key, route });
        }
        running = false;
      }
      if (!stopped) timer = setTimeout(refresh, 3000);
    };
    refreshRef.current = refresh;
    refresh();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('online', refresh);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [key, enabled]);
  useEffect(() => { refreshRef.current(); }, [request?.locksmith_lat, request?.locksmith_lng]);
  const route = result?.key === key ? result.route : null;
  return { routePath: route?.coordinates ?? null, routeEta: route ? etaMinutes(route.duration) : null, routeDistanceKm: route ? route.distance / 1000 : null };
}