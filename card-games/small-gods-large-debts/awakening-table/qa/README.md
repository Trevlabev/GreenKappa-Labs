# SG,LD — Alpha mechanical QA

All tests exercise the **real inline alpha engine** in `../play.html` via a deliberately minimal mocked DOM. They are **internal mechanical QA**, not browser/device tests or retail-rules approval.

Current candidate control: v1.1-P M13 **7 Devotion / 2 Glory**, Group A candidate clarifications A01–A07, and TW-01 **test-only** Titan options.

Run on Node.js 22+ from the repository root:

```bash
node --test card-games/small-gods-large-debts/awakening-table/qa/*.test.cjs
```

- `tw01-m03.test.cjs`: 9 sponsorship/control tests.
- `candidate-conformance.test.cjs`: 115 targeted and path/invariant tests.
- `player-count.test.cjs`: 75 setup, 3–6-god full-match, and multi-target/hidden-card tests (including 64 full-match simulations).
- [3–6-god table-size QA report](PLAYER_COUNT_QA_2026-11-23.md).
- [Conformance findings and source links](MECHANICAL_CONFORMANCE_2026-11-23.md).

Do **not** mistake passage of these scripted fixtures for human balance, final print approval, private-information security certification, or a rendered-device QA pass. No recurring CI workflow was added. Keep the original 54 source card slots and approved assets unchanged.
