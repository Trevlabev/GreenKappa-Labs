# AGENT/FAULT LIVE API Edition — Windows local party host.
# Reads an existing OPENAI_API_KEY, or safely prompts for one and protects it with
# Windows DPAPI under the current user's AppData. NEVER writes a plaintext key.
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$cfgDir = Join-Path $env:APPDATA 'GreenKappa Labs\AGENT_FAULT_LIVE_API'
$cfg = Join-Path $cfgDir 'api_key.dpapi'

Write-Host 'AGENT/FAULT LIVE  /  API EDITION v0.2.0' -ForegroundColor Cyan
Write-Host 'The key is used ONLY by the local host server and never sent to the phones.' -ForegroundColor DarkGray
if (-not $env:OPENAI_API_KEY) {
    $secure = $null
    if (Test-Path -LiteralPath $cfg) {
        try {
            $secure = ConvertTo-SecureString (Get-Content -LiteralPath $cfg -Raw -ErrorAction Stop).Trim()
            Write-Host 'Loaded your Windows-protected API credential.' -ForegroundColor Green
        } catch {
            Write-Warning 'The stored credential cannot be decrypted by this Windows user. Re-enter it.'
        }
    }
    if (-not $secure) {
        Write-Host 'Paste your EXISTING OpenAI API key below. The characters will not be displayed.' -ForegroundColor Yellow
        Write-Host 'This is an API key (sk-...), NOT your ChatGPT password.' -ForegroundColor DarkGray
        $secure = Read-Host 'OpenAI API key' -AsSecureString
        if (-not $secure -or $secure.Length -lt 15) { throw 'Missing API key. Nothing was saved.' }
        New-Item -ItemType Directory -Path $cfgDir -Force | Out-Null
        $secure | ConvertFrom-SecureString | Set-Content -LiteralPath $cfg -NoNewline -Encoding ASCII
        Write-Host 'Credential saved encrypted for THIS Windows user only (DPAPI).' -ForegroundColor Green
    }
    $ptr = [IntPtr]::Zero
    try {
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
        [Environment]::SetEnvironmentVariable('OPENAI_API_KEY', $plain, 'Process')
    } finally {
        if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
        Remove-Variable plain -ErrorAction SilentlyContinue
        if ($secure) { $secure.Dispose() }
    }
} else {
    Write-Host 'Using OPENAI_API_KEY already configured in this PowerShell environment.' -ForegroundColor Green
}
if (-not $env:AGENT_FAULT_MODEL) { $env:AGENT_FAULT_MODEL = 'gpt-4.1-mini' }
if ($env:AGENT_FAULT_MODEL -notin @('gpt-4.1-mini','gpt-5-mini','gpt-4o-mini')) {
    throw 'Allowed economy models: gpt-4.1-mini, gpt-5-mini, gpt-4o-mini.'
}
$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } elseif (Get-Command python -ErrorAction SilentlyContinue) { 'python' } else { throw 'Install Python 3.10 or newer and rerun.' }
Write-Host ('AI model: ' + $env:AGENT_FAULT_MODEL) -ForegroundColor Cyan
Write-Host 'Installing/updating dependencies...' -ForegroundColor Cyan
& $python -m pip install --user -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
Write-Host ''
Write-Host 'HOST:   http://localhost:8766' -ForegroundColor Green
Write-Host 'PHONES: http://YOUR-COMPUTER-IP:8766 (same trusted private Wi-Fi)' -ForegroundColor Yellow
Write-Host 'Check the key on the lobby screen: CHECK AI CONNECTION (no generation cost).' -ForegroundColor Cyan
Write-Host 'Only the host can request paid AI generation. Max 12 calls per room, 48 per UTC day.' -ForegroundColor Cyan
Write-Host 'Firewall: PRIVATE NETWORK only. Stop with Ctrl+C.' -ForegroundColor Yellow
$env:AGENT_FAULT_DB = Join-Path $PSScriptRoot 'api_rooms.sqlite3'
& $python -m uvicorn server:app --host 0.0.0.0 --port 8766
