import assert from 'node:assert/strict';
import { build } from 'esbuild';

let user, profiles, accounts, creates, loseReply, wrongOwner;
const clone = value => structuredClone(value);
const matches = (row, query) => Object.entries(query).every(([key, value]) => row[key] === value);
const authenticated = () => ({
  id: 'fixture-owner', account_type: 'chaveiro', role: 'user', is_verified: true,
  legal_name: 'Chaveiro de Teste', full_name: 'Chaveiro de Teste', phone: '11999999999',
});
function reset() {
  user = authenticated();
  profiles = [];
  accounts = [];
  creates = 0;
  loseReply = false;
  wrongOwner = false;
}
const profileEntity = {
  filter: async (query, _sort, limit = 500) => clone(profiles.filter(row => matches(row, query)).slice(0, limit)),
  get: async id => clone(profiles.find(row => row.id === id)),
};
globalThis.profileFixtureSDK = {
  auth: { me: async () => clone(user) },
  asServiceRole: { entities: {
    Locksmith: {
      ...profileEntity,
      create: async () => { throw new Error('Service-role creation recreates the ownership bug'); },
    },
    MercadoPagoAccount: { filter: async query => clone(accounts.filter(row => matches(row, query))) },
  } },
  entities: { Locksmith: {
    ...profileEntity,
    create: async data => {
      assert.equal('created_by_id' in data, false, 'ownership comes from authenticated credentials');
      creates++;
      const record = { ...data, id: 'fixture-profile-' + creates,
        created_by_id: wrongOwner ? 'service_fixture' : user.id };
      profiles.push(record);
      if (loseReply) { loseReply = false; throw new Error('Network reply lost after commit'); }
      return clone(record);
    },
  } },
};
const result = await build({
  stdin: { contents: "export { ensureLocksmithProfile } from './base44/shared/locksmithProfile.ts'; export { default as connectHandler } from './base44/functions/mercadoPagoConnect/entry.ts';", resolveDir: process.cwd() },
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{ name: 'isolated-fixtures', setup(builder) {
    builder.onResolve({ filter: /^npm:@base44\/sdk/ }, () => ({ path: 'sdk', namespace: 'fixture' }));
    builder.onResolve({ filter: /^base44:runtime$/ }, () => ({ path: 'runtime', namespace: 'fixture' }));
    builder.onResolve({ filter: /\/mercadoPago\.ts$/ }, () => ({ path: 'oauth', namespace: 'fixture' }));
    builder.onResolve({ filter: /\/appleReviewPolicy\.ts$/ }, () => ({ path: 'review', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path }) => ({
      contents: path === 'sdk' ? 'export const createClientFromRequest = () => globalThis.profileFixtureSDK;'
        : path === 'runtime' ? 'export const secrets = { get: () => "fixture-client" };'
        : path === 'review' ? 'export const appleReviewRole = () => null;'
        : 'export const MP_CALLBACK_URL = "https://fixture.invalid/callback"; export const createOAuthState = async () => "fixture-state";',
      loader: 'js',
    }));
  } }],
});
const api = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const prepare = details => api.ensureLocksmithProfile(profileFixtureSDK, user, details);
const invoke = async action => {
  const response = await api.connectHandler(new Request('https://fixture.invalid', {
    method: 'POST', body: JSON.stringify({ action }),
  }));
  return { status: response.status, data: await response.json() };
};

// Existing orphan records never authorize ownership just by matching a name.
reset();
profiles.push({ id: 'old-service-profile', created_by_id: 'service_fixture', name: user.legal_name });
let mine = await prepare({ specialty: 'Automotivo', created_by_id: 'intruder', name: 'Injected' });
assert.equal(mine.created_by_id, user.id);
assert.equal(mine.name, user.legal_name);
assert.equal(mine.specialty, 'Automotivo');
assert.equal((await prepare()).id, mine.id);
assert.equal(creates, 1, 'repeated preparation reuses the authenticated profile');
assert.equal(profiles[0].created_by_id, 'service_fixture', 'old history is preserved');
assert.equal(mine.online, false, 'repair does not make a provider online');

// A committed creation is recognized even when the first response was lost.
reset();
loseReply = true;
await assert.rejects(prepare(), /reply lost/);
mine = await prepare();
assert.equal(mine.created_by_id, user.id);
assert.equal(creates, 1);

reset();
wrongOwner = true;
await assert.rejects(prepare(), /confirmar o vínculo/, 'never acknowledge a profile owned by a technical principal');
for (const change of [{ account_type: 'cliente' }, { is_verified: false }]) {
  reset();
  user = { ...user, ...change };
  await assert.rejects(prepare(), /Entre com sua conta/);
  assert.equal(creates, 0);
}

// A current payment connection is recognized before an old inactive record.
reset();
mine = await prepare();
accounts = [
  { locksmith_user_id: user.id, status: 'revoked' },
  { locksmith_user_id: user.id, status: 'active', mercado_pago_user_id: 'fixture-seller' },
];
let status = await invoke('get_status');
assert.equal(status.status, 200);
assert.equal(status.data.connected, true);
assert.equal(status.data.account_id, 'fixture-seller');
assert.equal((await invoke('onboarding_policy')).data.completed, true);

// Owner linkage works even before an authenticated profile has been prepared.
profiles = [];
assert.equal((await invoke('get_status')).data.connected, true);
assert.equal(creates, 1, 'status lookup does not create real profiles');

// A foreign account with a coincident profile ID cannot bypass ownership.
reset();
mine = await prepare();
accounts = [{ locksmith_id: mine.id, locksmith_user_id: 'foreign-owner', status: 'active' }];
assert.equal((await invoke('get_status')).data.connected, false);
accounts = [{ locksmith_id: mine.id, status: 'active' }];
assert.equal((await invoke('get_status')).data.connected, true, 'unowned legacy record still belongs to its exact profile');
accounts = [];
status = await invoke('get_status');
assert.equal(status.data.connected, false);
assert.equal(status.data.required, true, 'payment connection remains required');
assert.equal(status.data.completed, false);
user = { ...user, account_type: 'cliente' };
assert.equal((await invoke('get_status')).status, 403);
user = null;
assert.equal((await invoke('get_status')).status, 401);
console.log('PASS: authenticated profile ownership, repeated preparation and lost replies; orphan history preserved; fail-closed owner validation; client/email restrictions; active vs stale/foreign/legacy payment links; mandatory receiving policy. Only mocks used.');
