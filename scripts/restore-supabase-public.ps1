#requires -Version 5.1
<#
Stellt public aus einem Backup IN DAS BESTEHENDE Supabase-Projekt zurueck (destruktiv fuer public).
Sicherheitsnetz:
  * Abbruch vor jeder Aenderung, wenn die Live-Zeilenzahlen nicht zum Backup passen.
  * Frisches Vorab-Backup (Daten + Rechte) wird neben das Backup gelegt.
  * drop schema + Restore + Rechte/Trigger/Publication laufen in EINER Transaktion; bei Fehler bleibt alles unveraendert.
  * Nach dem Commit werden Rechte und Zeilenzahlen mit dem Vorzustand verglichen.
Auth-Daten werden NICHT erneut eingespielt (bestehende Konten wuerden kollidieren).
#>
param(
    [Parameter(Mandatory)][string]$DbHost,
    [Parameter(Mandatory)][string]$DbUser,
    [Parameter(Mandatory)][string]$BackupDir,
    [string]$DbPort = '5432',
    [string]$ConfirmRef
)

$ErrorActionPreference = 'Stop'
$publicFile = Join-Path $BackupDir 'public.sql'
if (-not (Test-Path -LiteralPath $publicFile)) { throw "public.sql nicht gefunden in $BackupDir" }
if ($BackupDir -match '\s') { throw 'BackupDir darf keine Leerzeichen enthalten.' }
docker info --format '{{.ServerVersion}}' | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Docker laeuft nicht.' }

$ref = if ($DbUser -match '\.') { ($DbUser -split '\.', 2)[1] } else { $DbUser }
$answer = if ($ConfirmRef) { $ConfirmRef } else { Read-Host "Das ueberschreibt das Schema public im Projekt '$ref'. Zur Bestaetigung die Projektkennung eingeben" }
if ($answer -ne $ref) { throw 'Bestaetigung stimmt nicht. Abbruch, nichts veraendert.' }

$env:PGHOST = $DbHost; $env:PGPORT = $DbPort; $env:PGUSER = $DbUser
$env:PGDATABASE = 'postgres'
$env:PGSSLMODE = if ($DbHost -match 'host\.docker\.internal|localhost|127\.0\.0\.1') { 'disable' } else { 'require' }
$secure = $null
# Ein bereits gesetztes PGPASSWORD (nur fuer lokale Tests) wird verwendet, sonst verdeckte Abfrage.
if (-not $env:PGPASSWORD) {
    $secure = Read-Host 'Supabase-Datenbankpasswort' -AsSecureString
    $env:PGPASSWORD = [System.Net.NetworkCredential]::new('', $secure).Password
}

$envArgs = @('-e', 'PGHOST', '-e', 'PGPORT', '-e', 'PGUSER', '-e', 'PGDATABASE', '-e', 'PGPASSWORD', '-e', 'PGSSLMODE')
$dockerBase = 'docker run --rm -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD -e PGSSLMODE postgres:17'
$tmp = Join-Path $env:TEMP "cf-restore-$([guid]::NewGuid().ToString('N'))"
New-Item -ItemType Directory -Path $tmp | Out-Null

function Invoke-Sql([string]$Sql) {
    $out = $Sql | & docker run --rm -i @envArgs postgres:17 psql -At -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw 'SQL-Abfrage fehlgeschlagen.' }
    return ,@($out)
}

# Zeilenzahlen laut Backup-Datei
$inCopy = $false; $cur = ''; $fileCounts = [ordered]@{}
foreach ($l in [System.IO.File]::ReadLines($publicFile)) {
    if (-not $inCopy -and $l -match '^COPY public\.(\S+) ') { $inCopy = $true; $cur = $Matches[1] -replace '"', ''; $fileCounts[$cur] = 0; continue }
    if ($inCopy) { if ($l -eq '\.') { $inCopy = $false } else { $fileCounts[$cur]++ } }
}
$countSql = (($fileCounts.Keys | ForEach-Object { "select '$_', count(*) from public.""$_""" }) -join ' union all ') + ' order by 1'
$aclSql = @"
select 'T|'||table_name||'|'||grantee||'|'||privilege_type from information_schema.role_table_grants where table_schema='public'
union all select 'R|'||routine_name||'|'||grantee||'|'||privilege_type from information_schema.routine_privileges where routine_schema='public'
order by 1
"@

try {
    Write-Host 'Pruefe Live-Zustand gegen Backup ...'
    $live = Invoke-Sql $countSql
    $diff = @()
    foreach ($row in $live) { $n, $c = $row -split '\|'; if ([int]$c -ne $fileCounts[$n]) { $diff += "$n live=$c backup=$($fileCounts[$n])" } }
    if ($diff.Count -gt 0) { throw "Live-Daten weichen vom Backup ab, Abbruch ohne Aenderung:`n$($diff -join "`n")" }
    $aclBefore = Invoke-Sql $aclSql
    "Vorzustand: $($live.Count) Tabellen, $($aclBefore.Count) Rechte-Eintraege"

    Write-Host 'Erstelle Vorab-Backup (Daten + Rechte) ...'
    $safetyData = Join-Path $BackupDir 'pre-restore-public.sql'
    $safetyPriv = Join-Path $BackupDir 'pre-restore-privileges.sql'
    cmd /c "$dockerBase pg_dump --format=plain --no-owner --schema=public > $safetyData"
    if ($LASTEXITCODE -ne 0 -or (Get-Item -LiteralPath $safetyData).Length -eq 0) { throw 'Vorab-Backup (Daten) fehlgeschlagen.' }
    cmd /c "$dockerBase pg_dump --format=plain --no-owner --schema-only --schema=public > $safetyPriv"
    if ($LASTEXITCODE -ne 0 -or (Get-Item -LiteralPath $safetyPriv).Length -eq 0) { throw 'Vorab-Backup (Rechte) fehlgeschlagen.' }

    # Dinge ausserhalb von public, die das drop cascade mitreisst
    $trg = Invoke-Sql "select pg_get_triggerdef(t.oid)||';' from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='auth' and c.relname='users' and not t.tgisinternal and pg_get_triggerdef(t.oid) ilike '%public.%'"
    $pub = Invoke-Sql "select 'alter publication '||quote_ident(p.pubname)||' add table public.'||quote_ident(c.relname)||';' from pg_publication p join pg_publication_rel r on r.prpubid=p.oid join pg_class c on c.oid=r.prrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and p.pubname='supabase_realtime'"

    $privLines = Get-Content -LiteralPath $safetyPriv | Where-Object { $_ -match '^(GRANT|REVOKE|ALTER DEFAULT PRIVILEGES)' -and $_ -notmatch 'supabase_admin' }
    $pre = Join-Path $tmp 'pre.sql'; $post = Join-Path $tmp 'post.sql'
    @('SET client_min_messages = warning;', 'SET session_replication_role = replica;', 'DROP SCHEMA public CASCADE;') | Set-Content -LiteralPath $pre -Encoding ascii
    $postLines = @($privLines) + @($trg) + @($pub) | Where-Object { $_ }
    [System.IO.File]::WriteAllLines($post, [string[]]$postLines, (New-Object System.Text.UTF8Encoding($false)))
    "Wiederherzustellen nach dem Restore: $(@($privLines).Count) Rechte-Befehle, $(@($trg).Count) Auth-Trigger, $(@($pub).Count) Realtime-Tabellen"

    Write-Host 'Starte Restore in einer Transaktion ...'
    cmd /c "(type ""$pre"" & type ""$publicFile"" & type ""$post"") | docker run --rm -i -e PGHOST -e PGPORT -e PGUSER -e PGDATABASE -e PGPASSWORD -e PGSSLMODE postgres:17 psql -v ON_ERROR_STOP=1 --single-transaction -q -o NUL"
    if ($LASTEXITCODE -ne 0) { throw 'Restore fehlgeschlagen. Die Transaktion wurde zurueckgerollt, Produktion ist unveraendert.' }

    Write-Host 'Pruefe Ergebnis ...'
    $after = Invoke-Sql $countSql
    $bad = @()
    foreach ($row in $after) { $n, $c = $row -split '\|'; if ([int]$c -ne $fileCounts[$n]) { $bad += "$n nachher=$c backup=$($fileCounts[$n])" } }
    $aclAfter = Invoke-Sql $aclSql
    $aclDiff = Compare-Object $aclBefore $aclAfter
    "Zeilenzahlen: $($after.Count) Tabellen, Abweichungen: $($bad.Count)"
    $bad
    "Rechte vorher/nachher: $($aclBefore.Count)/$($aclAfter.Count), Unterschiede: $(@($aclDiff).Count)"
    $aclDiff | Select-Object -First 20 | ForEach-Object { "$($_.SideIndicator) $($_.InputObject)" }
    "RLS-aktiv: " + (Invoke-Sql "select count(*) filter (where c.relrowsecurity)||' von '||count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'")
    "Policies: " + (Invoke-Sql "select count(*) from pg_policies where schemaname='public'")
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    $secure = $null
    Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
