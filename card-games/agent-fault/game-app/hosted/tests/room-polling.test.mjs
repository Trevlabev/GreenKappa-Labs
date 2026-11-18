import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomPoller as classicPoller } from '../public/static/room-polling.mjs';
import { createRoomPoller as cascadePoller } from '../../cascade/public/static/room-polling.mjs';

function target(extra = {}) {
  const listeners = new Map();
  return {
    ...extra,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    emit(type) { for (const listener of listeners.get(type) ?? []) listener(); }
  };
}

function harness(factory, config = {}, implementation = async () => false) {
  let time = 0, sequence = 0, calls = 0, available = true;
  const timers = new Map(), statuses = [];
  const doc = target({ visibilityState: 'visible' }), win = target();
  const controller = factory({
    poll: async () => { calls++; return implementation(calls); },
    connected: () => available,
    onStatus: (state, reason) => statuses.push([state, reason]),
    activeMs: 1500, hiddenMs: 30000, idleMs: 15000,
    ...config
  }, {
    document: doc, window: win, now: () => time,
    setTimeout: (fn, delay) => {
      const id = ++sequence;
      timers.set(id, { at: time + delay, fn });
      return id;
    },
    clearTimeout: id => timers.delete(id)
  });
  async function advance(ms) {
    const end = time + ms;
    let iterations = 0;
    while (true) {
      const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      if (++iterations > 20000) throw Error('Unexpected self-scheduling loop');
      time = next[1].at;
      timers.delete(next[0]);
      next[1].fn();
      for (let i = 0; i < 8; i++) await Promise.resolve();
    }
    time = end;
  }
  return {
    controller, doc, win, advance, statuses,
    get calls() { return calls; },
    get timers() { return timers.size; },
    set available(value) { available = value; }
  };
}

for (const [edition, factory] of [['Classic', classicPoller], ['Cascade', cascadePoller]]) {
  test(edition + ': active tabs keep normal cadence without overlapping timers', async () => {
    const h = harness(factory);
    h.controller.start();
    await h.advance(0);
    assert.equal(h.calls, 1);
    await h.advance(1499);
    assert.equal(h.calls, 1);
    await h.advance(1);
    assert.equal(h.calls, 2);
    assert.equal(h.controller.status, 'active');
    assert.equal(h.timers, 1);
  });

  test(edition + ': hidden tabs back off and refresh immediately on return', async () => {
    const h = harness(factory);
    h.controller.start();
    await h.advance(0);
    h.doc.visibilityState = 'hidden';
    h.doc.emit('visibilitychange');
    await h.advance(29999);
    assert.equal(h.calls, 1);
    await h.advance(1);
    assert.equal(h.calls, 2);
    h.doc.visibilityState = 'visible';
    h.doc.emit('visibilitychange');
    await h.advance(0);
    assert.equal(h.calls, 3);
  });

  test(edition + ': abandoned rooms stop completely after 30 minutes and resume on input', async () => {
    const h = harness(factory);
    h.controller.start();
    await h.advance(30 * 60_000);
    assert.equal(h.controller.status, 'idle');
    assert(h.statuses.some(([state, reason]) => state === 'paused' && reason === 'idle'));
    const pausedCalls = h.calls;
    await h.advance(12 * 60 * 60_000);
    assert.equal(h.calls, pausedCalls);
    h.doc.emit('pointerdown');
    assert.equal(h.controller.status, 'active');
    await h.advance(0);
    assert.equal(h.calls, pausedCalls + 1);
  });

  test(edition + ': actual room changes prevent false idle suspension during gameplay', async () => {
    const h = harness(factory, {}, async call => call % 40 === 0);
    h.controller.start();
    await h.advance(50 * 60_000);
    assert.equal(h.controller.status, 'active');
  });

  test(edition + ': repeated server failures stop polling until explicit user activity', async () => {
    const h = harness(factory, {}, async () => {
      const err = Error('HTTP 503'); err.status = 503; throw err;
    });
    h.controller.start();
    await h.advance(10 * 60_000);
    assert.equal(h.controller.status, 'error');
    assert.equal(h.calls, 5);
    await h.advance(24 * 60 * 60_000);
    assert.equal(h.calls, 5);
    h.doc.emit('keydown');
    assert.equal(h.controller.status, 'active');
    await h.advance(0);
    assert.equal(h.calls, 6);
  });

  test(edition + ': expired/unauthorized sessions stop immediately and cannot auto-retry', async () => {
    const h = harness(factory, {}, async () => {
      const err = Error('Room expired'); err.status = 410; throw err;
    });
    h.controller.start();
    await h.advance(0);
    assert.equal(h.controller.status, 'session');
    await h.advance(60 * 60_000);
    h.doc.emit('pointerdown');
    h.win.emit('focus');
    await h.advance(0);
    assert.equal(h.calls, 1);
    assert.equal(h.controller.status, 'session');
  });

  test(edition + ': pagehide cancels timers; pageshow re-establishes connection', async () => {
    const h = harness(factory);
    h.controller.start();
    await h.advance(0);
    h.win.emit('pagehide');
    assert.equal(h.controller.status, 'stopped');
    const calls = h.calls;
    await h.advance(60_000);
    assert.equal(h.calls, calls);
    h.win.emit('pageshow');
    await h.advance(0);
    assert.equal(h.calls, calls + 1);
    h.controller.stop();
    assert.equal(h.timers, 0);
  });
}
