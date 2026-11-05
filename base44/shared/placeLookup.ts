import { secrets } from 'base44:runtime';
export async function placeLookup(body) {
  const action = body.action || 'search';
  const key = secrets.get('GOOGLE_PLACES_API_KEY');
  if (!key) return Response.json({ error: 'Google Places API key não configurada' }, { status: 500 });
  let endpoint, params;
  if (action === 'search') {
    const input = String(body.input || '').trim().slice(0, 160);
    if (input.length < 2) return Response.json({ predictions: [] });
    params = new URLSearchParams({ input, key, language: 'pt-BR', components: 'country:br', ...(body.include_places === true ? {} : { types: 'address' }) });
    if (body.include_places === true && Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng))) { params.set('location', `${Number(body.lat)},${Number(body.lng)}`); params.set('radius', '50000'); }
    endpoint = 'place/autocomplete';
  } else if (action === 'details') {
    if (typeof body.place_id !== 'string' || !body.place_id.trim() || body.place_id.length > 300) return Response.json({ error: 'Local inválido' }, { status: 400 });
    params = new URLSearchParams({ place_id: body.place_id.trim(), key, language: 'pt-BR', fields: 'formatted_address,geometry,name' });
    endpoint = 'place/details';
  } else if (action === 'reverse') {
    const lat = Number(body.lat), lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return Response.json({ error: 'Localização inválida' }, { status: 400 });
    params = new URLSearchParams({ latlng: `${lat},${lng}`, key, language: 'pt-BR' }); endpoint = 'geocode';
  } else return Response.json({ error: 'Ação inválida' }, { status: 400 });
  const response = await fetch(`https://maps.googleapis.com/maps/api/${endpoint}/json?${params}`, { signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  if (!response.ok || !['OK', 'ZERO_RESULTS'].includes(data.status)) return Response.json({ error: 'Não foi possível consultar o endereço. Tente novamente.', predictions: [] }, { status: 400 });
  if (action === 'search') return Response.json({ predictions: (data.predictions || []).slice(0, 8).map(p => ({ place_id: p.place_id, description: p.description, main_text: p.structured_formatting?.main_text || p.description, secondary_text: p.structured_formatting?.secondary_text || '' })) });
  if (action === 'reverse') return data.results?.[0]?.formatted_address ? Response.json({ address: data.results[0].formatted_address, lat: Number(body.lat), lng: Number(body.lng) }) : Response.json({ error: 'Endereço não encontrado' }, { status: 404 });
  const place = data.result;
  return Response.json({ address: place?.formatted_address, name: place?.name, lat: place?.geometry?.location?.lat, lng: place?.geometry?.location?.lng });
}