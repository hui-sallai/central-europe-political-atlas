$ErrorActionPreference = "Stop"
Set-Location -LiteralPath "C:\Users\crcrc\Documents\Codex\2026-05-27\new-chat-2\central-europe-political-atlas"
$env:Path = "C:\Users\crcrc\scoop\apps\nodejs-lts\current\bin;C:\Users\crcrc\scoop\apps\nodejs-lts\current;C:\Users\crcrc\scoop\persist\nodejs-lts\bin;$env:Path"
$log = Join-Path (Get-Location) "dev-server.log"
$err = Join-Path (Get-Location) "dev-server.err.log"
"[$(Get-Date -Format s)] Starting Central Europe Political Atlas" | Out-File -LiteralPath $log -Encoding utf8
try {
  & "C:\Users\crcrc\scoop\apps\nodejs-lts\current\node.exe" ".\node_modules\next\dist\bin\next" dev --webpack -p 3000 *>> $log
} catch {
  $_ | Out-File -LiteralPath $err -Encoding utf8
  throw
}
