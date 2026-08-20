$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
$log = Join-Path (Get-Location) "dev-server.log"
$err = Join-Path (Get-Location) "dev-server.err.log"
"[$(Get-Date -Format s)] Starting Central Europe Political Atlas" | Out-File -LiteralPath $log -Encoding utf8
try {
  & pnpm.cmd run dev *>> $log
} catch {
  $_ | Out-File -LiteralPath $err -Encoding utf8
  throw
}
