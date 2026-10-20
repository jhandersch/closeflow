#requires -Version 5.1
<#
Logischer Supabase-Backup nach USB/Zielordner (Docker + postgres:17 erforderlich).
Sichert: public (Schema+Daten), auth (nur Daten), storage-Metadaten, supabase_migrations.
Nicht enthalten: Dateiinhalte aus Storage (nur Metadaten) und Vault-/Root-Schluessel.
Das Passwort wird verdeckt abgefragt und nie als Argument uebergeben.
#>
param(
    [Parameter(Mandatory)][string]$DbHost,
    [Parameter(Mandatory)][string]$DbUser,
    [string]$DbPort = '5432',
    [string]$OutDir = 'F:\CloseFlow-Backups'
)

$ErrorActionPreference = 'Stop'
if ($OutDir -match '\s') { throw 'OutDir darf keine Leerzeichen enthalten.' }
if (-not (Test-Path -LiteralPath $OutDir)) { throw "Zielordner nicht gefunden: $OutDir" }
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker laeuft nicht.' }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$runDir = Join-Path $OutDir "backup-$stamp"
New-Item -ItemType Directory -Path $runDir | Out-Null

$env:PGHOST = $DbHost
$env:PGPORT = $DbPort
$env:PGUSER = $DbUser
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE = 'require'
$secure = Read-Host 'Supabase-Datenbankpasswort' -AsSecureString
$env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password

$dockerBase = 'docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD -e PGSSLMODE postgres:17'

# Ausgabe per cmd-Umleitung, weil Docker-Bind-Mounts auf dieses USB-Laufwerk nicht zuverlaessig schreiben und PowerShell-Umleitung UTF-16 erzeugt.
function Invoke-Dump([string]$Name, [string]$DumpArgs) {
    $file = Join-Path $runDir $Name
    cmd /c "$dockerBase pg_dump $DumpArgs > $file"
    if ($LASTEXITCODE -ne 0) { throw "Export fehlgeschlagen: $Name" }
    if ((Get-Item -LiteralPath $file).Length -eq 0) { throw "Export ist leer: $Name" }
    "{0,-28} {1,12:N0} Bytes" -f $Name, (Get-Item -LiteralPath $file).Length
}

try {
    $objects = cmd /c "$dockerBase psql -Atc ""select count(*) from storage.objects"""
    if ($LASTEXITCODE -ne 0) { throw 'Storage-Zaehlung fehlgeschlagen.' }
    if ([int]$objects -gt 0) {
        throw "Storage enthaelt $objects Dateien. Die Dateiinhalte werden von diesem Skript nicht gesichert; Backup abgebrochen."
    }

    Invoke-Dump 'public.sql' '--format=plain --no-owner --no-privileges --schema=public'
    Invoke-Dump 'auth-data.sql' '--format=plain --data-only --no-owner --no-privileges --schema=auth --exclude-table=auth.schema_migrations'
    Invoke-Dump 'storage-metadata.sql' '--format=plain --data-only --no-owner --no-privileges --schema=storage --exclude-table=storage.migrations'
    Invoke-Dump 'migrations-ledger.sql' '--format=plain --no-owner --no-privileges --schema=supabase_migrations'
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $secure = $null
}

$manifest = Get-ChildItem -LiteralPath $runDir -File | ForEach-Object {
    "{0}  {1}" -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower(), $_.Name
}
$manifest | Set-Content -LiteralPath (Join-Path $runDir 'SHA256SUMS.txt') -Encoding ascii
Write-Host "Fertig: $runDir"
$manifest
