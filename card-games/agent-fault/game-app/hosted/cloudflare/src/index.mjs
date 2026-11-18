/**
 * Unified AGENT/FAULT Cloudflare application.
 * One Worker: two independent rule engines, separate room namespaces, four play modes.
 * Preserve the original Classic /api, /host, /play endpoints and room IDs.
 */
import * as classicGame from '../../lib/game.mjs';
import * as cascadeGame from '../../../cascade/lib/game.mjs';
import QRCode from 'qrcode';
import { GameRoomBase, BudgetGateBase, createWorker } from '../../../cloudflare/shared/room-adapter.mjs';

const classicConfig = {
  edition: 'hosted-v0.3.0',
  cascade: false,
  maxOutputTokens: 500,
  aiInstructions: "You produce short fictional card-game alternatives. Return only labeled answers. Do not explain your process."
};
const cascadeConfig = {
  edition: 'cascade-v0.2-P',
  cascade: true,
  publicPrefix: '/cascade',
  maxOutputTokens: 300,
  aiInstructions: "Continue the original fictional agent conversation. Honor all earlier context. Write one vivid, concrete and grammatically complete response of about 35–50 words. No labels, no mechanics."
};

// Preserve the existing Classic Durable Object migration and its persisted rooms.
export class GameRoom extends GameRoomBase {
  constructor(ctx, env) { super(ctx, env, classicGame, classicConfig); }
}
// New storage class, separately migrated, for Cascade. Never substitute Classic state.
export class CascadeRoom extends GameRoomBase {
  constructor(ctx, env) { super(ctx, env, cascadeGame, cascadeConfig); }
}
export class BudgetGate extends BudgetGateBase {}

const classic = createWorker(classicGame, classicConfig, QRCode);
const cascade = createWorker(cascadeGame, cascadeConfig, QRCode);

function cascadeEnvironment(env) {
  return {
    ...env,
    ROOM: env.CASCADE_ROOM,
    // Adapter code expects assets at the edition root. Map them into /cascade/.
    ASSETS: {
      fetch(request) {
        const u = new URL(request.url);
        u.pathname = '/cascade' + (u.pathname === '/' ? '/index.html' : u.pathname);
        return env.ASSETS.fetch(new Request(u, request));
      }
    }
  };
}

export default {
  async fetch(request, env, ctx) {
    const u = new URL(request.url);
    if (u.pathname === '/cascade') {
      return Response.redirect(new URL('/cascade/', u.origin), 308);
    }
    if (u.pathname.startsWith('/cascade/')) {
      // Serve the dedicated animated walkthrough rather than the room launcher.
      if (u.pathname === '/cascade/demo' || u.pathname === '/cascade/demo/') {
        return env.ASSETS.fetch(new Request(new URL('/cascade/demo.html', u.origin), request));
      }
      // Handle Cascade document routes explicitly as static assets. This avoids
      // proxying page requests through the API adapter's virtual ASSETS binding,
      // while retaining isolated API/WebSocket routing for the edition.
      if (u.pathname === '/cascade/' ||
          u.pathname === '/cascade/collection' ||
          /^\/cascade\/(?:host|play)\/[A-HJ-NP-Z2-9]{6}\/?$/i.test(u.pathname)) {
        return env.ASSETS.fetch(new Request(new URL('/cascade/index.html', u.origin), request));
      }
      // Static Cascade resources are public assets, not room commands.
      if (u.pathname.startsWith('/cascade/static/')) return env.ASSETS.fetch(request);
      const target = new URL(u);
      target.pathname = u.pathname.slice('/cascade'.length) || '/';
      return cascade.fetch(new Request(target, request), cascadeEnvironment(env), ctx);
    }
    // Classic's original URLs remain valid for existing rooms and invitations.
    return classic.fetch(request, env, ctx);
  }
};
