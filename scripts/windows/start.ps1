[CmdletBinding()]
param(
    [switch]$Production,
    [ValidateRange(1, 65535)]
    [int]$Port = 3000,
    [ValidateNotNullOrEmpty()]
    [string]$HostName = "127.0.0.1"
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
Set-Location -LiteralPath $repoRoot

foreach ($envFileName in @(".env", ".env.local")) {
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot $envFileName) -PathType Leaf)) {
        throw "Missing $envFileName. Extract the complete private Windows demo package or run .\scripts\windows\setup.ps1 first."
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $repoRoot "node_modules\next\package.json") -PathType Leaf)) {
    throw "Dependencies are not installed. Run .\scripts\windows\setup.ps1 first."
}

$scriptName = "dev"
if ($Production) {
    $scriptName = "start"
    if (-not (Test-Path -LiteralPath (Join-Path $repoRoot ".next") -PathType Container)) {
        throw "No production build was found. Run npm run build before using -Production."
    }
}

$displayHost = $HostName
if ($HostName -eq "0.0.0.0") {
    $displayHost = "localhost"
}

Write-Host "Starting Next.js $scriptName at http://${displayHost}:$Port"
Write-Host "Press Ctrl+C to stop the server."

$arguments = @("run", $scriptName, "--", "--hostname", $HostName, "--port", $Port.ToString())
& npm.cmd @arguments
$exitCode = $LASTEXITCODE
if ($exitCode -ne 0) {
    Write-Error "npm run $scriptName stopped with exit code $exitCode."
    exit $exitCode
}
