# GreenKappa Labs — Website

Source for the static GitHub Pages website at **https://greenkappalabs.art/**.

## Studio architecture

| Route | Function | Status |
| --- | --- | --- |
| `/` | Studio positioning, featured products, four disciplines | Public-facing site |
| `/tablearc/` | Original TableArc local-first RPG engine | Active development |
| `/tablearc-red/` | Standalone Cyberpunk RED AI-GM and operations-console project | v0.5.0 source prototype; Windows acceptance pending |
| `/card-games/` | Five original card-driven games | In development |
| `/card-games/playtest/` | Who Broke the Prompt? 0.3 alpha invitation and score tracker | Provisional test companion |
| `/playground/` | Public experiments and free interactive prototypes | First experiment implemented |
| `/playground/not-to-scale/` | Nine-room shifting-house microgame | Browser concept demo |
| `/worlds/` | Original narrative settings | Studio concept |
| `/tools/` | Practical creative software and development systems | Studio direction |
| `/work/` | Portfolio and case studies | Public-facing site |
| `/journal/` | Development notes | First entry implemented |

## Tech stack

Static HTML, CSS, and vanilla JavaScript. No JavaScript framework or site-build step is required.

- `style.css` — existing responsive site-wide styles
- `tablearc-red/red.css` — scoped Cyberpunk RED product styling and homepage feature
- `studio.css` — complementary dark subpage design language
- `script.js` — navigation and shared progressive enhancement
- `playground/not-to-scale/demo.js` — interactive microgame logic
- `card-games/playtest/tracker.js` — alpha score tracker and local Markdown export
- `EXPANSION-ROADMAP.md` — production and validation gates

## Publishing

The custom domain is declared in `CNAME`. Intended GitHub Pages publishing configuration: **deploy from branch `main`, directory `/root`**. If edits to the repository are not reflected at the public URL, check **Settings → Pages** and deployment status.

## Important distinctions

- TableArc RED is a **separate app** from original TableArc: independently named Electron application, profile and saves. Its v0.5.0 source has partial RED mechanics, a structured Foundry, provider hooks, NET operations and tactical/medical tools. The site does not offer a public certified Windows binary. No official Cyberpunk RED rulebook content is distributed; GreenKappa Labs is not affiliated with R. Talsorian Games.
- TableArc RED hero terminal is an explicitly marked **illustrative mockup**, not a product screenshot.

- The Not to Scale microgame is a simplified prototype. It does **not** implement the full tabletop v0.3 rules.
- The Who Broke the Prompt? companion uses the provisional 0.3-alpha scoring model and invites playtesters to request the kit; it does not publish private deck files.
- These games are not commercial releases. Human playtest results, balance certification, print readiness, manufacturing costs, and market demand remain unverified.
- Changes committed to `main` have been read back through GitHub. Actual public-domain deployment and real-browser behavior require separate verification.

Contact: GreenkappaLabs@gmail.com.
