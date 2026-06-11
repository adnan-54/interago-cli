#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root       = Split-Path -Parent $PSScriptRoot
$installDir = Join-Path $env:APPDATA "interago"

Write-Host "Building interago.exe..."
Push-Location $root
try {
    bun scripts/build.ts
    if ($LASTEXITCODE -ne 0) { throw "Build failed" }
} finally {
    Pop-Location
}

if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
    Write-Host "Created $installDir"
}

Copy-Item -Path (Join-Path $root "interago.exe") -Destination $installDir -Force
Write-Host "Copied interago.exe → $installDir"

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$entries   = $userPath -split ";" | Where-Object { $_ -ne "" }

if ($entries -notcontains $installDir) {
    $newPath = ($entries + $installDir) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $installDir to user PATH"
} else {
    Write-Host "$installDir already in PATH — skipped"
}

Write-Host ""
Write-Host "Done. Open a new terminal and run: interago"
