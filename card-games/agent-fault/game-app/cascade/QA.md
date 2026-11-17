# Evidence & validation status

- `[CONFIRMED]` Exact source card counts and IDs: 24 / 36 / 6, identical to AGENT/FAULT v0.9-P card manifest.
- `[CONFIRMED]` Asset pipeline points at unchanged SHA-256-pinned 66-card digital archive, including the three corrected original backs.
- `[CONFIRMED]` Original Live/Classic application is not modified by this copy.
- `[TESTED]` Locally executed pure Node server tests for randomized Handoff coverage, private state exposure, scoring, challenge and timeouts, 8-player draw/refill, full round transitions and malformed reply rejection.
- `[TESTED]` Syntax checks for JavaScript frontend and demo; scripted demo uses no provider access.
- `[UNKNOWN]` Separate Netlify domain and database production deployment until a new project is created and production health checked.
- `[UNKNOWN]` End-to-end multi-device browser acceptance until tested against public deployment.
- `[UNKNOWN]` Human enjoyment, fairness, runtime and total provider spend across a full game; need observed playtests.

## Design tradeoffs

1. Transcript replay each request provides contextual continuity, but context lengths and output drift can grow over a long game.
2. One-rotation games scale with player count and may still be long at 7–8 players.
3. Immediate-trigger attribution is mechanically clear but may reward exploitation of other contestants' earlier work (intentionally competitive, not yet balanced).
4. Judges are anonymous-blind for Spotlight; authors are only revealed after score finalization.
5. Challenge-only scoring saves clicks but trades formal validation for table discretion.

## Independent deployment target

The Cascade edition uses a newly created Netlify project at `agent-fault-cascade-playtest`. Its site ID is `1f19b647-8097-4c8d-a1de-8966cc071e7d`. This is **not** the existing Classic site. The GitHub workflow for this copy specifically targets that new site, and is triggered only by changes within `game-app/cascade` or its dedicated workflow. An empty Netlify site or a successful source commit alone does not imply a live playable game; verify the deployment and API health separately.
