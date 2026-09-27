import assert from 'node:assert/strict';
import { build } from 'esbuild';
const mocks = {
  'serviceWeather.ts': "export async function pricingWeather() { return { key: 'rain_light', label: 'Chuva leve' }; }",
  'serviceCoverage.ts': 'export async function requireServiceCoverage() { return []; }',
  'regionalServicePricing.ts': 'export async function regionalPriceForLocation() { return { range: [900, 1100] }; }',
  'vehiclePricingQuote.ts': 'export async function verifyVehiclePricingQuote() { throw Error("unused"); }',
};
const result = await build({ stdin: { contents: `export * from './base44/shared/servicePricing.ts'; export * from './base44/shared/catalogServicePricing.ts'; export * from './base44/shared/servicePricingSettings.ts'; export * from './base44/shared/automotiveOpening.ts';`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false, plugins: [{ name: 'external-service-fixtures', setup(b) { b.onLoad({ filter: /\.ts$/ }, args => { const code = mocks[args.path.split('/').pop()]; if (code) return { contents: code, loader: 'ts' }; }); } }] });
const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const defaults = api.defaultPricing('Abertura Automotiva');
assert.deepEqual(api.motoSeatRange(defaults), [150, 300]);
assert.throws(() => api.defaultPricing('Cópia de Chave'), /Serviço inválido/);
assert.throws(() => api.validatePricing('Abertura Automotiva', { ...defaults, seat_base_min: 400 }), /mínimo/);
let settings = { ...defaults, tier_day: 0, tier_night: 0, tier_weekend: 0, tier_normal_cap: 0, supply_none: 0, saturday: 0, sunday: 0, holiday: 0, night: 0, opening_2020: 0 };
const pcx = { id: 'pcx', make: 'Honda', model: 'PCX 150 DLX/SPORT (presença)', year_start: 2019, year_end: 2022, original_proximity_price: 641.99, key_style: 'presenca' };
const adv = { id: 'adv', make: 'Honda', model: 'ADV 150', year_start: 2021, year_end: 2024, original_proximity_price: 641.99, key_style: 'presenca' };
const client = { asServiceRole: { entities: new Proxy({}, { get: (_, name) => ({ filter: async () => name === 'ServicePricingConfig' ? [{ values: settings }] : name === 'VehicleKeyCatalog' ? [pcx, adv] : [] }) }) } };
const vehicle = { opening_target: 'moto_seat', make: 'BMW', model: 'R 1250 GS', year: 2022, factory_seat_opening: true, complexity: 'simples' };
const data = { service_type: 'Abertura Automotiva', urgency: 'normal', customer_lat: -23, customer_lng: -46, pricing_inputs: { vehicle } };
assert.equal(api.validateOpeningVehicle(vehicle).valid, true);
assert.equal(api.validateOpeningVehicle({ ...vehicle, factory_seat_opening: false }).valid, false);
assert.equal(api.validateOpeningVehicle({ ...vehicle, year: 2500 }).valid, false);
assert.equal(api.validateOpeningVehicle({ make: 'Chevrolet', model: 'Celta', year: 2015 }).valid, true);
let quote = await api.calculateServerServicePrice(client, 'test', data);
assert.equal(quote.fields.base_labor_cost, 150, 'car regional range must not overwrite seat range');
assert.equal(quote.price, 187.5, 'existing 25% rain applies');
quote = await api.calculateServerServicePrice(client, 'test', { ...data, pricing_inputs: { vehicle: { ...vehicle, complexity: 'alta' }, broken_key_in_lock: true } });
assert.equal(quote.price, 262.5, 'complexity and condition extras apply');
settings = { ...settings, seat_base_min: 200, seat_base_max: 400 };
quote = await api.calculateServerServicePrice(client, 'test', data);
assert.equal(quote.fields.base_labor_cost, 200, 'admin seat override applies');
await assert.rejects(api.calculateServerServicePrice(client, 'test', { ...data, service_type: 'Cópia de Chave' }), /Serviço inválido/);
await assert.rejects(api.calculateServerServicePrice(client, 'test', { ...data, pricing_inputs: { vehicle: { ...vehicle, factory_seat_opening: false } } }), /original de fábrica/);
for (const row of [pcx, adv]) {
  const found = await api.currentVehicleCatalog(client, { make: row.make, model: row.model, year: row.year_start }, 'moto', 'presenca');
  assert.equal(found.id, row.id);
  assert.equal(await api.catalogKeyPrice(client, found, 0, 'presenca', 'original', {}, row.year_start), 641.99);
  assert.equal(await api.currentVehicleCatalog(client, { make: row.make, model: row.model, year: row.year_start - 1 }, 'moto', 'presenca'), null);
}
console.log('PASS: seat eligibility, server pricing, rain, complexity, condition, admin overrides, copy rejection, PCX/ADV catalog and year bounds');
