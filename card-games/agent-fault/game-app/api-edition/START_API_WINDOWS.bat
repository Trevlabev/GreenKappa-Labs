@echo off
cd /d "%~dp0"
title AGENT-FAULT LIVE - OpenAI API Edition
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0START_API_WINDOWS.ps1"
if errorlevel 1 (
 echo.
 echo The launcher stopped with an error. Read the message above.
 pause
)
