import assert from 'node:assert/strict';
import { build } from 'esbuild';
const mocks = {
 'serviceWeather.ts': "export async function pricingWeather() { return {key:'rain_light',label:'Chuva leve'}; }",
 'serviceCoverage.ts': 'export async function requireServiceCoverage() { return []; }',
 'regionalServicePricing.ts': 'export async function regionalPriceForLocation() { return {range:[300,500]}; } export async function manageRegionalPricing() { throw Error("unused"); }',
 'vehiclePricingQuote.ts': 'export async function verifyVehiclePricingQuote() { throw Error("unused"); }',
};
const result=await build({stdin:{contents:`export * from './base44/shared/servicePricing.ts'; export * from './base44/shared/servicePricingSettings.ts'; export * from './base44/shared/vehicleOpeningRules.ts'; export { default as manage } from './base44/functions/manageServicePricing/entry.ts';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node',plugins:[{name:'fixtures',setup(b){
 b.onResolve({filter:/^npm:@base44\/sdk/},()=>({path:'sdk',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const createClientFromRequest = () => globalThis.testClient;'}));
 b.onLoad({filter:/\.ts$/},args=>{const contents=mocks[args.path.split('/').pop()]; if(contents)return {contents,loader:'ts'};});
}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const service='Abertura Automotiva';
const defaults=api.defaultPricing(service);
const values={...defaults,tier_day:0,tier_night:0,tier_weekend:0,tier_normal_cap:0,supply_none:0,saturday:0,sunday:0,holiday:0,night:0,opening_2020:0};
let record={id:'initial',values,vehicle_opening_rules:[]};let role='admin';let writes=0;
const paid=Array.from({length:5},(_,i)=>({id:`paid${i}`}));
const entities=new Proxy({}, {get:(_,name)=>({
 filter:async query=>name==='ServicePricingConfig'?[record]:name==='ServiceRequest'&&query.status==='completed'?paid:name==='Payment'?paid.map(r=>({service_request_id:r.id})):[],
 create:async data=>{assert.equal(name,'ServicePricingConfig');writes++;record={...data,id:`save${writes}`,created_date:'2026-09-28T00:00:00Z'};return record;}
})});
globalThis.testClient={auth:{me:async()=>({id:'admin',role})},entities,asServiceRole:{entities}};
const client=globalThis.testClient;
const vehicle={make:'Chevrolet',model:'Celta',year:2015,opening_method:'simples'};
const data={service_type:service,customer_lat:-23,customer_lng:-46,pricing_inputs:{vehicle}};
const quote=(v=vehicle,extras={})=>api.calculateServerServicePrice(client,'client',{...data,...extras,pricing_inputs:{...data.pricing_inputs,...extras.pricing_inputs,vehicle:v}});
const request=body=>new Request('https://test.invalid',{method:'POST',body:JSON.stringify({service_type:service,...body})});
let simple=await quote(); assert.equal(simple.price,375,'legacy regional price and 25% rain preserved');
let lishi=await quote({...vehicle,opening_method:'lishi'}); assert.equal(lishi.price,525,'40% on final simple price');
assert.equal(lishi.calculation.lines.filter(l=>l.label.startsWith('Abertura Lishi')).length,1);
assert.equal((await quote({...vehicle,complexity:'alta'})).price,375,'client complexity no longer charges car');
let rules=api.validateVehicleOpeningRules([{make:'Chevrolet',model:'Celta',year_start:2015,year_end:2015,base_price:200,lishi_percent:50}]);
let res=await api.manage(request({action:'save',version:record.id,values,vehicle_opening_rules:rules}));assert.equal(res.status,200); assert.equal(writes,1);
res=await api.manage(request({action:'get'}));assert.deepEqual((await res.json()).vehicle_opening_rules,rules,'saved config roundtrip');
assert.equal((await quote()).price,250,'individual base replaces regional range');
assert.equal((await quote({...vehicle,opening_method:'lishi'})).price,375,'individual percent overrides 40');
assert.equal((await quote({...vehicle,year:2014})).price,375,'other year unaffected');
assert.equal((await quote({...vehicle,model:'Onix'})).price,375,'other model unaffected');
assert.equal((await quote({...vehicle,make:'Fiat',model:'Palio'})).price,375,'other brand unaffected');
const versionRule={...rules[0],version:'LT 1.0',base_price:280};
record.vehicle_opening_rules=api.validateVehicleOpeningRules([...rules,versionRule]);
assert.equal((await quote({...vehicle,version:'lt 1.0'})).price,350,'exact version priority');
assert.equal((await quote({...vehicle,version:'outra'})).price,250,'generic rule fallback');
assert.throws(()=>api.validateVehicleOpeningRules([...rules,{...rules[0]}]),/sobrepostas/);
assert.throws(()=>api.validateVehicleOpeningRules([{...rules[0],year_end:2020}]),/anos-modelo/);
assert.throws(()=>api.validateVehicleOpeningRules([{...rules[0],lishi_percent:-1}]),/percentual/);
await assert.rejects(quote({...vehicle,opening_method:'alta'}),/Selecione/);
record.vehicle_opening_rules=[];
assert.equal((await quote()).price,375,'removal restores legacy price');
record.values.lishi_percent=0; assert.equal((await quote({...vehicle,opening_method:'lishi'})).price,375,'zero surcharge supported');
record.values.lishi_percent=40;
simple=await quote(vehicle,{discount_applied:true,pricing_inputs:{broken_key_in_lock:true}});
lishi=await quote({...vehicle,opening_method:'lishi'},{discount_applied:true,pricing_inputs:{broken_key_in_lock:true}});
assert.equal(simple.price,362.5); assert.equal(lishi.price,507.5,'40% on total after loyalty and condition');
assert.equal(lishi.price,Math.round(simple.price*140)/100);
assert.equal(Math.round((lishi.calculation.total-lishi.discount)*100)/100,lishi.price,'ledger total reconciles');
res=await api.manage(request({action:'save',version:'stale',values,vehicle_opening_rules:rules}));assert.equal(res.status,409);assert.equal(writes,1,'stale config not written');
role='cliente';res=await api.manage(request({action:'save',version:record.id,values,vehicle_opening_rules:rules}));assert.equal(res.status,403);assert.equal(writes,1,'client cannot change admin prices');
role='admin';res=await api.manage(request({action:'save',version:record.id,values,vehicle_opening_rules:[...rules,...rules]}));assert.equal(res.status,400);assert.equal(writes,1,'invalid rules not written');
console.log('PASS: legacy fallback, rain, vehicle/year/version isolation, 40% final total, custom/zero Lishi percent, loyalty, conditions, roundtrip, admin authorization, conflict and validation.');

const availabilityOnly = { make:'Chevrolet', model:'Celta', year_start:2015, year_end:2015, simple_unavailable:true, lishi_unavailable:false };
res=await api.manage(request({action:'save',version:record.id,values,vehicle_opening_rules:[availabilityOnly]}));
assert.equal(res.status,200,'availability-only config can be saved');
assert.equal(record.vehicle_opening_rules[0].simple_unavailable,true,'flag persisted');
await assert.rejects(quote(vehicle),/Abertura simples indisponível/);
assert.equal((await quote({...vehicle,opening_method:'lishi'})).price,525,'Lishi remains available at existing price');
assert.equal((await quote({...vehicle,year:2014})).price,375,'other year remains available');
record.vehicle_opening_rules=api.validateVehicleOpeningRules([{...availabilityOnly,simple_unavailable:false,lishi_unavailable:true}]);
assert.equal((await quote()).price,375,'simple can be reenabled');
await assert.rejects(quote({...vehicle,opening_method:'lishi'}),/Lishi profissional indisponível/);
record.vehicle_opening_rules=api.validateVehicleOpeningRules([{...availabilityOnly,lishi_unavailable:true}]);
await assert.rejects(quote(),/indisponível/);
await assert.rejects(quote({...vehicle,opening_method:'lishi'}),/indisponível/);
record.vehicle_opening_rules=api.validateVehicleOpeningRules([{...availabilityOnly,simple_unavailable:false}]);
assert.equal((await quote()).price,375,'reenabling preserves legacy price');
assert.throws(()=>api.validateVehicleOpeningRules([{...availabilityOnly,simple_unavailable:'true'}]),/Disponibilidade/);
console.log('PASS: availability-only save, per-method server blocking, both blocked, other-year isolation and reenabling.');
record.vehicle_opening_rules=[];
record.values={...values};
data.customer_lat=-23.597085;data.customer_lng=-46.6628884;
let byNeighborhood=await quote(vehicle,{address:'Rua Exemplo, 100 - Moema, São Paulo - SP'});
assert.equal(byNeighborhood.price,431.25,'restored neighborhood +15% after rain on labor');
assert.ok(byNeighborhood.calculation.lines.some(l=>l.label.includes('Bairro: Moema') && l.value===56.25));
let neighborhoodLishi=await quote({...vehicle,opening_method:'lishi'},{address:'Rua Exemplo, 100 - Moema, São Paulo - SP'});
assert.equal(neighborhoodLishi.price,603.75,'Lishi applied once after neighborhood');
record.values.neighborhood_high=20;
assert.equal((await quote(vehicle,{address:'Rua Exemplo - Moema, São Paulo - SP'})).price,450,'admin override used');
assert.equal((await quote(vehicle,{address:'Rua Moema, 100 - Bairro desconhecido, São Paulo - SP'})).price,375,'street not mistaken for neighborhood');
assert.equal((await quote(vehicle,{address:'Rua José, 100 - Bairro desconhecido, São Paulo - SP'})).price,375,'Sé not matched inside José');
assert.equal((await quote(vehicle,{address:'Moema',customer_lat:-22.9,customer_lng:-43.2})).price,375,'SP list not applied in another state');
let unknown=await quote(vehicle,{address:'Rua desconhecida'});
assert.ok(unknown.calculation.lines.some(l=>l.label.includes('Bairro ainda sem identificação confirmada') && l.value===0),'no adjustment explicitly recorded');
record.values.neighborhood_high=0;
assert.equal((await quote(vehicle,{address:'Moema'})).price,375,'zero disables group surcharge');
console.log('PASS: neighborhood defaults, editable percent, Lishi ordering, unknown/zero disclosure and no street/out-of-region false matches.');
