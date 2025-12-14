#!/usr/bin/env pwsh
Set-StrictMode -Version Latest
$PSScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $PSScriptRoot "..")
Write-Host "[DEV] Starting unified dev mode (Swift + Vite + Electron)"
npm run dev-native


