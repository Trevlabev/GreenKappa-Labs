@echo off
cd /d "%~dp0"
title AGENT-FAULT LIVE Local Host
where py >nul 2>nul
if %ERRORLEVEL% == 0 (
  set PYCMD=py
) else (
  set PYCMD=python
)
echo AGENT/FAULT LIVE
%PYCMD% -m pip install --user -r requirements.txt
if errorlevel 1 (
  echo Dependency installation failed. Install Python 3.10 or newer.
  pause
  exit /b 1
)
echo.
echo HOST SCREEN: http://localhost:8765
 echo PHONES: http://YOUR-PC-IP:8765 -- find IP with ipconfig
 echo Allow Windows Firewall for PRIVATE network only. Stop with Ctrl+C.
%PYCMD% -m uvicorn server:app --host 0.0.0.0 --port 8765
pause
