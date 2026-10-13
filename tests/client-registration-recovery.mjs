import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({entryPoints:['base44/shared/recoverClientRegistration.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {recoverClientRegistration}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
let current,rows,profiles,blocked,duplicates,writes;
function setup(user,reviewRows=[],profileRows=[]) {current={...user};rows=reviewRows;profiles=profileRows;blocked=[];duplicates=[];writes=[];return {asServiceRole:{entities:{User:{get:async()=>({...current}),filter:async()=>duplicates,update:async(id,data)=>{assert.equal(id,current.id);writes.push(data);current={...current,...data};}},VerifiedCpf:{filter:async query=>query.user_id ? rows : []},Locksmith:{filter:async()=>profiles},BlockedCpf:{filter:async()=>blocked}}}};}
const user={id:'client',account_type:'chaveiro',cpf:'52998224725',phone:'11999999999',moderation_blocked:false};
const review={user_id:user.id,cpf:user.cpf,review_status:'rejected',ownership_verified:false,review_note:'nao e chaveiro',retry_after:'2099-01-01'};
let db=setup(user,[review]);let recovered=await recoverClientRegistration(db,user);assert.equal(recovered.account_type,'cliente');assert.equal(recovered.cpf,user.cpf);assert.equal(writes.length,1);assert.equal('ownership_verified' in writes[0],false);
assert.equal((await recoverClientRegistration(db,recovered)).account_type,'cliente');assert.equal(writes.length,1,'idempotent recovery');
for(const [changed,reviews,providerProfiles] of [[user,[{...review,review_note:'Documentação inválida'}],[]],[user,[review],[{id:'professional'}]],[{...user,moderation_blocked:true},[review],[]],[user,[{...review,ownership_verified:true}],[]]]) {db=setup(changed,reviews,providerProfiles);assert.equal((await recoverClientRegistration(db,changed)).account_type,'chaveiro');assert.equal(writes.length,0,'legitimate locksmith/security restrictions preserved');}
const client={id:'client',account_type:'cliente'};db=setup(client,[{...review,review_status:'pending'}]);recovered=await recoverClientRegistration(db,client);assert.equal(recovered.cpf,user.cpf);assert.equal(recovered.account_type,'cliente');
db=setup(client,[review]);blocked=[{cpf:user.cpf}];assert.equal((await recoverClientRegistration(db,client)).cpf,undefined);assert.equal(writes.length,0);
db=setup(client,[review]);duplicates=[{id:'other',cpf:user.cpf}];assert.equal((await recoverClientRegistration(db,client)).cpf,undefined);assert.equal(writes.length,0);
console.log('PASS: mistaken locksmith category recovered, client pending CPF restored, recovery idempotent, genuine rejections/profiles/moderation/approval/duplicate/blocked CPF preserved.');
