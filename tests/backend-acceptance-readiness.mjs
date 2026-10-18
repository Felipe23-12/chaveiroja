import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
const source=await readFile('base44/functions/serviceTrust/entry.ts','utf8');
const real=new Set(['acceptedTravel.ts','serviceRequestOwner.ts','requestAcceptance.ts','requestDispatch.ts','scoreDispatchPolicy.ts','locksmithAppReadiness.ts','registrationEligibility.ts','unansweredRequest.ts']);
const mocks={};
for(const match of source.matchAll(/import \{([^}]+)\} from '([^']+)'/g)) {
 const file=match[2].split('/').at(-1);
 if(real.has(file)||match[2].startsWith('npm:')||match[2].startsWith('base44:'))continue;
 mocks[file]=match[1].split(',').map(n=>n.trim()).map(n=>'export const '+n+'=(...args)=>globalThis.auditBackendMocks.'+n+'(...args);').join('\n');
}
let profiles,users,approvals,accounts,scores,requests,user,writes,contexts,blocked,approvalError;
const clone=v=>structuredClone(v);
const matches=(row,q)=>Object.entries(q).every(([key,v])=>{
 if(key==='$or')return v.some(part=>matches(row,part));
 const value=row[key];
 if(v&&typeof v==='object') {
  if('$in' in v)return v.$in.includes(value??null);
  if('$nin' in v)return !v.$nin.includes(value);
  if('$ne' in v)return value!==v.$ne;
  if('$gt' in v)return value>v.$gt;
 }
 return value===v;
});
const profile=(id,owner)=>({id,created_by_id:owner,online:true,lat:-23.53,lng:-46.7,work_mode:'app',services:['abertura_residencial'],service_radius_km:10});
const callRecord=(id='call')=>({id,client_id:'client',created_by_id:'service_technical',status:'ringing',created_date:new Date().toISOString(),service_type:'Abertura Residencial',address:'Fixture',
 urgency:'normal',customer_lat:-23.54,customer_lng:-46.7,ringing_locksmith_ids:['p1','p2'],ringing_locksmith_user_ids:['u1','u2']});
function reset(){
 profiles=[profile('p1','u1'),profile('p2','u2')];
 users=[{id:'u1',role:'user',cpf:'52998224725'},{id:'u2',role:'user',cpf:'52998224725'}];
 approvals=users.map(u=>({user_id:u.id,cpf:u.cpf,ownership_verified:true}));
 accounts=users.map(u=>({locksmith_user_id:u.id,status:'active'}));
 scores=[];requests=[callRecord()];user=users[0];writes=0;contexts=[{request_id:'call',client_id:'client'}];blocked=[];approvalError=null;
}
const entity=(list,requiredFields)=>({filter:async(q,_sort,limit=500,skip=0,fields)=>{
 if(requiredFields)assert.deepEqual(fields,requiredFields,'private eligibility reads request only required fields');
 return clone(list().filter(row=>matches(row,q)).slice(skip,skip+limit));
}});
const entities={
 User:entity(()=>users,['id','role','cpf','moderation_blocked']),
 VerifiedCpf:{filter:async(q,_sort,limit=500,_skip,fields)=>{
  if(approvalError)throw approvalError;
  if(fields)assert.deepEqual(fields,['user_id','cpf']);
  return clone(approvals.filter(row=>matches(row,q)).slice(0,limit));
 }},
 MercadoPagoAccount:entity(()=>accounts),
 LocksmithScore:entity(()=>scores),
 UserBlock:entity(()=>blocked),
 Locksmith:{...entity(()=>profiles),get:async id=>clone(profiles.find(p=>p.id===id))},
 ServiceRequest:{
  get:async id=>clone(requests.find(r=>r.id===id)||null),
  filter:async(q,_sort,limit=500)=>clone(requests.filter(r=>matches(r,q)).slice(0,limit)),
  updateMany:async(q,patch)=>{const found=requests.find(r=>matches(r,q));if(!found)return {updated:0};Object.assign(found,clone(patch.$set));writes++;return {updated:1};},
  update:async(id,patch)=>{const found=requests.find(r=>r.id===id);Object.assign(found,clone(patch));return clone(found);},
 },
 ServiceRequestContext:entity(()=>contexts),
};
globalThis.auditBackendSDK={auth:{me:async()=>user},asServiceRole:{entities},entities};
globalThis.auditBackendMocks={
 handleAppleReview:async()=>null,verifiedCpf:async(_sdk,id)=>approvals.find(a=>a.user_id===id&&a.ownership_verified)?.cpf||null,
 loadServiceAreas:async()=>[],isAreaAvailable:(_areas,lat)=>Number.isFinite(lat)&&lat!==90,
 appleReviewUserIds:async()=>[],isAppleReviewRequest:r=>r?.apple_review===true,clientDebt:async()=>null,
};
const compiled=await build({
 stdin:{contents:"export {default as handler} from './base44/functions/serviceTrust/entry.ts';export * from './base44/shared/locksmithAppReadiness.ts';export * from './base44/shared/requestAcceptance.ts';",resolveDir:process.cwd()},
 bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'fixtures',setup(b){
  b.onResolve({filter:/^npm:@base44\/sdk/},()=>({path:'sdk',namespace:'fixture'}));
  b.onResolve({filter:/^base44:runtime$/},()=>({path:'runtime',namespace:'fixture'}));
  b.onResolve({filter:/\.ts$/},a=>mocks[a.path.split('/').at(-1)]?{path:a.path.split('/').at(-1),namespace:'fixture'}:null);
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({contents:path==='sdk'?'export const createClientFromRequest=()=>globalThis.auditBackendSDK;':path==='runtime'?'export const secrets={get:()=>undefined};':mocks[path],loader:'js'}));
 }}],
});
const temp=await mkdtemp(tmpdir()+'/chaveiro-backend-');await writeFile(temp+'/test.mjs',compiled.outputFiles[0].text);
const api=await import(pathToFileURL(temp+'/test.mjs'));
const invoke=async(action,data={})=>{const response=await api.handler(new Request('https://offline.test',{method:'POST',body:JSON.stringify({action,...data})}));return {status:response.status,data:await response.json()};};
const accept=(request_id='call',locksmith_id=user.id==='u1'?'p1':'p2')=>invoke('accept_request',{request_id,locksmith_id});
reset();
assert.equal((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).length,2);
accounts.unshift({locksmith_user_id:'u1',status:'disconnected'});
assert.equal((await accept()).status,200,'old inactive account must not hide a current active connection');
assert.equal(writes,1);assert.equal((await accept()).data.duplicate,true);assert.equal(writes,1,'retry does not reserve twice');
user=users[1];assert.equal((await accept()).status,409);assert.equal(writes,1,'other locksmith cannot take recovered assignment');
reset();const first=accept();user=users[1];const second=accept();const race=await Promise.all([first,second]);
assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);assert.equal(writes,1,'two simultaneous acceptances have one winner');
reset();approvals=[];assert.equal((await accept()).data.code,'CPF_REQUIRED');assert.equal(writes,0);
assert.equal((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).length,0);
reset();accounts=[];assert.equal((await accept()).data.code,'MERCADO_PAGO_REQUIRED');assert.equal(writes,0);
assert.equal((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).length,0);
reset();accounts=[{locksmith_id:'p1',locksmith_user_id:'intruder',status:'active'}];
assert.equal(api.activePaymentAccount(accounts,profiles[0]),undefined,'another owner cannot be accepted through legacy profile linkage');
assert.equal((await accept()).data.code,'MERCADO_PAGO_REQUIRED');
reset();accounts=[{locksmith_id:'p1',status:'active'}];
assert.equal((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).length,1,'legacy account without owner still matches exact own profile');
reset();users[0].moderation_blocked=true;
assert.equal((await accept()).data.code,'PROFILE_BLOCKED');
assert.deepEqual((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).map(p=>p.id),['p2']);
reset();profiles[0].inactive_deactivated=true;assert.deepEqual((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).map(p=>p.id),['p2']);
reset();scores=[{locksmith_id:'p1',score:9,banned:true},{locksmith_id:'p1',score:10,banned:false}];
assert.deepEqual((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).map(p=>p.id),['p2'],'latest suspension cannot be overridden by duplicate older score');
reset();profiles[0].work_mode='livre';profiles[0].monthly_fee_paid=false;
assert.deepEqual((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).map(p=>p.id),['p2'],'unpaid free mode is not app availability');
reset();users[0].cpf='11111111111';assert.deepEqual((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).map(p=>p.id),['p2']);
reset();approvals.unshift({user_id:'u1',cpf:'11111111111',ownership_verified:true});
assert.deepEqual((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).map(p=>p.id),['p2'],'newest approval governs, never older matching row');
reset();users[0].role='admin';approvals=approvals.filter(a=>a.user_id!=='u1');assert.equal((await api.filterAppReadyLocksmiths(auditBackendSDK,profiles)).length,2);
reset();accounts=accounts.filter(a=>a.locksmith_user_id==='u1');
assert.equal((await invoke('public_locksmiths')).data.items.length,1,'client availability counts only profiles able to accept');
assert.equal((await invoke('public_locksmiths',{surface:'map'})).data.items.length,2,'map surface remains separate');
reset();blocked=[{blocker_id:'client',blocked_id:'u1',active:true}];assert.equal((await accept()).data.code,'CONTACT_BLOCKED');
reset();profiles[0].online=false;assert.equal((await accept()).data.code,'PROFILE_OFFLINE');
reset();profiles[0].services=['confeccao_chave_carro'];assert.equal((await accept()).data.code,'SERVICE_UNAVAILABLE');
reset();profiles[0].lat=90;assert.equal((await accept()).data.code,'AREA_UNAVAILABLE');
reset();scores=[{locksmith_id:'p1',score:9}];requests[0].score_priority_until=new Date(Date.now()+60000).toISOString();assert.equal((await accept()).data.code,'SCORE_PRIORITY');
reset();profiles[0].service_radius_km=1;profiles[0].lat=-23.63;
assert.equal((await accept()).status,200,'directed request survives fresh GPS outside original dispatch radius');
reset();contexts=[];assert.equal((await accept()).status,409,'request context still mandatory');
reset();requests.push({...callRecord('active'),status:'on_the_way',locksmith_id:'p1',locksmith_user_id:'u1'});
requests[0].urgency='urgent';assert.equal((await accept()).status,409,'urgent request cannot queue');
requests[0].urgency='normal';assert.equal((await accept()).data.queued,true);
reset();requests.push({...callRecord('queued'),status:'queued',locksmith_id:'p1',locksmith_user_id:'u1'});assert.equal((await accept()).status,409,'two-job limit remains enforced');
reset();requests[0].status='cancelled';assert.equal((await accept()).status,409);assert.equal(writes,0);
reset();user=null;assert.equal((await accept('call','p1')).status,401);assert.equal(writes,0);
// Integração da nova política dentro da reserva atômica real do handler.
reset();
profiles[0].lat=requests[0].customer_lat+50/6371*180/Math.PI;
profiles[0].service_radius_km=50;
Object.assign(requests[0],{urgency:'urgent',price:100,discount_amount:0,extra_cost:0,
 initial_locksmith_distances:[{locksmith_id:'p1',distance_km:50}],
 pricing_calculation:{total:100,lines:[{label:'Mão de obra',value:100}],distance_pricing:{threshold_km:20,rate_per_km:0.9,fee:0,
 price_model:{base:100,minimum:0,after_minimum:0,protected_fees:0,customer_minimum:0,loyalty_percent:0,lishi_percent:0,first_call:false}}}});
const distant=await accept();assert.equal(distant.status,200);assert.equal(distant.data.request.price,127);
assert.equal(distant.data.request.locomotion_cost,27);assert.equal(distant.data.request.arrival_extra_minutes,15);
assert.equal(distant.data.request.accepted_distance_km,50);
profiles[0].lat=requests[0].customer_lat;
const recovered=await accept();assert.equal(recovered.data.duplicate,true);assert.equal(recovered.data.request.price,127);
assert.equal(recovered.data.request.accepted_distance_km,50);assert.equal(recovered.data.request.arrival_extra_minutes,15);
assert.equal(writes,1,'lost reply recovery does not reprice or restart the deadline');
reset();assert.equal((await invoke('accept_request',{request_id:'call',locksmith_id:'p1',extra:99})).status,400);
assert.equal(writes,0,'locksmith cannot supply an arbitrary surcharge');
await rm(temp,{recursive:true,force:true});
console.log('PASS: readiness and client availability; active vs stale/foreign/legacy payment account; approved CPF and moderation; invitation/profile/service/area/score protections; fresh GPS acceptance; queue limits; two-accept race; idempotent recovery; cancelled and unauthenticated requests. No real data, payments or notifications changed.');
