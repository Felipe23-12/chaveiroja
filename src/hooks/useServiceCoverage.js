import { useEffect, useState } from 'react';
import { useServiceAreas, isAreaAvailable } from '@/lib/serviceAreas';

export default function useServiceCoverage(location, confirmed = false) {
  const coverage = useServiceAreas();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const allowed = online && confirmed === true && !coverage.loading && !coverage.error &&
    isAreaAvailable(coverage.areas, location?.lat, location?.lng);
  return { ...coverage, allowed };
}