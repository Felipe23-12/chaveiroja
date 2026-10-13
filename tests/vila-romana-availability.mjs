import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result=await build({stdin:{contents:"export {buildEligibleQueue} from './src/lib/ringRotation.js'; export {expandUntilFound} from './src/lib/searchRadius.js';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,plugins:[{name:'sdk',setup(b){b.onResolve({filter:/^@\/api\/base44Client$/},()=>({path:'sdk',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const base44={};',loader:'js'}));}}]});
const {buildEligibleQueue,expandUntilFound}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const location={lat:-23.5287714,lng:-46.7037412};
const service={id:'abertura_automotiva',specialty:'Automotivo'};
// Synthetic nearby profiles; no customer identity or live-provider records are created.
const profile={id:'fixture',online:true,work_mode:'app',services:['abertura_automotiva'],lat:-23.53,lng:-46.71,service_radius_km:15};
assert.equal(buildEligibleQueue([profile],service,location,10).length,1);
assert.equal(expandUntilFound(buildEligibleQueue([profile],service,location,100),10).inRadius.length,1);
assert.equal(buildEligibleQueue([{...profile,services:['abertura_residencial']}],service,location,10).length,0);
assert.equal(buildEligibleQueue([{...profile,work_mode:'livre',receive_app_requests:false}],service,location,10).length,0);
assert.equal(buildEligibleQueue([{...profile,trust_status:{suspended_until:'2099-01-01'}}],service,location,10).length,0);
console.log('PASS: Vila Romana automotive opening with nearby online provider, automatic radius, service/mode/suspension restrictions.');
