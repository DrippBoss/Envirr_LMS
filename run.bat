@echo off
REM ── Envirr LMS — double-click launcher (Windows) ──────────────────────────
REM Runs the PowerShell one-click runner with the right execution policy.
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run.ps1" %*
echo.
pause
