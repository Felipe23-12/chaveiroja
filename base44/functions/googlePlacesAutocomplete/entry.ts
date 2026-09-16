import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'search';
    const apiKey = secrets.get("GOOGLE_PLACES_API_KEY");
    if (!apiKey) return Response.json({ error: 'Google Places API key não configurada' }, { status: 500 });

    if (action === 'search') {
      const input = (body.input || '').trim();
      if (input.length < 2) return Response.json({ predictions: [] });

      const includePlaces = body.include_places === true;
      const params = new URLSearchParams({
        input: input.slice(0, 160),
        key: apiKey,
        language: 'pt-BR',
        components: 'country:br',
        ...(includePlaces ? {} : { types: 'address' })
      });
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (includePlaces && Number.isFinite(lat) && Number.isFinite(lng)) {
        params.set('location', `${lat},${lng}`);
        params.set('radius', '50000');
      }
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`);
      const data = await res.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        return Response.json({ error: data.error_message || data.status, predictions: [] });
      }

      const predictions = (data.predictions || []).map((p) => ({
        place_id: p.place_id,
        description: p.description,
        main_text: p.structured_formatting?.main_text || p.description,
        secondary_text: p.structured_formatting?.secondary_text || ''
      }));
      return Response.json({ predictions });
    }

    if (action === 'reverse') {
      const lat = Number(body.lat);
      const lng = Number(body.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return Response.json({ error: 'Localização inválida' }, { status: 400 });
      }
      const params = new URLSearchParams({ latlng: `${lat},${lng}`, key: apiKey, language: 'pt-BR' });
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
      const data = await response.json();
      const address = data.results?.[0]?.formatted_address;
      if (!response.ok || data.status !== 'OK' || !address) {
        return Response.json({ error: 'Endereço não encontrado' }, { status: 404 });
      }
      return Response.json({ address, lat, lng });
    }

    if (action === 'details') {
      const placeId = (body.place_id || '').trim();
      if (!placeId) return Response.json({ error: 'place_id obrigatório' }, { status: 400 });

      const params = new URLSearchParams({
        place_id: placeId,
        key: apiKey,
        language: 'pt-BR',
        fields: 'formatted_address,geometry,name'
      });
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params}`);
      const data = await res.json();

      if (data.status !== 'OK') {
        return Response.json({ error: data.error_message || data.status });
      }

      const place = data.result;
      return Response.json({
        address: place.formatted_address,
        name: place.name,
        lat: place.geometry?.location?.lat,
        lng: place.geometry?.location?.lng
      });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}