# Backup und Restore (Supabase, manuell)

Stand: 2026-10-19. Das Projekt läuft auf dem Supabase Free Plan ohne Provider-Backups. Dieses Verfahren ist daher die einzige Sicherung.

## Backup erstellen

Voraussetzungen: Docker Desktop läuft, Zielmedium ist verschlüsselt (BitLocker To Go), Host und Benutzer stammen aus der Supabase-Verbindung „Session pooler“.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-supabase.ps1 -DbHost "<HOST>" -DbUser "<BENUTZER>"
```

Das Passwort wird verdeckt abgefragt. Das Skript schreibt `backup-<Zeitstempel>` mit `public.sql`, `public-privileges.sql` (Schema mit Rechten, für den Restore), `auth-data.sql`, `storage-metadata.sql`, `migrations-ledger.sql` und `SHA256SUMS.txt`.

`auth-data.sql` enthält Passwort-Hashes und MFA-Daten. Nie ins Repository legen und nur auf verschlüsselten Medien speichern.

Nach jedem Lauf (und nach jedem Kopieren auf ein weiteres Medium) Prüfsummen und Vollständigkeit kontrollieren:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\verify-supabase-backup.ps1 -BackupDir "F:\CloseFlow-Backups\backup-<Zeitstempel>"
```

## Regelmäßiger Ablauf

Der vereinbarte Rhythmus ist wöchentlich sowie zusätzlich vor Datenbankmigrationen oder geplanten Restore-Arbeiten:

1. Docker Desktop starten und das verschlüsselte USB-Laufwerk anschließen/entsperren.
2. Das Backup-Skript mit dem aktuellen Session-Pooler-Host und -Benutzer ausführen.
3. Prüfen, dass der Lauf erfolgreich war; anschließend das Prüfsummen-Skript auf dem neuen Backup-Ordner ausführen.
4. Eine zweite Kopie auf ein separates, verschlüsseltes Medium an einem anderen Ort kopieren und dort ebenfalls das Prüfsummen-Skript ausführen.
5. Die zweite Kopie und der wöchentliche Rhythmus sind noch nicht eingerichtet. Für die Auth-Daten keine unverschlüsselte Cloud-Kopie verwenden.

## Nicht enthalten / harte Grenzen

- Dateiinhalte aus Supabase Storage (nur Metadaten). Der Bucket `closeflow-files` war am 2026-10-19 leer.
- Vault-/Verschlüsselungs-Rootschlüssel, Custom-Role-Passwörter, Edge-Function-Secrets, Vercel- und Stripe-Konfiguration.
- Das Backup-Skript bricht ab, wenn Storage-Dateien vorhanden sind, damit kein unvollständiges Backup als erfolgreich erscheint. In dem Fall müssen die Dateiinhalte separat gesichert werden, bevor ein vollständiges Backup möglich ist.

## Restore (getestet gegen lokalen Supabase-Stack)

1. Neues Supabase-Projekt oder lokalen Stack bereitstellen. Auth-Schema muss mindestens so neu sein wie das der Quelle (siehe Befund unten).
2. `drop schema public cascade;` (der Dump legt `public` selbst an).
3. `auth-data.sql` mit `SET session_replication_role = replica;` voranstellen und per `psql` einspielen.
4. `public.sql` ebenso, mit `--single-transaction -v ON_ERROR_STOP=1`.
5. Migrations-Ledger bei Bedarf aus `migrations-ledger.sql` einspielen.
6. Zeilenzahlen je Tabelle mit den `COPY`-Blöcken der Datei vergleichen.

## Testergebnis 2026-10-19

- `public.sql`: 37 Tabellen, 5.061 Zeilen, 84 Policies, RLS auf allen 37 Tabellen; Restore ohne Fehler, keine Zeilenabweichung.
- `auth-data.sql`: 3 Nutzer, Identitäten und MFA-Faktor wiederhergestellt; keine verwaisten Verweise von `workspace_members` und `workspaces` auf `auth.users`.
- Befund: Das lokale Auth-Image war älter als die Produktion. `mfa_recovery_code_sets`, `mfa_recovery_codes`, `scim_tokens`, `scim_users` und die Spalte `one_time_tokens.expires_at` fehlten dort, die Daten dieser Tabellen wurden beim Test nicht eingespielt. Das ist ein Versionsunterschied der Testumgebung, kein Backup-Fehler, wurde aber nicht gegen ein neues Supabase-Cloud-Projekt geprüft.

## In-Place-Restore von `public` (scripts/restore-supabase-public.ps1)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-supabase-public.ps1 -DbHost "<HOST>" -DbUser "postgres.<REF>" -BackupDir "F:\CloseFlow-Backups\backup-<timestamp>"
```

- Bricht ab, wenn die Live-Zeilenzahlen vom Backup abweichen; erstellt vorher Sicherheits-Dumps (`pre-restore-*.sql`).
- Restore läuft in einer Transaktion (Fehler = Rollback). Auth-Daten werden nicht erneut eingespielt.
- Wichtig: Der Dump nutzt `--no-privileges`. Nach `DROP SCHEMA public CASCADE` fehlen alle Grants; das Skript stellt sie aus einem Schema-Dump mit Rechten wieder her und vergleicht sie danach.
- Dry-Run lokal: 37 Tabellen, 0 Zeilenabweichungen, Rechte 1149/1149 identisch, RLS 37/37, 84 Policies.
- Production-Lauf 2026-10-19 (Backup `backup-20261019-203016`, Free-Plan): 37 Tabellen, 0 Zeilenabweichungen, Rechte 1096/1096 identisch, RLS 37/37, 84 Policies. Danach: `/api/health` 200, `/login` 200, `/api/leads` ohne Session 401, PostgREST mit Publishable Key liefert `[]` (RLS greift, keine Permission-Fehler). Nicht erneut getestet: Login mit echtem Konto und authentifizierte Lead-Liste.

## Restore in ein neues, leeres Projekt (scripts/restore-supabase-fresh.ps1)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\restore-supabase-fresh.ps1 -DbHost "<HOST>" -DbUser "postgres.<TEST-REF>" -BackupDir "<Laufwerk>:\CloseFlow-Backups\backup-<timestamp>" [-PrivilegesFile "<Datei>"] [-ShowPassword]
```

- Lehnt Production und nicht-leere Ziele ab, spielt auth-Daten und public je in einer Transaktion ein, danach Vergleich der Zeilenzahlen.
- Tabellenrechte kommen aus `public-privileges.sql` (neue Backups ab 2026-10-20). Für ältere Backups per `-PrivilegesFile` angeben; `-GrantsOnly` wendet nur die Rechte an.
- Testlauf 2026-10-20 (Backup `backup-20261020-132228`, neues leeres Free-Projekt, Region eu-central-1): auth 26 Tabellen/212 Zeilen und public 37 Tabellen/5.061 Zeilen, jeweils 0 Abweichungen; RLS 37/37; 84 Policies; 0 verwaiste Verweise. Rechte-Einträge 1096 (identisch zu Production), erst nach Anwendung der Rechte-Datei. Ohne sie waren es 305, weil der Dump mit `--no-privileges` erstellt wird.
- Die MFA-Recovery- und SCIM-Tabellen aus dem Auth-Befund wurden hier erstmals gegen ein echtes Cloud-Projekt wiederhergestellt (alle 26 auth-Tabellen ohne Abweichung).
- Nicht getestet: Login mit einem wiederhergestellten Konto, App gegen das Testprojekt, Migrations-Ledger.

## Offen

- Zweite Kopie an anderem Ort; der wöchentliche Rhythmus ist vereinbart, aber noch nicht als wiederkehrender Ablauf eingerichtet.
- Bei Pro-Upgrade: Provider-Backups und Restore-Test über das Dashboard zusätzlich nutzen.
