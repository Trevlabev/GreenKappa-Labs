# The Awakening Table — SG,LD website sub-subpage (v0.1-P, UNAPPROVED)

**Branch:** `sgld-awakening-table-v0.1-p-unapproved`

**Target route:** `/card-games/small-gods-large-debts/awakening-table/`

**Parent page:** `/card-games/small-gods-large-debts/`

## Current status
The page shell and Three.js GLB viewer are committed to the unapproved branch. The existing parent page and production branch are unchanged.

**Deployment blocker:** 36 binary GLB files (~112 MB uncompressed) are not yet in the GitHub repository. Copy the `assets/` folder from the `SGLD_Awakening_Table_v0.1-P_UNAPPROVED.zip` package into this directory before browser testing or merging. The page currently expects exact relative paths matching that package.

## QA limitations
- Browser rendering not yet tested.
- Die result is uniformly selected 1–8, but the visible D8 face is not synchronized.
- Three.js ES module CDN requires internet; for production bundle dependencies locally.
- The Sealed Three chapter currently selects and inspects one Titan at a time; the cinematic three-card table composition is not yet implemented.
- Card flip and spin are presentation-only; no mechanics are asserted.
- Add a parent-page CTA only after owner review.
- Preserve source approved art and the historical 54-card baseline.

## Approval
This is **not approved for production deployment**. Await owner's visual and functional review, finish assets and QA, then request approval before merge.
