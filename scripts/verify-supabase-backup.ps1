#requires -Version 5.1
param(
    [Parameter(Mandatory)][string]$BackupDir
)

$ErrorActionPreference = 'Stop'
if (-not (Test-Path -LiteralPath $BackupDir -PathType Container)) {
    throw "Backup-Ordner nicht gefunden: $BackupDir"
}

$requiredFiles = @(
    'public.sql',
    'auth-data.sql',
    'storage-metadata.sql',
    'migrations-ledger.sql'
)
$manifestPath = Join-Path $BackupDir 'SHA256SUMS.txt'
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "SHA256SUMS.txt nicht gefunden in $BackupDir"
}

$expectedHashes = @{}
foreach ($line in [System.IO.File]::ReadLines($manifestPath)) {
    if ($line -notmatch '^([0-9a-fA-F]{64})  ([^\\/:]+)$') {
        throw "Ungueltige Zeile im SHA256SUMS.txt: $line"
    }
    $name = $Matches[2]
    if ($expectedHashes.ContainsKey($name)) {
        throw "Doppelter Dateieintrag im SHA256SUMS.txt: $name"
    }
    $expectedHashes[$name] = $Matches[1].ToLowerInvariant()
}

foreach ($name in $requiredFiles) {
    if (-not $expectedHashes.ContainsKey($name)) {
        throw "Datei fehlt im SHA256SUMS.txt: $name"
    }

    $path = Join-Path $BackupDir $name
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
        throw "Backup-Datei fehlt: $name"
    }
    if ((Get-Item -LiteralPath $path).Length -eq 0) {
        throw "Backup-Datei ist leer: $name"
    }

    $actualHash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualHash -ne $expectedHashes[$name]) {
        throw "SHA-256 stimmt nicht ueberein: $name"
    }
    Write-Host "OK  $name"
}

if ($expectedHashes.Count -ne $requiredFiles.Count) {
    throw 'SHA256SUMS.txt enthaelt unerwartete oder fehlende Eintraege.'
}

Write-Host "Backup-Pruefung erfolgreich: $BackupDir"
