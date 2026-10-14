import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const temp = await mkdtemp(tmpdir()+'/chaveiro-connection-');
let n=0;
async function module(path,mocks={}) {
 const compiled=await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',jsx:'automatic',write:false,plugins:[{name:'offline',setup(b){
  b.onResolve({filter:/.*/},a=>a.path in mocks?{path:a.path,namespace:'fixture'}:null);
  b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:mocks[a.path],loader:'js'}));
 }}]});
 const file=temp+'/'+(++n)+'.mjs';await writeFile(file,compiled.outputFiles[0].text);return import(pathToFileURL(file));
}
const network=()=>Object.assign(Error('Network Error'),{code:'ERR_NETWORK'});
const http=status=>Object.assign(Error('HTTP '+status),{response:{status}});
const errors=await module('src/lib/connectionErrors.js');
let attempts=0;
assert.equal(await errors.retryConnectionRead(async()=>{if(++attempts===1)throw network();return 'ok';},{wait:async()=>{}}),'ok');
assert.equal(attempts,2);
for(const status of [400,401,403,404,409]){attempts=0;await assert.rejects(errors.retryConnectionRead(async()=>{attempts++;throw http(status);},{wait:async()=>{}}));assert.equal(attempts,1);}
assert.equal(errors.isTemporaryConnectionError(http(503)),true);
assert.equal(errors.isTemporaryConnectionError(http(403)),false);

// Successful authentication survives a failed optional account repair.
const preserve=(await module('src/lib/preserveAccountProfile.js')).default;
const verifiedClient={id:'client',role:'user',account_type:'cliente',is_verified:true,phone:'11999999999'};
const auth={me:async()=>verifiedClient,updateMe:async fields=>({...verifiedClient,...fields})};
preserve(auth,{invoke:async()=>{throw network();}});
assert.deepEqual(await auth.me(),verifiedClient);
assert.equal((await auth.updateMe({avatar_url:'photo'})).phone,verifiedClient.phone);

// Run the actual provider with React state fixtures: no browser login or credentials.
let states=[],refs=[],effects=[],si=0,ri=0;
globalThis.testAuthReact={
 createContext:()=>({Provider:'provider'}),
 useState:initial=>{const index=si++;states[index]=initial;return [initial,value=>{states[index]=typeof value==='function'?value(states[index]):value;}];},
 useRef:value=>{const index=ri++;refs[index]={current:value};return refs[index];},
 useEffect:effect=>effects.push(effect),
 useContext:()=>({}),
};
const listeners=new Map();let meError=null,publicError=null,tokenClears=0,meCalls=0;
const storage={getItem:()=>null,removeItem:()=>{},setItem:()=>{}};
globalThis.window={localStorage:storage,sessionStorage:storage,location:{pathname:'/',search:'',href:'https://offline.test/'},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
globalThis.localStorage=storage;globalThis.sessionStorage=storage;
globalThis.testAppParams={appId:'app',token:'session'};
globalThis.testAuthSDK={auth:{
 me:async()=>{meCalls++;if(meError)throw meError;return verifiedClient;},
 setToken:()=>tokenClears++,logout:async()=>{},
},functions:{invoke:async(_name,body)=>({data:body.action==='review_status'?{enabled:false,role:null}:{recovered:false}})}};
const authModule=await module('src/lib/AuthContext.jsx',{
 react:'export const {createContext,useState,useRef,useEffect,useContext}=globalThis.testAuthReact;export default globalThis.testAuthReact;',
 'react/jsx-runtime':'export const jsx=(type,props)=>({type,props});export const jsxs=jsx;',
 '@/api/base44Client':'export const base44=globalThis.testAuthSDK;',
 '@/lib/app-params':'export const appParams=globalThis.testAppParams;',
 '@/lib/authProvider':'export const clearAuthProvider=()=>{};',
 '@base44/sdk/dist/utils/axios-client':'export const createAxiosClient=()=>({get:async()=>{if(globalThis.publicAuthError)throw globalThis.publicAuthError;return {id:"app"};}});',
});
function provider(){states=[];refs=[];effects=[];si=0;ri=0;return authModule.AuthProvider({children:null}).props.value;}
let context=provider();
await context.checkAppState();assert.equal(states[2],true);assert.equal(states[0].id,'client');
meError=network();await context.checkUserAuth();
assert.equal(states[0].id,'client','temporary read failure retains confirmed account');
assert.equal(states[2],true);assert.equal(states[5].type,'connection');assert.equal(tokenClears,0);
meError=null;await context.checkUserAuth();assert.equal(states[5],null);
const blocked={getItem(){throw Error('storage blocked');},removeItem(){throw Error('storage blocked');}};
window.localStorage=blocked;window.sessionStorage=blocked;globalThis.localStorage=blocked;globalThis.sessionStorage=blocked;
await context.checkAppState();assert.equal(states[2],true,'blocked storage cannot prevent SDK session validation');
meError=http(401);await context.checkUserAuth();assert.equal(states[2],false);assert.equal(states[0],null);assert.equal(tokenClears,1);assert.equal(testAppParams.token,null,'invalid token cleared even if storage removal throws');
meError=null;await context.checkUserAuth();
globalThis.publicAuthError=network();await context.checkAppState();assert.equal(states[2],true,'valid SDK session can recover independently of public settings endpoint');
globalThis.publicAuthError=null;
let resolveMe;testAuthSDK.auth.me=()=>new Promise(resolve=>{resolveMe=resolve;});
const one=context.checkUserAuth(),two=context.checkUserAuth();assert.equal(one,two,'simultaneous auth checks share one request');
context.logout(false);resolveMe(verifiedClient);await one;assert.equal(states[0],null,'late auth response must not undo logout');
testAuthSDK.auth.me=async()=>verifiedClient;

// Acceptance is acknowledged only by the server record; a lost reply is reconciled.
let fresh,mode,reads,mutations;
const locksmith={id:'locksmith',created_by_id:'locksmith-user'};
function resetRing(){fresh={id:'call',status:'ringing',customer_lat:-23.5,customer_lng:-46.7};mode='normal';reads=0;mutations=0;}
Object.defineProperty(globalThis,'navigator',{value:{onLine:true,geolocation:{getCurrentPosition:ok=>ok({coords:{latitude:-23.5,longitude:-46.7}})}},configurable:true});
globalThis.testRingSDK={entities:{ServiceRequest:{get:async()=>{reads++;if(mode==='read_failure')throw network();return structuredClone(fresh);}}},functions:{invoke:async(_name,body)=>{
 if(body.action==='locksmith_location')return {data:{allowed:true}};
 if(body.action==='score_event')return {data:{}};
 assert.equal(body.action,'accept_request');mutations++;
 if(mode==='denied')throw Object.assign(Error('Forbidden'),{response:{status:403,data:{code:'CPF_REQUIRED',error:'CPF pendente'}}});
 if(mode==='unconfirmed')throw network();
 if(mode==='malformed')return {data:{}};
 fresh={...fresh,status:mode==='queued'?'queued':'accepted',locksmith_id:'locksmith',locksmith_user_id:'locksmith-user'};
 if(mode==='lost_reply')throw network();
 return {data:{request:structuredClone(fresh),queued:fresh.status==='queued'}};
}}};
const ring=await module('src/lib/ringBroadcast.js',{
 '@/api/base44Client':'export const base44=globalThis.testRingSDK;',
 '@/lib/geo':'export const fetchDrivingRoute=async()=>null;',
 '@/lib/serviceQueue':'export const SECOND_JOB_MAX_DISTANCE_KM=20;export const canReceiveWhileBusy=()=>true;export const getLocksmithQueueState=async()=>({});',
});
resetRing();assert.equal((await ring.acceptRing('call',locksmith)).ok,true);assert.equal(mutations,1);
assert.equal((await ring.acceptRing('call',locksmith)).recovered,true);assert.equal(mutations,1,'duplicate click does not reserve again');
resetRing();mode='lost_reply';const recovered=await ring.acceptRing('call',locksmith);assert.equal(recovered.ok,true);assert.equal(recovered.recovered,true);assert.equal(mutations,1);
resetRing();mode='unconfirmed';let result=await ring.acceptRing('call',locksmith);assert.equal(result.ok,false);assert.equal(result.retryable,true);assert.equal(fresh.status,'ringing');
resetRing();mode='read_failure';result=await ring.acceptRing('call',locksmith);assert.equal(result.retryable,true);assert.equal(mutations,0);
resetRing();mode='denied';result=await ring.acceptRing('call',locksmith);assert.equal(result.code,'CPF_REQUIRED');assert.equal(result.retryable,false);
resetRing();mode='malformed';result=await ring.acceptRing('call',locksmith);assert.equal(result.ok,false,'malformed reply cannot show false acceptance');
resetRing();mode='queued';assert.equal((await ring.acceptRing('call',locksmith)).queued,true);
resetRing();fresh.status='cancelled';assert.equal((await ring.acceptRing('call',locksmith)).code,'REQUEST_UNAVAILABLE');assert.equal(mutations,0);
resetRing();fresh={...fresh,status:'accepted',locksmith_id:'other',locksmith_user_id:'other-user'};assert.equal((await ring.acceptRing('call',locksmith)).ok,false);assert.equal(mutations,0);
resetRing();navigator.geolocation={getCurrentPosition:(_ok,fail)=>fail({code:1})};assert.equal((await ring.acceptRing('call',locksmith)).code,'GPS_REQUIRED');assert.equal(mutations,0);

// Pending offline acceptance must not be discarded by a temporary network failure.
const memory=new Map();globalThis.localStorage={getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)};
let queueResult={ok:false,retryable:true,code:'CONNECTION_FAILED'},queueCalls=0;
globalThis.queueFixture=async()=>{queueCalls++;return queueResult;};
const queue=await module('src/lib/offlineActionQueue.js',{
 '@/api/base44Client':'export const base44={};',
 '@/lib/ringBroadcast':'export const acceptRing=(...args)=>globalThis.queueFixture(...args);export const rejectRing=async()=>{};',
 '@/lib/offlineCache':'export const saveLastService=()=>{};export const getLastService=()=>null;',
});
queue.enqueueAction({type:'accept',requestId:'call',locksmith});
assert.equal(await queue.flushActionQueue(),0);assert.equal(queue.queuedActionsCount(),1);
queueResult={ok:true,request:{id:'call'}};assert.equal(await queue.flushActionQueue(),1);assert.equal(queue.queuedActionsCount(),0);
assert.equal(queueCalls,2);
await rm(temp,{recursive:true,force:true});
console.log('PASS: temporary vs authorization errors; bounded read retries; profile sync failure; session retained after network loss; blocked storage; real 401; auth deduplication and logout race; lost acceptance reply recovered; no false acceptance; GPS and policy checks preserved; offline acceptance retained until confirmed. No real users or calls modified.');
