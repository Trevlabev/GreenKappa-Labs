# AGENT/FAULT — Unified 4-mode Cloudflare Worker

One hosted Worker: `agent-fault-classic-cf`, one GitHub-connected production build.
No second Cascade Worker is required.

| Public entry path | Mode |
| --- | --- |
| `/` | Four-option landing: Classic Digital, Classic Physical, Cascade Digital, Cascade Physical |
| `/host/:code`, `/play/:code` | Classic (original URLs preserved) |
| `/cascade/` | Cascade launcher |
| `/cascade/host/:code`, `/cascade/play/:code` | Cascade multiplayer |

The physical/digital choice is a room-level setting (`play_mode`) in both existing rules engines.
Classic uses the original `GameRoom` Durable Object (migration tag `v1`);
Cascade uses new `CascadeRoom` (migration `v2-unified`) and a separate binding,
so rooms and secrets never cross between the engines. Both share a daily AI budget
via `BudgetGate`. One `OPENAI_API_KEY` runtime secret serves both editions.

The original Classic game was already live on this Worker. Keep its GitHub production
branch pointing to `feature/agent-fault-cloudflare-multiplayer-20261118` until this
unified branch passes review; then publish a single coordinated commit/update on the
watched branch. Do not deploy intermediate source files.

Cloudflare Builds command (no dashboard change):
`cd card-games/agent-fault/game-app/hosted && npm install --no-audit --no-fund && npm run build`

Cloudflare Deploy command (no dashboard change):
`cd card-games/agent-fault/game-app/hosted && npx wrangler deploy`

The new build compiles both editions, checks 66-card assets and tests both rule
engines, and copies them into `hosted/unified-public/`. Cascade's original source
is left intact; its built JS/CSS/HTML receives deterministic URL prefixes.

Site showcase links will target Classic `/` and Cascade `/cascade/` on the
single Worker after promotion. Cloudflare Pages and the custom domain remain a
separate static-site deployment; merging/promoting the game Worker does not
automatically cut over the custom domain.

Do not represent this as full multiplayer acceptance until real sessions verify
QR, auth, Socket reconnect, AI generation, all rounds and both printed modes.
