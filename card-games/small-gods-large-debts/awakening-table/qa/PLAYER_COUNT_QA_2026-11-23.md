# SG,LD — Configurable 3–6-God Alpha QA

**Date:** November 23, 2026  
**Build:** Playable alpha v0.7-P — single human player against 2–5 automated rival gods  
**Authority:** v1.1-P Group A candidate implementation and TW-01 test-only mechanics  
**Approval boundary:** Internal simulated engineering QA; not final retail rules, formal human playtesting, online multiplayer, or device acceptance.

## Source rules and authority

- [Integrated Rulebook v1.1-P — Group A candidate baseline](https://docs.google.com/document/d/1Ys4bBF0Is7c6KoWYlwu-6XBcuyE2mONNHahLLKpS8Z4/edit), especially 3–6-player setup and seating.
- [Complete Effect Manifest v1.1-P — M13 2-Glory control](https://docs.google.com/document/d/1_5JAhiyiCEf42-0_ZBQuvyx9afbQYkZpnXrk7jWhhR8/edit), especially OG06/OG07 and BB07.
- [Owner-approved Group A candidate clarifications](https://docs.google.com/document/d/1jx5UcAs6SMJZQaA2ASohI3J9FzuSdV17LfSs9ZMxrOA/edit) and [16 operative Boon texts](https://docs.google.com/document/d/1Ql6lCErVsvZg1JxHSy8l9H2DR4YOaEyFhtot069eYQE/edit).
- [00 START HERE authority register](https://docs.google.com/document/d/14BImRCsrWYBl6-A8B7cZgbQ-x7wE0A5O-xn6Hg8v8eY/edit).

## Implementation corrections

1. **Configurable table size.** The setup page offers total 3, 4, 5, or 6 gods. It preserves exactly one human player, chooses 2–5 unique automated rival Deities from the original eight candidate identities, and selects a random first seat.
2. **Rulebook-aligned rounds.** Five rounds when there are 3–4 gods; four rounds when there are 5–6. The fixed clockwise seat formula now uses dynamic player count instead of 3. At game end all seats must have equal personal turns.
3. **BB07 — Envy of Heaven.** Printed operative text directs the player to choose TWO DIFFERENT other gods. The old alpha granted +1 Devotion to EVERY other player; at 5–6 players that incorrectly benefited 4–5 opponents. The new implementation selects exactly two distinct other gods and awards +1 to each, with capped gains.
4. **OG07 — False Harmony (D8 5–6).** Printed experimental text directs the player to choose TWO DIFFERENT other gods, one receiving +2 Devotion and one losing up to 2. The old alpha implicitly selected the first unchosen opponent as the penalty target. The new alpha requests the second distinct god explicitly; three-player outcomes remain unchanged.
5. **OG06 and OG07 whole-table effects protected.** OG06 Around the Fold's snapshot contributions and clockwise rotation remain all-player. OG07 Silent Chorus still passes one privately chosen Miracle to the next clockwise god, without disclosing identities.
6. **Site documentation aligned.** The product page and play page now clearly state one-human versus bots 3–6 mode; this does not imply hosted multiplayer.

## Executed regression results

The revised source and exact archived suites were executed together in an isolated V8 JavaScript environment with a mocked DOM and Node test interfaces.

| Suite | Tests passed | Coverage |
| --- | ---: | --- |
| New `player-count.test.cjs` | **75/75** | Setup choices, player identities, correct 3–6 round budgets, 64 end-to-end scripted matches, BB07, OG06, OG07, six-player sponsorship |
| Existing `candidate-conformance.test.cjs` | **115/115** | Miracle/Boons/Titan face paths, cap/loan/settlement constraints |
| Existing `tw01-m03.test.cjs` | **9/9** | Sponsorship-only M03 bonuses, M06/M15 protection |
| **Total** | **199/199** | **16,758 executed assertions**; assertions from mock-simulated turn sequences included |

The 64 automated complete games cover each of 3, 4, 5, and 6 player counts, both human action policies (Gather-focused and self-funded Miracle where affordable), and eight seeded rival-policy profiles per count/policy pair. All reached Final Reckoning without engine deadlock; the simulated winner phase, fixed seat rotation, final debt clearing, and per-god turn budget were checked.

**Methodological limits:** Tests were executed with the existing engine plus mock DOM, timers, rendered-card interface and deterministic pseudo-random streams. This is stronger than static reading but **not** independently run in GitHub CI or in a real mobile/desktop browser. The 64 runs are neither natural human games nor statistically independent balance trials. Some complex Titan/Deity interactions remain candidate implementations; the 199 pass result is **not** a universal proof of all 3–6-player rules semantics.

## Reproduction

Node.js 22+ from the repository root:

```bash
node --test card-games/small-gods-large-debts/awakening-table/qa/*.test.cjs
```

The ordinary Node test scripts are committed but were not executed by GitHub Actions as part of this work; no new recurring or deployment-triggered test workflow was created.

## Production and approval safeguards

No new printed Deity slots, Titan cards, Boons, physical inventory, final balance values, owner rule approvals, or production-ready assets were created. The original 54 card IDs remain preserved; M13 is 7 Devotion / 2 Glory control (3 Glory only a separate internal treatment). The experimental Titan D8 tables and TW-01 effects remain unapproved retail mechanics. Formal human playtesting remains on hold.

**Open next engineering gate:** Real desktop/mobile/WebGL rendered-device acceptance and refinement of multi-party bot negotiation and consent decisions; the new mode is intentionally solo versus automated rivals, not local/online 3–6-human multiplayer.
