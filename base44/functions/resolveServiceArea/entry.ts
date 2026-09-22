import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const accepted = {
  street: ['road', 'residential', 'pedestrian', 'street', 'highway'],
  neighborhood: ['suburb', 'neighbourhood', 'quarter', 'city_district', 'borough'],
  city: ['city', 'town', 'village', 'municipality'],
  state: ['state'],
  country: ['country'],
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Não autenticado' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Apenas administradores podem definir áreas' }, { status: 403 });
    const body = await req.json();
    const scope = String(body.scope || '');
    const query = String(body.query || '').trim();
    if (!accepted[scope] || query.length < 3 || query.length > 140) return Response.json({ error: 'Informe o tipo e o nome completo da área' }, { status: 400 });
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.search = new URLSearchParams({ q: query, format: 'json', polygon_geojson: '1', polygon_threshold: scope === 'country' ? '0.01' : scope === 'state' ? '0.002' : '0.0002', addressdetails: '1', limit: '7', 'accept-language': 'pt-BR' }).toString();
    const response = await fetch(url, { headers: { 'User-Agent': 'ChaveiroJa/1.0 (https://woodoo-quick-lock-link.base44.app)', Accept: 'application/json' } });
    if (!response.ok) return Response.json({ error: 'Busca de limites indisponível. Tente novamente.' }, { status: 502 });
    const results = await response.json();
    const areas = results.filter(item => accepted[scope].includes(item.addresstype)).slice(0, 4).map(item => {
      const shape = item.geojson || {};
      const polygons = shape.type === 'Polygon' ? [shape.coordinates?.[0]] : shape.type === 'MultiPolygon' ? shape.coordinates?.map(part => part[0]) : [];
      const lines = shape.type === 'LineString' ? [shape.coordinates] : shape.type === 'MultiLineString' ? shape.coordinates : [];
      const cleaned = { name: item.display_name, scope, polygons: (polygons || []).filter(ring => Array.isArray(ring) && ring.length >= 4), lines: (lines || []).filter(line => Array.isArray(line) && line.length >= 2), street_radius_m: 120, active: true };
      if (!cleaned.polygons.length && !cleaned.lines.length) return null;
      if (JSON.stringify(cleaned).length > 65000) return null;
      return cleaned;
    }).filter(Boolean);
    return Response.json({ areas });
  } catch (error) {
    return Response.json({ error: error.message || 'Falha ao buscar área' }, { status: 500 });
  }
}