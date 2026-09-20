[CmdletBinding()]
param(
    [string]$Destination
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
$prismaRoot = Join-Path $repoRoot "prisma"
$envPath = Join-Path $repoRoot ".env"
Set-Location -LiteralPath $repoRoot

function Get-ConfiguredValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
    if (-not [string]::IsNullOrWhiteSpace($processValue)) {
        return $processValue.Trim()
    }

    if (-not (Test-Path -LiteralPath $envPath -PathType Leaf)) {
        return $null
    }

    foreach ($line in Get-Content -LiteralPath $envPath) {
        if ($line -match "^\s*(?:export\s+)?$Name\s*=\s*(.*)\s*$") {
            $value = $Matches[1].Trim()
            if ($value.Length -ge 2) {
                $first = $value.Substring(0, 1)
                $last = $value.Substring($value.Length - 1, 1)
                if ((($first -eq '"') -and ($last -eq '"')) -or (($first -eq "'") -and ($last -eq "'"))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
            }
            return $value
        }
    }

    return $null
}

$databaseUrl = Get-ConfiguredValue -Name "DATABASE_URL"
if ([string]::IsNullOrWhiteSpace($databaseUrl)) {
    throw "DATABASE_URL was not found in the process environment or .env."
}

$databaseUrl = $databaseUrl.Trim()
if (-not $databaseUrl.StartsWith("file:", [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "This backup helper only supports SQLite file: URLs."
}

$rawDatabasePath = $databaseUrl.Substring(5)
if ([string]::IsNullOrWhiteSpace($rawDatabasePath) -or ($rawDatabasePath -match "[?#]")) {
    throw "DATABASE_URL must contain a plain SQLite file path without query parameters or fragments."
}

try {
    $rawDatabasePath = [Uri]::UnescapeDataString($rawDatabasePath)
} catch {
    throw "DATABASE_URL contains an invalid escaped path."
}

$candidateDatabasePath = $rawDatabasePath
if (-not [System.IO.Path]::IsPathRooted($candidateDatabasePath)) {
    # Prisma resolves relative SQLite URLs from the directory containing schema.prisma.
    $candidateDatabasePath = Join-Path $prismaRoot $candidateDatabasePath
}

$databasePath = [System.IO.Path]::GetFullPath($candidateDatabasePath)
if (-not (Test-Path -LiteralPath $databasePath -PathType Leaf)) {
    throw "SQLite database was not found at $databasePath."
}

if ([string]::IsNullOrWhiteSpace($Destination)) {
    $repoParent = Split-Path -Parent $repoRoot
    $repoName = Split-Path -Leaf $repoRoot
    $backupDirectory = Join-Path $repoParent ("{0}-db-backups" -f $repoName)
    $backupName = "{0}.backup-{1}" -f [System.IO.Path]::GetFileName($databasePath), (Get-Date -Format "yyyyMMdd-HHmmssfff")
    $backupPath = Join-Path $backupDirectory $backupName
} elseif ([System.IO.Path]::IsPathRooted($Destination)) {
    $backupPath = $Destination
} else {
    $backupPath = Join-Path $repoRoot $Destination
}

$backupPath = [System.IO.Path]::GetFullPath($backupPath)
if ([string]::Equals($databasePath, $backupPath, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Backup destination must be different from the source database."
}

$backupParent = Split-Path -Parent $backupPath
if (-not (Test-Path -LiteralPath $backupParent -PathType Container)) {
    New-Item -ItemType Directory -Path $backupParent -Force | Out-Null
}

$sidecarSuffixes = @("-wal", "-shm", "-journal")
$sidecars = @(
    foreach ($suffix in $sidecarSuffixes) {
        $sidecarPath = $databasePath + $suffix
        if (Test-Path -LiteralPath $sidecarPath -PathType Leaf) {
            $sidecarPath
        }
    }
)

Write-Host "Copying SQLite database to $backupPath"
Write-Host "Stop the application before backup when possible."
if ($sidecars.Count -gt 0) {
    Write-Warning "SQLite companion files were found; copying them with the database."
}

Copy-Item -LiteralPath $databasePath -Destination $backupPath -Force
foreach ($sidecarPath in $sidecars) {
    $suffix = $sidecar.Substring($databasePath.Length)
    Copy-Item -LiteralPath $sidecar -Destination ($backupPath + $suffix) -Force
}

$hash = (Get-FileHash -LiteralPath $backupPath -Algorithm SHA256).Hash
Write-Host "Backup created: $backupPath"
Write-Host "SHA256: $hash"
