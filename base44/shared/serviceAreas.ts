export function pointInArea(lat, lng, area) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Math.abs(Number(lat)) > 90 || Math.abs(Number(lng)) > 180) return false;
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
    const km = Math.hypot((x - a[0]) * scale - t * dx, (y - a[1]) - t * dy) * 111.2;
    if (km * 1000 <= (area.street_radius_m || 120)) return true;
  }
  return false;
}

export async function loadServiceAreas(base44) {
  return await base44.asServiceRole.entities.ServiceArea.filter({ active: true }, '-created_date', 100);
}

export function isAreaAvailable(areas, lat, lng) {
  // Before the first area is configured, existing coverage remains unchanged.
  return !areas.length || areas.some(area => pointInArea(lat, lng, area));
}