import { createClientFromRequest } from 'npm:@base44/sdk@0.8.46';
import { verifyInternalCall } from '../../shared/internalCall.ts';
import { VEHICLE_MODEL_YEARS } from '../../shared/vehicleModelYears.ts';

const BASE = 'https://fipe.parallelum.com.br/api/v2';
const DAILY_LIMIT = 440; // Reserva 60 das 500 chamadas sem token para consultas ao vivo.
const BATCH_LIMIT = 18;
const NEXT_REVIEW_MS = 20 * 24 * 60 * 60 * 1000;
const normalize = (v: unknown) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const priceNumber = (v: unknown) => Number(String(v || '').replace(/[^\d,]/g, '').replace(',', '.'));
const dateKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const families = VEHICLE_MODEL_YEARS.filter(item => item.min && item.max);
const aliases: Record<string, string[]> = { chevrolet: ['gm chevrolet'], volkswagen: ['vw volkswagen'], 'mercedes benz': ['mercedes benz'], 'caoa chery': ['caoa chery', 'chery'] };
let calls = 0;
async function api(path: string, reference?: string) {
  calls++;
  const response = await fetch(BASE + path + (reference ? '?reference=' + encodeURIComponent(reference) : ''), { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  if (response.status === 429) throw new Error('A API atingiu seu limite de requisições. O lote será retomado no próximo dia.');
  if (!response.ok) throw new Error('Erro HTTP ' + response.status + ' na API de preços.');
  return await response.json();
}
function matchesBrand(source: string, make: string) {
  const value = normalize(make);
  return normalize(source) === value || (aliases[value] || []).includes(normalize(source));
}
function belongsToFamily(candidate: string, family: typeof families[number]) {
  const text = normalize(candidate), prefix = normalize(family.model);
  if (!(text === prefix || text.startsWith(prefix + ' '))) return false;
  return !families.some(other => other.make === family.make && other.model !== family.model && normalize(other.model).length > prefix.length && (text === normalize(other.model) || text.startsWith(normalize(other.model) + ' ')));
}
async function upsert(base44: any, details: any, reference: string, url: string) {
  const price = priceNumber(details.price), year = Number(details.modelYear);
  if (!/^\d{6}-\d$/.test(details.codeFipe || '') || !/^\d{4}-\d$/.test(details.yearCode || '') || !Number.isFinite(price) || price < 1000 || price > 3000000 || !details.referenceMonth || !Number.isInteger(year)) throw new Error('Resposta de preço incompleta; registro ignorado.');
  const existing = await base44.asServiceRole.entities.FipeVehiclePrice.filter({ code_fipe: details.codeFipe, year_code: details.yearCode }, '-updated_date', 1);
  const now = new Date();
  const update = { code_fipe: details.codeFipe, year_code: details.yearCode, model_year: year, brand: details.brand, model: details.model, price, reference_month: details.referenceMonth, reference_code: reference, source_url: url, checked_at: now.toISOString(), next_check_at: new Date(now.getTime() + NEXT_REVIEW_MS).toISOString() };
  if (existing[0]) await base44.asServiceRole.entities.FipeVehiclePrice.update(existing[0].id, update);
  else await base44.asServiceRole.entities.FipeVehiclePrice.create(update);
}
export default async function(req: Request): Promise<Response> {
  const base44 = createClientFromRequest(req);
  const body = await req.json().catch(() => ({}));
  if (!verifyInternalCall(req, body)) {
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  const current = (await base44.asServiceRole.entities.FipeSyncState.list('-created_date', 1))[0];
  let state = current || { date_key: dateKey(), requests_used: 0, brand_index: 0, model_index: 0, year_index: 0, phase: 'initial', records_written: 0 };
  if (state.date_key !== dateKey()) state = { ...state, date_key: dateKey(), requests_used: 0 };
  if (state.requests_used >= DAILY_LIMIT) return Response.json({ paused: 'cota diária reservada', phase: state.phase, requests_used: state.requests_used, records_written: state.records_written });
  if (body.dry_run === true) return Response.json({ dry_run: true, catalog_families: families.length, state });
  let written = 0, message = '';
  try {
    const budget = Math.min(BATCH_LIMIT, DAILY_LIMIT - state.requests_used);
    const references = await api('/references');
    const reference = references?.[0];
    if (!reference?.code || !reference?.month) throw new Error('Mês FIPE indisponível.');
    state.reference_code = String(reference.code);
    if (state.phase === 'refresh') {
      const due = await base44.asServiceRole.entities.FipeVehiclePrice.filter({ next_check_at: { $lte: new Date().toISOString() } }, 'next_check_at', 30);
      for (const row of due) {
        if (calls + 1 > budget) break;
        const url = BASE + '/cars/' + encodeURIComponent(row.code_fipe) + '/years/' + encodeURIComponent(row.year_code) + '?reference=' + encodeURIComponent(reference.code);
        const details = await api('/cars/' + encodeURIComponent(row.code_fipe) + '/years/' + encodeURIComponent(row.year_code), reference.code);
        details.yearCode = row.year_code;
        if (details.codeFipe !== row.code_fipe || Number(details.modelYear) !== row.model_year) throw new Error('Dados FIPE divergentes para código ' + row.code_fipe);
        await upsert(base44, details, reference.code, url);
        written++;
      }
      if (!due.length) message = 'Nenhum registro vence hoje; revisão a cada 20 dias após cada consulta.';
    } else {
      if (calls + 1 <= budget) {
        const brands = await api('/cars/brands', reference.code);
        while (state.brand_index < families.length && calls + 3 <= budget) {
          const family = families[state.brand_index];
          const brand = brands.find((item: any) => matchesBrand(item.name, family.make));
          if (!brand) { state.brand_index++; state.model_index = 0; state.year_index = 0; continue; }
          const models = (await api('/cars/brands/' + encodeURIComponent(brand.code) + '/models', reference.code)).filter((item: any) => belongsToFamily(item.name, family));
          if (state.model_index >= models.length) { state.brand_index++; state.model_index = 0; state.year_index = 0; continue; }
          const model = models[state.model_index];
          const years = (await api('/cars/brands/' + encodeURIComponent(brand.code) + '/models/' + encodeURIComponent(model.code) + '/years', reference.code)).filter((item: any) => {
            const year = Number(String(item.code).slice(0, 4));
            return year >= Number(family.min) && year <= Math.min(Number(family.max), new Date().getFullYear() + 1);
          });
          if (state.year_index >= years.length) { state.model_index++; state.year_index = 0; continue; }
          if (calls + 1 > budget) break;
          const selected = years[state.year_index];
          const path = '/cars/brands/' + encodeURIComponent(brand.code) + '/models/' + encodeURIComponent(model.code) + '/years/' + encodeURIComponent(selected.code);
          const details = await api(path, reference.code);
          details.yearCode = selected.code;
          if (normalize(details.model) !== normalize(model.name) || Number(details.modelYear) !== Number(selected.code.slice(0, 4)) || !matchesBrand(details.brand, family.make)) throw new Error('Modelo/ano FIPE divergente: ' + model.name);
          await upsert(base44, details, reference.code, BASE + path + '?reference=' + encodeURIComponent(reference.code));
          written++; state.year_index++;
        }
      }
      if (state.brand_index >= families.length) { state.phase = 'refresh'; state.cycle_completed_at = new Date().toISOString(); message = 'Cobertura inicial do catálogo concluída; revisão de registros após 20 dias.'; }
    }
  } catch (error) { message = String(error?.message || error); state.last_error = message.slice(0,400); }
  state.requests_used += calls;
  state.records_written += written;
  state.last_run_at = new Date().toISOString();
  if (current) await base44.asServiceRole.entities.FipeSyncState.update(current.id, state);
  else await base44.asServiceRole.entities.FipeSyncState.create(state);
  return Response.json({ phase: state.phase, calls, requests_today: state.requests_used, written, total_written: state.records_written, cursor: [state.brand_index, state.model_index, state.year_index], message });
}
