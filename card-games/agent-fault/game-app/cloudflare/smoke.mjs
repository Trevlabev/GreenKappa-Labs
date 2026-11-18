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

/**
 * Run a complete four-human, no-inference round in both card modes for this edition.
 * The first (digital) room was created and started by the existing WebSocket smoke above.
 * The second room uses printed IDs and must never draw private virtual hands.
 */
const getRoom = async (room, token) =>
  (await call('/api/rooms/' + room.code, { token })).data;
const act = async (room, token, name, data = {}, expectedStatus = 200) =>
  (await call('/api/rooms/' + room.code + '/action', {
    method: 'POST', token, body: { name, data }, expectedStatus
  })).data;
const sampleReply = 'The fictional assistant reviews the assignment, proposes a detailed first step, and makes an absurd but carefully explained suggestion. It then asks the group to confirm the plan before proceeding.';
const digital = { code: created.code, host: created.token, players: playerSecrets };

async function finishRound(room, playMode) {
  let view = await getRoom(room, room.host);
  assert.equal(view.phase, 'setup');
  assert.equal(view.play_mode, playMode);
  assert.equal(view.player_count, 4);
  const judge = room.players[0], nonjudge = room.players.slice(1);
  assert.equal(view.judge_id, (await getRoom(room, judge)).me.id);
  assert.equal((await getRoom(room, nonjudge[0])).fault, null, 'Judge Fault must not leak');
  if (playMode === 'physical') {
    assert.equal(view.scenario, null, 'Printed-card room must not draw a virtual Scenario');
    assert.equal((await getRoom(room, nonjudge[0])).me.hand.length, 0, 'Printed-card room must not deal virtual hands');
    await act(room, room.host, 'set_scenario', { card_id: 'AF-INF-001' }, 422);
    await act(room, nonjudge[0], 'set_scenario', { card_id: 'AF-SCN-001' }, 409);
    await act(room, room.host, 'set_scenario', { card_id: 'AF-SCN-001' });
    await act(room, nonjudge[0], 'set_fault', { card_id: 'AF-FLT-001' }, 409);
    await act(room, judge, 'set_fault', { card_id: 'AF-FLT-001' });
    assert.equal((await getRoom(room, room.host)).fault, null, 'Unrevealed physical Fault must remain private from the host');
    assert.equal((await getRoom(room, nonjudge[0])).fault, null);
    assert.equal((await getRoom(room, judge)).fault?.id, 'AF-FLT-001');
  } else {
    assert(view.scenario, 'Digital setup must draw a Scenario');
    assert.equal((await getRoom(room, nonjudge[0])).me.hand.length, 4, 'Digital mode deals 4 private cards');
  }

  await act(room, judge, 'lock_profile', { profile: 'An overly dramatic fictional assistant' });

  if (edition === 'hosted') {
    assert.equal((await getRoom(room, room.host)).phase, 'submit');
    const selected = [];
    for (let i = 0; i < nonjudge.length; i++) {
      const token = nonjudge[i];
      const card = playMode === 'physical'
        ? 'AF-INF-00' + (i + 1)
        : (await getRoom(room, token)).me.hand[0].id;
      if (playMode === 'physical' && i === 0) {
        await act(room, token, 'submit', { card_id: 'AF-SCN-001' }, 422);
      }
      if (playMode === 'physical' && i === 1) {
        await act(room, token, 'submit', { card_id: selected[0] }, 409);
      }
      await act(room, token, 'submit', { card_id: card });
      selected.push(card);
    }
    view = await getRoom(room, room.host);
    assert.equal(view.phase, 'generate');
    assert.deepEqual([...view.candidate_labels].sort(), ['A', 'B', 'C']);
    const text = view.candidate_labels.map(label => label + ': ' + sampleReply).join('\n');
    await act(room, room.host, 'manual_answers', { text });
    assert.equal((await getRoom(room, room.host)).phase, 'spotlight');
    await act(room, judge, 'spotlight', { label: 'A' });
    await act(room, judge, 'propose_bonus', { bonus: null, claims: {} });
    assert.equal((await getRoom(room, room.host)).phase, 'review');
    for (const token of room.players) await act(room, token, 'approve', { yes: true });
    view = await act(room, room.host, 'finalize');
  } else {
    assert.equal((await getRoom(room, room.host)).phase, 'baseline');
    await act(room, room.host, 'manual_reply', { text: sampleReply });
    assert.equal((await getRoom(room, room.host)).phase, 'lock_cards');
    const locked = [];
    for (let i = 0; i < nonjudge.length; i++) {
      const token = nonjudge[i];
      const card = playMode === 'physical'
        ? 'AF-INF-00' + (i + 1)
        : (await getRoom(room, token)).me.hand[0].id;
      if (playMode === 'physical' && i === 0)
        await act(room, token, 'lock_card', { card_id: 'AF-SCN-001' }, 422);
      if (playMode === 'physical' && i === 1)
        await act(room, token, 'lock_card', { card_id: locked[0] }, 409);
      await act(room, token, 'lock_card', { card_id: card });
      locked.push(card);
    }
    for (let steps = 0; steps < 12; steps++) {
      view = await getRoom(room, room.host);
      if (view.phase === 'judging') break;
      if (view.phase === 'cascade') {
        await act(room, room.host, 'manual_reply', { text: sampleReply });
      } else if (view.phase === 'handoff') {
        let handoffToken;
        for (const token of nonjudge) {
          const state = await getRoom(room, token);
          if (state.me.can_handoff) { handoffToken = token; break; }
        }
        assert(handoffToken, 'Cascade must select a valid, different-player Handoff recipient');
        await act(room, handoffToken, 'handoff', { message: 'Make the situation even more ridiculous.' });
      } else {
        assert.fail('Unexpected Cascade phase while testing Handoffs: ' + view.phase);
      }
    }
    view = await getRoom(room, room.host);
    assert.equal(view.phase, 'judging', 'Cascade must reach human judging after card/Handoff progression');
    assert.equal(view.replies.length, 6, 'Three cards and three Handoffs must produce six replies');
    await act(room, judge, 'propose_awards', {
      spotlight: 'R1',
      bonus: { reply_id: 'R2', tier: 'Breakpoint A', evidence: 'This mocked example violates the fictional assignment.' }
    });
    assert.equal((await getRoom(room, room.host)).phase, 'challenge');
    await act(room, nonjudge[0], 'challenge');
    assert.equal((await getRoom(room, room.host)).phase, 'vote');
    for (const token of room.players) await act(room, token, 'vote', { yes: true });
    view = await act(room, room.host, 'finalize');
  }

  assert.equal(view.phase, 'results', edition + '/' + playMode + ' must reach scored results');
  assert.equal(view.players.reduce((sum, player) => sum + player.score, 0),
    edition === 'hosted' ? 1 : 2, 'Human scoring must update the scoreboard');
  assert.equal(view.generation_calls, 0, 'Manual mocked replies must not invoke a paid model');
  if (playMode === 'physical') {
    for (const token of nonjudge)
      assert.equal((await getRoom(room, token)).me.hand.length, 0, 'Physical mode must never generate digital cards');
  }
  view = await act(room, room.host, 'next');
  assert.equal(view.phase, 'setup');
  assert.equal(view.round, 2);
  assert.notEqual(view.judge_id, (await getRoom(room, judge)).me.id, 'Judge must rotate after a round');
  if (playMode === 'physical') {
    assert.equal(view.scenario, null, 'Physical next round requires a new printed Scenario');
  }
  console.log('PASS: ' + edition + ' / ' + playMode + ' — 4 human clients, full mocked round, privacy, scoring and judge rotation');
}

await finishRound(digital, 'digital');
const printed = (await call('/api/rooms', {
  method: 'POST', body: { play_mode: 'physical' }
})).data;
const physical = { code: printed.code, host: printed.token, players: [] };
for (let i = 0; i < 4; i++) {
  const joined = (await call('/api/rooms/' + physical.code + '/join', {
    method: 'POST', body: { name: 'Printed ' + (i + 1) }
  })).data;
  physical.players.push(joined.token);
}
await act(physical, physical.host, 'start');
await finishRound(physical, 'physical');
console.log('PASS: ' + edition + ' (' + (prefix || '/') + ') — digital and printed full-round integration, routing, QR, WebSockets and authentication');

