$path = Join-Path $env:APPDATA 'GreenKappa Labs\AGENT_FAULT_LIVE_API\api_key.dpapi'
if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Force
    Write-Host 'The locally encrypted API credential file was deleted.' -ForegroundColor Green
} else {
    Write-Host 'No stored local API credential file was found.'
}
Write-Host 'This does NOT revoke the key on the OpenAI Platform or remove a GitHub Actions secret.'
