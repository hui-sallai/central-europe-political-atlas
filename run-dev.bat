@echo off
setlocal
cd /d "%~dp0"
set "PATH=C:\Users\crcrc\scoop\apps\nodejs-lts\current\bin;C:\Users\crcrc\scoop\apps\nodejs-lts\current;C:\Users\crcrc\scoop\persist\nodejs-lts\bin;%PATH%"
echo Starting Central Europe Political Atlas on http://localhost:3000
echo.
"C:\Users\crcrc\scoop\apps\nodejs-lts\current\node.exe" ".\node_modules\next\dist\bin\next" dev --webpack -p 3000
