/**
 * Local integration smoke test against a running Cloudflare Worker.
 * Usage: node ../cloudflare/smoke.mjs http://127.0.0.1:8787 hosted|cascade [path-prefix]
 */
import assert from 'node:assert/strict';

const [base, edition, prefix = ''] = process.argv.slice(2);
assert(['', '/cascade'].includes(prefix), 'Unsupported path prefix');
assert(base && ['hosted','cascade'].includes(edition), 'Pass URL and edition');
const expected = edition === 'hosted' ? 'hosted-v0.3.0' : 'cascade-v0.2-P';
const headers = token => token ? { Authorization: 'Bearer ' + token } : {};
async function call(path, { method = 'GET', token, body, expectedStatus = 200 } = {}) {
  const response = await fetch(base + prefix + path, {
    method,
    headers: { ...headers(token), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const data = response.headers.get('content-type')?.includes('json')
    ? await response.json() : await response.text();
  assert.equal(response.status, expectedStatus, method + ' ' + path + ' => ' + JSON.stringify(data));
  return { response, data };
}
const health = (await call('/api/health')).data;
assert.equal(health.status, 'ok');
assert.equal(health.edition, expected);
assert.equal(health.mode, 'cloudflare-durable-object');
assert.deepEqual(health.cards, { Scenario: 24, Interference: 36, Fault: 6 });

const created = (await call('/api/rooms', { method: 'POST', body: {} })).data;
assert.match(created.code, /^[A-HJ-NP-Z2-9]{6}$/);
assert(created.token.length > 20);
await call('/api/rooms/' + created.code, { expectedStatus: 401 });
let host = (await call('/api/rooms/' + created.code, { token: created.token })).data;
assert.equal(host.phase, 'lobby');
assert.equal(host.me.role, 'host');
assert.equal(host.player_count, 0);

const qr = await fetch(base + prefix + '/api/rooms/' + created.code + '/qr.png');
assert.equal(qr.status, 200);
assert.match(qr.headers.get('content-type'), /^image\/svg\+xml/i);
assert((await qr.arrayBuffer()).byteLength > 100);
const playerSecrets = [];
for (let i = 0; i < 4; i++) {
  const joined = (await call('/api/rooms/' + created.code + '/join', {
    method: 'POST', body: { name: 'Tester ' + (i + 1) }
  })).data;
  playerSecrets.push(joined.token);
  const individual = (await call('/api/rooms/' + created.code, { token: joined.token })).data;
  assert.equal(individual.me.role, 'player');
}
await call('/api/rooms/' + created.code + '/join', {
  method: 'POST', body: { name: 'Tester 1' }, expectedStatus: 409
});

const wsUrl = base.replace(/^http/, 'ws') + prefix + '/api/rooms/' + created.code + '/ws';
const observed = [];
const ws = new WebSocket(wsUrl, ['af.v1', 'token.' + playerSecrets[0]]);
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(Error('WebSocket connection timeout')), 12000);
  ws.addEventListener('message', e => {
    const event = JSON.parse(e.data);
    observed.push(event);
    if (event.type === 'ready') {
      clearTimeout(timeout);
      resolve();
    }
  });
  ws.addEventListener('error', reject);
});
assert(observed.some(x => x.type === 'ready'));
await call('/api/rooms/' + created.code + '/action', {
  method: 'POST', token: playerSecrets[0], body: { name: 'start', data: {} },
  expectedStatus: 409
});
host = (await call('/api/rooms/' + created.code + '/action', {
  method: 'POST', token: created.token, body: { name: 'start', data: {} }
})).data;
assert.equal(host.phase, 'setup');
assert.equal(host.round, 1);
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(Error('No server-side WebSocket change notification')), 12000);
  const check = () => {
    if (observed.some(x => x.type === 'changed' && x.version === host.version)) {
      clearTimeout(timeout);
      resolve();
    }
  };
  ws.addEventListener('message', e => {
    const event = JSON.parse(e.data);
    observed.push(event);
    check();
  });
  check();
});
const privatePlayer = (await call('/api/rooms/' + created.code, { token: playerSecrets[2] })).data;
assert.equal(privatePlayer.phase, 'setup');
assert.equal(privatePlayer.me.role, 'player');
assert.equal(privatePlayer.fault, null, 'Private Judge Fault must not leak');
ws.close(1000, 'Tests complete');
const html = await fetch(base + prefix + '/host/' + created.code);
assert.equal(html.status, 200);
assert.match(await html.text(), /AGENT\/FAULT/i);

console.log('PASS: ' + edition + ' (' + (prefix || '/') + ') — routing, rooms, tokens, 4-player start, QR, privacy and WebSockets');

if (edition === 'hosted') {
  // Physical and Cascade flows have a separate baseline suite. NPCs currently
  // apply to digital Classic only. No AI provider request is made here.
  const solo = (await call('/api/rooms', { method: 'POST', body: { play_mode: 'digital' } })).data;
  const endpoint = '/api/rooms/' + solo.code;
  const human = (await call(endpoint + '/join', {
    method: 'POST', body: { name: 'Host Playing Privately' }
  })).data;
  const player = human.token;
  await call(endpoint + '/action', {
    method:'POST', token:player, body:{name:'set_npcs', data:{count:3}}, expectedStatus:409
  });
  const full = (await call(endpoint + '/action', {
    method:'POST',token:solo.token,body:{name:'set_npcs',data:{count:3}}
  })).data;
  assert.equal(full.player_count,4);
  assert.equal(full.npc_count,3);
  assert.equal(full.human_count,1);
  assert.equal(full.players.filter(p=>p.is_npc).length,3);
  assert.equal(full.me.role,'host','The shared host display stays a distinct session');
  let state=(await call(endpoint+'/action',{
    method:'POST',token:solo.token,body:{name:'start',data:{}}
  })).data;
  assert.equal(state.phase,'setup');
  assert.equal(state.players.find(p=>p.is_judge).is_npc,false);
  state=(await call(endpoint+'/action',{
    method:'POST',token:player,body:{name:'lock_profile',data:{profile:'A worried fictional mayor assistant'}}
  })).data;
  assert.equal(state.phase,'generate','Three NPCs should submit automatically without extra clients');
  assert.equal(state.submitted,3);
  assert.equal(state.generation_calls,0);
  state=(await call(endpoint+'/action',{
    method:'POST',token:solo.token,body:{name:'manual_answers',data:{text:
      'A: A ridiculous but still coherent city hall answer.\nB: An elaborately bureaucratic goose problem.\nC: A dramatic emergency meeting about bread.'}}
  })).data;
  assert.equal(state.phase,'spotlight');
  await call(endpoint+'/action',{
    method:'POST',token:player,body:{name:'spotlight',data:{label:'A'}}
  });
  state=(await call(endpoint+'/action',{
    method:'POST',token:player,body:{name:'propose_bonus',data:{claims:{},bonus:null}}
  })).data;
  assert.equal(state.phase,'review');
  assert.equal(Object.keys(state.approvals).length,3,'NPCs automatically cast conservative votes');
  await call(endpoint+'/action',{
    method:'POST',token:player,body:{name:'approve',data:{yes:true}}
  });
  state=(await call(endpoint+'/action',{
    method:'POST',token:solo.token,body:{name:'finalize',data:{}}
  })).data;
  assert.equal(state.phase,'results');
  assert.equal(state.players.reduce((a,p)=>a+p.score,0),1);
  assert.equal(state.generation_calls,0);
  state=(await call(endpoint+'/action',{
    method:'POST',token:solo.token,body:{name:'next',data:{}}
  })).data;
  assert.equal(state.round,2);
  assert.equal(state.phase,'submit','The next NPC Judge should prepare the round automatically');
  assert(state.players.find(p=>p.is_judge)?.is_npc);
  const privateHand=(await call(endpoint,{token:player})).data;
  assert.equal(privateHand.me.hand.length,4);
  assert.equal(privateHand.fault,null,'NPC Judge Fault remains private before reveal');
  await call(endpoint+'/action',{
    method:'POST',token:player,body:{name:'submit',data:{card_id:privateHand.me.hand[0].id}}
  });
  state=(await call(endpoint+'/action',{
    method:'POST',token:solo.token,body:{name:'manual_answers',data:{text:
      'A: A serious goose-related city government proposal.\nB: A very theatrical budget memo.\nC: A bizarre but internally consistent emergency form.'}}
  })).data;
  assert.equal(state.phase,'review','NPC Judge should select Spotlight and conservatively propose no Bonus');
  assert.equal(state.proposal.bonus,null);
  assert.equal(Object.keys(state.approvals).length,3);
  console.log('PASS: hosted NPCs — solo human + 3 private NPC seats, automatic turns, judge rotation, privacy, votes, zero model calls');
}
