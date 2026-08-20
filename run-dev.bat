@echo off
setlocal
cd /d "%~dp0"
echo Starting Central Europe Political Atlas on http://localhost:3000
echo.
pnpm.cmd run dev
