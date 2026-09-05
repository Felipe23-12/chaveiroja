/**
 * Estimativa de tempo de chegada (ETA) a partir da distância em km.
 *
 * Usa uma velocidade média urbana com penalidade para trajetos curtos
 * (semáforos, manobras) e um tempo fixo de preparo/saída do chaveiro.
 */
const PREP_MINUTES = 4;

export function estimateEtaMinutes(distanceKm) {
  if (distanceKm == null || isNaN(distanceKm)) return null;
  // Velocidade média: mais baixa em trajetos curtos (trânsito urbano)
  const avgSpeedKmh = distanceKm <= 3 ? 18 : distanceKm <= 10 ? 26 : 38;
  const travel = (distanceKm / avgSpeedKmh) * 60;
  return Math.max(3, Math.round(travel + PREP_MINUTES));
}

export function formatEta(minutes) {
  if (minutes == null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}