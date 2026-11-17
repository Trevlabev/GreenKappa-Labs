# AGENT/FAULT LIVE — Jackbox-style multiplayer prototype

**Status: local/LAN working prototype, not publicly hosted.** Uses the exact 66 card texts from proposed GreenKappa Labs v0.9-P. Cards remain candidate, not approved canon. The design is original; it doesn't reproduce Jackbox content.

## What works

- Host starts a game and receives a random six-character room code and QR link.
- Four to eight players join from private phones, using a nickname; no player accounts.
- Server-authoritative separate Scenario, Interference, Fault decks with exact v0.9-P texts and without-replacement hands. Four cards per player, including Judge.
- Judge rotates; only their phone sees private Fault and personality before reveal.
- All non-Judges submit one secret card; the server shuffles submissions into A–G labels.
- Host displays prompt to copy into a shared AI chat **or**, if `OPENAI_API_KEY` is configured on the server, calls the OpenAI Responses API securely.
- Fictional replies are revealed; Judge privately locks Spotlight; Judge proposes Breakpoint/Fault eligibility; every player confirms or challenges and a strict majority can approve, or host reopens scoring.
- Spotlight (+1) and one optional Derailment Bonus (+1), potentially to the same author. Validated on the server. Hand refill, subsequent rounds, scoreboards, ties, player names revealed after scoring.
- Page refresh reconnection using browser-local room tokens, persistent SQLite rooms (24-hour idle expiry), lobby removal, health checks.
- Clearly labeled *simulated demo* to inspect the sequence without real teammates.

## Run on Windows

1. Install [Python 3.10+](https://www.python.org/downloads/) with `py` available.
2. Extract the ZIP to a normal folder.
3. Right-click **START_WINDOWS.ps1** and choose **Run with PowerShell** (if script execution is blocked, open PowerShell and run `powershell -ExecutionPolicy Bypass -File .\START_WINDOWS.ps1` from the extracted folder). Alternatively use two commands:
   ```powershell
   py -m pip install --user -r requirements.txt
   py -m uvicorn server:app --host 0.0.0.0 --port 8765
   ```
4. Open `http://localhost:8765` on the computer connected to a TV/projector. Click **Host a game**.
5. For the QR code to work on phones, **open the host game via your computer's local IPv4 address** instead (e.g., `http://192.168.1.42:8765`), not `localhost`. Get the address from `ipconfig`. Allow Windows Firewall for **private networks only**. Everyone must use the same trusted Wi-Fi.
6. Players scan the QR or enter the URL and select nicknames. At least four players are needed.

## Run on macOS/Linux

Use `./START_MAC_LINUX.sh` or install the requirements and run `python3 -m uvicorn server:app --host 0.0.0.0 --port 8765`. Open the host browser on its LAN address so QR points to a reachable URL.

## AI modes

**Manual is fully playable without any subscription:** The host can copy the exact generation prompt into one external AI chat, then paste one `A:`, `B:`, etc. answer per line. The AI never scores the outcome.

**Optional automated AI (server only):** Set `OPENAI_API_KEY` in the computer's environment before launching, and optionally `AGENT_FAULT_MODEL` (default `gpt-4.1-mini`). In PowerShell: `$env:OPENAI_API_KEY = 'YOUR_SECRET'; py -m uvicorn server:app --host 0.0.0.0 --port 8765`. Don't put it in web pages, repository files or messages. Maximum 12 generation requests per room, each initiated by the host; usage is billable. No automatic calls without clicking.

## Security / hosting limits

- Rooms are short-lived and stored on the host computer (`rooms.sqlite3`). Room secrets and player session tokens are generated using cryptographic randomness. The database stores token **hashes** rather than raw tokens; browser session tokens are stored in localStorage. The host screen never gets another player's hand or hidden Fault before reveal.
- This is a **LAN prototype**, not a hardened Internet-ready service. Plain HTTP on local Wi-Fi is not encrypted; use only a **trusted private network**. For Internet/public hosting, add TLS, origin/CORS/CSRF protections, mature rate limiting, moderation and availability controls, monitoring, reverse proxy, persistence backups, and an independent security review. Do not deploy the Uvicorn development server directly on the public Internet.
- Host screen and player UI are separate. The host is not an automatic player; someone else must join and become the Judge. The host controls the TV and manual prompt entry. If hosting on a phone, share the screen, but a computer is recommended.
- There is no actual video/audio broadcast: only shared browser state. Players reconnect if they reload in the same browser profile.
- SQLite persists rooms and scores on one server; this prototype is **single-process**. Do not run multiple Uvicorn workers without replacing the store and locking design.
- The voting step is explicit each round. If a proposed qualifying Bonus receives a disputed majority rejection, the host reopens and the Judge changes the proposal; it does not silently award points.

## Automated verification

From project root: `python -m pytest -q tests/test_game.py`. Tested 4-player complete round, 8-player card allocation and private state, room/auth rejection, and strict-majority challenge/reopen logic. `node --check static/app.js` validates JS syntax.

## Tech

FastAPI/Python 3, SQLite, client-side HTML/CSS/JS, HTTP polling for roughly one-second synchronized updates (no WebSockets needed in this initial build). Self-contained source, except optional Google font CDN. The robot is an existing AGENT/FAULT project asset.

## Next milestones

1. Real four-person LAN session and usability observations.
2. Record/replay stage with sound/animation and an improved timer.
3. Independent hosted backend with secure TLS and true live Internet room joining (e.g., Supabase/Fly.io/Render), then `play.greenkappalabs.art` when hosting is verified.
4. Optional official AI provider integration and explicit cost controls, after key-storage authorization.

**Not a public production deployment or validated commercial product.**
