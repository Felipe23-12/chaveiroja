import { useEffect, useState } from 'react';
import { useServiceAreas, isAreaAvailable, AREA_UNAVAILABLE } from '@/lib/serviceAreas';

export default function useServiceCoverage(location, confirmed = false) {
  const coverage = useServiceAreas();
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const known = confirmed === true && Number.isFinite(location?.lat) && Number.isFinite(location?.lng) && Math.abs(location.lat) <= 90 && Math.abs(location.lng) <= 180;
  // Ausência de GPS, falha de rede e consulta pendente não significam falta de cobertura.
  const status = !online ? 'offline' : !known ? 'unknown' : coverage.loading ? 'checking'
    : coverage.error ? 'error' : isAreaAvailable(coverage.areas, location.lat, location.lng) ? 'available' : 'unavailable';
  const message = {
    offline: 'Sem conexão. Reconecte-se para verificar a área de atendimento.',
    unknown: 'Confirme o endereço do atendimento nas sugestões ou use sua localização atual para verificar a cobertura.',
    checking: 'Verificando área de atendimento…',
    error: 'Não foi possível verificar a cobertura agora. Tente novamente.',
    available: '',
    unavailable: AREA_UNAVAILABLE,
  }[status];
  return { ...coverage, allowed: status === 'available', status, message };
}