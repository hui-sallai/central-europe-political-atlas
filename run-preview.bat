@echo off
setlocal
cd /d "%~dp0"
echo Starting production preview on http://localhost:3000
echo.
pnpm.cmd run preview
