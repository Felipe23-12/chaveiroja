import assert from 'node:assert/strict';
import { build } from 'esbuild';
const built=await build({stdin:{contents:`export { default as catalog } from './base44/shared/neighborhoodData/catalog.ts'; export * from './base44/shared/neighborhoodResolver.ts'; export * from './base44/shared/neighborhoodAssignments.ts';`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {catalog,resolveNeighborhood:resolve,catalogNeighborhoodPricing:price,validateNeighborhoodAssignments:validate}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const byId=new Map(catalog.map(r=>[r.id,r]));
assert.equal(byId.size,catalog.length);
assert.equal(catalog.length,3138);assert.equal(catalog.filter(r=>r.boundary_verified).length,486);
for(const row of catalog)for(const id of row.neighbors)assert.equal(byId.get(id)?.city,row.city,'neighbors belong to same municipality');
const moema=catalog.find(r=>r.name==='Moema');
assert.equal(resolve('Moema',moema.lat,moema.lng).row?.id,moema.id);
assert.equal(resolve('Rua Moema, Bairro desconhecido',moema.lat,moema.lng).row,undefined);
assert.equal(resolve('Moema',-22.9,-43.2).row,undefined);
assert.equal(resolve('Moema',null,null).row,undefined);
const groups=new Map();
for(const r of catalog.filter(r=>!r.boundary_verified)){const key=r.city+'|'+r.name;groups.set(key,[...(groups.get(key)||[]),r]);}
let resolvedHomonyms=0;
for(const rows of groups.values())if(rows.length>1)for(const row of rows){const found=resolve(row.name,row.lat,row.lng);if(found.row?.id===row.id)resolvedHomonyms++;}
assert.ok(resolvedHomonyms>10,'homonyms differentiated at their own coordinates');
const candidate=catalog.find(r=>!r.boundary_verified&&r.city!=='São Paulo'&&resolve(r.name,r.lat,r.lng).row?.id===r.id);
assert.ok(candidate);
assert.equal(price(candidate.name,candidate.lat,candidate.lng,{}).percent,0,'new unclassified locality has no guessed adjustment');
assert.equal(price(candidate.name,candidate.lat,candidate.lng,{neighborhood_high:17},{[candidate.id]:'high'}).percent,17);
assert.equal(price(candidate.name,candidate.lat,candidate.lng,{}, {[candidate.id]:'neutral'}).percent,0);
assert.deepEqual(validate({[candidate.id]:'high'}),{[candidate.id]:'high'});
assert.throws(()=>validate({'unknown':'high'}));assert.throws(()=>validate({[candidate.id]:'invalid'}));
console.log(`PASS: 3138 unique records, 486 official boundaries, municipality-safe neighbors, ${resolvedHomonyms} homonym positions, street/out-of-area protection, pending/neutral pricing and assignment validation.`);
