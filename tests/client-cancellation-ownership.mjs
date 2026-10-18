import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const entry='base44/functions/serviceTrust/entry.ts';
const source=await readFile(entry,'utf8');
const mocks={};
for(const match of source.matchAll(/import \{([^}]+)\} from '([^']+)'/g)){
  const file=match[2].split('/').at(-1);
  if(file==='acceptedTravel.ts'||file==='serviceRequestOwner.ts'||file==='requestDispatch.ts'||file==='scoreDispatchPolicy.ts'||file==='locksmithAppReadiness.ts'||file==='registrationEligibility.ts')continue;
  if(match[2].startsWith('npm:')||match[2].startsWith('base44:'))continue;
  const names=match[1].split(',').map(n=>n.trim());
  mocks[file]=names.map(n=>'export const '+n+'=(...args)=>globalThis.ownerMocks.'+n+'(...args);').join('\n');
}
mocks['serviceAreas.ts']+='\n';
let quote, events, user, rows, contexts, writes, queries;
const clone=value=>structuredClone(value);
const matches=(record,query)=>Object.entries(query).every(([key,value])=>{
 if(key==='$or')return value.some(q=>matches(record,q));
 if(key==='$and')return value.every(q=>matches(record,q));
 const actual=record[key];
 if(value&&typeof value==='object'){
  if('$in' in value)return value.$in.includes(actual??null);
  if('$exists' in value)return (key in record)===value.$exists;
  if('$ne' in value)return actual!==value.$ne;
 }
 return actual===value;
});
const now=new Date().toISOString();
const reset=()=>{
 user={id:'client',role:'user',full_name:'Cliente Teste'};
 rows=[];contexts=[];writes=0;events=[];
 quote={free:true,fee:0,locksmithAmount:0,appFee:0};
};
const entities={
 ServiceRequest:{
  get:async id=>clone(rows.find(r=>r.id===id)||null),
  filter:async q=>{queries.push(clone(q));return clone(rows.filter(r=>matches(r,q)));},
  create:async data=>{
   const r={...clone(data),id:'request-'+(rows.length+1),created_by_id:'service_technical',created_date:now,updated_date:now};
   rows.push(r);return clone(r);
  },
  update:async(id,patch)=>{const r=rows.find(r=>r.id===id);assert.ok(r);Object.assign(r,clone(patch));writes++;return clone(r);},
  delete:async id=>{rows=rows.filter(r=>r.id!==id);},
 },
 ServiceRequestContext:{create:async r=>{contexts.push(clone(r));return r;}},
 Locksmith:{filter:async()=>[]},
 LocksmithScore:{filter:async()=>[]},
 UserBlock:{filter:async()=>[]},
};
globalThis.ownerSDK={auth:{me:async()=>user,updateMe:async()=>user},asServiceRole:{entities}};
globalThis.ownerMocks={
 handleAppleReview:async()=>null,
 clientRequestAccess:async()=>({allowed:true,registration_complete:true}),
 clientDebt:async()=>null,
 requestCustomerName:v=>String(v).trim(),
 requireServiceCoverage:async()=>[],
 calculateServerServicePrice:async()=>({price:100,discount:0,fields:{},calculation:{total:100,lines:[]}}),
 getClientCancelBlock:async()=>({blocked:false}),
 loadServiceAreas:async()=>[],
 isAreaAvailable:()=>true,
 appleReviewUserIds:async()=>[],
 isAppleReviewRequest:r=>r?.apple_review===true,
 validatedLocation:d=>({service_type:d.service_type,address:d.address,place_type:'vehicle'}),
 notifyRingingLocksmiths:async()=>({notified:[]}),
 clientCancellationQuote:async(_sdk,request)=>{assert.equal(globalThis.ownerHelpers.requestClientId(request),'client');return quote;},
 recordClientCancellation:async(_sdk,r)=>events.push({client_id:globalThis.ownerHelpers.requestClientId(r),request_id:r.id}),
 penalizeLocksmithCancellation:async()=>{throw Error('Client cancellation cannot penalize locksmith');},
};
const compiled=await build({
 stdin:{contents:"export {default as handler} from './"+entry+"'; export * from './base44/shared/serviceRequestOwner.ts';",resolveDir:process.cwd()},
 bundle:true,platform:'node',format:'esm',write:false,
 plugins:[{name:'offline-auth-and-db',setup(b){
  b.onResolve({filter:/^npm:@base44\/sdk/},()=>({path:'sdk',namespace:'fixture'}));
  b.onResolve({filter:/^base44:runtime$/},()=>({path:'runtime',namespace:'fixture'}));
  b.onResolve({filter:/\.ts$/},args=>{
   const file=args.path.split('/').at(-1);
   return mocks[file]?{path:file,namespace:'fixture'}:null;
  });
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({
   contents:path==='sdk'?'export const createClientFromRequest=()=>globalThis.ownerSDK;':
    path==='runtime'?'export const secrets={get:()=>undefined};':mocks[path],loader:'js',
  }));
 }}],
});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
globalThis.ownerHelpers=api;
const call=async(action,body={})=>{const response=await api.handler(new Request('https://offline.test',{method:'POST',body:JSON.stringify({action,...body})}));return {status:response.status,data:await response.json()};};
reset();queries=[];
const created=await call('create_request',{data:{
 service_type:'Abertura Automotiva',address:'Endereço de teste',customer_name:'Cliente Teste',
 customer_lat:-23.53,customer_lng:-46.7,location_context:{coordinates_confirmed:true},
 client_id:'attacker',created_by_id:'attacker',
}});
assert.equal(created.status,200);
assert.equal(created.data.request.created_by_id,'service_technical','fixture reproduces actual Base44 server attribution');
assert.equal(created.data.request.client_id,'client','owner comes from authenticated user, never body');
assert.equal(contexts[0].client_id,'client');
const id=created.data.request.id;
assert.equal((await call('cancel_quote',{request_id:id})).status,200,'quote succeeds for real client despite technical author');
let result=await call('cancel_request',{request_id:id,actor:'chaveiro'});
assert.equal(result.status,200);
assert.equal(rows[0].status,'cancelled');
assert.equal(rows[0].cancelled_by,'cliente','actor inferred from authenticated participant');
assert.deepEqual(events,[{client_id:'client',request_id:id}]);
assert.equal((await call('cancel_request',{request_id:id})).data.duplicate,true);
assert.equal(events.length,1,'repeat cancellation does not duplicate penalties');
user={id:'other',role:'user'};
assert.equal((await call('cancel_quote',{request_id:id})).status,403);
assert.equal((await call('cancel_request',{request_id:id,client_id:'client',actor:'cliente'})).status,403);
user={id:'client',role:'user'};
assert.equal((await call('cancel_quote',{})).status,400);
assert.equal((await call('cancel_quote',{request_id:'missing'})).status,404);
assert.equal((await call('cancel_request',{request_id:'missing'})).status,404);
rows[0].status='completed';
assert.equal((await call('cancel_request',{request_id:id})).status,409,'completed service cannot be cancelled');
rows[0].status='accepted';quote={free:false,fee:25,locksmithAmount:20,appFee:5};
result=await call('cancel_request',{request_id:id});
assert.equal(result.status,409);assert.equal(result.data.requires_fee,true);assert.equal(rows[0].status,'accepted');
assert.equal((await call('cancel_request',{request_id:id,confirmed_fee:true,confirmed_fee_amount:1})).status,409);
result=await call('cancel_request',{request_id:id,confirmed_fee:true,confirmed_fee_amount:25});
assert.equal(result.status,200);assert.equal(rows[0].cancellation_fee,25);assert.equal(rows[0].payment_status,'pending');
rows[0]={...rows[0],status:'ringing',client_id:undefined,created_by_id:'client'};quote={free:true,fee:0,locksmithAmount:0,appFee:0};
assert.equal((await call('cancel_request',{request_id:id})).status,200,'old user-created calls still work');
rows[0]={...rows[0],status:'ringing',client_id:undefined,created_by_id:'service_technical'};
assert.equal((await call('cancel_request',{request_id:id,client_id:'client'})).status,403,'unlinked technical request cannot be claimed from caller input');
user={id:'administrator',role:'admin'};rows[0].client_id='client';
assert.equal((await call('cancel_quote',{request_id:id})).status,200);
assert.equal((await call('cancel_request',{request_id:id,actor:'cliente'})).status,200);
user=null;assert.equal((await call('cancel_request',{request_id:id})).status,401);
assert.equal(api.requestClientId({client_id:'actual',created_by_id:'technical'}),'actual');
assert.equal(api.requestClientId({created_by_id:'legacy'}),'legacy');
assert.equal(api.requestClientId({created_by_id:'service_technical'}),undefined);
const query=api.clientRequestsQuery('client');
assert.equal(matches({client_id:'client',created_by_id:'service_technical'},query),true);
assert.equal(matches({created_by_id:'client'},query),true);
assert.equal(matches({client_id:'other',created_by_id:'client'},query),false,'explicit owner overrides legacy creator in history filters');
const schema=JSON.parse(await readFile('base44/entities/ServiceRequest.jsonc','utf8'));
assert.ok(schema.rls.read.$or.some(q=>q['data.client_id']==='{{user.id}}'));
for(const action of ['create','update','delete'])assert.equal(schema.rls[action].user_condition.role,'admin','clients cannot forge ownership through direct entity mutations');
await build({entryPoints:[
 'base44/functions/serviceTrust/entry.ts','base44/functions/mercadoPagoPayment/entry.ts',
 'base44/functions/sendClientPushNotification/entry.ts','base44/functions/sendChatMessage/entry.ts',
 'base44/functions/quoteOperations/entry.ts','base44/shared/appleReviewOperations.ts',
],outdir:'/tmp/owner-smoke',bundle:true,platform:'node',format:'esm',write:false,external:['npm:*','base44:*']});
console.log('PASS: reproduced technical creator; authenticated client owns new calls; cancel quote and free/paid cancellation; unauthorized/missing/completed/idempotent/admin cases; legacy history; read access and mutation protection; related backend compilation. No real calls cancelled or notifications sent.');
