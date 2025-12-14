#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
Write-Host "[DEV:STOP] Stopping previous dev processes..."

Function Kill-ByName([string]$pattern) {
  try {
    Get-Process | Where-Object { $_.ProcessName -match $pattern } | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-Host "[DEV:STOP] Stopped $pattern"
  } catch { }
}

Kill-ByName "electron"
Kill-ByName "node" # for vite/nodemon
Kill-ByName "CRMNativeHost"

Write-Host "[DEV:STOP] Done."












