# Backup und Restore (Supabase, manuell)

Stand: 2026-10-19. Das Projekt läuft auf dem Supabase Free Plan ohne Provider-Backups. Dieses Verfahren ist daher die einzige Sicherung.

## Backup erstellen

Voraussetzungen: Docker Desktop läuft, Zielmedium ist verschlüsselt (BitLocker To Go), Host und Benutzer stammen aus der Supabase-Verbindung „Session pooler“.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\backup-supabase.ps1 -DbHost "<HOST>" -DbUser "<BENUTZER>"
```

Das Passwort wird verdeckt abgefragt. Das Skript schreibt `backup-<Zeitstempel>` mit `public.sql`, `auth-data.sql`, `storage-metadata.sql`, `migrations-ledger.sql` und `SHA256SUMS.txt`.

`auth-data.sql` enthält Passwort-Hashes und MFA-Daten. Nie ins Repository legen und nur auf verschlüsselten Medien speichern.

## Nicht enthalten

- Dateiinhalte aus Supabase Storage (nur Metadaten). Der Bucket `closeflow-files` war am 2026-10-19 leer.
- Vault-/Verschlüsselungs-Rootschlüssel, Custom-Role-Passwörter, Edge-Function-Secrets, Vercel- und Stripe-Konfiguration.

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

## Offen

- Restore in ein echtes neues Supabase-Cloud-Projekt (inklusive der oben genannten Auth-Tabellen).
- Zweite Kopie an anderem Ort und fester Backup-Rhythmus.
- Bei Pro-Upgrade: Provider-Backups und Restore-Test über das Dashboard zusätzlich nutzen.
