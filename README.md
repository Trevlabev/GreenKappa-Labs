# GreenKappa Labs — Website

Source for the static GitHub Pages website at **https://greenkappalabs.art/**.

## Studio architecture

| Route | Function | Status |
| --- | --- | --- |
| `/` | Eight-slide gallery including Flowglass, and four studio divisions | Public-facing site |
| `/tablearc/` | Original TableArc local-first RPG engine | Active development |
| `/tablearc-red/` | Standalone Cyberpunk RED AI-GM and operations-console project | v0.5.0 source prototype; Windows acceptance pending |
| `/card-games/` | Three original card-driven games | In development |
| `/card-games/playtest/` | Playtest inquiries for the three current card games | Intake page |
| `/playground/` | Public experiments and free interactive prototypes | First experiment implemented |
| `/playground/not-to-scale/` | No Such Room shifting-house microgame (legacy URL) | Browser concept demo |
| `/worlds/` | Portal linking to independent universe sourcebook and adventure catalogs | Public portfolio hub |
| `/worlds/sourcebooks/` | Five universe sourcebook collections, The Oldest House featured | Illustrated development portfolio |
| `/worlds/adventures/` | Four distinct adventure entries, The Records House featured | Illustrated development portfolio |
| `/tools/` | Product portfolio subpage with two working alphas and four concept-stage utilities | Public product directory |
| `/filingproof/` | Local legal PDF preflight, source-aware rules and structured reports | Working browser alpha v0.1 |
| `/flowglass/` | Local-first dependency-map editor and structural impact analysis | Working browser alpha v0.1 |
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
- `EXPANSION-ROADMAP.md` — production and validation gates

## Publishing

The custom domain is declared in `CNAME`. Intended GitHub Pages publishing configuration: **deploy from branch `main`, directory `/root`**. If edits to the repository are not reflected at the public URL, check **Settings → Pages** and deployment status.

## Important distinctions

- TableArc RED is a **separate app** from original TableArc: independently named Electron application, profile and saves. Its v0.5.0 source has partial RED mechanics, a structured Foundry, provider hooks, NET operations and tactical/medical tools. The site does not offer a public certified Windows binary. No official Cyberpunk RED rulebook content is distributed; GreenKappa Labs is not affiliated with R. Talsorian Games.
- TableArc RED hero terminal is an explicitly marked **illustrative mockup**, not a product screenshot.

- The No Such Room browser microgame is a simplified prototype at the legacy `/playground/not-to-scale/` URL. It does **not** implement the full tabletop game's rules.
- The playtest page invites inquiries for No Such Room, Small Gods, Large Debts and AGENT/FAULT; it does not publish private deck files.
- Flowglass v0.1 is a real local-first browser alpha that analyzes user-supplied graphs. It does **not** discover tenant assets, access Microsoft APIs or infer production risks. FilingProof v0.1 is a working browser-local PDF preflight with sourced reference profiles; it is not a filing service, legal-advice system, redaction certifier or court-acceptance validator. PDF.js is loaded via a pinned third-party CDN but selected PDF contents are not uploaded. The other four GreenKappa Tools remain design concepts. No commercial release dates are announced.
- These games are not commercial releases. Human playtest results, balance certification, print readiness, manufacturing costs, and market demand remain unverified.
- Changes committed to `main` have been read back through GitHub. Actual public-domain deployment and real-browser behavior require separate verification.

Contact: GreenkappaLabs@gmail.com.

### Flowglass promotional assets and gallery

The homepage's eight-slide gallery includes a Flowglass alpha feature linking to `/flowglass/`. GreenKappa Tools has an enhanced product portfolio page at `/tools/`, with featured Flowglass and FilingProof release cards. Promotional images in `assets/promos/flowglass-*.webp` are AI-generated conceptual illustrations; they are **not literal screenshots** of the implemented alpha and must remain labeled as such. The main project has a dedicated square image for mobile. Sourcebook and adventure slide art and links are unchanged.
