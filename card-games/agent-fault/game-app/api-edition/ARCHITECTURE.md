# AGENT/FAULT LIVE — API Edition v0.2.0

Standalone self-hosted local/LAN party app. A separate fork of AGENT/FAULT LIVE v0.1.0 using exactly the same v0.9-P candidate game text.

- **Frontend:** HTML/CSS/JS, separate shared host screen and private phone controllers. The host presses one button to generate all anonymous A–G replies. Manual prompt/paste fallback still available.
- **Server:** FastAPI + SQLite. Independent database `api_rooms.sqlite3`, default port `8766`. Authenticated host/player tokens; same gameplay transitions and scoring as v0.1.0.
- **Private game data:** only Judge receives secret Fault before reveal; only each player sees their own cards; host generation prompt excludes secret Fault, Breakpoints and ownership map.
- **Provider:** `POST https://api.openai.com/v1/responses` from the SERVER ONLY. No browser copy of `OPENAI_API_KEY`. `GET /v1/models/{model}` host-only validation endpoint.
- **Billing audit:** separate SQLite table `api_usage` records request ID, timestamp, room code, outcome, model, input/output/cached tokens and estimated price. No prompts, player names, or API keys in that table.
- **Safe defaults:** cheap model allowlist; tested default gpt-4.1-mini; 500 max output tokens; one request per round; 12 requests per room; 48 requests per UTC day; estimated daily spending threshold $0.25. Not a provider-side or guaranteed spending cap; billing and pricing may differ.
- **Key handling (Windows):** existing process `OPENAI_API_KEY` or optional encrypted DPAPI file under current user's `%APPDATA%`. The ZIP, GitHub, static pages, join codes, and shared phone state contain no real key.
- **Key handling (macOS/Linux):** existing environment variable or hidden terminal prompt; no local plaintext config.
- **Security limitations:** HTTP LAN; no TLS or production security review; in-memory process lock and SQLite single process; browser room tokens stored in localStorage. Do not publish this server directly on the Internet.
- **Audits:** tests/test_game.py (4 baseline gameplay tests); tests/test_api_edition.py (3 mocked credential/generation/billing tests); all successful. No paid API calls were made during development/testing of this fork.
