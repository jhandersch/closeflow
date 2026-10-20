#requires -Version 5.1
<#
Restore-Test: spielt auth-Daten und public aus einem Backup in ein NEUES, LEERES Supabase-Projekt ein.
Schutz:
  * Das Production-Projekt wird hart abgelehnt.
  * Abbruch, wenn das Ziel nicht leer ist (auth.users oder Tabellen in public vorhanden).
  * Projektkennung muss zur Bestaetigung eingetippt werden.
  * auth und public laufen je in einer Transaktion (Fehler = Rollback).
  * Danach Vergleich der Zeilenzahlen je Tabelle mit den COPY-Bloecken der Backup-Dateien.
Die Rechte (GRANT/ALTER DEFAULT PRIVILEGES) von public werden vor dem Schema-Drop aus dem Ziel gelesen und danach wieder gesetzt.
Der Migrations-Ledger wird nicht eingespielt.
#>
param(
    [Parameter(Mandatory)][string]$DbHost,
    [Parameter(Mandatory)][string]$DbUser,
    [Parameter(Mandatory)][string]$BackupDir,
    [string]$DbPort = '5432',
    [string]$PrivilegesFile,
    [switch]$GrantsOnly,
    [switch]$ShowPassword
)

$ErrorActionPreference = 'Stop'
$productionRef = 'itqzelpofshmzeajvmma'
$publicFile = Join-Path $BackupDir 'public.sql'
$authFile = Join-Path $BackupDir 'auth-data.sql'
if ($BackupDir -match '\s') { throw 'BackupDir darf keine Leerzeichen enthalten.' }
if (-not $PrivilegesFile) { $PrivilegesFile = Join-Path $BackupDir 'public-privileges.sql' }
foreach ($f in $publicFile, $authFile, $PrivilegesFile) { if (-not (Test-Path -LiteralPath $f)) { throw "Datei nicht gefunden: $f (Rechte-Datei: -PrivilegesFile angeben)" } }
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker laeuft nicht.' }

if ($DbUser -notmatch '^postgres\.[a-z0-9]+$') { throw 'DbUser muss die Form postgres.<PROJEKTKENNUNG> haben (Session pooler).' }
$ref = ($DbUser -split '\.', 2)[1]
if ($ref -eq $productionRef -or $DbUser -match $productionRef -or $DbHost -match $productionRef) {
    throw 'Das ist das Production-Projekt. Dieses Skript ist nur fuer ein neues, leeres Testprojekt. Abbruch.'
}
$answer = Read-Host "Das ueberschreibt public im Projekt '$ref'. Zur Bestaetigung die Projektkennung eingeben"
if ($answer -ne $ref) { throw 'Bestaetigung stimmt nicht. Abbruch, nichts veraendert.' }

$env:PGHOST = $DbHost; $env:PGPORT = $DbPort; $env:PGUSER = $DbUser
$env:PGDATABASE = 'postgres'; $env:PGSSLMODE = 'require'
$secure = $null
if ($ShowPassword) {
    $plain = Read-Host 'Datenbankpasswort des TESTprojekts (sichtbar)'
} else {
    $secure = Read-Host 'Datenbankpasswort des TESTprojekts' -AsSecureString
    $plain = [System.Net.NetworkCredential]::new('', $secure).Password
}
$env:PGPASSWORD = $plain.Trim()
$plain = $null

$envArgs = @('-e', 'PGHOST', '-e', 'PGPORT', '-e', 'PGUSER', '-e', 'PGDATABASE', '-e', 'PGPASSWORD', '-e', 'PGSSLMODE')
$dockerBase = 'docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD -e PGSSLMODE postgres:17'
$tmp = Join-Path $env:TEMP "cf-fresh-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tmp | Out-Null

function Invoke-Sql([string]$Sql) {
    $out = $Sql | & docker run --rm -i @envArgs postgres:17 psql -At -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw 'SQL-Abfrage fehlgeschlagen.' }
    return ,@($out)
}

function Get-CopyCounts([string]$File) {
    $inCopy = $false; $cur = ''; $counts = [ordered]@{}
    foreach ($l in [System.IO.File]::ReadLines($File)) {
        if (-not $inCopy -and $l -match '^COPY (\S+) ') { $inCopy = $true; $cur = $Matches[1]; $counts[$cur] = 0; continue }
        if ($inCopy) { if ($l -eq '\.') { $inCopy = $false } else { $counts[$cur]++ } }
    }
    return $counts
}

function Compare-Counts($Expected, [string]$Label) {
    $sql = (($Expected.Keys | ForEach-Object { "select '$_', count(*) from $_" }) -join ' union all ') + ' order by 1'
    $bad = @(); $rows = 0
    foreach ($row in (Invoke-Sql $sql)) {
        $n, $c = $row -split '\|'
        $rows += [int]$c
        if ([int]$c -ne $Expected[$n]) { $bad += "$n ist=$c backup=$($Expected[$n])" }
    }
    "$Label`: $($Expected.Count) Tabellen, $rows Zeilen, Abweichungen: $($bad.Count)"
    $bad
}

function Invoke-Restore([string[]]$Files) {
    $parts = ($Files | ForEach-Object { "type ""$_""" }) -join ' & '
    cmd /c "($parts) | docker run --rm -i -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD -e PGSSLMODE postgres:17 psql -v ON_ERROR_STOP=1 --single-transaction -q -o NUL"
    return $LASTEXITCODE
}

try {
    Write-Host 'Pruefe, ob das Ziel leer ist ...'
    $users = [int](Invoke-Sql 'select count(*) from auth.users')[0]
    $tables = [int](Invoke-Sql "select count(*) from pg_tables where schemaname='public'")[0]
    if (-not $GrantsOnly -and ($users -ne 0 -or $tables -ne 0)) { throw "Ziel ist nicht leer (auth.users=$users, public-Tabellen=$tables). Abbruch, nichts veraendert." }

    $authCounts = Get-CopyCounts $authFile
    $publicCounts = Get-CopyCounts $publicFile
    "Backup: auth $($authCounts.Count) Tabellen, public $($publicCounts.Count) Tabellen"

    # Rechte stammen aus der Sicherung (public-privileges.sql), nicht aus den Standardrechten des Ziels
    $privLines = Get-Content -LiteralPath $PrivilegesFile | Where-Object { $_ -match '^(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES)' -and $_ -notmatch 'supabase_admin' }
    if (@($privLines).Count -eq 0) { throw 'Rechte-Datei enthaelt keine GRANT/REVOKE-Befehle.' }

    $pre = Join-Path $tmp 'pre.sql'; $post = Join-Path $tmp 'post.sql'
    @('SET client_min_messages = warning;', 'SET session_replication_role = replica;') | Set-Content -LiteralPath $pre -Encoding ascii
    $dropPre = Join-Path $tmp 'drop.sql'
    @('SET client_min_messages = warning;', 'SET session_replication_role = replica;', 'DROP SCHEMA public CASCADE;') | Set-Content -LiteralPath $dropPre -Encoding ascii
    [System.IO.File]::WriteAllLines($post, [string[]]@($privLines), (New-Object System.Text.UTF8Encoding($false)))

    if ($GrantsOnly) {
        Write-Host "Wende nur Rechte an ($(@($privLines).Count) Befehle) ..."
        if ((Invoke-Restore @($post)) -ne 0) { throw 'Rechte konnten nicht angewendet werden (zurueckgerollt).' }
    } else {
        Write-Host 'Spiele auth-Daten ein ...'
        if ((Invoke-Restore @($pre, $authFile)) -ne 0) { throw 'auth-Restore fehlgeschlagen (zurueckgerollt).' }
        Write-Host 'Spiele public ein ...'
        if ((Invoke-Restore @($dropPre, $publicFile, $post)) -ne 0) { throw 'public-Restore fehlgeschlagen (zurueckgerollt).' }
    }

    Write-Host 'Pruefe Ergebnis ...'
    Compare-Counts $authCounts 'auth'
    Compare-Counts $publicCounts 'public'
    "RLS-aktiv: " + (Invoke-Sql "select count(*) filter (where c.relrowsecurity)||' von '||count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'")
    "Policies: " + (Invoke-Sql "select count(*) from pg_policies where schemaname='public'")
    "Rechte-Eintraege public: " + (Invoke-Sql "select (select count(*) from information_schema.role_table_grants where table_schema='public')+(select count(*) from information_schema.routine_privileges where routine_schema='public')")
    "Waisen workspace_members -> auth.users: " + (Invoke-Sql 'select count(*) from public.workspace_members m where not exists (select 1 from auth.users u where u.id=m.user_id)')
    "anon darf public.leads lesen: " + (Invoke-Sql "select has_table_privilege('anon','public.leads','select')")
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $secure = $null
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
