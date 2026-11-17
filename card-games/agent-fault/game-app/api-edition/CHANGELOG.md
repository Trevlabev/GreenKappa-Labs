# AGENT/FAULT LIVE API Edition v0.2.0

- Duplicated independent v0.1.0 LAN party game. Original version remains unchanged.
- OpenAI API generation is the primary host action; manual paste retained as fallback.
- Windows launcher prompts for an existing key once, saves with user-scoped Windows DPAPI, never ships plaintext credential. macOS/Linux launcher reads environment/hidden prompt without persistence.
- New host-only key/model connection check (GET /v1/models/{model}, no inference request).
- Safe fixed cheap-model allowlist; default gpt-4.1-mini for compatibility with initial real model benchmarks.
- Server-side daily request count, per-room call cap, estimated daily cost threshold and SQLite usage audit from API token usage. Estimates are not a hard billing cap.
- Separate port 8766 and database api_rooms.sqlite3 to avoid affecting the original version.
- Added mock-API test; no live API calls made during package build.
