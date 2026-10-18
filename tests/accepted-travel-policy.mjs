import assert from 'node:assert/strict';
import { build } from 'esbuild';

const mocks = {
 'serviceWeather.ts': "export async function pricingWeather(){return {key:null,label:'Sem chuva'};}",
 'serviceCoverage.ts': 'export async function requireServiceCoverage(){return [];}',
 'regionalServicePricing.ts': 'export async function regionalPriceForLocation(){return null;}',
 'vehiclePricingQuote.ts': "export async function verifyVehiclePricingQuote(){return {fipeValue:25000,keyValue:200,hasCodedKey:true};}",
 '@/api/base44Client': 'export const base44={};',
 '@/lib/geo': 'export const haversineKm=()=>100;',
};
const result=await build({
 stdin:{contents:"export * from './base44/shared/acceptedTravel.ts';export * from './base44/shared/servicePricing.ts';export * from './base44/shared/servicePricingSettings.ts';export * from './src/lib/arrivalSla.js';",resolveDir:process.cwd()},
 bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'isolated',setup(b){
  b.onResolve({filter:/^@\//},args=>args.path in mocks?{path:args.path,namespace:'fixture'}:null);
  b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'js'}));
  b.onLoad({filter:/\.ts$/},args=>{const text=mocks[args.path.split('/').at(-1)];return text?{contents:text,loader:'ts'}:null;});
 }}],
});
const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const initial=[{locksmith_id:'near',distance_km:10},{locksmith_id:'far',distance_km:10.01}];
const request={urgency:'urgent',initial_locksmith_distances:initial};
assert.equal(api.arrivalExtraMinutes(request,'near',40),0,'initial close locksmith moving away does not gain extra time');
assert.equal(api.arrivalExtraMinutes(request,'far',5),15,'initial distance remains authoritative after movement');
assert.equal(api.arrivalExtraMinutes(request,'new',11),15,'later professional uses acceptance distance');
assert.equal(api.arrivalExtraMinutes(request,'new',10),0);
assert.equal(api.arrivalExtraMinutes({...request,urgency:'normal'},'far',30),0);
assert.throws(()=>api.acceptedTravelPatch({}, {id:'far'},NaN),/distância/);
assert.throws(()=>api.acceptedTravelPatch({}, {id:'far'},-1),/distância/);
let providerKm=1,history=[],service,record;
const customer={lat:-23.5,lng:-46.7};
const entities=new Proxy({}, {get(_target,name){return {filter:async(query)=>
 name==='Locksmith'?[{id:'far',lat:customer.lat+providerKm/6371*180/Math.PI,lng:customer.lng}]:
 name==='ServicePricingConfig'?[record]:
 name==='ServiceRequest'&&(query.$or||query.created_by_id)?history:[]};}});
const sdk={asServiceRole:{entities}};
const scenarios=[
 ['Abertura Residencial',{}],
 ['Abertura Automotiva',{vehicle:{make:'Chevrolet',model:'Celta',year:2015,opening_method:'simples'}}],
 ['Abertura Automotiva',{vehicle:{make:'Chevrolet',model:'Celta',year:2015,opening_method:'lishi'}}],
 ['Confecção de Chave de Carro',{vehicle:{make:'Ford',model:'Ka',year:2020}}],
 ['Confecção de Chave de Moto',{vehicle:{make:'Honda',model:'CG 160',year:2020}}],
];
let cases=0;
for(const [type,pricing_inputs] of scenarios)for(const urgency of ['normal','urgent'])for(const discount of ['first_call','none','loyalty'])for(const floor of [0,10000]){
 service=type;providerKm=1;history=discount==='first_call'?[]:[{id:'previous'}];
 record={id:'config',values:{...api.defaultPricing(service),minimum:floor},vehicle_opening_rules:[],vehicle_fipe_rates:[]};
 const data={service_type:service,urgency,customer_lat:customer.lat,customer_lng:customer.lng,address:'Fixture',
  key_type:'simples',pricing_inputs,discount_applied:discount==='loyalty'};
 // Loyalty fixtures need five paid calls and no previous loyalty use.
 const loyaltyEntities=new Proxy(entities,{get(target,name){
  if(name!=='ServiceRequest'&&name!=='Payment')return target[name];
  return {filter:async query=>name==='Payment'?Array.from({length:5},(_,i)=>({service_request_id:'paid'+i})):
   query.status==='completed'?Array.from({length:5},(_,i)=>({id:'paid'+i})):
   query.discount_applied?[]:(query.$or||query.created_by_id)?history:[]};
 }});
 const client={asServiceRole:{entities:loyaltyEntities}};
 const original=await api.calculateServerServicePrice(client,'client',data);
 const call={id:'call',...data,...original.fields,price:original.price,discount_amount:original.discount,discount_type:original.discount_type,
  pricing_calculation:original.calculation,status:'ringing',initial_locksmith_distances:[{locksmith_id:'far',distance_km:50}]};
 for(const km of [10,20,20.01,25,50]){
  const patch=api.acceptedTravelPatch(call,{id:'far'},km);
  providerKm=km;
  const expected=await api.calculateServerServicePrice(client,'client',data);
  if(patch.price!==expected.price)console.log(JSON.stringify({km,original,patch,expected}));
  assert.equal(patch.price,expected.price,`${service} ${urgency} ${discount} floor=${floor} distance=${km}`);
  assert.equal(patch.discount_amount,expected.discount,'discount reconciles with a fresh quote');
  assert.equal(patch.locomotion_cost,expected.fields.locomotion_cost,'fee uses accepted locksmith distance');
  assert.equal(patch.pricing_calculation.total,expected.calculation.total,'gross ledger reconciles');
  assert.equal(patch.arrival_extra_minutes,urgency==='urgent'?15:0);
  assert.equal(patch.pricing_calculation.distance_pricing.fee,Math.round(Math.max(0,km-20)*0.9*100)/100);
  cases++;
 }
}
const accepted={urgency:'urgent',status:'accepted',accepted_at:'2026-10-18T12:00:00Z',arrival_extra_minutes:15};
assert.equal(api.slaMinutes(accepted),50);
assert.equal(api.slaMinutes({...accepted,arrival_extra_minutes:0}),35);
assert.equal(api.arrivalDeadline(accepted,Date.parse(accepted.accepted_at)),Date.parse(accepted.accepted_at)+50*60000);
assert.equal(api.arrivalDeadline({...accepted,status:'completed'}),null);
assert.equal(api.arrivalDeadline({...accepted,status:'cancelled'}),null);
const base={status:'ringing',urgency:'urgent',price:100,discount_amount:0,extra_cost:0,pricing_calculation:{total:100,lines:[{label:'Mão de obra',value:100}],distance_pricing:{threshold_km:20,rate_per_km:0.9,fee:0,price_model:{base:100,minimum:0,after_minimum:0,protected_fees:0,customer_minimum:0,loyalty_percent:0,lishi_percent:0,first_call:false}}}};
const patch=api.acceptedTravelPatch(base,{id:'far'},50);
assert.equal(patch.price,127);assert.equal(patch.locomotion_cost,27);
assert.equal(api.acceptedTravelPatch({...base,...patch},{id:'far'},50).price,127,'re-applying cannot duplicate the travel fee');
const lower=api.acceptedTravelPatch({...base,...patch},{id:'far'},10);
assert.equal(lower.price,100,'closer winner removes previously quoted extra distance');
const legacy={...base,discount_type:'first_call',discount_amount:10,price:90,pricing_calculation:{...base.pricing_calculation,distance_pricing:{threshold_km:20,rate_per_km:0.9,fee:0}}};
assert.equal(api.acceptedTravelPatch(legacy,{id:'far'},50).price,114.3,'legacy first-call discount remains 10%');
console.log(`PASS: ${cases} isolated price comparisons (normal/emergency, 10/20/20.01/25/50 km, first-call/loyalty, minimum floor, Lishi, car/moto/residential); initial distance snapshot, fixed 15-minute extension, stable deadline, no duplicate distance fee and legacy first-call discount. No live accounts, calls, payments or notifications used.`);
