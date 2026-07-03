@echo off
title X1 — FCC Proxy
echo ========================================
echo  X1 — Free Claude Code Proxy Launcher
echo ========================================
echo.
echo Starting FCC proxy on http://localhost:8082
echo.

cd /d "%~dp0background\integrations\free-claude-code"

where uv >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X1] uv not found. Installing...
    powershell -Command "irm https://astral.sh/uv/install.ps1 | iex"
    if %ERRORLEVEL% neq 0 (
        echo [X1] Could not install uv. Install Python + uv manually.
        pause
        exit /b 1
    )
)

echo [X1] Installing dependencies...
call uv sync 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X1] uv sync failed, trying pip...
    pip install -r requirements.txt 2>nul
    if %ERRORLEVEL% neq 0 (
        pip install fastapi uvicorn httpx pydantic python-dotenv tiktoken loguru aiohttp jsonschema pydantic-settings
    )
)

echo.
echo [X1] Starting FCC proxy...
echo [X1] Access at: http://localhost:8082
echo [X1] Admin UI: http://127.0.0.1:8082/admin
echo.
echo Press Ctrl+C to stop
echo ========================================
echo.

uv run uvicorn server:app --host 0.0.0.0 --port 8082 --reload --timeout-graceful-shutdown 5

pause
