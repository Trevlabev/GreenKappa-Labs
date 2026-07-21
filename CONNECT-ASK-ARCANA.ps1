$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $Root "arcana-config.js"
$DefaultArcanaProject = "C:\Projects\TableArc-Arcana-Recruiter-Chatbot"
$DefaultUrlFile = Join-Path $DefaultArcanaProject "ARCANA-LIVE-URL.txt"

function Stop-WithMessage([string]$Message) {
    Write-Host ""
    Write-Host "CONNECTION STOPPED" -ForegroundColor Red
    Write-Host $Message -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
}

try {
    Clear-Host
    Write-Host "====================================================" -ForegroundColor DarkBlue
    Write-Host " CONNECT ASK ARCANA TO GREENKAPPA LABS" -ForegroundColor Blue
    Write-Host "====================================================" -ForegroundColor DarkBlue
    Write-Host ""

    $url = ""

    if (Test-Path -LiteralPath $DefaultUrlFile) {
        $url = (Get-Content -LiteralPath $DefaultUrlFile -Raw).Trim()
        Write-Host "Found Arcana's saved Netlify URL:" -ForegroundColor Green
        Write-Host $url
        $useSaved = Read-Host "Use this URL? Press Enter for Yes, or type N"
        if ($useSaved -match "^[Nn]") { $url = "" }
    }

    if ([string]::IsNullOrWhiteSpace($url)) {
        $url = Read-Host "Paste Arcana's Netlify URL"
    }

    $url = $url.Trim().TrimEnd("/")
    if ($url -notmatch "^https://[a-zA-Z0-9.-]+\.netlify\.app$") {
        throw "That does not look like a Netlify site URL. Example: https://tablearc-arcana-3400.netlify.app"
    }

    $config = @"
window.GREENKAPPA_ARCANA_CONFIG = {
  apiEndpoint: "$url/.netlify/functions/chat",
  fullGuideUrl: "$url/"
};
"@

    Set-Content -LiteralPath $ConfigPath -Value $config -Encoding UTF8

    Write-Host ""
    Write-Host "Ask Arcana is now connected to:" -ForegroundColor Green
    Write-Host $url
    Write-Host ""
    Write-Host "Commit and push the GreenKappa Labs repository to publish the change." -ForegroundColor Cyan
    Read-Host "Press Enter to close"
} catch {
    Stop-WithMessage $_.Exception.Message
}
