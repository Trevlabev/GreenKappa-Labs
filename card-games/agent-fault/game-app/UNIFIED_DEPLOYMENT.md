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

## Direct-commit release policy (2026-11-23)

The Cloudflare-connected branch is `feature/agent-fault-cloudflare-multiplayer-20261118`.
Despite its historical name, this is the **live Worker source branch**. Approved,
routine game changes are committed **directly to that branch** with no PR. The
public GitHub Pages website is separately updated on `main`.

**Routine workflow:** edit the appropriate files -> review diff -> run local game,
Worker and browser regression checks when feasible -> make one cohesive direct
commit -> Cloudflare builds/tests/deploys from its watched branch -> check Actions,
Cloudflare deployment, and health/gameplay endpoints. Never claim a deployment
succeeded solely because the GitHub commit succeeded. The unified GitHub Actions
workflow now also runs on direct pushes to the watched branch.

Do not force-push or delete room data. Port only explicitly approved tested
features from the older research branches. Do not wholesale merge an older
website layout, unapproved scoring or human-untested gameplay candidates.
The release register is at `card-games/agent-fault/DEVELOPMENT_WORKFLOW.md`.


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
