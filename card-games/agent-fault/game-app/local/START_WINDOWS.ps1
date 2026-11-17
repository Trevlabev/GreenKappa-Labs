# AGENT/FAULT LIVE — start the local multiplayer host (Windows PowerShell).
# Run from an ordinary user account; administrator privileges are not required.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } elseif (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { throw 'Python 3.10 or newer must be installed first.' }
Write-Host "AGENT/FAULT LIVE — Installing required Python libraries..." -ForegroundColor Cyan
& $python -m pip install --user -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed.' }
Write-Host ""
Write-Host "Host screen: http://localhost:8765" -ForegroundColor Green
Write-Host "To join on a phone: connect to the SAME trusted Wi-Fi network." -ForegroundColor Cyan
Write-Host "Find your computer's IPv4 address with: ipconfig" -ForegroundColor Yellow
Write-Host "Then open http://YOUR-COMPUTER-IP:8765 on each phone." -ForegroundColor Yellow
Write-Host "The host QR code will automatically use the address you opened the game with." -ForegroundColor Cyan
Write-Host "If Windows Firewall prompts, allow access on PRIVATE networks only." -ForegroundColor Yellow
Write-Host "Stop: Ctrl+C" -ForegroundColor Cyan
& $python -m uvicorn server:app --host 0.0.0.0 --port 8765
