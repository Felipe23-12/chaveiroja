import assert from 'node:assert/strict';
import { build } from 'esbuild';
async function moduleFrom(path, mocks = {}) {
  const result = await build({entryPoints:[path], bundle:true, platform:'node', format:'esm', write:false, plugins:[{name:'fixtures',setup(b){b.onResolve({filter:/.*/},args => args.path in mocks ? {path:args.path,namespace:'fixture'} : null);b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:mocks[args.path],loader:'js'}));}}]});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const sdkMock = 'export const base44 = globalThis.testSDK;';
const sdk = {'@/api/base44Client':sdkMock};
const blocked = {getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}};
globalThis.localStorage = blocked; globalThis.sessionStorage = blocked;
const origin='https://example.test'; let replaced='';
globalThis.window={location:{origin,search:'?access_token=test-token&returnTo=%2F',pathname:'/auth/google-return',hash:''},history:{replaceState(_a,_b,url){replaced=url;}},addEventListener(){},removeEventListener(){}};
globalThis.document={title:'test',visibilityState:'visible',addEventListener(){},removeEventListener(){}};
let token;
globalThis.testSDK={auth:{setToken(value){token=value;},isAuthenticated:async()=>true}};
const restore=await moduleFrom('src/lib/restoreGoogleSession.js',sdk);
assert.equal(await restore.default(),true);assert.equal(token,'test-token');assert.ok(!replaced.includes('access_token'));
window.location.search='';assert.equal(await restore.default(),true,'cookie authentication survives blocked storage');
const provider=await moduleFrom('src/lib/authProvider.js');assert.doesNotThrow(()=>provider.markAuthProvider('google'));assert.equal(provider.getAuthProvider(),null);assert.doesNotThrow(provider.clearAuthProvider);
const redirects=await moduleFrom('src/lib/authReturnTo.js');
for(const url of ['https://evil.test','//evil.test','/\\evil.test'])assert.equal(redirects.safeReturnTo(url),'/');
assert.equal(redirects.safeReturnTo('/?app_id=bad&access_token=bad&step=2'),'/?step=2');
const native=await moduleFrom('src/lib/nativeAuthEnvironment.js');
Object.defineProperty(globalThis,'navigator',{value:{userAgent:'iPhone',platform:'iPhone',maxTouchPoints:1},configurable:true});assert.equal(native.isNativeIOS(),false);window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'ios'};assert.equal(native.isNativeIOS(),true);delete window.Capacitor;
// GPS must succeed and synchronize before the accept operation can run.
let actions=[];globalThis.testSDK={entities:{ServiceRequest:{get:async()=>({status:'ringing',customer_lat:-23,customer_lng:-46})}},functions:{invoke:async(_name,args)=>{actions.push(args.action);return {data:{request:{id:'service',status:'accepted',locksmith_id:'locksmith',locksmith_user_id:'locksmith-user'},allowed:true}};}}};
const ring=await moduleFrom('src/lib/ringBroadcast.js',{...sdk,'@/lib/geo':'export async function fetchDrivingRoute(){return null;}', '@/lib/serviceQueue':'export const SECOND_JOB_MAX_DISTANCE_KM=5; export const canReceiveWhileBusy=()=>true; export const getLocksmithQueueState=async()=>({});'});
navigator.geolocation=undefined;assert.equal((await ring.acceptRing('service',{id:'locksmith',created_by_id:'locksmith-user'})).code,'GPS_REQUIRED');assert.deepEqual(actions,[]);
navigator.geolocation={getCurrentPosition(_ok,fail){fail({code:1});}};assert.equal((await ring.acceptRing('service',{id:'locksmith',created_by_id:'locksmith-user'})).code,'GPS_REQUIRED');assert.deepEqual(actions,[]);
navigator.geolocation={getCurrentPosition(ok,_fail,options){assert.equal(options.maximumAge,0);ok({coords:{latitude:-23.5,longitude:-46.5}});}};
assert.equal((await ring.acceptRing('service',{id:'locksmith',created_by_id:'locksmith-user'})).ok,true);assert.deepEqual(actions.slice(0,2),['locksmith_location','accept_request']);
// Payment callback failure must allow a later retry, without creating a new charge.
let effect,cleanup,fail=true,confirmations=0,statusCalls=0;
globalThis.testReact={useEffect(fn){effect=fn;},useRef(value){return {current:value};},useState(){return [{},()=>{}];}};
globalThis.testSDK={functions:{invoke:async(name,args)=>{assert.equal(name,'mercadoPagoPayment');assert.equal(args.action,'get_status');statusCalls++;return {data:{status:'paid',payment_id:'payment',method:'pix'}};}}};
const checkout=await moduleFrom('src/hooks/useCheckoutConfirmation.js',{...sdk,react:'export const {useEffect,useRef,useState}=globalThis.testReact;'});
const state=checkout.default('service','service',async()=>{confirmations++;if(fail)throw Error('temporary update failure');});cleanup=effect();
await new Promise(resolve=>setImmediate(resolve));fail=false;await state.check();await state.check();cleanup();assert.equal(confirmations,2);assert.equal(statusCalls,2,'no duplicate callback once successful');
const verification=await moduleFrom('base44/shared/paymentVerification.ts');
const request={id:'service',status:'completed',created_by_id:'client',locksmith_id:'locksmith',price:100};let payments=[];
const db={asServiceRole:{entities:{Payment:{filter:async()=>payments}}}};
assert.equal(await verification.confirmedServicePayment(db,{...request,payment_status:'paid'}),false,'display-only status cannot settle debt');
const payment={client_id:'client',locksmith_id:'locksmith',payment_kind:'service',amount:100};payments=[payment];assert.equal(await verification.confirmedServicePayment(db,request),true);
for(const invalid of [{...payment,amount:99},{...payment,client_id:'other'},{...payment,payment_kind:'cancellation'}]){payments=[invalid];assert.equal(await verification.confirmedServicePayment(db,request),false);}
console.log('PASS: Google callback and blocked storage, redirect safety, native iOS detection, GPS denied/required/fresh fix, payment callback retry and confirmation ownership/amount.');
