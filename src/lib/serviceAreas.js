import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { safeUnsubscribe } from '@/lib/safeUnsubscribe';
import { base44 } from '@/api/base44Client';
const EMPTY_AREAS = [];

export function validAreaGeometry(area) {
  const validLine = line => Array.isArray(line) && line.length >= 2 && line.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90);
  const validRing = ring => validLine(ring) && ring.length >= 4 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  if (!area || !Array.isArray(area.polygons || []) || !Array.isArray(area.lines || []) || !(area.polygons || []).every(validRing) || !(area.lines || []).every(validLine)) return false;
  if (area.polygon_holes && (!Array.isArray(area.polygon_holes) || !area.polygon_holes.every(holes => Array.isArray(holes) && holes.every(validRing)))) return false;
  if (area.street_radius_m != null && (!Number.isFinite(area.street_radius_m) || area.street_radius_m <= 0)) return false;
  return Boolean(area.polygons?.length || area.lines?.length);
}

export function pointInArea(lat, lng, area) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || !validAreaGeometry(area)) return false;
  const x = Number(lng), y = Number(lat);
  for (const [index, ring] of (area.polygons || []).entries()) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    if (inside && !(area.polygon_holes?.[index] || []).some(hole => pointInArea(lat, lng, { polygons: [hole] }))) return true;
  }
  const scale = Math.cos(y * Math.PI / 180);
  for (const line of area.lines || []) for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const dx = (b[0] - a[0]) * scale, dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, (((x - a[0]) * scale * dx + (y - a[1]) * dy) / (dx * dx + dy * dy || 1))));
    if (Math.hypot((x - a[0]) * scale - t * dx, (y - a[1]) - t * dy) * 111200 <= (area.street_radius_m || 120)) return true;
  }
  return false;
}

export function isAreaAvailable(areas, lat, lng) {
  try { return Array.isArray(areas) && areas.filter(area => area?.active === true).every(validAreaGeometry) && areas.some(area => area?.active === true && pointInArea(lat, lng, area)); }
  catch { return false; }
}
export const AREA_UNAVAILABLE = 'Esta região ainda não está atendida. Selecione um endereço em uma área liberada.';

export function useServiceAreas() {
  const client = useQueryClient();
  const query = useQuery({ queryKey: ['serviceAreas'], staleTime: 30000, refetchInterval: 30000, refetchOnWindowFocus: true, queryFn: async () => {
    const rows = [];
    for (let skip = 0; ; skip += 100) {
      const page = await base44.entities.ServiceArea.list('-created_date', 100, skip);
      rows.push(...page); if (page.length < 100) return rows;
    }
  } });
  useEffect(() => safeUnsubscribe(base44.entities.ServiceArea.subscribe(() => client.invalidateQueries({ queryKey: ['serviceAreas'] }))), [client]);
  return { areas: query.data || EMPTY_AREAS, loading: query.isPending, checking: query.isFetching, error: query.error };
}