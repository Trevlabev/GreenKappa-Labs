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


## Cinematic showcase refresh v0.3-P

- Animated demo styling is isolated in `public/static/cascade-showcase.css`, loaded **only** on the demo and offline preview pages. The live game and Classic project are not edited.
- Original 66-card archive and three corrected backs remain unchanged. The revised demo uses only previously approved real card images, and sample output remains explicitly scripted.
- Added `tests/showcase.test.mjs` for demo routing, card IDs, accessible focus/navigation, reduced-motion behavior, branch selection, animation hooks and isolated styling.
- Browser smoke testing via in-memory document injection covered all six stages at desktop (1440×900) and phone (390×844) sizes, with no page JS errors, no horizontal overflow, sticky controls above variable-height scenes, keyboard dialog dismissal, three Handoff branches, and scoring outcome switching. This bypasses this test environment's blocked URL navigation; it is not an independent test of the public Netlify endpoint.
