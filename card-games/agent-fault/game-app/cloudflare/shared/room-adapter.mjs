/**
 * AGENT/FAULT Cloudflare runtime shared by Classic and Cascade.
 * Each edition has its own Worker, Room DO namespace and Budget DO namespace.
 * All game rule decisions remain in the original lib/game.mjs.
 */
import { DurableObject } from 'cloudflare:workers';
import QRCode from 'qrcode';
import { randomBytes } from 'node:crypto';

const NC = { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY' };
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_TTL = 24 * 60 * 60 * 1000;
const MAX_BODY = 12000;
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;

function json(body, status = 200) { return Response.json(body, { status, headers: NC }); }
function randomCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}
async function bodyJson(request, demand, problem) {
  const text = await request.text();
  demand(text.length <= MAX_BODY, 'Request too large', 413);
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch { throw problem(400, 'Invalid JSON'); }
}
function errorResponse(e) {
  const status = Number(e?.status);
  const safe = status >= 400 && status <= 599 ? status : 500;
  return json({ detail: safe === 500 ? 'Server error. Please try again.' : String(e.message || 'Request failed') }, safe);
}
function originCheck(request, problem) {
  const websocket = (request.headers.get('Upgrade') || '').toLowerCase() === 'websocket';
  if ((request.method === 'GET' || request.method === 'HEAD') && !websocket) return;
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) throw problem(403, 'Cross-origin access rejected');
}
function budgetStub(env) { return env.BUDGET.getByName('global'); }
async function budget(env, op, body) {
  const response = await budgetStub(env).fetch('https://budget.internal/' + op, {
    method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw Object.assign(new Error(payload.detail || 'Budget gate rejected request'), { status: response.status });
  return payload;
}
function today() { return new Date().toISOString().slice(0, 10); }

export class BudgetGateBase extends DurableObject {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const operation = url.pathname.slice(1);
      const date = today(), key = 'daily:' + date;
      if (operation === 'usage') return json(await this.ctx.storage.get(key) || { requests: 0, successful: 0, estimated_usd: 0, input_tokens: 0, output_tokens: 0 });
      const data = await request.json();
      if (operation === 'rate') {
        const k = 'rate:' + data.bucket;
        const rateResult = await this.ctx.storage.transaction(async tx => {
          const old = await tx.get(k) || { start: 0, requests: 0 };
          const now = Date.now(), reset = now - old.start >= 10 * 60_000;
          const next = { start: reset ? now : old.start, requests: (reset ? 0 : old.requests) + 1 };
          await tx.put(k, next);
          if (next.requests > data.limit) return { allowed: false };
          return { allowed: true };
        });
        return rateResult.allowed ? json(rateResult) : json({ detail: 'Rate limit exceeded' }, 429);
      }
      if (operation === 'reserve') {
        const result = await this.ctx.storage.transaction(async tx => {
          const u = await tx.get(key) || { requests: 0, successful: 0, estimated_usd: 0, input_tokens: 0, output_tokens: 0, reported: {} };
          if (u.requests >= data.maxRequests || u.estimated_usd >= data.maxEstimatedUsd) return { allowed: false };
          u.requests++;
          await tx.put(key, u);
          return { allowed: true };
        });
        return result.allowed ? json({ ...result, date }) : json({ detail: 'Daily AI budget exceeded' }, 429);
      }
      if (operation === 'report') {
        const result = await this.ctx.storage.transaction(async tx => {
          const reportKey = 'daily:' + (typeof data.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data.date) ? data.date : date);
          const u = await tx.get(reportKey) || { requests: 0, successful: 0, estimated_usd: 0, input_tokens: 0, output_tokens: 0, reported: {} };
          u.reported ||= {};
          if (!u.reported[data.requestId]) {
            u.reported[data.requestId] = 1;
            u.successful += data.success ? 1 : 0;
            u.estimated_usd += Math.max(0, Number(data.cost) || 0);
            u.input_tokens += Math.max(0, Number(data.input_tokens) || 0);
            u.output_tokens += Math.max(0, Number(data.output_tokens) || 0);
            await tx.put(reportKey, u);
          }
          return { ok: true };
        });
        return json(result);
      }
      return json({ detail: 'Unknown budget operation' }, 404);
    } catch (e) { return errorResponse(e); }
  }
}

export class GameRoomBase extends DurableObject {
  constructor(ctx, env, engine, configuration) {
    super(ctx, env);
    this.engine = engine;
    this.configuration = configuration;
    this.reserving = false;
  }
  async load() {
    const room = await this.ctx.storage.get('room');
    this.engine.demand(room, 'Room not found', 404);
    const changedAt = await this.ctx.storage.get('changed_at');
    this.engine.demand(Date.now() - changedAt < ROOM_TTL, 'Room has expired', 410);
    return room;
  }
  async save(room) {
    await this.ctx.storage.put('room', room);
    await this.ctx.storage.put('changed_at', Date.now());
    await this.ctx.storage.setAlarm(Date.now() + ROOM_TTL);
    this.publish(room.version);
  }
  publish(version) {
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.send(JSON.stringify({ type: 'changed', version })); } catch { /* stale socket */ }
    }
  }
  async present(room, role, player) {
    const tally = role === 'host' ? await budget(this.env, 'usage') : { requests: 0, estimated_usd: 0 };
    return this.engine.visible(room, role, player, tally, this.model(), Boolean(this.env.OPENAI_API_KEY));
  }
  model() { return (this.env.AGENT_FAULT_MODEL || '').trim() || 'gpt-4.1-mini'; }
  async alarm() {
    const changed = await this.ctx.storage.get('changed_at');
    if (changed && Date.now() - changed < ROOM_TTL) {
      await this.ctx.storage.setAlarm(changed + ROOM_TTL);
      return;
    }
    for (const socket of this.ctx.getWebSockets()) {
      try { socket.close(1001, 'Room expired'); } catch { /* no-op */ }
    }
    await this.ctx.storage.deleteAll();
  }
  async socket(request, room) {
    this.engine.demand((request.headers.get('Upgrade') || '').toLowerCase() === 'websocket', 'Upgrade required', 426);
    const entries = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(x => x.trim());
    this.engine.demand(entries.includes('af.v1'), 'Unsupported connection protocol', 400);
    const secret = entries.find(x => x.startsWith('token.'))?.slice(6);
    this.engine.demand(secret && /^[A-Za-z0-9_-]{20,200}$/.test(secret), 'Session token required', 401);
    const who = this.engine.auth(room, 'Bearer ' + secret);
    this.engine.demand(this.ctx.getWebSockets().length < 24, 'Too many open connections', 429);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role: who.role, player: who.p?.id || null });
    server.send(JSON.stringify({ type: 'ready', version: room.version }));
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'af.v1' } });
  }
  async webSocketMessage(ws) {
    // Refuse untrusted client messages; never let a broken test browser
    // generate unbounded billable WebSocket events.
    try { ws.close(1008, 'Read-only channel'); } catch { /* ignore */ }
  }
  async webSocketClose() {}
  async fetch(request) {
    const { demand, problem } = this.engine;
    try {
      const path = new URL(request.url).pathname;
      const method = request.method;
      if (path === '/_create' && method === 'POST') {
        const { code, secret } = await bodyJson(request, demand, problem);
        demand(CODE.test(code), 'Invalid room code', 422);
        return this.ctx.blockConcurrencyWhile(async () => {
          try {
          const existing = await this.ctx.storage.get('room');
          demand(!existing, 'Room code unavailable', 409);
          const room = this.engine.createRoom(code, secret);
          await this.save(room);
          return json({ code, token: secret, role: 'host' });
          } catch (error) { return errorResponse(error); }
        });
      }
      const room = await this.load();
      if (path.endsWith('/ws')) return this.socket(request, room);
      if (path.endsWith('/qr.png') && method === 'GET') return json({ valid: true });
      if (path.endsWith('/join') && method === 'POST') {
        const { name: rawName } = await bodyJson(request, demand, problem);
        const name = String(rawName || '').trim().replace(/\s+/g, ' ');
        demand(name.length >= 2 && name.length <= 24, 'Nickname must have 2–24 characters', 422);
        return this.ctx.blockConcurrencyWhile(async () => {
          try {
          const current = await this.load();
          demand(current.phase === 'lobby', 'Joining is closed');
          demand(current.players.filter(p => p.active).length < 8, 'Room is full');
          demand(!current.players.some(p => p.active && p.name.toLowerCase() === name.toLowerCase()), 'Nickname already in use');
          const secret = this.engine.token(), id = randomBytes(8).toString('hex');
          current.players.push({ id, token_hash: this.engine.digest(secret), name, seat: current.players.length, active: true, hand: [], score: 0 });
          current.version++;
          await this.save(current);
          return json({ code: current.code, token: secret, role: 'player', player_id: id });
          } catch (error) { return errorResponse(error); }
        });
      }
      const who = this.engine.auth(room, request.headers.get('Authorization'));
      if (method === 'GET' && !/\/(?:action|generate|check-ai|join|ws|qr\.png)$/.test(path)) {
        return json(await this.present(room, who.role, who.p));
      }
      if (method === 'POST' && path.endsWith('/action')) {
        const payload = await bodyJson(request, demand, problem);
        demand(typeof payload.name === 'string' && payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data),
          'Invalid action payload', 422);
        const outcome = await this.ctx.blockConcurrencyWhile(async () => {
          try {
          const current = await this.load();
          const actor = this.engine.auth(current, request.headers.get('Authorization'));
          this.engine.applyAction(current, actor.role, actor.p, payload.name, payload.data);
          await this.save(current);
          return { current, actor };
          } catch (error) { return { error }; }
        });
        if (outcome.error) throw outcome.error;
        return json(await this.present(outcome.current, outcome.actor.role, outcome.actor.p));
      }
      if (method === 'POST' && path.endsWith('/_authorize')) return json({ role: who.role });
      if (method === 'POST' && path.endsWith('/generate')) return json(await this.generate(room, who, request.headers.get('Authorization')));
      return json({ detail: 'Method not allowed' }, 405);
    } catch (e) { return errorResponse(e); }
  }
  async generate(room, who, bearer) {
    const { demand, problem } = this.engine;
    demand(who.role === 'host', 'Only the host may generate', 403);
    const cascade = this.configuration.cascade;
    demand(cascade ? ['baseline', 'cascade'].includes(room.phase) : room.phase === 'generate',
      'No pending AI generation step', 409);
    demand(!this.reserving, 'Generation reservation in progress', 409);
    demand(!cascade || !room.generation_pending, 'Generation already in progress', 409);
    demand(cascade ? !room.ai_attempted_step : !room.ai_attempted, 'Generation already attempted. Use manual reply.', 429);
    demand(room.generation_calls < this.engine.MAX_ROOM_CALLS, 'Room AI budget exceeded', 429);
    demand(this.env.OPENAI_API_KEY, 'OPENAI_API_KEY is not configured', 503);
    const model = this.model();
    demand(model in this.engine.MODEL_PRICES, 'Model not approved for this game', 422);
    const requestId = crypto.randomUUID();
    let started = false, step, reservedDay;
    this.reserving = true;
    try {
      const grant = await this.ctx.blockConcurrencyWhile(async () => {
        try {
        const current = await this.load();
        const actor = this.engine.auth(current, bearer);
        demand(actor.role === 'host', 'Only host can generate', 403);
        demand(cascade ? ['baseline', 'cascade'].includes(current.phase) : current.phase === 'generate', 'Round changed', 409);
        demand(cascade ? (!current.generation_pending && !current.ai_attempted_step) : !current.ai_attempted,
          'Generation already attempted', 429);
        const authorization = await budget(this.env, 'reserve', { requestId,
          maxRequests: this.engine.MAX_DAILY_CALLS, maxEstimatedUsd: this.engine.MAX_DAILY_ESTIMATED_USD });
        if (cascade) {
          step = this.engine.currentStageKey(current);
          current.generation_pending = true;
          current.pending_at = Date.now();
          current.ai_attempted_step = true;
        } else current.ai_attempted = true;
        current.generation_calls++;
        current.version++;
        await this.save(current);
        room = current;
        started = true;
        return authorization;
        } catch (error) { return { error }; }
      });
      if (grant.error) throw grant.error;
      reservedDay = grant.date;
    } finally { this.reserving = false; }
    if (!started) throw problem(503, 'Generation could not begin');
    let content = '', used = {}, success = false;
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + this.env.OPENAI_API_KEY },
        body: JSON.stringify({ model,
          instructions: this.configuration.aiInstructions,
          input: this.engine.buildPrompt(room),
          max_output_tokens: this.configuration.maxOutputTokens,
          store: false }),
        signal: AbortSignal.timeout(45000)
      });
      if (!response.ok) throw Error('Model request rejected');
      const payload = await response.json();
      used = payload.usage || {};
      content = (payload.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text || '').join('');
      success = true;
    } catch { /* error returned without provider internals */ }
    const cost = this.engine.estimateUsd(model, used) || 0;
    try {
      await budget(this.env, 'report', { requestId, date: reservedDay, success, cost,
        input_tokens: used.input_tokens || 0, output_tokens: used.output_tokens || 0 });
    } catch { /* never disclose or skip game rollback because accounting failed */ }
    const billing = { model, input_tokens: used.input_tokens || null,
      output_tokens: used.output_tokens || null, estimated_usd: cost };
    const current = await this.load();
    if (cascade) {
      if (!current.generation_pending || this.engine.currentStageKey(current) !== step)
        return { complete: false, detail: 'Stale generation result discarded', billing };
      current.generation_pending = false;
      if (!success) {
        current.version++;
        await this.save(current);
        throw problem(502, 'Generation failed. Use the manual reply option.');
      }
      try {
        this.engine.receiveAgentReply(current, this.engine.parseReply(content));
        await this.save(current);
        return { complete: true, reply_id: current.timeline.at(-1)?.id, billing };
      } catch (e) {
        current.version++;
        await this.save(current);
        return { complete: false, detail: e.message || 'Invalid model output', raw: content.slice(0, 1200), billing };
      }
    }
    if (!success) throw problem(502, 'Generation failed. Use manual response entry.');
    if (current.phase !== 'generate') return { complete: false, detail: 'Stale generation result discarded', billing };
    const labels = current.candidates.map(x => x.label);
    const parsed = this.engine.parseAnswers(content, labels);
    if (!labels.every(x => x in parsed) || Object.values(parsed).filter(x => x && x.toUpperCase() !== 'SKIP').length < 2) {
      return { complete: false, raw: content.slice(0, 7000), missing: labels.filter(x => !(x in parsed)), billing };
    }
    current.answers = parsed;
    current.phase = 'spotlight';
    current.version++;
    await this.save(current);
    return { complete: true, billing };
  }
}

export function createWorker(engine, configuration) {
  const { demand, problem } = engine;
  return {
    async fetch(request, env) {
      try {
        originCheck(request, problem);
        const url = new URL(request.url), method = request.method, path = url.pathname;
        if (path === '/api/health' && method === 'GET') {
          return json({ status: 'ok', edition: configuration.edition, mode: 'cloudflare-durable-object',
            cards: { Scenario: 24, Interference: 36, Fault: 6 }, ai_configured: Boolean(env.OPENAI_API_KEY) });
        }
        if (path === '/api/rooms' && method === 'POST') {
          await bodyJson(request, demand, problem);
          const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
          const key = engine.digest('create-room:' + ip);
          const allowed = await budget(env, 'rate', { bucket: key, limit: 10 });
          demand(allowed.allowed, 'Room creation rate limit exceeded', 429);
          for (let i = 0; i < 8; i++) {
            const code = randomCode(), secret = engine.token();
            const result = await env.ROOM.getByName(code).fetch('https://room.internal/_create', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, secret })
            });
            if (result.status === 409) continue;
            return result;
          }
          throw problem(503, 'Unable to allocate new room');
        }
        const match = path.match(/^\/api\/rooms\/([A-HJ-NP-Z2-9]{6})(?:\/(join|action|generate|check-ai|qr\.png|ws))?\/?$/i);
        if (match) {
          const code = match[1].toUpperCase(), op = match[2] || '', stub = env.ROOM.getByName(code);
          if (op === 'join' && method === 'POST') {
            const ip = request.headers.get('CF-Connecting-IP') || 'anonymous';
            const allowed = await budget(env, 'rate', { bucket: engine.digest('join-room:' + ip), limit: 40 });
            demand(allowed.allowed, 'Joining too frequently', 429);
          }
          if (op === 'qr.png' && method === 'GET') {
            const existing = await stub.fetch('https://room.internal/api/rooms/' + code + '/qr.png');
            if (!existing.ok) return existing;
            const value = new URL('/play/' + code, url.origin).toString();
            const dataUrl = await QRCode.toDataURL(value, { errorCorrectionLevel: 'M', width: 320, margin: 2 });
            const binary = atob(dataUrl.split(',')[1]);
            return new Response(Uint8Array.from(binary, c => c.charCodeAt(0)), {
              headers: { ...NC, 'Content-Type': 'image/png' }
            });
          }
          if (op === 'check-ai' && method === 'POST') {
            const allowed = await stub.fetch(new Request('https://room.internal/api/rooms/' + code + '/_authorize', {
              method: 'POST', headers: { Authorization: request.headers.get('Authorization') || '' }
            }));
            if (!allowed.ok) return allowed;
            const who = await allowed.json();
            demand(who.role === 'host', 'Host only', 403);
            const model = (env.AGENT_FAULT_MODEL || 'gpt-4.1-mini').trim();
            demand(env.OPENAI_API_KEY, 'OpenAI key not configured', 503);
            demand(model in engine.MODEL_PRICES, 'Model not supported', 422);
            const check = await fetch('https://api.openai.com/v1/models/' + encodeURIComponent(model), {
              headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY }, signal: AbortSignal.timeout(15000)
            });
            demand(check.ok, 'Model access check failed', 502);
            return json({ configured: true, reachable: true, model, note: 'Connected. No generation charge.' });
          }
          return stub.fetch(request);
        }
        if (path.startsWith('/api/')) return json({ detail: 'API endpoint not found' }, 404);
        if (/^\/(?:host|play)\/[A-HJ-NP-Z2-9]{6}\/?$/i.test(path) || ['/demo', '/collection'].includes(path)) {
          return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
        }
        return env.ASSETS.fetch(request);
      } catch (e) { return errorResponse(e); }
    }
  };
}
