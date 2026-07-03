<#
.SYNOPSIS
  X1 — Free Claude Code (FCC) Proxy Launcher
.DESCRIPTION
  Starts the FCC proxy on localhost:8082.
  Auto-installs uv + Python dependencies if needed.
.NOTES
  Access: http://localhost:8082
  Admin:  http://127.0.0.1:8082/admin
#>

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$FccDir = Join-Path $ScriptDir "background\integrations\free-claude-code"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " X1 — Free Claude Code Proxy Launcher" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check uv
$uv = Get-Command "uv" -ErrorAction SilentlyContinue
if (-not $uv) {
    Write-Host "[X1] uv not found. Installing..." -ForegroundColor Yellow
    try {
        $null = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -Command irm https://astral.sh/uv/install.ps1 | iex" -Wait -NoNewWindow
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "User") + ";" + [Environment]::GetEnvironmentVariable("Path", "Machine")
    } catch {
        Write-Host "[X1] Could not install uv. Install Python + uv manually." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Install deps
Write-Host "[X1] Installing dependencies..." -ForegroundColor Green
Set-Location $FccDir
try {
    & uv sync 2>&1 | Out-Null
} catch {
    Write-Host "[X1] uv sync failed, trying pip..." -ForegroundColor Yellow
    try {
        & pip install -r requirements.txt 2>&1 | Out-Null
    } catch {
        & pip install fastapi uvicorn httpx pydantic python-dotenv tiktoken loguru aiohttp jsonschema pydantic-settings 2>&1 | Out-Null
    }
}

Write-Host ""
Write-Host "[X1] Starting FCC proxy..." -ForegroundColor Green
Write-Host "[X1] Access at: http://localhost:8082" -ForegroundColor Green
Write-Host "[X1] Admin UI: http://127.0.0.1:8082/admin" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

& uv run uvicorn server:app --host 0.0.0.0 --port 8082 --reload --timeout-graceful-shutdown 5
