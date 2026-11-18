/**
 * AGENT/FAULT WebSocket room synchronization.
 *
 * - HTTP remains authoritative for commands and private room snapshots.
 * - WebSocket only announces the public fact that the room version changed.
 * - Credentials are carried in WebSocket subprotocol headers, never URLs.
 * - Idle sockets close; reconnects and HTTP fallback have bounded backoff.
 * - All timer cleanup happens on pagehide, completion, and room changes.
 */
export function createRoomSocket({ details, onReady, onChange, onFallback, onPaused },
  env = {}) {
  const W = env.window ?? window;
  const D = env.document ?? document;
  const makeSocket = env.WebSocket ?? ((url, protocols) => new WebSocket(url, protocols));
  const now = env.now ?? (() => Date.now());
  const set = env.setTimeout ?? ((fn, ms) => setTimeout(fn, ms));
  const clear = env.clearTimeout ?? (id => clearTimeout(id));
  const IDLE_MS = 30 * 60_000;
  let ws = null, retry = null, idle = null, epoch = 0, attempts = 0;
  let alive = false, paused = false, everReady = false;
  let lastInteraction = now(), lastChange = now();

  function cleanupTimers() {
    if (retry !== null) clear(retry);
    if (idle !== null) clear(idle);
    retry = idle = null;
  }
  function endSocket() {
    if (!ws) return;
    const old = ws;
    ws = null;
    old.onopen = old.onmessage = old.onerror = old.onclose = null;
    try { old.close(1000, 'Session suspended'); } catch { /* no-op */ }
  }
  function resetIdleTimer() {
    if (idle !== null) clear(idle);
    if (!alive || paused) return;
    const inactivity = Math.max(0, now() - Math.max(lastInteraction, lastChange));
    if (inactivity >= IDLE_MS) { suspend(); return; }
    idle = set(suspend, IDLE_MS - inactivity);
  }
  function suspend() {
    if (!alive || paused) return;
    paused = true;
    cleanupTimers();
    endSocket();
    onPaused('idle');
  }
  function connect() {
    if (!alive || paused) return;
    const credentials = details();
    if (!credentials?.code || !credentials.token) return;
    const run = epoch;
    let next;
    try {
      const url = new URL('/api/rooms/' + encodeURIComponent(credentials.code) + '/ws', W.location.href);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      next = makeSocket(url.toString(), ['af.v1', 'token.' + credentials.token]);
    } catch { onFallback(); return scheduleRetry(run); }
    ws = next;
    next.onmessage = event => {
      if (run !== epoch || !alive || paused) return;
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data?.type === 'ready') {
        everReady = true;
        attempts = 0;
        onReady();
        onChange();
      } else if (data?.type === 'changed') {
        lastChange = now();
        resetIdleTimer();
        onChange();
      }
    };
    next.onclose = () => {
      if (run !== epoch || !alive || paused) return;
      if (ws === next) ws = null;
      onFallback();
      scheduleRetry(run);
    };
    next.onerror = () => {
      // Browsers report socket errors via close; the close callback owns retries.
    };
    resetIdleTimer();
  }
  function scheduleRetry(run) {
    if (run !== epoch || !alive || paused) return;
    if (retry !== null) clear(retry);
    const delay = Math.min(60_000, 2000 * 2 ** Math.min(attempts++, 5));
    retry = set(() => { retry = null; connect(); }, delay);
  }
  function start() {
    stop();
    alive = true;
    paused = false;
    everReady = false;
    attempts = 0;
    lastInteraction = lastChange = now();
    connect();
  }
  function stop() {
    epoch++;
    alive = false;
    paused = false;
    cleanupTimers();
    endSocket();
  }
  function resume() {
    if (!alive || !details()?.token) return;
    lastInteraction = now();
    if (paused) {
      paused = false;
      attempts = 0;
      onFallback();
      connect();
    }
    resetIdleTimer();
  }
  function interact() { if (alive) resume(); }
  D.addEventListener('pointerdown', interact, { passive: true });
  D.addEventListener('keydown', interact);
  D.addEventListener('touchstart', interact, { passive: true });
  D.addEventListener('visibilitychange', () => { if (D.visibilityState === 'visible') resume(); });
  W.addEventListener('focus', () => { if (D.visibilityState !== 'hidden') resume(); });
  W.addEventListener('pagehide', stop);
  W.addEventListener('pageshow', () => { if (!alive && details()?.token) start(); });
  return { start, stop, resume,
    get connected() { return Boolean(ws && everReady && ws.readyState === 1); },
    get status() { return paused ? 'idle' : alive ? 'active' : 'stopped'; } };
}
