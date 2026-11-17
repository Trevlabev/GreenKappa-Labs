# AGENT/FAULT LIVE — OpenAI API Edition v0.2.0

**Separate fork of the original v0.1.0 local multiplayer app.** Real 66-card v0.9-P candidate deck, no changed card wording. Runs on a computer serving host and phone controllers on a *trusted private network*. This package has no API key inside it and should never be directly hosted on the open Internet.

## First launch — Windows

1. Extract the ZIP. Install [Python 3.10+](https://www.python.org/downloads/) first, including the `py` launcher.
2. Double-click `START_API_WINDOWS.bat`. The script detects `OPENAI_API_KEY` already configured in your environment, or asks you to paste your **existing** OpenAI API key once into a hidden PowerShell prompt.
3. On first use only, the launcher stores an encrypted **Windows DPAPI** credential in `%APPDATA%\GreenKappa Labs\AGENT_FAULT_LIVE_API\api_key.dpapi`. Only the same Windows user profile can decrypt that file. The app never includes your key in the ZIP, source code, HTML, QR, database, or git commits.
4. Open `http://localhost:8766` in your browser. To let phones join, reopen using your computer's local IPv4 address instead of localhost: `http://YOUR-PC-IP:8766`. Phones and host must use the same trusted Wi-Fi. Allow Windows Firewall on **Private** networks only.
5. Create a room. Click **CHECK AI CONNECTION** in the host lobby; this verifies your key/model access using the models API, without requesting generation. It is not a free quota guarantee.
6. Join 4–8 players, start, then at the generation phase click **GENERATE ALL ANSWERS WITH MY API**. One Responses API request handles all anonymous players' replies. Model replies replace manual pasting. The judge still decides eligibility and awards.

To choose another supported model before starting:
```powershell
$env:AGENT_FAULT_MODEL='gpt-5-mini'
.\START_API_WINDOWS.ps1
```
The default `gpt-4.1-mini` preserves prior benchmark behavior. Supported alternatives: `gpt-5-mini` and `gpt-4o-mini` (available models can change).

To remove the encrypted local credential, right-click `RESET_SAVED_KEY_WINDOWS.ps1` → Run with PowerShell. This removes *local storage only*: revoke the API key separately in your OpenAI Platform settings if desired. Never paste API keys in a chat message or store them in a public GitHub repository.

## macOS / Linux

`bash ./START_API_MAC_LINUX.sh`. If `OPENAI_API_KEY` is already exported in the shell, the launcher uses it; otherwise it requests a hidden key each launch and does not save it to disk. Host at port 8766.

## Billing and safety

- **Generation is billable.** Nothing is automatically charged on startup, lobby join, connection test, or manual mode. A request is made only when the room host clicks Generate.
- Single inference request per round, including all submitted candidates, capped at 500 output tokens; 12 calls per room; 48 requests in a UTC day across all rooms on this server. The request-counter limit is strict, but the **$0.25/day estimated threshold is not a provider spending cap**: costs can differ, run higher, or have delays, and the final bill is authoritative.
- The server records model, input/output/cache token counts, estimated model charge, success/failure and time in its own `api_rooms.sqlite3`, with *no keys, prompts, responses, or player identities* in the API-usage table. The game room does store its normal card state and generated text locally.
- Example: 599 input and 277 output tokens on `gpt-4.1-mini` cost `(599×$0.40 + 277×$1.60) ÷ 1,000,000 ≈ $0.000683`, excluding any discounts, credits and taxes.
- For safety, auto-generation rejects unknown models rather than permitting a costly model. Pricing used for estimate is documented in `API_PRICING.md` and may change.
- A call may be billable even if parsing fails or the provider later reports an error; request count is incremented before the HTTP request, and unknown-cost errors are not assumed free.
- Manual copy/paste remains available as a fallback if the model omits letters or the API is unavailable. Responses displayed in the game are truncated to 30 words, consistent with v0.9-P.

## Public hosting limitations

This runs on unencrypted **HTTP** on the home LAN; host session tokens live in browser storage, and the server has a single-process SQLite store. Do not expose it to the Internet or open a router port. No API key is ever sent to player phones, but local HTTP traffic can be observed on untrusted networks. A real internet game would require HTTPS, authentication/rate hardening, hosted persistence, monitoring and separate deployment.

## Verification

Run `python -m pytest -q tests/test_game.py tests/test_api_edition.py` and `node --check static/app.js`. Tests use a fake API client and test-only dummy key, **not your paid OpenAI account**. A live model test occurs only after you configure a key and click Generate.

## Provenance

- Fork from AGENT/FAULT LIVE v0.1.0 local prototype.
- Cards are unchanged v0.9-P **proposed** 24 Scenario / 36 Interference / 6 Fault.
- API Edition version v0.2.0. The local prototype and original print assets remain separate.
