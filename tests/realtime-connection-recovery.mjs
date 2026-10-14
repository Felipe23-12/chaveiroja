import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
const temp=await mkdtemp(tmpdir()+'/chaveiro-realtime-');
let fresh,subscribeMode,subscriber,delivered=[],errors=[];
const docEvents=new Map(),winEvents=new Map(),timers=new Map();let timerId=0;
globalThis.document={visibilityState:'visible',addEventListener:(event,fn)=>docEvents.set(event,fn),removeEventListener:event=>docEvents.delete(event)};
globalThis.window={addEventListener:(event,fn)=>winEvents.set(event,fn),removeEventListener:event=>winEvents.delete(event)};
const originalSetTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout;
globalThis.setTimeout=(fn)=>{const id=++timerId;timers.set(id,fn);return id;};globalThis.clearTimeout=id=>timers.delete(id);
globalThis.liveSDK={entities:{ServiceRequest:{
 get:async()=>structuredClone(fresh),
 subscribe:fn=>{subscriber=fn;if(subscribeMode==='throws')throw Error('realtime offline');if(subscribeMode==='rejects')return Promise.reject(Error('realtime offline'));return ()=>{};},
},LocksmithScore:{list:async(sort,limit)=>{assert.equal(sort,'-updated_date');assert.equal(limit,500);return [{locksmith_id:'l',score:8,banned:true},{locksmith_id:'l',score:10,banned:false}];}}}};
const compiled=await build({stdin:{contents:"export {default as watch} from './src/lib/watchServiceRequest.js'; export * from './src/lib/safeUnsubscribe.js';export {loadScoreMap} from './src/lib/locksmithScore.js';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'offline',setup(b){
 b.onResolve({filter:/^@\/api\/base44Client$/},()=>({path:'sdk',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const base44=globalThis.liveSDK;',loader:'js'}));
}}]});
await writeFile(temp+'/test.mjs',compiled.outputFiles[0].text);const api=await import(pathToFileURL(temp+'/test.mjs'));
const settle=async()=>{for(let i=0;i<6;i++)await new Promise(resolve=>setImmediate(resolve));};
const record=(status,time)=>({id:'call',status,updated_date:time,service_type:'Abertura Residencial',address:'Fixture',customer_lat:-23.5,customer_lng:-46.7,locksmith_lat:-23.51,locksmith_lng:-46.7});
for(const mode of ['throws','rejects','works']){
 subscribeMode=mode;delivered=[];errors=[];fresh=record('ringing','2026-10-14T04:00:00Z');
 const stop=api.watch('call',r=>delivered.push(r),e=>errors.push(e));
 await settle();assert.equal(delivered.at(-1).status,'ringing','failed realtime initialization must still start polling');
 fresh=record('accepted','2026-10-14T04:00:01Z');winEvents.get('online')();await settle();
 assert.equal(delivered.at(-1).status,'accepted','reconnection fetch observes atomic acceptance');
 if(mode==='works'){
  subscriber({id:'call',data:record('ringing','2026-10-14T03:59:59Z')});
  assert.equal(delivered.at(-1).status,'accepted','out-of-order event cannot reopen pending request');
 }
 document.visibilityState='hidden';fresh=record('on_the_way','2026-10-14T04:00:02Z');
 document.visibilityState='visible';docEvents.get('visibilitychange')();await settle();
 assert.equal(delivered.at(-1).status,'on_the_way');
 stop();assert.equal(timers.size,0);assert.equal(docEvents.size,0);assert.equal(winEvents.size,0);assert.equal(errors.length,0);
}
const latest=await api.loadScoreMap();assert.equal(latest.get('l').score,8);assert.equal(latest.get('l').banned,true,'old duplicate must not override recent safety state');
let cleaned=0;let resolveSubscription;
const subscription=new Promise(resolve=>{resolveSubscription=resolve;});const stop=api.safeUnsubscribe(subscription);
stop();resolveSubscription(()=>{cleaned++;});await settle();assert.equal(cleaned,1);stop();assert.equal(cleaned,1);
globalThis.setTimeout=originalSetTimeout;globalThis.clearTimeout=originalClearTimeout;
await rm(temp,{recursive:true,force:true});
console.log('PASS: realtime thrown/rejected startup falls back to polling; reconnect/resume observes acceptance and movement; stale events cannot reopen calls; subscription cleanup is safe; latest score wins over older duplicate. No live subscriptions or calls used.');
