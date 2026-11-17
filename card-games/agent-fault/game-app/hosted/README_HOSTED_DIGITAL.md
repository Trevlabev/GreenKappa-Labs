# AGENT/FAULT Digital — Hosted Release Candidate v0.4-P

This deploys the complete **66 illustrated-card digital-only multiplayer game** through the existing reserved Netlify site `agent-fault-live-online`, using its Netlify Database-backed cloud server and encrypted OpenAI API key on the Functions side.

**Critical:** A GitHub commit does not itself establish a live game. `status=ready` and an HTTPS `/api/health` response are the minimum technical deployment checks; a genuine 4-phone playtest remains required.

## Release sources

- Authoritative backend: `lib/game.mjs`, `netlify/functions/api.mts`, PostgreSQL migration.
- Immutable illustrated edition: a SHA-256-pinned ZIP split into ten Git blobs under `assets/digital-full-00.part` through `assets/digital-full-09.part`.
- `scripts/prepare-digital.mjs` verifies all segment bytes against the exact original full digital edition ZIP, restores `public/index.html`, `public/static/digital.js`, `digital.css`, `assets/{fronts,backs}`, and verifies that card text exactly matches the hosted server's 24/36/6 manifest.
- This uses **the corrected three original robot backs**, not reconstructed or generic replacements. Card animations are the CSS-driven animations in the digital UI.
- Backend preserves anonymous submissions, rotating Judge, secret Fault, human-scored Spotlight+Breakpoint/Fault, score persistence, and AI generation limits.

## If the automated production deployment reports missing credentials

GitHub: repository **Settings → Secrets and variables → Actions → New repository secret**. Name `NETLIFY_AUTH_TOKEN`; paste a Netlify **personal access token** created by the authorized Netlify account owner. The token must permit deployments to the existing `agent-fault-live-online` site. This credential is never placed in source code, the HTML or downloaded files.

Then run GitHub **Actions → AGENT-FAULT Digital — deploy hosted app → Run workflow**, selecting `main`. The action tests the game and original art registry, invokes Netlify CLI to build/deploy and verifies `https://agent-fault-live-online.netlify.app/api/health` after deployment. If Netlify Database provisioning needs account-level authorization, finish it in the Netlify project settings and redeploy.

Under Netlify **agent-fault-live-online → Environment variables**, create `OPENAI_API_KEY` as a secret with **Functions** runtime scope, production context, then redeploy. Until this is done, manual AI responses remain an option. There is no safe way to read the existing GitHub Actions secret back as plaintext.

## Acceptance gates

1. Github Actions workflow **green**, including build and health verification.
2. Netlify production deploy **ready**, persistent PostgreSQL tables created by migration.
3. Host and each remote phone can load same HTTPS site, join with 6-character room code and maintain role-specific state.
4. Digital hand shows four rendered Interferences; all 66 original fronts and three approved backs load successfully.
5. One complete round: scenario, locked Judge Fault/profile, private card submit, AI/manual batch, Spotlight, Bonus vote, scoring, Judge rotation, refill.
6. Server-only API key, proper rate limits, no secrets in client or source. Run public security and cost review before broad advertising.

This release is a **proposed playtest candidate**, not approved final canon or a certified production service.
