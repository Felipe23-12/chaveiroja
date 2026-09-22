import { base44 } from '@/api/base44Client';

export function pointInArea(lat, lng, area) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return false;
  const x = Number(lng), y = Number(lat);
  for (const ring of area.polygons || []) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    if (inside) return true;
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

export const isAreaAvailable = (areas, lat, lng) => !areas.length || areas.some(area => pointInArea(lat, lng, area));
export const AREA_UNAVAILABLE = 'Esta área ainda não está disponível para atendimento.';

export function useServiceAreas() {
  const React = requireReact();
  const [areas, setAreas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    let mounted = true;
    const load = () => base44.entities.ServiceArea.filter({ active: true }, '-created_date', 100).then(rows => { if (mounted) { setAreas(rows); setLoading(false); } }).catch(() => { if (mounted) setLoading(false); });
    load();
    const unsubscribe = base44.entities.ServiceArea.subscribe(load);
    return () => { mounted = false; unsubscribe?.(); };
  }, []);
  return { areas, loading };
}