# BI PANIC! — Website and browser prototype

**Status:** v1.4-P / proposed, adult-only browser prototype; not human-playtested, retail-approved, or online multiplayer.

## Public routes

- `/card-games/bi-panic/` — product page with original campaign artwork, 3D box and Panic Die viewers, mechanic preview and six actual card proofs.
- `/card-games/bi-panic/play/` — complete **60-card** local pass-and-play experience (4–12 adults, shared device, private hands).

## Asset provenance

The playable game is mechanically derived from the existing archived `BI_PANIC_Play_Offline_Single_File.html` (November 20, 2026). Its **120 original card-front images** (60 Ivory and 60 Noir), common back and Panic Die illustration were preserved as their original data-image payloads in 14 separate, versioned JavaScript bundles under `play/assets/`. The card texts and 240 prompt variants are retained. The assets load on the play route; **the marketing page does not load the full deck**.

The product page references its existing source-tracked assets under `assets/` and remains independent of gameplay state. The 3D box and die viewers use the existing GLB models; the model-viewer library loads only on demand.

## Rules and safeguards

Four D4 modes: Rocket / ME TIME; Orchid / YOUR PROBLEM; Arrows / THE LINEUP; Lips / ALL IN. Adults may pass any prompt without penalty. Physical contact requires freely given agreement. ALL IN uses SPILL only. No scoring or victory condition. No accounts or remote game server; this browser prototype stores local resume data if available.

## Release gates

- [x] Original card-art and prompt inventory preserved; 60 card IDs / 20 per intensity.
- [x] Play route plus product page, Games directory and homepage discovery links.
- [x] Site integrity route and sitemap included.
- [x] Local Chromium smoke tests at 390px and 1280px: setup, manifest counts, no page-script errors, no horizontal overflow.
- [ ] Public GitHub Pages deploy verified after merge.
- [ ] Real-device playtest and long-session acceptance.
- [ ] Screen-reader acceptance and reduced-motion inspection.
- [ ] Final print-prepress, packaging and legal/product review.

Older archives and the separate v1.3-P premium demo are retained for provenance, not silently replaced or deleted. This is a **hosted v1.4-P pass-and-play build**, not a claim that every v1.3-P production asset has been shipped.
