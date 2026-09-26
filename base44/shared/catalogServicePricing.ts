const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const modelName = value => normalize(value).replace(/^novo\s+/, '').replace(/\beco sport\b/g, 'ecosport').replace(/\bs 10\b/g, 's10');
const round = value => Math.round(value * 100) / 100;

export async function currentVehicleCatalog(base44, vehicle, type, keyType, origin = 'original') {
  if (!vehicle?.make || !vehicle?.model || !vehicle?.year) return null;
  const rows = await base44.asServiceRole.entities.VehicleKeyCatalog.filter({ vehicle_type: type, make: String(vehicle.make), active: true }, '-updated_date', 1000);
  const model = modelName(vehicle.model), year = Number(vehicle.year);
  const candidates = rows.filter(row => (!row.year_start || year >= row.year_start) && (!row.year_end || year <= row.year_end) && String(row.model || '').split(/[,/]/).some(part => {
    const name = modelName(part);
    return name && (name === model || name.replace(/\s+(?:g\d+|mk\d+)$/, '') === model);
  }));
  const matchType = row => keyType === 'simples' ? Number(row.original_simple_price) > 0 || Number(row.parallel_simple_price) > 0 || row.key_style === 'lamina_sem_pcf' : keyType === 'presenca' ? Number(row.original_proximity_price) > 0 || Number(row.parallel_proximity_price) > 0 || row.key_style === 'presenca' : keyType === 'canivete' || keyType === 'telecomando' ? Number(row.parallel_flip_price) > 0 || ['canivete_sem_pcf', 'pcf_integrado'].includes(row.key_style) : false;
  const selectedPrice = row => {
    if (origin === 'paralela') {
      if (keyType === 'simples') return Number(row.parallel_simple_price) || 0;
      if (keyType === 'presenca') return Number(row.parallel_proximity_price) || 0;
      return Number(row.parallel_flip_price) || 0;
    }
    if (keyType === 'simples') return Number(row.original_simple_price) || (row.key_style === 'lamina_sem_pcf' ? Number(row.original_price) || 0 : 0);
    if (keyType === 'presenca') return Number(row.original_proximity_price) || Number(row.original_price) || 0;
    return Number(row.original_price) || 0;
  };
  const manual = row => Boolean(row.manual_price_updated_at || Number(row.original_simple_price) > 0 || Number(row.original_proximity_price) > 0 || Number(row.parallel_simple_price) > 0 || Number(row.parallel_flip_price) > 0 || Number(row.parallel_proximity_price) > 0);
  const date = row => Date.parse(row.manual_price_updated_at || row.updated_date || '') || 0;
  const datedPrice = row => Boolean(row.catalog_code && row.year_start && Number(row.original_price) > 0);
  const score = row => Number(!!row.verified) * 100 + Number(!!(row.vvdi_supported || row.kd_supported || row.km100_supported)) * 10;
  // Edição manual explícita prevalece; entre ofertas não editadas, usa a maior cotação da chave escolhida.
  const explicitlyEdited = row => Boolean(row.manual_price_updated_at);
  return candidates.sort((a, b) => Number(matchType(b)) - Number(matchType(a)) || Number(explicitlyEdited(b)) - Number(explicitlyEdited(a)) || (explicitlyEdited(a) && explicitlyEdited(b) ? date(b) - date(a) : 0) || selectedPrice(b) - selectedPrice(a) || Number(manual(b)) - Number(manual(a)) || Number(datedPrice(b)) - Number(datedPrice(a)) || score(b) - score(a) || Date.parse(b.updated_date) - Date.parse(a.updated_date))[0] || null;
}

export async function catalogKeyPrice(base44, catalog, fallback, keyType, origin, settings, year) {
  const original = Number(catalog?.original_price) > 0 ? Number(catalog.original_price) : fallback;
  if (origin !== 'paralela') {
    if (catalog?.factory_alarm_status === 'ausente') throw new Error('Este veículo aceita somente chave paralela confirmada no catálogo');
    if (keyType === 'simples') return Number(catalog?.original_simple_price) > 0 ? Number(catalog.original_simple_price) : catalog?.key_style === 'lamina_sem_pcf' && Number(catalog.original_price) > 0 ? Number(catalog.original_price) : 50;
    if (keyType === 'presenca' && Number(catalog?.original_proximity_price) > 0) return Number(catalog.original_proximity_price);
    return original;
  }
  if (!catalog) throw new Error('Catálogo da chave paralela é obrigatório');
  if (keyType === 'simples') return Number(catalog.parallel_simple_price) > 0 ? Number(catalog.parallel_simple_price) : 50;
  const field = keyType === 'simples' ? 'parallel_simple_price' : keyType === 'presenca' ? 'parallel_proximity_price' : 'parallel_flip_price';
  if (Number(catalog[field]) > 0) return Number(catalog[field]);
  const links = await base44.asServiceRole.entities.VehicleRemoteCompatibility.filter({ vehicle_catalog_id: catalog.id, active: true, verified: true }, '-updated_date', 500);
  const ids = [...new Set(links.filter(link => catalog.factory_alarm_status !== 'ausente' || ['VVDI', 'KD'].includes(link.platform)).map(link => link.universal_remote_id))];
  const remotes = ids.length ? await base44.asServiceRole.entities.UniversalRemote.filter({ id: { $in: ids }, available: true, verified: true }) : [];
  const prices = remotes.map(remote => Number(remote.list_price) || 0);
  if (!prices.length) {
    if (catalog.vvdi_supported && catalog.vvdi_file) prices.push(Number(catalog.vvdi_price) || 0);
    if (catalog.kd_supported && catalog.kd_file) prices.push(Number(catalog.kd_price) || 0);
    if (catalog.factory_alarm_status !== 'ausente' && catalog.km100_supported && (!catalog.km100_years?.length || catalog.km100_years.includes(Number(year)))) prices.push(Number(catalog.km100_price) || 0);
  }
  const generated = Math.max(0, ...prices);
  if (generated > 0) return generated;
  if (prices.length && catalog.factory_alarm_status !== 'ausente' && original > 0) return round(original * (1 - settings.parallel_discount / 100));
  throw new Error('Preço da chave paralela não confirmado no catálogo');
}