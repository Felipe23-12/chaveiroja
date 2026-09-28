import assert from 'node:assert/strict';
import { build } from 'esbuild';
const result = await build({entryPoints:['base44/shared/cancellationFee.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const { cancellationFee } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
let checks=0;
for (const serviceType of ['Confecção de Chave de Carro','Confecção de Chave de Moto']) {
 for (const [time,business] of [['2026-09-28T07:59:59-03:00',false],['2026-09-28T08:00:00-03:00',true],['2026-09-28T16:59:59-03:00',true],['2026-09-28T17:00:00-03:00',false],['2026-09-26T12:00:00-03:00',false],['2026-09-27T12:00:00-03:00',false],['2026-10-12T12:00:00-03:00',false],['2026-07-09T12:00:00-03:00',false]]) {
  for (const price of [999.99,1000,1000.01]) {
   for (const urgency of ['normal','urgent']) {
    const q=cancellationFee(price,{serviceType,urgency,now:new Date(time)});
    assert.equal(q.fee,business ? price>1000?150:80 : price>1000?200:150);
    assert.equal(q.businessHours,business);
    assert.equal(q.fixed,true);
    assert.equal(q.locksmithAmount+q.appFee,q.fee); checks++;
   }
  }
 }
}
for (const price of [320,1000,1200,284.74]) {
 const q=cancellationFee(price,{serviceType:'Abertura Residencial',now:new Date('2026-09-27T12:00:00-03:00')});
 assert.equal(q.fee,Math.round(price*25)/100); assert.equal(q.fixed,false); checks++;
}
assert.throws(()=>cancellationFee(-1)); assert.throws(()=>cancellationFee(NaN));
console.log(`${checks+2} cenários de cancelamento aprovados.`);
