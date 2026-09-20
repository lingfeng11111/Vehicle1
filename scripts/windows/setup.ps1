[CmdletBinding()]
param(
    [switch]$SeedDemo
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $repoRoot

function Assert-Command {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$InstallHint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Command '$Name' was not found. $InstallHint"
    }
}

function Invoke-Npm {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    Write-Host ("> npm " + ($Arguments -join " "))
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
    }
}

Assert-Command -Name "node" -InstallHint "Install Node.js 20.9 or newer from https://nodejs.org/ and reopen PowerShell."
Assert-Command -Name "npm" -InstallHint "npm is included with Node.js; reinstall Node.js 20.9 or newer and reopen PowerShell."

$nodeVersionText = (& node --version).Trim()
if ($LASTEXITCODE -ne 0) {
    throw "Unable to read the installed Node.js version."
}

$nodeVersionMatch = [regex]::Match($nodeVersionText, "^v(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)")
if (-not $nodeVersionMatch.Success) {
    throw "Unable to parse the installed Node.js version: $nodeVersionText"
}

$nodeMajor = [int]$nodeVersionMatch.Groups["major"].Value
$nodeMinor = [int]$nodeVersionMatch.Groups["minor"].Value
if (($nodeMajor -lt 20) -or (($nodeMajor -eq 20) -and ($nodeMinor -lt 9))) {
    throw "Vehicle requires Node.js 20.9 or newer; found $nodeVersionText."
}

$envPath = Join-Path $repoRoot ".env"
$envExamplePath = Join-Path $repoRoot ".env.example"
if (-not (Test-Path -LiteralPath $envExamplePath -PathType Leaf)) {
    throw "Required configuration template is missing: .env.example"
}
if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
    Copy-Item -LiteralPath $envExamplePath -Destination $envPath
    Write-Host "Created local .env from .env.example. Add any private API keys to .env.local."
}

$databasePath = Join-Path $repoRoot "prisma\dev.db"
if (-not (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
    throw "Required competition demo database is missing: prisma/dev.db"
}

Write-Host "Using the local .env and competition database. .env.local is optional and remains local."
Write-Host "Installing the exact package-lock.json dependency tree..."
Invoke-Npm -Arguments @("ci")
Invoke-Npm -Arguments @("run", "db:generate")

if ($SeedDemo) {
    Write-Warning "-SeedDemo resets the supplied local demo database and restores the fixed seed data. Do not use it for data that must be kept."
    $previousRustLog = [Environment]::GetEnvironmentVariable("RUST_LOG", "Process")
    try {
        # Prisma's SQLite schema engine is more diagnosable on this project with info logging.
        $env:RUST_LOG = "info"
        Invoke-Npm -Arguments @("run", "demo:reset")
    } finally {
        if ($null -eq $previousRustLog) {
            Remove-Item Env:RUST_LOG -ErrorAction SilentlyContinue
        } else {
            $env:RUST_LOG = $previousRustLog
        }
    }
}

Write-Host "Windows demo setup completed without changing the supplied database. Start with .\scripts\windows\start.ps1"
