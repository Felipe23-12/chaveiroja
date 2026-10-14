import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const compiled = await build({
  stdin: { contents: "export * from './base44/shared/scoreDispatchPolicy.ts'; export * from './base44/shared/requestDispatch.ts'; export * from './base44/shared/locksmithRingPush.ts'; export {selectScoreBroadcast} from './src/lib/locksmithScore.js';", resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'offline-fixtures', setup(b) {
    b.onResolve({ filter: /serviceAreas\.ts$/ }, () => ({ path: 'areas', namespace: 'fixture' }));
    b.onResolve({ filter: /appleReviewPolicy\.ts$/ }, () => ({ path: 'review', namespace: 'fixture' }));
    b.onResolve({ filter: /^@\/api\/base44Client$/ }, () => ({ path: 'sdk', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({path}) => ({
      contents: path === 'areas' ? 'export async function loadServiceAreas(){return [];} export function isAreaAvailable(_areas,lat,lng){return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) && lat !== 90;}'
        : path === 'review' ? 'export async function appleReviewUserIds(){return ["review-user"];} export function isAppleReviewRequest(sr){return sr?.apple_review === true;}'
        : 'export const base44={};', loader: 'js',
    }));
  }}],
});
const api = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const start = Date.parse('2026-10-13T12:00:00Z');
let now = start;
const realNow = Date.now;
Date.now = () => now;
const clone = value => structuredClone(value);
const provider = (id,extra={}) => ({id,created_by_id:id+'-user',online:true,lat:-23.53,lng:-46.70,service_radius_km:15,services:['abertura_automotiva'],work_mode:'app',...extra});
let providers, scores, blocks, request, notifications, writes, acceptDuringUpdate;
function reset() {
  providers=[provider('ten'),provider('nine'),provider('three')];
  scores=[{locksmith_id:'ten',score:10},{locksmith_id:'nine',score:9},{locksmith_id:'three',score:3}];
  blocks=[];notifications=[];writes=0;acceptDuringUpdate=false;now=start;
  request={id:'call',created_by_id:'client',status:'ringing',service_type:'Abertura Automotiva',customer_lat:-23.53,customer_lng:-46.70,search_radius_km:10,
    created_date:new Date(start).toISOString(),updated_date:'v0',score_priority_until:new Date(start+60000).toISOString(),
    ringing_locksmith_ids:['ten'],ringing_locksmith_user_ids:['ten-user']};
}
const entities={
  User:{filter:async()=>providers.map(p=>({id:p.created_by_id,role:'user',cpf:'52998224725'}))},
  VerifiedCpf:{filter:async()=>providers.map(p=>({user_id:p.created_by_id,ownership_verified:true,cpf:'52998224725'}))},
  MercadoPagoAccount:{filter:async()=>providers.map(p=>({locksmith_user_id:p.created_by_id,status:'active'}))},
  Locksmith:{filter:async()=>providers.filter(p=>p.online),get:async id=>providers.find(p=>p.id===id)},
  LocksmithScore:{filter:async()=>scores},
  UserBlock:{filter:async()=>blocks},
  ServiceRequest:{
    get:async()=>clone(request),
    updateMany:async(query,update)=>{
      if(acceptDuringUpdate){acceptDuringUpdate=false;request.status='accepted';request.ringing_locksmith_ids=['ten'];request.ringing_locksmith_user_ids=['ten-user'];request.updated_date='accepted';return {updated:0};}
      if(query.status!==request.status || query.updated_date && query.updated_date!==request.updated_date)return {updated:0};
      Object.assign(request,clone(update.$set));request.updated_date='v'+(++writes);return {updated:1};
    },
    update:async(_id,patch)=>{Object.assign(request,clone(patch));request.updated_date='v'+(++writes);return clone(request);},
  },
};
const sdk={asServiceRole:{entities,integrations:{Core:{SendPushNotification:async payload=>notifications.push(payload.user_id)}}}};
reset();
let candidates=await api.loadDispatchCandidates(sdk,request);
assert.deepEqual(api.initialScoreCandidates(candidates).map(c=>c.locksmith.id),['ten']);
assert.equal(api.scoreCanReceive(request,{score:9},start+59999),false);
assert.equal(api.scoreCanReceive(request,{score:9},start+60000),true);
await api.refreshRequestDispatch(sdk,'call',start+59999);
assert.deepEqual(request.ringing_locksmith_ids,['ten'],'lower scores excluded before 60s');
now=start+60000;
let result=await api.refreshRequestDispatch(sdk,'call',now);
assert.equal(result.added,2);
assert.deepEqual(request.ringing_locksmith_ids,['ten','nine','three'],'score 10 retained alongside lower scores at 60s');
await api.notifyRingingLocksmiths(sdk,request,true);
assert.deepEqual(notifications,['ten-user','nine-user','three-user']);
const priorWrites=writes;
await api.refreshRequestDispatch(sdk,'call',now);
assert.equal(writes,priorWrites,'retry does not duplicate or rewrite dispatch');
notifications=[];
await api.notifyRingingLocksmiths(sdk,request);
assert.equal(notifications.length,0,'non-repeat alerts are deduplicated');

reset();
request.ringing_locksmith_ids=['ten','nine'];request.ringing_locksmith_user_ids=['ten-user','nine-user'];
await api.notifyRingingLocksmiths(sdk,request,true);
assert.deepEqual(notifications,['ten-user'],'push also enforces score priority against stale or forged recipients');
request.status='accepted';notifications=[];
await api.notifyRingingLocksmiths(sdk,request,true);
assert.equal(notifications.length,0);
assert.equal((await api.refreshRequestDispatch(sdk,'call',start+60000)).added,0);
assert.equal(writes,1,'only previous push tracking write exists');
reset();acceptDuringUpdate=true;
await api.refreshRequestDispatch(sdk,'call',start+60000);
assert.equal(request.status,'accepted','acceptance racing expansion is preserved');
assert.deepEqual(request.ringing_locksmith_ids,['ten']);
await api.notifyRingingLocksmiths(sdk,request,true);
assert.equal(notifications.length,0,'no late alert after concurrent acceptance');

for (const status of ['cancelled','queued','completed','on_the_way']) {
  reset();request.status=status;
  await api.refreshRequestDispatch(sdk,'call',start+60000);
  await api.notifyRingingLocksmiths(sdk,request,true);
  assert.equal(writes,0);assert.equal(notifications.length,0);
}
reset();providers=providers.filter(p=>p.id!=='ten');
candidates=await api.loadDispatchCandidates(sdk,request);
assert.deepEqual(api.initialScoreCandidates(candidates).map(c=>c.locksmith.id),['nine','three'],'no score 10 means no artificial delay');
reset();scores[0].banned=true;
assert.deepEqual(api.initialScoreCandidates(await api.loadDispatchCandidates(sdk,request)).map(c=>c.locksmith.id),['nine','three']);
reset();
providers.push(provider('offline',{online:false}),provider('wrong',{services:['abertura_residencial']}),
  provider('far',{lat:-23.9}),provider('outside',{lat:90}),provider('review',{created_by_id:'review-user'}),
  provider('blocked'),provider('disabled',{work_mode:'livre',receive_app_requests:false}),
  provider('suspended'),provider('banned'),provider('deactivated',{inactive_deactivated:true}));
blocks=[{blocker_id:'blocked-user',blocked_id:'client',active:true}];
scores.push({locksmith_id:'suspended',score:9,suspended_until:new Date(start+3600000).toISOString()},{locksmith_id:'banned',score:8,banned:true});
assert.deepEqual((await api.loadDispatchCandidates(sdk,request)).map(c=>c.locksmith.id),['ten','nine','three'],'service, online, radius, area, review, blocks and suspensions respected');
now=start+60000;
await api.refreshRequestDispatch(sdk,'call',now);
assert.deepEqual(request.ringing_locksmith_ids,['ten','nine','three']);
request.rejections=[{locksmith_id:'nine',rering_at:new Date(now+60000).toISOString()}];
await api.notifyRingingLocksmiths(sdk,request,true);
assert.deepEqual(notifications,['ten-user','three-user'],'rejection cooldown retained');
reset();request.apple_review=true;
assert.deepEqual(await api.loadDispatchCandidates(sdk,request),[]);
await api.refreshRequestDispatch(sdk,'call',start+60000);
assert.equal(writes,0);
reset();providers.push(provider('new-ten'),provider('new-low'));scores.push({locksmith_id:'new-low',score:7});
await api.refreshRequestDispatch(sdk,'call',start+30000);
assert.deepEqual(request.ringing_locksmith_ids,['ten','new-ten'],'online sync does not bypass 60s for lower scores');
reset();request.search_radius_km=1;providers.push(provider('edge',{lat:-23.54}));
assert.equal((await api.loadDispatchCandidates(sdk,request)).some(c=>c.locksmith.id==='edge'),false);
request.auto_expand_radius=true;
await api.refreshRequestDispatch(sdk,'call',start+300000);
assert.equal(request.search_radius_km,1.2);
assert.equal(request.ringing_locksmith_ids.includes('edge'),true,'five-minute radius expansion remains independent');
reset();request.search_radius_km=1;
await api.refreshRequestDispatch(sdk,'call',start+300000);
assert.equal(request.search_radius_km,1,'explicit radius stays fixed');
const queue=[{l:{id:'ten',trust_score:10}},{l:{id:'nine',trust_score:9}}];
assert.deepEqual(api.selectScoreBroadcast(queue,100).map(q=>q.l.id),['ten']);
assert.deepEqual(api.selectScoreBroadcast(queue,200,true).map(q=>q.l.id),['ten','nine']);
assert.equal(api.dispatchScore(undefined),10);
assert.equal(api.dispatchScore({score:'invalid'}),0);
const workflow=JSON.parse(await readFile('base44/workflows/Ampliar Chamado Score Apos Um Minuto.jsonc','utf8'));
assert.deepEqual(workflow.trigger.config.events,['create']);
assert.equal(workflow.definition.do[0].aguardar_prioridade.wait,'PT1M');
assert.equal(workflow.definition.do[1].ampliar_score.with.function_name,'expandScoreDispatch');
const schema=JSON.parse(await readFile('base44/entities/ServiceRequest.jsonc','utf8'));
assert.equal(schema.properties.score_priority_until.format,'date-time');
await build({entryPoints:['base44/functions/serviceTrust/entry.ts','base44/functions/expandScoreDispatch/entry.ts','base44/functions/repeatRingingPushAlerts/entry.ts'],outdir:'/tmp/dispatch-smoke',bundle:true,platform:'node',format:'esm',write:false,external:['npm:*','base44:*']});
Date.now=realNow;
console.log('PASS: score 10 priority before 60s; lower scores at 60s with score 10 retained; online sync; accepted/cancelled races; push timing and deduplication; eligibility and cooldown; no-score-10 fallback; fixed/automatic radius; workflow and backend compilation. No real notifications sent.');
