#!/bin/sh
set -eu
cd "$(dirname "$0")"
python3 -m pip install -r requirements.txt
printf '\nHost: http://localhost:8765\nPhones: http://YOUR-LAN-IP:8765 (same trusted Wi-Fi)\nStop: Ctrl+C\n'
python3 -m uvicorn server:app --host 0.0.0.0 --port 8765
