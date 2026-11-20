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
