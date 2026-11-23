# Small Gods, Large Debts — Candidate Mechanical Conformance

**Date:** November 23, 2026  
**Scope:** v1.1-P M13 7-Devotion/2-Glory CONTROL and owner-authorized Group A / TW-01 experiment.  
**Status:** Internal software QA, **NOT** a final retail-rules approval, formal human playtest, or browser/device acceptance.

## Source authorities

- [Owner-approved candidate interpretations A01–A07 and M13 test-control distinction](https://docs.google.com/document/d/1jx5UcAs6SMJZQaA2ASohI3J9FzuSdV17LfSs9ZMxrOA/edit)
- [Integrated rulebook v1.1-P (candidate; retail approval not granted)](https://docs.google.com/document/d/1Ys4bBF0Is7c6KoWYlwu-6XBcuyE2mONNHahLLKpS8Z4/edit)
- [Complete effect manifest v1.1-P control](https://docs.google.com/document/d/1_5JAhiyiCEf42-0_ZBQuvyx9afbQYkZpnXrk7jWhhR8/edit)
- [Owner-approved operative 16 Boon effects](https://docs.google.com/document/d/1Ql6lCErVsvZg1JxHSy8l9H2DR4YOaEyFhtot069eYQE/edit)
- [TW-01, approved for controlled mechanical testing only](https://docs.google.com/document/d/1NfOaaoSUC9wkdwE49zOMyFdByzqubbCOjDTKvDLXmPw/edit)
- [00 START HERE approval authority register](https://docs.google.com/document/d/14BImRCsrWYBl6-A8B7cZgbQ-x7wE0A5O-xn6Hg8v8eY/edit)

## Candidate behavior clarified

### GB02 — A Thousand Kneel

The previously implemented **full two-Devotion voluntary payment requirement** is retained, not rebalanced. Under the candidate full-transfer and cap rules, the selected payer needs at least 2 Devotion, and the invoker must have room to receive all 2 (starting Devotion at most 8). An ineligible opponent must **not appear as a selectable payer** when another legally eligible opponent exists. If none exists, the Good Boon's invoker still gains its base 1 Glory; no contribution occurs, no extra Glory is awarded, and no Covenant is created.

**Source defect repaired:** GB02 previously presented *every* rival for the optional purchase, only rejecting illegality *after* selection, allowing an otherwise legal Boon choice to fizzle when a different legal payer existed.

**Interpretation boundary:** If the project owner later decides that a payer may spend 2 while the capped recipient retains only a partial amount, that would be a **new explicit rule decision**. The current implementation follows the candidate rulebook's full voluntary-payment and recipient-cap transfer constraints; no new Boon text was approved here.

### OG05 — The Last Witness, D8 2–5 ("Remembered by None")

Printed experimental row: choose **another** god tied for lowest Glory; **both** invoker and chosen god gain 1 Devotion.

Under Group A A07, if no other god is tied for the game's minimum Glory, the choice has **no eligible target** and the entire coupled effect is skipped. Previously, the alpha granted the invoker +1 Devotion before checking eligibility, contrary to this condition.

**Source defect repaired:** eligible opponents are determined before any grant; only a successful selection grants +1 to each participant (independently capped at 10). No general fallback +1 is invented. OG05's other D8 rows remain unchanged.

## Regression coverage

The two files exercise the actual inline `play.html` engine under a mocked DOM. This avoids changing game art, models, or the active website's module structure.

| Suite | Scenarios | Coverage |
| --- | ---: | --- |
| `tw01-m03.test.cjs` | 9 | M03 sponsored/unsponsored eligibility, fallback, control data, M06/M15 protection |
| `candidate-conformance.test.cjs` — targeted | 15 | GB02 (4), OG05 (4), cap, identity, snapshot, partial/capped debt, frozen reckoning, M13 control |
| Candidate conformance — all Miracles | 18 | Each M01–M18 self-funded base resolution, Glory, Move count, no unintended Covenant and cap invariants |
| Candidate conformance — all Boons | 16 | Each of 8 Good + 8 Bad Boons resolves with callback and resource invariants |
| Candidate conformance — all Titan middle outcomes | 48 | Each OG01–OG08 D8 2–7 resolves, with callback and resource invariants |
| Candidate conformance — natural extrema | 16 | Each OG01–OG08 natural 1/8 routes through ordinary Bad/Good Boons outside OG08 exact-10 override |
| Candidate conformance — OG08 exception | 2 | Exact-ten natural 1 loses all Devotion and 2 Glory without a Bad Boon; exact-ten natural 8 immediately wins without a Good Boon or Final Reckoning |
| **Total** | **124** | **Both suites, non-browser** |

An independent V8 execution of **the exact fetched engine and test sources** recorded **124/124 passing scenarios** with **732 assertions** (115/115, 668 assertions in the candidate suite; 9/9, 64 assertions in M03). The test functions were executed in a JavaScript runtime with mocks for Node's `fs`, `path`, `assert`, and `node:test` interfaces. This is **not** an assertion that GitHub Actions executed them or that a browser accepted them. The test files are ordinary CommonJS and can also run under Node.js 22+:

```bash
node --test card-games/small-gods-large-debts/awakening-table/qa/*.test.cjs
```

## Coverage limitations and remaining risk

- Every available Titan face has an executable invariant fixture, but **these are not 64 exhaustive rule-semantic proofs**. Many paths test completion and resource invariants rather than all strategic consequences, hand secrecy or choice ordering.
- The 18 Miracle and 16 Boon smoke cases similarly do **not** establish that every combination of modifiers, sponsorship, debt, Titan choice, target order, or private-hand recycling is correct.
- The fixed **three-player** alpha is not a certified implementation of all intended **3–6-player** table configurations.
- The JS runtime mocks do not verify mobile/browser rendering, animation, network-loaded GLBs, D8 face orientation, audio or accessibility.
- Scripted rival strategies do not certify human negotiation, player enjoyment, comparative balance, or 30–45-minute duration.
- **M13 remains at 7D/2G** in the control; 7D/3G is a separate test treatment, **not promoted**.
- Original **54 historical physical slots** remain protected, irrespective of separate experimental Titan/Boon/deity modules.
- Human playtesting is still **ON HOLD** by owner direction.
- Potential future fixtures: cross-effects for Noid target legality, two distinct actors' simultaneous cap/transfer edge cases, Gilt–Ravel settlement timing, cancellation during an active debt and full 3–6-player turn sequences.

No recurring GitHub workflow, pull request or unapproved rules/asset promotion is part of this QA change.
