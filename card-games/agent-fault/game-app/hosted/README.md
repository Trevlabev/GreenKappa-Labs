# AGENT/FAULT LIVE — Hosted v0.3.0-P

**Status: online-host-ready prototype, not yet deployed or security-verified on a public endpoint.**

This is a **separate third edition** of the AGENT/FAULT game, based on the exact 66-card **v0.9-P candidate** manifest. The original LAN v0.1.0 and local API v0.2.0 editions remain unchanged. No official rule/card change is implied by this software edition.

## The application

- One public HTTPS address shared by a TV/host browser and 4–8 phone players, including players on different networks.
- 6-character room code and join QR; nickname-only ephemeral party rooms.
- 24 Scenarios, 36 Interference, 6 Fault; private 4-card hands, secret Judge Fault, locked Agent Profile, anonymous A–G submissions.
- Server-side OpenAI API generation, default `gpt-4.1-mini`, one billable generation call per round. Manual paste fallback. The API key stays **only** in Netlify's Functions-scoped environment variables.
- Human Spotlight/Breakpoint/Fault adjudication with majority voting, automatic score updates, Judge rotation, 24-hour stale-room expiration.
- Netlify Database (Postgres) with row-level `FOR UPDATE` locking for submitted cards and scoring; avoids collisions when many phones click together.
- Local tests via `npm test` (6 tests, all passing on 2026-11-16). Full public-hosted browser/AI validation **not yet performed**.

## Deploy (Netlify)

Site shell already reserved in Trevor's Netlify team:

**Project:** `agent-fault-live-online`

**Netlify project management:** https://app.netlify.com/projects/agent-fault-live-online

**Source:** https://github.com/Trevlabev/GreenKappa-Labs/tree/main/card-games/agent-fault/game-app/hosted

The current Netlify connector does not expose an operation for linking a Git repo or uploading a deploy; a site shell being created does **not** mean an app was deployed. To activate it, in Netlify:

1. Open project > **Project configuration > Developer settings > Continuous deployment > Repository > Link repository**. Authorize Netlify's GitHub integration if prompted.
2. Select GitHub repository `Trevlabev/GreenKappa-Labs`, production branch `main`.
3. Set **Base directory** to `card-games/agent-fault/game-app/hosted`. The included `netlify.toml` uses `public` as the publish directory and builds/tests the project. Do not deploy the root GitHub Pages site as this project.
4. Select **Deploy** and verify the build succeeds, the DB migration applies, and `/api/health` reports 24/36/6. `@netlify/database` is declared and the SQL migration automatically provisions the hosted DB on supported credit-based accounts.
5. Under this project's Environment variables, add **OPENAI_API_KEY** as a **secret**, scoped **Functions** (not Builds-only), context **Production**. Optionally set `AGENT_FAULT_MODEL=gpt-4.1-mini`. **Redeploy** afterward so functions see the secret. Do not paste keys in GitHub, ChatGPT, HTML or a ZIP.
6. Visit the actual *HTTPS* deploy URL; host a room, use **Check AI Connection**, and perform a real 4-player test with the host on a separate computer and friends on phones.

Do not claim the URL is live until Netlify deploy state is `ready` and a complete test succeeds.

## Guardrails and limitations

- Only the host can initiate paid AI calls; 12 per room, max 48 requests per UTC day, and a $0.25/day **estimated** spending threshold. This is not a hard OpenAI billing limit; costs could overrun a little, unsuccessful requests may still be billable, and Netlify compute/database charges are separate.
- Fixed economical model allowlist: gpt-4.1-mini, gpt-5-mini, gpt-4o-mini. Output capped at 500 model tokens per generation and 30 words per displayed reply.
- Database request limits: 10 new-room creates per 10 minutes per IP, 40 joins per 10 minutes per IP. Netlify limits 900 API requests/minute per IP. No signups and no persistent account identity. Room codes are NOT account passwords.
- User-input profile max 20 words. Page text escaped. CORS not enabled. Mutating browser requests checked against same Origin; sessions are bearer tokens stored in the browser's localStorage. This is a **public playtest**, not a completed security assessment.
- Privacy: private player cards and the secret Fault are excluded from public responses until reveal; generated prompt omits secret Fault and Breakpoints; submission owner mapping hidden until scoring.
- State updates are 3.5-second polling rather than WebSockets. This is adequate for small groups but creates Netlify requests and DB load. No guarantee of uptime, large-scale concurrency or zero cost.
- Reconnect works using original browser profile; clearing local storage loses the player or host session. Room data may remain stored after 24h until an administrator purges it: 24h is an access-expiry policy, NOT automatic physical deletion. A retention cleanup job remains for future production work.
- Database function logs, vulnerability assessment, actual TLS/provider behavior, and end-to-end mobile gameplay still require verification after connecting/deploying the site. Do not treat local tests as full production proof.

## Local developer checks

```bash
npm install
npm test
npm run check
npx netlify dev
```

When using Netlify local database, apply migrations as instructed by `netlify database migrations apply`. Never commit `.env`, `.netlify/state.json`, or actual API keys.

## Design provenance

Card content is unchanged from `AGENT_FAULT_WEB_SCENARIO.json`, `AGENT_FAULT_WEB_INTERFERENCE.json`, and `AGENT_FAULT_WEB_FAULT.json` (24/36/6). Original GreenKappa Labs midnight navy #141736, warm cream #FFF6E9, lime #E5F91B, lilac #C982EC, coral #FF7568, and robot mascot retained.
