# AGENT/FAULT — CASCADE v0.2-P

> **Independent copy of the web-hosted AGENT/FAULT v0.9-P deck and infrastructure.**
> **Status:** playtest candidate, not approved Classic replacement and not a commercially validated game. The original Classic app and GreenKappa website were not altered.

## What changed

Classic generated independent, anonymous A/B/C outputs in one call. Cascade keeps **one continuing fictional conversation**: the AI's initial answer, followed by each player's locked Interference card, an AI reply, then a **different player's** freely written Handoff, another AI reply, and finally the next card. The server sends the full previous transcript on every model call. This preserves conversational context without relying on the provider's stored conversation service; `store:false` is used.

For four total players, there are three contestants, one Judge, three card plays, three Handoffs, and seven AI replies per round (including the baseline). No contestant can follow up on their own card, and each receives exactly one Handoff and one card play.

## Quick start (Netlify)

1. Deploy **this new folder**, not `game-app/hosted`, to a **separate Netlify project**. Base directory: `card-games/agent-fault/game-app/cascade`. Build command: `npm run build`. Publish: `public`. Netlify Functions and Netlify Database use the included configuration and migrations.
2. Add `OPENAI_API_KEY` (secret, Functions scope) to **the new site's** environment settings and optionally `AGENT_FAULT_MODEL=gpt-4.1-mini`. Never put a key in GitHub or the browser.
3. Visit the new HTTPS site `/`, create a host room, and have 4–8 phones join from any network. The host is a facilitator and is not a player.
4. Judge sees a private Fault and programs a 1–20-word personality; the host generates the initial 35–50-word response (or manually pastes one if the API is unavailable).
5. All non-Judges privately lock one card from their four-card hands **after the initial answer**. Only then is the card order randomized.
6. For every card: the host generates the next AI reply, the designated **different** player writes one 2–25-word Handoff (optional exact-quote Hook), and the host generates another reply. The previous conversation always remains in context.
7. Judge awards **one Spotlight +1** (one player-generated AI reply) and may select **one explicit Derailment Bonus +1** using Breakpoint A/B or the secret Fault. The Bonus may be challenged within 12 seconds; if challenged, all players vote, a strict majority is required, and the Spotlight is unaffected.
8. The host finalizes, the server reveals credited actions, refills hands and rotates Judge; game ends after each player has judged once.

### Animated demo

`/demo` presents a *scripted*, branching six-step walkthrough using the correct 66-card illustrated deck. Visitors can choose different sample Handoffs to see how that choice changes a **scripted** agent reply and potential Breakpoint. It sends no OpenAI requests and creates no room or billing events. It is entirely separate from the live game state.

## Differences from Classic

| Mechanic | Classic | Cascade v0.2-P |
| --- | --- | --- |
| AI | Parallel independent replies | Baseline + full accumulating conversation |
| Player turns | One anonymous card | One locked card + one reactive Handoff, different player |
| Order | Simultaneous submissions | Cards shuffle after locking, then card/AI/Handoff/AI |
| Scoring | Judge Spotlight and Bonus | Same two-point cap, credited to triggering action |
| Evidence | Every player votes | Challenge-triggered majority vote only |
| Reply length | Hard cut after 30 words | 8–65 accepted, 35–50 suggested, must end in a complete sentence |
| Game length | Four players = 8 rounds | One judge rotation = 4 rounds with four players |

## Core rules & privacy

- 24 Scenarios, 36 Interferences, six Faults. **No card text or art was changed.** Exact candidate deck v0.9-P; 66 original illustrated card fronts and three previously corrected original robot backs.
- Host and players receive different cryptographically random room tokens, hashed in Postgres JSONB game state; only the Judge receives the secret Fault before the judging phase. Other players' private hands are never included in their state response.
- Card owners and Handoff authors are hidden until the round has been scored; the Judge chooses Spotlight without seeing authors. Publicly inspectable card art URLs do **not** reveal private card ownership or draw order.
- Participants lock cards simultaneously; the host can run one server-side model request per AI-reply step, or paste a manual response. Never truncate mid-sentence. Each provider response can be billable even if invalid or timed out.
- One automatic attempt per step (prevents accidental paid retries); after failure, host may paste a correction. Recovery of a stuck request is available after 60 seconds.
- Per-room generation call ceiling: 144; global daily request ceiling: 300; $1.00 estimated/day cap is **not a provider-level billing cap**. This edition can make substantially more calls than Classic. Track provider bills separately.
- The Netlify Database SQL migration creates only `afc_rooms`, `afc_usage`, and `afc_request_limits`; the Classic tables and live API are untouched. Room inactivity expires after 24 hours.
- One response after each card and Handoff, plus one baseline: `1+2(P−1)` per round for total player count `P`. At eight players and one-rotation full game: 120 calls if every action generates once.

## Run QA

```bash
node --test tests/*.test.mjs
node --check lib/game.mjs
node --check public/static/cascade.js
node --check public/static/cascade-demo.js
```

The pure rules engine has deterministic *invariant tests* but uses cryptographically randomized turn order. It has not been human-balanced or verified with physical iOS/Android devices. A separate public internet deployment is not established merely by committing source files.

## Outstanding human evaluation

1. Do players enjoy inheriting other players' complications, or does it feel like unintended kingmaking?
2. Are 7–15 AI replies per round too long? Is the advantage of acting later meaningful?
3. Is a 25-word Handoff enough to react to the AI, and is the optional Hook actually used?
4. Are the response's Objective hits genuine rather than merely a prompted recitation of success conditions?
5. Does challenge-only adjudication reduce time without allowing ambiguous awards?

**Never overwrite the Classic deployment with Cascade without a separate explicit decision.**

### Offline preview (no network or API required)

The source package also includes `public/CASCADE_OFFLINE_PREVIEW.html` and `public/static/cascade-demo-offline.js`. Open that HTML file after extracting the package to browse the new six-step animated demo without running Netlify. Only the original bundled card illustrations are displayed; interactive scripted demo replies make no API calls. The companion `CASCADE_ANIMATED_DEMO_OFFLINE.zip` contains just this preview and its required image assets.
