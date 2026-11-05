import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
let passed=0;
const context=vm.createContext({crypto:webcrypto,TextEncoder,TextDecoder,Response,URLSearchParams,Date,console});
async function load(path,imports={}) {
  const module=new vm.SourceTextModule(await readFile(path,'utf8'),{context});
  await module.link(async name=>{const values=imports[name];assert.ok(values,'Unexpected import '+name);return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});});
  await module.evaluate();return module.namespace;
}
async function test(name,run){await run();passed++;console.log('PASS',name);}
const errors=await load('src/lib/serviceErrors.js');
await test('HTTP 400 preserves the backend message and code',()=>{const e=errors.normalizeServiceError({message:'Request failed with status code 400',response:{status:400,data:{error:'Esta região ainda não está atendida.',code:'AREA_UNAVAILABLE'}}});assert.equal(e.message,'Esta região ainda não está atendida.');assert.equal(e.code,'AREA_UNAVAILABLE');assert.equal(e.status,400);});
await test('first-use login guidance is visible',()=>{const e=errors.normalizeServiceError({message:'Request failed with status code 400',response:{status:400,data:{error:'Entre na sua conta para continuar.',code:'GUEST_LOGIN_REQUIRED'}}});assert.equal(e.message,'Entre na sua conta para continuar.');assert.equal(e.code,'GUEST_LOGIN_REQUIRED');});
await test('cancellation refusal keeps its original HTTP status',()=>{const e=errors.normalizeServiceError({response:{status:403,data:{error:'Limite de cancelamentos atingido.'}}});assert.equal(e.status,403);assert.equal(e.message,'Limite de cancelamentos atingido.');});
const cancellation=await load('base44/shared/cancellationRules.ts',{
 './serviceRequestOwner.ts':{requestClientId:x=>x.client_id,clientRequestsQuery:id=>({client_id:id})},
 './cancellationFee.ts':{cancellationFee:()=>({fee:0})},
 './cancellationSafety.ts':{detectCancellationPattern:async()=>{},safetyBlockFor:async()=>null},
});
const now=Date.now();const events=[1,2,3].map(n=>({request_id:'cancel'+n,cancelled_at:new Date(now-n*60000).toISOString()}));
await test('three distinct cancellations still block for six hours',()=>{const r=cancellation.calculateClientBlock(events,now);assert.equal(r.blocked,true);assert.equal(r.cancelCount,3);assert.ok(r.minutesLeft>350&&r.minutesLeft<=360);});
await test('duplicate events do not create a false cancellation block',()=>assert.equal(cancellation.calculateClientBlock([events[0],events[0],events[0]],now).blocked,false));
await test('empty guest cancellation history stays unblocked',async()=>{const client={asServiceRole:{entities:{ServiceRequest:{filter:async()=>[]},ClientCancellationEvent:{filter:async()=>[]}}}};assert.equal((await cancellation.getClientCancelBlock(client,'guest:new')).blocked,false);});
await test('expired cancellation blocks release automatically',()=>{const old=events.map(e=>({...e,cancelled_at:new Date(now-7*3600000).toISOString()}));assert.equal(cancellation.calculateClientBlock(old,now).blocked,false);});
const identity=await load('base44/shared/guestServiceIdentity.ts',{
 'base44:runtime':{secrets:{get:()=> 'test-key-only'}},
 './clientRequestAccess.ts':{requestCustomerName:x=>String(x||'').trim().length>=2?String(x).trim():''},
 './appleReviewPolicy.ts':{appleReviewRole:()=>null},
 './serviceRequestOwner.ts':{clientRequestsQuery:id=>({client_id:id})},
});
function clientFor(accounts,priorIds=[]) {
 const rows=[];
 return{asServiceRole:{entities:{
 GuestServiceSession:{filter:async q=>rows.filter(x=>x.phone_hash===q.phone_hash),create:async d=>{const row={...d,id:'session'+rows.length};rows.push(row);return row;}},
 User:{filter:async()=>accounts},
 ServiceRequest:{filter:async q=>priorIds.includes(q.client_id)?[{id:'previous'}]:[]},
 }}};
}
const contact={customer_name:'Teste',phone:'11900000000',terms_accepted:true};
const state={clientId:'guest:test',expiresAt:new Date(now+86400000).toISOString()};
await test('registration alone does not consume the first guest service',async()=>{const r=await identity.reserveGuestContact(clientFor([{id:'new-user'}]),state,contact);assert.equal(r.guest_client_id,state.clientId);});
await test('previous service still requires sign-in',async()=>{await assert.rejects(identity.reserveGuestContact(clientFor([{id:'used-user'}],['used-user']),state,contact),e=>e.code==='GUEST_LOGIN_REQUIRED');});
await test('moderation remains enforced for matching accounts',async()=>{await assert.rejects(identity.reserveGuestContact(clientFor([{id:'blocked',moderation_blocked:true}]),state,contact),e=>e.code==='GUEST_LOGIN_REQUIRED');});
let priceCalls=0;
const handler=await load('base44/shared/guestCommandHandler.ts',{
 './serviceCoverage.ts':{requireServiceCoverage:async(client,lat)=>{if(lat===0)throw Object.assign(new Error('Área não atendida.'),{code:'AREA_UNAVAILABLE'});}},
 './createServiceRequest.ts':{createServiceRequest:async()=>{throw Error('Dispatch is forbidden in quote tests');}},
 './placeLookup.ts':{placeLookup:async()=>Response.json({})},
 './guestServiceIdentity.ts':{reserveGuestContact:async()=>{throw Error('Contact creation is forbidden in quote tests');}},
 './guestClaimProof.ts':{signGuestClaimProof:async()=>({})},
 './guestServiceSnapshot.ts':{guestServiceSnapshot:async()=>({request:null})},
 './guestServiceOperations.ts':{guestOpeningData:x=>x,guestServiceAction:async()=>({})},
 './servicePricing.ts':{calculateServerServicePrice:async()=>{priceCalls++;return{price:130};}},
 './servicePricingSettings.ts':{loadServicePricing:async()=>({})},
 './vehicleOpeningRules.ts':{matchingOpeningRule:()=>null,openingAvailability:()=>null},
 './automotiveOpening.ts':{validateOpeningVehicle:()=>({valid:true}),isMotoSeatOpening:()=>false},
});
const quoteClient={asServiceRole:{entities:{GuestServiceSession:{filter:async()=>[]}}}};
await test('out-of-coverage addresses are rejected before offering a total',async()=>{await assert.rejects(handler.handleGuestCommand(quoteClient,{clientId:'guest:quote'},{action:'quote',data:{customer_lat:0,customer_lng:0}}),e=>e.code==='AREA_UNAVAILABLE');assert.equal(priceCalls,0);});
await test('covered addresses still receive the server price',async()=>{const r=await handler.handleGuestCommand(quoteClient,{clientId:'guest:quote'},{action:'quote',data:{customer_lat:-23.5,customer_lng:-46.7}});assert.equal(r.data.pricing.price,130);assert.equal(priceCalls,1);});
console.log(`${passed} checks passed; no external calls, real requests or locksmith notifications.`);
