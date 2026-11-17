# GreenKappa Labs — Website

Source for the static GitHub Pages website at **https://greenkappalabs.art/**.

## Studio architecture

| Route | Function | Status |
| --- | --- | --- |
| `/` | Ten-slide gallery, four studio divisions, and product discovery | Public-facing site |
| `/tablearc/` | Original TableArc local-first RPG engine | Active development |
| `/tablearc-red/` | Standalone Cyberpunk RED AI-GM and operations-console project | v0.5.0 source prototype; Windows acceptance pending |
| `/card-games/` | Three original card-driven games | In development |
| `/card-games/playtest/` | Playtest inquiries for the three current card games | Intake page |
| `/playground/` | Public experiments and free interactive prototypes | First experiment implemented |
| `/playground/not-to-scale/` | No Such Room shifting-house microgame (legacy URL) | Browser concept demo |
| `/worlds/` | Portal linking to independent universe sourcebook and adventure catalogs | Public portfolio hub |
| `/worlds/sourcebooks/` | Five universe sourcebook collections, The Oldest House featured | Illustrated development portfolio |
| `/worlds/adventures/` | Four distinct adventure entries, The Records House featured | Illustrated development portfolio |
| `/tools/` | Product portfolio with four working alphas and two concept-stage utilities | Public product directory |
| `/filingproof/` | Local legal PDF preflight, source-aware rules and structured reports | Working browser alpha v0.1 |
| `/courtflow/` | Synthetic court casework simulator and visual workflow designer | Working browser alpha v0.2 |
| `/flowglass/` | Local-first dependency-map editor and structural impact analysis | Working browser alpha v0.1 |
| `/tools/handoff-atlas/` | Procedure builder, branching guided runner and handoff history | Working browser alpha v0.1 |
| `/work/` | Portfolio and case studies | Public-facing site |
| `/journal/` | Development notes | First entry implemented |

## Tech stack

Static HTML, CSS, and vanilla JavaScript. No JavaScript framework or site-build step is required.

- `style.css` — existing responsive site-wide styles
- `tablearc-red/red.css` — scoped Cyberpunk RED product styling and homepage feature
- `studio.css` — complementary dark subpage design language
- `script.js` — navigation and shared progressive enhancement
- `playground/not-to-scale/demo.js` — interactive microgame logic
- `tools/tools.css` — custom GreenKappa Tools design system
- `flowglass/core.mjs` — pure dependency graph engine, validation and report generation
- `flowglass/app.mjs` — browser UI, editing, local project state and import/export
- `flowglass/tests/core.test.mjs` — Node built-in unit tests (no npm dependencies)
- `filingproof/core.mjs` — deterministic legal PDF technical-preflight rule engine
- `filingproof/app.mjs` — browser-local PDF analysis and review interface
- `filingproof/tests/core.test.mjs` — deterministic Node unit tests
- `courtflow/core.mjs` — workflow engine and dependency-validation logic
- `courtflow/app.mjs` — intake, queues, profile editor, audit and local persistence
- `courtflow/tests/core.test.mjs` — deterministic workflow tests
- `tools/handoff-atlas/core.mjs` — pure branching procedure engine and validation
- `tools/handoff-atlas/app.mjs` — local-first editor, guided runner, import and export
- `tools/handoff-atlas/tests/core.test.mjs` — deterministic procedure and report tests
- `EXPANSION-ROADMAP.md` — production and validation gates

## Publishing

The custom domain is declared in `CNAME`. Intended GitHub Pages publishing configuration: **deploy from branch `main`, directory `/root`**. If edits to the repository are not reflected at the public URL, check **Settings → Pages** and deployment status.

## Important distinctions

- TableArc RED is a **separate app** from original TableArc: independently named Electron application, profile and saves. Its v0.5.0 source has partial RED mechanics, a structured Foundry, provider hooks, NET operations and tactical/medical tools. The site does not offer a public certified Windows binary. No official Cyberpunk RED rulebook content is distributed; GreenKappa Labs is not affiliated with R. Talsorian Games.
- TableArc RED hero terminal is an explicitly marked **illustrative mockup**, not a product screenshot.

- The No Such Room browser microgame is a simplified prototype at the legacy `/playground/not-to-scale/` URL. It does **not** implement the full tabletop game's rules.
- The playtest page invites inquiries for No Such Room, Small Gods, Large Debts and AGENT/FAULT; it does not publish private deck files.
- Flowglass v0.1 is a real local-first browser alpha that analyzes user-supplied graphs. It does **not** discover tenant assets, access Microsoft APIs or infer production risks. FilingProof v0.1 is a working browser-local PDF preflight with sourced reference profiles; it is not a filing service, legal-advice system, redaction certifier or court-acceptance validator. PDF.js is loaded via a pinned third-party CDN but selected PDF contents are not uploaded. Handoff Atlas v0.1 is a working browser-only procedure builder and guided run demo; it has no authenticated backend or official audit log. Proofline and Lorelock remain design concepts. No commercial release dates are announced.
- These games are not commercial releases. Human playtest results, balance certification, print readiness, manufacturing costs, and market demand remain unverified.
- Changes committed to `main` have been read back through GitHub. Actual public-domain deployment and real-browser behavior require separate verification.

Contact: GreenkappaLabs@gmail.com.

### Flowglass promotional assets and gallery

The homepage's ten-slide gallery includes a Flowglass alpha feature linking to `/flowglass/`. GreenKappa Tools has an enhanced product portfolio page at `/tools/`, with four runnable alpha cards and two separately labeled concepts. Promotional images in `assets/promos/flowglass-*.webp` are AI-generated conceptual illustrations; they are **not literal screenshots** of the implemented alpha and must remain labeled as such. The main project has a dedicated square image for mobile. Sourcebook and adventure slide art and links are unchanged.

### FilingProof promotional media (2026-11-17)

The website now includes four optimized WebP promotional assets under `assets/promos/filingproof-*.webp`: wide gallery illustration, square mobile crop, a Tools portfolio preview, and a secondary feature visual. These images are illustrative AI-generated marketing concepts, **not actual product screenshots, court acceptance decisions, or certifications**. Pages disclose their illustrative status and link to the real FilingProof alpha.

## Site quality gate

Run `node tests/site-integrity.mjs` to verify local HTML links, image references, anchors, canonical routes, accessibility basics, and sitemap entries. Run `node tests/site-navigation.mjs` after starting a local HTTP server and installing Playwright to exercise the public marketing pages on desktop and mobile. GitHub Actions also exercises the primary gallery and application entrypoints.

Maintained marketing pages are intentionally separate from research artifacts (such as AGENT/FAULT experiment reports and the legacy redirect). Automated checks cannot establish human accessibility, legal review, product fitness, or long-session application reliability.
