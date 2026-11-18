/**
 * AGENT/FAULT room synchronization lifecycle.
 * Active games retain their normal refresh speed. Inactive/hidden tabs back off,
 * then stop network traffic entirely after 30 minutes with no input or room changes.
 * No timer or network request keeps a room alive; the server owns game persistence.
 */
export function createRoomPoller({
  poll, connected, onStatus = () => {}, onFailure = () => {},
  activeMs = 3500, hiddenMs = 30000, idleMs = 15000,
  idleAfterMs = 5 * 60_000, pauseAfterMs = 30 * 60_000,
  maxErrors = 5, maxRetryMs = 60_000
}, env = {}) {
  const doc = env.document ?? document;
  const win = env.window ?? window;
  const now = env.now ?? (() => Date.now());
  const timerSet = env.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const timerClear = env.clearTimeout ?? (id => clearTimeout(id));
  let running = false, paused = null, timer = null, epoch = 0;
  let inFlightEpoch = null, errors = 0;
  let lastInteraction = now(), lastChange = now();

  function clear() {
    if (timer !== null) timerClear(timer);
    timer = null;
  }
  function suspend(reason) {
    if (!running || paused) return;
    paused = reason;
    clear();
    onStatus('paused', reason);
  }
  function nextDelay() {
    const inactivity = Math.max(0, now() - Math.max(lastInteraction, lastChange));
    if (inactivity >= pauseAfterMs) {
      suspend('idle');
      return null;
    }
    const base = doc.visibilityState === 'hidden' ? hiddenMs
      : inactivity >= idleAfterMs ? idleMs : activeMs;
    const backoff = errors ? Math.min(maxRetryMs, activeMs * 2 ** errors) : 0;
    return Math.max(0, Math.min(Math.max(base, backoff), pauseAfterMs - inactivity));
  }
  function schedule(delay = null) {
    clear();
    if (!running || paused || !connected() || inFlightEpoch === epoch) return;
    const wait = nextDelay();
    if (wait === null) return;
    timer = timerSet(() => { timer = null; void step(); }, delay === null ? wait : Math.min(delay, wait));
  }
  async function step() {
    if (!running || paused || !connected() || inFlightEpoch === epoch) return;
    if (nextDelay() === null) return;
    const current = epoch;
    inFlightEpoch = current;
    try {
      const changed = await poll();
      if (!running || current !== epoch) return;
      if (changed) lastChange = now();
      errors = 0;
    } catch (error) {
      if (!running || current !== epoch) return;
      errors += 1;
      const fatal = [401, 403, 404, 410].includes(error?.status);
      if (fatal) suspend('session');
      else if (errors >= maxErrors) suspend('error');
      onFailure(error, errors);
    } finally {
      if (inFlightEpoch === current) inFlightEpoch = null;
      if (current === epoch) schedule();
    }
  }
  function start() {
    clear();
    epoch += 1;
    running = true;
    paused = null;
    errors = 0;
    lastInteraction = lastChange = now();
    onStatus('active', 'connected');
    schedule(0);
  }
  function stop() {
    clear();
    epoch += 1;
    running = false;
    paused = null;
    errors = 0;
    onStatus('stopped', 'disconnected');
  }
  function resume() {
    if (!running || !connected() || paused === 'session') return;
    lastInteraction = now();
    if (paused) {
      paused = null;
      errors = 0;
      onStatus('active', 'resumed');
      schedule(0);
    } else if (timer === null && inFlightEpoch !== epoch) schedule(0);
  }
  function interacted() {
    if (!running || !connected()) return;
    lastInteraction = now();
    if (paused === 'idle' || paused === 'error') resume();
  }
  function changed() {
    lastChange = now();
    if (paused === 'idle' || paused === 'error') resume();
  }
  function refresh() {
    if (!running || paused || inFlightEpoch === epoch) return;
    schedule(0);
  }
  doc.addEventListener('pointerdown', interacted, { passive: true });
  doc.addEventListener('keydown', interacted);
  doc.addEventListener('touchstart', interacted, { passive: true });
  doc.addEventListener('visibilitychange', () => {
    if (!running) return;
    if (doc.visibilityState === 'visible') { resume(); refresh(); }
    else if (!paused) schedule();
  });
  win.addEventListener('focus', () => {
    if (doc.visibilityState !== 'hidden') { resume(); refresh(); }
  });
  win.addEventListener('pagehide', stop);
  win.addEventListener('pageshow', () => {
    if (!running && connected()) start();
  });
  return { start, stop, resume, refresh, changed,
    get status() { return paused ?? (running ? 'active' : 'stopped'); } };
}
