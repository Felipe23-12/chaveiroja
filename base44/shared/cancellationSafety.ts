const normalize = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const minutes30 = 30 * 60000;

export function validatedLocation(data) {
  const input = data.location_context || {};
  const vehicle = ['Abertura Automotiva', 'Confecção de Chave de Carro', 'Confecção de Chave de Moto'].includes(data.service_type);
  const place_type = vehicle ? 'vehicle' : ['individual', 'condominium', 'unknown'].includes(input.place_type) ? input.place_type : 'unknown';
  const building = String(input.building || '').trim().slice(0, 80);
  const unit = String(input.unit || '').trim().slice(0, 80);
  if (place_type === 'condominium' && (!normalize(building) || !normalize(unit))) throw new Error('Informe bloco/torre e apartamento/unidade; se não houver bloco, informe Único.');
  const vehicle_plate = normalize(input.vehicle_plate).toUpperCase();
  if (vehicle_plate && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(vehicle_plate)) throw new Error('Confira a placa do veículo.');
  const location = { service_type: data.service_type, address: String(data.address || '').trim(), place_type, building: place_type === 'condominium' ? building : '', unit: place_type === 'condominium' ? unit : '', vehicle_plate: vehicle ? vehicle_plate : '' };
  if (input.coordinates_confirmed === true && Number.isFinite(data.customer_lat) && Number.isFinite(data.customer_lng) && Math.abs(data.customer_lat) <= 90 && Math.abs(data.customer_lng) <= 180) {
    location.latitude = data.customer_lat; location.longitude = data.customer_lng;
  }
  return location;
}

export function sameServiceTarget(a, b) {
  if (a.service_type !== b.service_type || !a.place_type || a.place_type === 'unknown' || a.place_type !== b.place_type) return false;
  if (![a.latitude, a.longitude, b.latitude, b.longitude].every(Number.isFinite)) return false;
  const rad = (n) => n * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  if (6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h))) > 25) return false;
  if (a.place_type === 'vehicle') return !!normalize(a.vehicle_plate) && normalize(a.vehicle_plate) === normalize(b.vehicle_plate);
  // Mesmo prédio não significa mesma porta. Não inferir unidade pelo GPS.
  if (!normalize(a.address) || normalize(a.address) !== normalize(b.address)) return false;
  if (a.place_type === 'condominium') return !!normalize(a.building) && !!normalize(a.unit) && normalize(a.building) === normalize(b.building) && normalize(a.unit) === normalize(b.unit);
  // Um endereço que menciona condomínio/unidade não pode ser tratado como casa isolada.
  return !/condom[ií]nio|apartamento|\bapto?\b|bloco|torre|edif[ií]cio|sala\s*\d/i.test(a.address + ' ' + b.address) && /\d/.test(a.address);
}

export async function detectCancellationPattern(base44, event) {
  const time = Date.parse(event.cancelled_at);
  if (!Number.isFinite(time) || time + minutes30 < Date.now()) return;
  const entity = base44.asServiceRole.entities.ClientCancellationEvent;
  const matches = [event];
  for (let skip = 0; ; skip += 200) {
    const page = await entity.filter({ service_type: event.service_type, cancelled_at: { $gte: new Date(time - minutes30).toISOString(), $lte: event.cancelled_at } }, 'cancelled_at', 200, skip);
    matches.push(...page.filter((row) => row.request_id !== event.request_id && sameServiceTarget(event, row)));
    if (page.length < 200) break;
  }
  const clients = [...new Set(matches.map((r) => r.client_id))];
  if (clients.length < 2) return;
  const blocks = base44.asServiceRole.entities.ClientSafetyBlock;
  for (const client_id of clients) {
    const existing = await blocks.filter({ client_id, trigger_request_id: event.request_id });
    if (!existing.length) await blocks.create({ client_id, trigger_request_id: event.request_id, matched_request_ids: [...new Set(matches.map((r) => r.request_id))], blocked_until: new Date(time + 2 * 3600000).toISOString(), reason: 'Cancelamentos por contas diferentes para o mesmo serviço e unidade em até 30 minutos.' });
  }
}

export async function safetyBlockFor(base44, clientId) {
  const rows = await base44.asServiceRole.entities.ClientSafetyBlock.filter({ client_id: clientId, blocked_until: { $gt: new Date().toISOString() } }, '-blocked_until', 1);
  return rows[0] || null;
}