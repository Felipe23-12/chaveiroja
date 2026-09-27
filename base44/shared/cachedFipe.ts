import { lookupExactFipe } from './fipeCatalog.ts';

const normalize = (v: unknown) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const alias: Record<string, string[]> = { chevrolet: ['gm chevrolet'], volkswagen: ['vw volkswagen'], 'mercedes benz': ['mercedes benz'], 'caoa chery': ['caoa chery', 'chery'] };
const sameMake = (saved: string, wanted: string) => normalize(saved) === normalize(wanted) || (alias[normalize(wanted)] || []).includes(normalize(saved));
function matches(model: string, family: string, version: string) {
  const name = normalize(model), selected = normalize(family), variant = normalize(version);
  return (name === selected || name.startsWith(selected + ' ')) && (!variant || name.includes(variant));
}
export async function fipeFromDatabase(base44: any, make: string, model: string, year: string | number, version = '') {
  const sourceBrands: Record<string, string[]> = { chevrolet: ['GM - Chevrolet'], volkswagen: ['VW - VolksWagen'], 'mercedes benz': ['Mercedes-Benz'], 'caoa chery': ['CAOA Chery', 'Chery'] };
  const brands = [make, ...(sourceBrands[normalize(make)] || [])];
  const rows = await base44.asServiceRole.entities.FipeVehiclePrice.filter({ model_year: Number(year), brand: { $in: brands } }, '-checked_at', 500);
  const matchesRows = rows.filter((row: any) => sameMake(row.brand, make) && matches(row.model, model, version));
  // Durante a carga inicial, um único registro não prova que não há outras versões.
  const state = (await base44.asServiceRole.entities.FipeSyncState.list('-created_date', 1))[0];
  const complete = state?.phase === 'refresh';
  if (matchesRows.length > 1) throw new Error('Há várias versões FIPE para este modelo e ano. Informe a versão exata: ' + matchesRows.slice(0, 6).map((row: any) => row.model).join('; '));
  if (matchesRows.length === 1 && (version || complete)) {
    const row = matchesRows[0];
    return { value: row.price, code: row.code_fipe, month: row.reference_month, model: row.model, sourceUrl: row.source_url, provider: 'Banco local · origem Parallelum' };
  }
  // Primeira consulta de uma combinação ausente: consulta externa uma vez e guarda no banco.
  const fresh = await lookupExactFipe(make, model, year, version);
  const existing = await base44.asServiceRole.entities.FipeVehiclePrice.filter({ code_fipe: fresh.code, year_code: fresh.yearCode }, '-updated_date', 1);
  const now = new Date();
  const record = { code_fipe: fresh.code, year_code: fresh.yearCode, model_year: Number(year), brand: fresh.brand, model: fresh.model, price: fresh.value, reference_month: fresh.month, reference_code: fresh.referenceCode, source_url: fresh.sourceUrl, checked_at: now.toISOString(), next_check_at: new Date(now.getTime() + 20 * 86400000).toISOString() };
  if (existing[0]) await base44.asServiceRole.entities.FipeVehiclePrice.update(existing[0].id, record);
  else await base44.asServiceRole.entities.FipeVehiclePrice.create(record);
  return fresh;
}
