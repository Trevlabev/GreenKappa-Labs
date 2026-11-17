#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
echo 'AGENT/FAULT LIVE API Edition (macOS / Linux)'
if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo 'Enter your existing OpenAI API key. Hidden input; not stored on disk.'
  read -r -s -p 'API key: ' OPENAI_API_KEY
  echo
  export OPENAI_API_KEY
fi
if [[ -z "${OPENAI_API_KEY:-}" ]]; then echo 'No API key provided.'; exit 1; fi
export AGENT_FAULT_MODEL="${AGENT_FAULT_MODEL:-gpt-4.1-mini}"
case "$AGENT_FAULT_MODEL" in gpt-4.1-mini|gpt-5-mini|gpt-4o-mini) ;; *) echo 'Unsupported economy model';exit 1;; esac
export AGENT_FAULT_DB="${AGENT_FAULT_DB:-$PWD/api_rooms.sqlite3}"
python3 -m pip install -r requirements.txt
printf 'Host: http://localhost:8766 | Phone: http://YOUR-LAN-IP:8766\n'
python3 -m uvicorn server:app --host 0.0.0.0 --port 8766
