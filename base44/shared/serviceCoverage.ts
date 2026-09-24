import { loadServiceAreas, isAreaAvailable } from './serviceAreas.ts';

export const COVERAGE_MESSAGE = 'Esta região ainda não está atendida. Selecione um endereço em uma área liberada.';

export function coverageError() {
  return Object.assign(new Error(COVERAGE_MESSAGE), { code: 'AREA_UNAVAILABLE' });
}

// No default coordinates, regional table, radius or provider can authorize a customer address.
export async function requireServiceCoverage(base44, lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw coverageError();
  let areas;
  try { areas = await loadServiceAreas(base44); } catch { throw coverageError(); }
  if (!isAreaAvailable(areas, lat, lng)) throw coverageError();
  return areas;
}