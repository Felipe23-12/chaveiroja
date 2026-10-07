import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useServiceAreas, isAreaAvailable } from '@/lib/serviceAreas';
import { haversineKm } from '@/lib/geo';
import { preserveFinancials } from '@/lib/myLocksmith';
export default function useLocksmithCoverage(me, setMe) {
  const coverage = useServiceAreas();
  const allowed = !coverage.loading && !coverage.error && isAreaAvailable(coverage.areas, me?.lat, me?.lng);
  // Nunca desconecta usando coordenadas antigas do perfil. A cobertura é
  // revalidada no servidor somente após uma leitura GPS recente e precisa.
  useEffect(() => {
    if (!me?.online || !navigator.geolocation) return;
    let last = { lat: me.lat, lng: me.lng }, lastSavedAt = 0, saving = false, mounted = true;
    const watchId = navigator.geolocation.watchPosition(async ({ coords, timestamp }) => {
      const lat = coords.latitude, lng = coords.longitude;
      if (!mounted || saving || ![lat, lng, coords.accuracy].every(Number.isFinite) || coords.accuracy > 100 || Date.now() - timestamp > 30000) return;
      const elapsed = Date.now() - lastSavedAt;
      if (elapsed < 5000 || (elapsed < 30000 && haversineKm(last, { lat, lng }) <= 0.05)) return;
      saving = true;
      try {
        const { data } = await base44.functions.invoke('serviceTrust', { action: 'locksmith_location', locksmith_id: me.id, lat, lng });
        last = { lat, lng }; lastSavedAt = Date.now();
        if (mounted) setMe(prev => prev?.id === me.id ? preserveFinancials(prev, data.locksmith) : prev);
      } finally { saving = false; }
    }, () => {}, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    return () => { mounted = false; navigator.geolocation.clearWatch(watchId); };
  }, [me?.id, me?.online]);
  return { ...coverage, allowed };
}