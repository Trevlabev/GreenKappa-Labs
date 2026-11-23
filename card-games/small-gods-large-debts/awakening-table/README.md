# Current SG,LD website experiences — source map (2026-11-23)

**Status:** Public development experiences, not final tabletop canon or authorization for formal human playtesting. The latest approved rules authority is the [00 START HERE Drive index](https://docs.google.com/document/d/14BImRCsrWYBl6-A8B7cZgbQ-x7wE0A5O-xn6Hg8v8eY/edit).

| Purpose | Current URL | Main implementation |
| --- | --- | --- |
| Play a 3-player development match | [Playable Alpha](play.html) | `play.html` + `cards3d.js`, with `visuals.js` fallback |
| Learn Devotion, Glory, and Covenants | [The Divine Economy](divine-economy.html) | `divine-economy.html` |
| Watch the 14-chapter scripted game | [Awakening Table v0.5-P](tabletop-v05.html) | `tabletop-v05.html`; illustrative, not a full simulation |
| Watch the cinematic showcase | [The Awakening](cinematic.html) | `cinematic.html` |
| Inspect 3D game artifacts | [Gallery](index.html) | `index.html` (standalone Three.js viewer) |

**Preservation:** `tabletop-v04.html`, `cinematic-v02.html`, and `walkthrough-v03.html` are older or alternative independent demos. They are deliberately retained for provenance and existing direct links; they are not primary links from the SG,LD subpage. `table3d.js` remains separate from the active playable-alpha renderer because it includes standalone die/scene behavior that has not been validated as a drop-in replacement for `cards3d.js`. The gallery and cinematic scripts are not interchangeable with the game engine. Do not deduplicate these by deleting code or changing asset bytes without dependency and device checks.

## Candidate mechanical conformance

For this branch, all 18 Miracle IDs, costs, and base Glory values use the [v1.1-P M13-2G control](https://docs.google.com/document/d/1_5JAhiyiCEf42-0_ZBQuvyx9afbQYkZpnXrk7jWhhR8/edit). The M13-3G treatment is restricted to internal experiments; no printed text or physical inventory changed.

**TW-01 M03 correction:** In the active alpha, unsponsored M03 now grants only its base 1 Glory after paying the normal cost. Only a sponsored M03 can choose +2 Devotion or free awakening of one dormant Titan; the sponsor still gains +1 Devotion. The common M06/M15 alternate-action handler remains available without sponsorship. [Approved-for-testing TW-01 specification](https://docs.google.com/document/d/1NfOaaoSUC9wkdwE49zOMyFdByzqubbCOjDTKvDLXmPw/edit). TW-01 is NOT permanent retail gameplay canon.

Run focused, no-network, no-new-workflow regressions with Node.js 22+:

```bash
node --test card-games/small-gods-large-debts/awakening-table/qa/tw01-m03.test.cjs
```

The nine focused tests exercise the actual inline alpha engine in a mocked DOM and check the 18 Miracle IDs/costs/Glory. Historical 142-fixture evidence remains archived in Drive, but its unsponsored M03 test expectation predates the TW-01 correction and must not be counted as conformance. The isolated new tests are not an exhaustive game-balance or rendered browser QA certificate. No recurring GitHub Actions workflow was introduced.

## Historical v0.1 device-testing record (preserved)

# The Awakening Table — SG,LD public device-testing beta (v0.1-P)

**Route:** /card-games/small-gods-large-debts/awakening-table/

**Parent page:** /card-games/small-gods-large-debts/

**Status:** Owner-approved for public **device testing** on 2026-11-20. This is not game canon or approval of experimental art/mechanics.

## Deployment record
- All 36 GLB models and an integrity manifest were pushed to the main branch in commit `9276e0fb3976fc294e4506fe4c6ef61d2e442a46`.
- Local deployment script verified 36/36 GLB SHA-256 checksums and file sizes before the push.
- Its post-deploy checks returned HTTP 200 for the HTML page and sampled GLB URLs. This does **not** constitute a full live render/performance test.
- Website viewer references 35 standalone artifacts; the 36th GLB is the combined eight-deity animated deck, retained as a source asset and not selected by the viewer.
- Parent-page CTA is live in the repository.

## Known limitations — not yet QA-approved
- Actual interactive WebGL rendering on desktop and mobile browsers has not been independently verified.
- The D8 yields an illustrative 1–8 result, but the visible die face is not synchronized to the result.
- The Sealed Three chapter currently inspects one Titan at a time; the cinematic three-card composition is not implemented.
- Card flip/spin are presentation only, not gameplay.
- The Three.js ES-module CDN requires network availability.
- Owner-approved **public deployment** does not imply production-quality or retail-canon approval. Maintain the 54-card historical physical inventory baseline.

## Device test suggestions
Check Safari iOS, Chrome Android, desktop Chrome/Edge/Firefox/Safari, touch orbit, scroll interaction, loading time, WebGL errors, memory pressure, orientation changes, and reduced-motion preference.

## Governance
Approved for public testing by the project owner; keep experimental project artifacts under Unapproved Assets in SG,LD Drive until explicitly approved as assets.
