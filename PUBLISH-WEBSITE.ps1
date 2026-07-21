$ErrorActionPreference = "Stop"
Set-Location -LiteralPath (Split-Path -Parent $MyInvocation.MyCommand.Path)

try {
    if (-not (Test-Path ".git")) {
        throw "This folder is not a Git repository. Copy these files into your existing GreenKappa Labs repository first."
    }

    $message = Read-Host "Commit message, or press Enter for 'Perfect GreenKappa Labs website'"
    if ([string]::IsNullOrWhiteSpace($message)) {
        $message = "Perfect GreenKappa Labs website"
    }

    git add .
    if ($LASTEXITCODE -ne 0) { throw "git add failed." }

    git commit -m $message
    if ($LASTEXITCODE -ne 0) {
        Write-Host "There may be no new changes to commit." -ForegroundColor Yellow
    }

    git push
    if ($LASTEXITCODE -ne 0) { throw "git push failed." }

    Write-Host ""
    Write-Host "Website pushed successfully." -ForegroundColor Green
    Start-Process "https://greenkappalabs.art/"
    Read-Host "Press Enter to close"
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}
