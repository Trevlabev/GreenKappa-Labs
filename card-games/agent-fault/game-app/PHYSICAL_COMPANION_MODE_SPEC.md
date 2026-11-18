# AGENT/FAULT — Physical-card companion modes (design candidate)

Status: Proposed implementation alongside Cloudflare multiplayer migration, not established tabletop canon. Do not claim full gameplay acceptance before real four-player tests.

## Mode matrix
| Ruleset | Digital-table mode | Physical-card companion |
|---|---|---|
| Classic / Live Online | Server deals virtual hands; players select illustrated digital cards | Players use the actual printed deck; the site manages prompts, private submissions, votes, and scoring |
| Cascade | Server deals digital Interferences and randomized order | Players physically draw Interferences; the site captures the played card ID, orders the cascade, runs generation and Handoffs |

The selected mode belongs to the room (play_mode = digital or physical), is immutable after room creation, and travels in state snapshots. It is not a different card manifest, AI model, or Worker. Both editions retain separate engines, separate Workers, and distinct rooms.

## Physical-table play flow
1. Host chooses **Use digital cards** (default) or **Use printed cards** at room creation. Host facilitates the display; four to eight additional player seats join using phones and room code.
2. Players shuffle and deal the actual cards at the table. Each player holds their physical Interference hand. The website must never draw a competing digital hand in this mode.
3. In setup, host records the printed Scenario ID; the current Judge records the printed Fault ID privately on their phone. The server validates the IDs against the unchanged 24/36/6 card manifest; other players cannot see the unrevealed Fault.
4. Judge locks the personality using the existing private input. The physical Scenario remains visible on the tabletop; its canonical wording is available to the AI and on the display.
5. Non-Judges privately enter the ID of the physical Interference card they are actually playing. Server checks category, format, duplicates within that round and player authorization. It cannot prove physical ownership. Physical discard/draw/refill is handled by players.
6. Classic: unchanged labeled answers → Spotlight → qualifying Bonus → all-player approval → scoring. Cascade: unchanged AI baseline → locked physical cards → randomized order → different-player Handoffs → judging/challenge → scoring.
7. At the start of the next round, host and Judge record the next printed Scenario and Fault. The website must not silently replace those physical cards.
8. Preserve online room reconnection, AI-call budget limits, manual AI responses, accessible card ID input, inactivity controls, and original artwork for optional inspection.
9. Physical mode must never disclose card ownership, unrevealed Fault, private Handoff author, or access credentials on the shared host screen. Player input remains authenticated.
10. Room state expires under the same hosting policy as the digital mode. Disconnection does not automatically discard a physical hand.

## Non-goals / safeguards
- No reprinting, replacing, or renumbering the 66 candidate cards.
- No digital replacement deck or virtual hand randomized behind the table's back.
- No assumption that the host can secretly know the Judge's physical Fault.
- No requirement to photograph or scan printed cards; printed ID entry is sufficient.
- Do not advertise a single-screen/no-phone game until privacy and anonymous submission are separately designed and playtested.
- In-person discussions and physical card drawing are human-governed; app does not adjudicate whether the physical deck was shuffled correctly.
- Physical companion mode still requires internet for Cloudflare multiplayer and automated AI; manual AI entry remains available.
- Keep existing digital mode and public demos unchanged.

## Release acceptance gates
- Same 66-card IDs/texts as existing manifest; at least one complete four-player Classic physical round and Cascade physical round.
- No digital hand dealt in physical mode; no error because a played card was not in a virtual hand.
- Unique valid printed IDs only; invalid or duplicate played IDs rejected without altering room state.
- Scenario/Fault must be set before personality lock. Judge's Fault hidden until the specified reveal phase, including from host.
- Server-authoritative phase transitions, turn ownership, majority/challenge rules, generation quotas, and score totals unchanged.
- First and subsequent rounds demand new real-card selections; physical discard/refill remain player actions.
- Ordinary digital rooms pass existing tests without behavioral changes.
- Screen-reader labels, room reconnection, browser/tab inactivity and WebSocket notification behavior preserved.
- No production deployment until GitHub tests and live multi-browser acceptance succeed.


## Cloudflare staging build kickoff — 2026-11-18

The first Cloudflare Git-connected Worker is named `agent-fault-classic-cf`.
Its Workers Builds production branch is `feature/agent-fault-cloudflare-multiplayer-20261118`.
This documentation commit intentionally triggers an initial connected-repository build, without merging to `main`.

Expected configuration at first staging build:
- Working repository root: `/`
- Build command: `cd card-games/agent-fault/game-app/hosted && npm install --no-audit --no-fund && npm run build`
- Deploy command: `cd card-games/agent-fault/game-app/hosted && npx wrangler versions upload`
- Preview builds: off
- No live traffic cutover, no custom-domain changes, and no plaintext API keys

Acceptance: Cloudflare build reports success, uploads a version without making it live, and the main repository's automated tests pass. Any errors must be resolved before activating the Worker or connecting the second game.
