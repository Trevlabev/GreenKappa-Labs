# AGENT/FAULT — Direct Updates and Release Register

**Effective date:** 2026-11-23  
**Status:** Operational GitHub workflow. Deployed app behavior still requires
separate live end-to-end verification.

## No-PR publishing contract

Routine approved changes are committed **directly** to their existing deployment
source; no new PR or feature branch is required.

| Surface | Source of truth | Delivery |
| --- | --- | --- |
| Public marketing page, illustrated cards, scripted Classic/Cascade demos | `main` | GitHub Pages at `https://greenkappalabs.art/card-games/agent-fault/` |
| Classic and Cascade rooms, digital and physical options, NPC baseline, shared audio | `feature/agent-fault-cloudflare-multiplayer-20261118` | GitHub-connected Cloudflare Worker at `https://agent-fault-classic-cf.grenkappa459.workers.dev/` |
| Experimental gameplay / scoring candidates | Historical isolated branches (below) | Not deployed merely by being present on GitHub |

**Do not rename the Worker branch yet.** Its `feature/` prefix is historical,
but Cloudflare Builds watches that specific branch. Renaming without updating
and verifying Cloudflare settings can disconnect automatic deployment.

### Routine change procedure

1. Determine whether the request changes the static website (`main`) or the
   playable Worker (its watched branch).
2. Inspect existing code and preserve the original 66-card assets and approved
   rules unless the change explicitly authorizes replacing them.
3. Review the complete proposed diff and run relevant tests. For a Worker
   checkout, from `card-games/agent-fault/game-app/hosted` run:
   `npm install --no-audit --no-fund && npm run build && npm run cloudflare:check && npm run cloudflare:dry-run`.
   For public-site edits, run `node tests/site-integrity.mjs` at repository root.
   Multiplayer or UI changes should additionally get Wrangler smoke and browser
   acceptance. Checks should use mocked AI replies whenever feasible.
4. Publish **one complete direct commit** to the correct existing branch. Do not
   push half-finished file sequences or create a PR by default. The Worker
   Cloudflare build runs tests before its deploy step.
5. Inspect the new commit, its GitHub Actions status, and the actual published
   service. Verify applicable health endpoints, card assets, rooms and UI.
   If live deployment cannot be checked, label it **unverified**, not successful.
6. If the new build fails, repair or revert through another ordinary commit.
   Never force-push a production branch, expose secrets, or reset Durable Objects.

### Release and safety boundaries

- Site changes must not overwrite the newer `main` marketing page with older
  HTML from the Worker source history. Do not wholesale merge historical
  Cloudflare feature branches into `main`.
- Scoring/rules changes and AI judgment of bonus conditions require explicit
  approval and human evaluation. A passing automation test is not proof of
  comic quality, competitive balance, print readiness, or model authentication.
- Live API calls can cost money. Test room behavior with deterministic fake
  answers first; use real AI calls only where specifically necessary.
- Deploying the Worker does not move DNS or change the GitHub Pages site.
- Retain source commits in historical branches even when closing obsolete PRs.

## Historical PR and candidate-branch register

These are **reference and research sources, not approvals to publish**:

| PR | Topic | Disposition |
| --- | --- | --- |
| #5 | Idle polling fix | Historical ancestor of the Cloudflare Worker branch; keep source for traceability |
| #6 | Unified Cloudflare Worker | Its **head branch is the direct-update Worker release line**; a PR is no longer needed for routine pushes |
| #7 | Four-mode integration acceptance | Additional test coverage candidate; selectively port test assertions without replacing newer NPC tests |
| #13 | Classic NPC + private Host Also Plays | Merged into the Cloudflare release branch; part of the established code baseline |
| #19 | Cascade NPCs / Handoffs | Candidate; not approved as deployed |
| #21 | NPC relevance and solo UX | Candidate; final one-screen solo flow incomplete |
| #25 | Balance audit / scoring and UI refinements | Research candidate; not fully promoted |
| #27 | Optional Clear Bonus / human referee | Unapproved experimental scoring; remains OFF in canonical release |
| #31 | Persistent public Scenario/Interference cards | Merged into PR #25's experimental branch, **not** proof it reached the Worker release branch |

Closing an unfinished PR does **not** delete its head branch or merge its code.
Any later approved change may be ported from a historical branch directly to the
Worker release line, with appropriate verification.

## Acceptance still outstanding

The GitHub pipeline confirms only tested source behavior. A verified public
playtest requires a deployment/build identity check, correct model
authentication, full cross-device Classic/Cascade digital and printed rounds,
private Fault/hand isolation, reconnection, mobile audio, score correctness and
actual human player feedback. Do not infer those outcomes from workflow success.
