@echo off
setlocal
title Preview GreenKappa Labs
cd /d "%~dp0"
start "" http://127.0.0.1:8765/
py -m http.server 8765 --bind 127.0.0.1
if errorlevel 1 python -m http.server 8765 --bind 127.0.0.1
