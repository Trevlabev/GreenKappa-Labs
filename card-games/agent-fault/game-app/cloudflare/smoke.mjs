/**
 * Local integration smoke test against a running Cloudflare Worker.
 * Usage: node ../cloudflare/smoke.mjs http://127.0.0.1:8787 hosted|cascade
 */
import assert from 'node:assert/strict';

const [base, edition] = process.argv.slice(2);
assert(base && ['hosted','cascade'].includes(edition), 'Pass URL and edition');
const expected = edition === 'hosted' ? 'hosted-v0.3.0' : 'cascade-v0.2-P';
const headers = token => token ? { Authorization: 'Bearer ' + token } : {};
async function call(path, { method = 'GET', token, body, expectedStatus = 200 } = {}) {
  const response = await fetch(base + path, {
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

const qr = await fetch(base + '/api/rooms/' + created.code + '/qr.png');
assert.equal(qr.status, 200);
assert.match(qr.headers.get('content-type'), /^image\/png/i);
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

const wsUrl = base.replace(/^http/, 'ws') + '/api/rooms/' + created.code + '/ws';
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
const html = await fetch(base + '/host/' + created.code);
assert.equal(html.status, 200);
assert.match(await html.text(), /AGENT\/FAULT/i);

console.log('PASS: ' + edition + ' — routing, rooms, tokens, 4-player start, QR, privacy and WebSockets');
