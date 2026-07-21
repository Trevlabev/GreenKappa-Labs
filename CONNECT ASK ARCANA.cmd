@echo off
title Connect Ask Arcana to GreenKappa Labs
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0CONNECT-ASK-ARCANA.ps1"
exit /b %errorlevel%
