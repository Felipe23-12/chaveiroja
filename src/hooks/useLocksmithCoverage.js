import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useServiceAreas, isAreaAvailable } from '@/lib/serviceAreas';
import { haversineKm } from '@/lib/geo';
import { preserveFinancials } from '@/lib/myLocksmith';
export default function useLocksmithCoverage(me, setMe) {
  const coverage = useServiceAreas();
  const allowed = !coverage.loading && !coverage.error && isAreaAvailable(coverage.areas, me?.lat, me?.lng);
  useEffect(() => {
    if (!me?.online || coverage.loading || coverage.error || allowed) return;
    base44.functions.invoke('serviceTrust', { action: 'locksmith_location', locksmith_id: me.id, lat: me.lat, lng: me.lng }).then(({ data }) => setMe(prev => preserveFinancials(prev, data.locksmith)));
  }, [me?.id, me?.online, me?.lat, me?.lng, allowed, coverage.loading, coverage.error]);
  useEffect(() => {
    if (!me?.online || !navigator.geolocation) return;
    let last = { lat: me.lat, lng: me.lng }, saving = false, mounted = true;
    const watchId = navigator.geolocation.watchPosition(async ({ coords }) => {
      const lat = coords.latitude, lng = coords.longitude;
      if (saving || haversineKm(last, { lat, lng }) <= 0.05) return;
      saving = true;
      try {
        const { data } = await base44.functions.invoke('serviceTrust', { action: 'locksmith_location', locksmith_id: me.id, lat, lng });
        last = { lat, lng }; if (mounted) setMe(prev => preserveFinancials(prev, data.locksmith));
      } finally { saving = false; }
    }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });
    return () => { mounted = false; navigator.geolocation.clearWatch(watchId); };
  }, [me?.id, me?.online]);
  return { ...coverage, allowed };
}