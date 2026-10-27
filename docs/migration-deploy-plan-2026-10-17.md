# Migrations- und Deploy-Plan (Stand 2026-10-17)

**Aktueller Status (2026-10-27): Migrationen 1-9 wurden in Production angewendet; Gesamtfreigabe bleibt NO-GO. Migration 10 (Lead-Duplikatschutz) ist in Production vorhanden (Index, Trigger, RPC identisch zur lokalen Definition, Grant nur authenticated); Schema-Health-Check am 2026-10-27: SUMMARY 0 problems. Code-Deploy und Preview-Smoke stehen noch aus.**
Die frühen Migrationen wurden manuell über die Supabase Management API angewendet, da `db push` das DB-Passwort ablehnte. Produktion hat weiterhin keinen Staging-Klon. Backup-/Restore-Tests waren am 2026-10-19 (In-Place-Restore) und 2026-10-20 (Restore in ein neues Cloud-Testprojekt) erfolgreich; vor der nächsten Produktionsmigration trotzdem ein frisches Backup erstellen und prüfen.

## 0. Voraussetzungen

- Jede Anweisung unten gegen **Staging oder einen Produktions-Klon** ausführen, bevor Produktion angefasst wird. Ein solcher Klon existiert derzeit nicht (offen).
- `supabase/config.toml`: `[db.migrations] enabled = false`, weil das Basisschema nicht versioniert ist. Für diesen Deploy nicht auf `true` setzen und `supabase db push` nicht verwenden; nur die freigegebene Migration über den etablierten manuellen Production-Migrationsweg anwenden und korrekt erfassen.
- Vor Start ein frisches Backup erstellen und Prüfsummen prüfen; das getestete Restore-Verfahren und die noch offenen physischen Backup-Aufgaben stehen in `docs/backup-restore.md`.
- Änderungen sind noch uncommittet. Erst committen, dann deployen.

## 1. Vorab-Checks in Produktion (nur lesend, SQL-Editor)

```sql
-- a) Wo liegt pgcrypto? (Legacy-Einladungsfunktionen nutzen digest())
select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pgcrypto';

-- b) Aktuelle Definition der RLS-Helper (security definer? search_path?)
select p.proname, p.prosecdef, p.proconfig from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname in ('is_workspace_member','is_workspace_manager');

-- c) Bereits vorhandene Policies auf leads / activities (Migration 193000 entfernt Altpolicies)
select tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename in ('leads','activities') order by 1,2;

-- d) Spalten, auf die die neuen Funktionen zugreifen
select table_name, column_name from information_schema.columns
where table_schema='public'
  and ((table_name in ('calendar_events','activities','tasks','leads') and column_name in ('user_id','workspace_id'))
    or (table_name='notifications' and column_name='user_id')
    or (table_name='profiles' and column_name='id'));

-- e) Rolle-Werte in workspace_members (Helper erwartet 'owner','admin','sales_manager')
select distinct role from public.workspace_members;

-- f) Legacy-Tabellen vorhanden/befüllt?
select count(*) from public.organization_invites;
select count(*) from public.organization_members;

-- g) Grobe Tabellengröße vor dem nicht-CONCURRENTLY erstellten Lead-Index
select reltuples::bigint as estimated_rows, pg_size_pretty(pg_total_relation_size('public.leads')) as total_size
from pg_class where oid = 'public.leads'::regclass;
```

Abbruchkriterien: (d) liefert nicht alle erwarteten Spalten -> `20261017230000` nicht anwenden. (e) liefert andere Rollenwerte -> `…200000` und die RLS-Policies neu bewerten. (c) zeigt Policies, auf die die App in Produktion angewiesen ist -> `…193000` neu prüfen.

## 2. Reihenfolge der Migrationen

Immer **vor** dem Code-Deploy, in dieser Reihenfolge (aufsteigende Zeitstempel):

| # | Datei | Zweck | Lokal geprüft | Rollback |
|---|-------|-------|---------------|----------|
| 1 | `20261017193000_remove_legacy_owner_only_crm_policies.sql` | Entfernt permissive Alt-Policies auf `leads`/`activities`, setzt Workspace-Policies | RLS-Matrix 76/76, Leak-Check | Policies aus Sicherung/`pg_policies`-Export wiederherstellen (Export aus 1c vorher ablegen) |
| 2 | `20261017195000_revoke_legacy_organization_invite_rpc_public_grants.sql` | Entzieht `public`/`anon` die Ausführung der Legacy-Einladungs-RPCs | Anonymer Aufruf verweigert | `grant execute … to public` (nicht empfohlen) |
| 3 | `20261017200000_workspace_rls_helpers_security_definer.sql` | Helper `SECURITY DEFINER` (behebt RLS-Rekursion) | Matrix 76/76 | Alte Funktionsdefinition aus 1b wiederherstellen |
| 4 | `20261017210000_workspace_import_lock.sql` | Tabelle `workspace_import_locks` + Lock-RPCs | Import-Suiten 4/4, 5/5, 9/9 | `drop function …; drop table public.workspace_import_locks;` (erst nach Rückbau des Codes) |
| 5 | `20261017220000_harden_accept_organization_invite.sql` | Härtet `accept_organization_invite` | 6/6 | Vorherige Funktionsdefinition aus `20260713_team_workspace.sql` neu erstellen |
| 6 | `20261017230000_delete_account_data_transactional.sql` | `delete_account_data(uuid)` | Lösch-Suite 15/15, RPC-Test 3/3 (inkl. Rollback bei erzwungenem Fehler) | `drop function public.delete_account_data(uuid);` (erst nach Rückbau des Codes) |
| 7 | `20261018000000_subscriptions_last_stripe_event.sql` | Spalte `subscriptions.last_stripe_event_at` (Webhook-Ereignisreihenfolge) | Webhook-Suite 8/8 | `alter table … drop column last_stripe_event_at` (erst nach Rückbau des Codes) |
| 8 | `20261018010000_harden_create_organization_invite.sql` | Nur Owner dürfen Owner/Admin einladen, Gültigkeit max. 30 Tage, `search_path` inkl. `extensions` | Invite-Suite 10/10 | Vorherige Funktionsdefinition aus `20260713_team_workspace.sql` neu erstellen |

| 9 | `20261018020000_atomic_crm_import_rows.sql` | Lead-/Kundenzeile und zugehörige Aktivität je Zeile atomar schreiben | Production-Migration und Live-Routentest PASS; lokaler Stack wegen Docker nicht verfügbar | Erst Code zurückrollen, dann beide Import-RPCs entfernen |
| 10 | `20261027010000_prevent_concurrent_lead_duplicates.sql` | Sperrt race-sicher exakte Lead-Dubletten; atomarer manueller Create-RPC mit explizitem Override | Lokale DB-Suite 5/5, RLS-Matrix/Leak-Check PASS, Schema-Health 0 Probleme; Production offen | Erst Code zurückrollen; danach Trigger und RPC-Funktion entfernen und Index nach Prüfung der Abhängigkeiten löschen |

Hinweise:
- Migration 1 hängt funktional von 3 ab. Bei einer Datenbank, in der die Helper noch `SECURITY INVOKER` sind, kann 1 allein RLS-Rekursion auslösen. Deshalb **1 und 3 in einer Sitzung anwenden und danach sofort Check 3a** (unten) ausführen.
- Migration 5: Falls Check 1a nicht `extensions` ergibt, `search_path` in der Funktion anpassen (z. B. `public`), sonst scheitert jede Token-Annahme.
- Migrationen 4, 6 und 7 sind rein additiv und stören den alten Code nicht. Der neue Code stört ohne sie: Import-Routen antworten 503, Kontolöschung 500, und der Stripe-Webhook antwortet bei Abo-Events mit 500 (Spalte fehlt; Stripe wiederholt, verliert aber nichts). Migration 7 also zwingend vor dem Code-Deploy.
- Migration 10 fügt keine Daten um und lässt historische Dubletten unverändert. Der Index wird nicht `CONCURRENTLY` erstellt; vor Anwendung daher Größe/geschätzte Zeilenzahl von `public.leads` prüfen und einen möglichen Schreib-Lock während des Indexaufbaus einplanen. Da kein Staging-Klon existiert, ist die Production-Anwendung bis zu einem Klon oder einer ausdrücklich freigegebenen Ausnahme blockiert. Vor einer Ausnahme ein frisches Backup erstellen und verifizieren. `supabase db push` nicht verwenden; Production-Anwendung und Code-Deploy benötigen separate ausdrückliche Freigaben.

## 3. Nach den Migrationen, vor dem Code-Deploy (Verifikation)

3a. RLS-Rekursionstest als normaler Nutzer: `select count(*) from public.leads;` mit einem echten Test-Login (nicht service role) -> kein `54001`.
3b. `tests/rls-cross-tenant-matrix.mjs` und `tests/rls-leak-check.mjs` im Produktionsmodus gegen **Staging** (nicht `*-production.mjs` ohne Freigabe).
3c. `select proname, prosecdef from pg_proc where proname in ('is_workspace_member','is_workspace_manager','delete_account_data','acquire_workspace_import_lock','accept_organization_invite');`
3d. Grants: `delete_account_data` darf nur `service_role` haben (`select grantee from information_schema.routine_privileges where routine_name='delete_account_data';`).
3e. Nach Migration 10: aktuelle `supabase/schema-health-check-compact.sql` ausführen und `SUMMARY 0 problems` erwarten; außerdem Trigger `prevent_duplicate_workspace_lead` und den Grant von `create_lead_with_duplicate_check(uuid, uuid, jsonb, boolean)` an `authenticated` verifizieren. Die lokale Route-Integration gegen Supabase REST/Auth ist noch offen und muss vor dem App-Deploy gegen Preview geprüft werden.

## 4. Code-Deploy

1. Commit der Codeänderungen (siehe `git status`), Review.
2. `npm run verify:release`, `npx tsc --noEmit`, Unit-Tests (`npm test` bzw. vorhandene Skripte).
3. Preview-Deploy, dort Smoke: Login, Lead anlegen, CSV-Import (Lead + Kunde), Export, Konto-Löschung nur mit Wegwerf-Konto (aal2).
4. Produktions-Deploy erst nach ausdrücklicher Freigabe durch dich.

## 5. Rollback-Reihenfolge

1. Code auf vorherige Version zurückrollen (Vercel Instant Rollback).
2. Danach erst Migrationen 6 und 4 zurücknehmen (nur wenn nötig, additiv, Rest kann bleiben).
3. RLS-Änderungen (1, 3) nur mit den vorab exportierten Definitionen zurücknehmen; beide zusammen.
4. Bei Datenverlust: Wiederherstellung aus dem frisch geprüften Backup gemäß `docs/backup-restore.md`.

## 6. Nach dem Deploy

- Logs 30 Minuten beobachten: `IMPORT LOCK ERROR`, 503 auf `/api/*/import`, 500 auf `/api/profile/delete`, `54001`.
- Cron-/Stripe-Webhook weiter wie in `docs/go-live-checklist.md` prüfen.

## 7. Weiterhin offen (nicht durch diesen Plan gelöst)

- Kein Staging/Klon, Schema in Produktion nicht gegengeprüft.
- Physische Backup-Aufgaben (laut Nutzer erledigt): Sticks getrennt lagern und Wiederherstellungsschlüssel separat sichern. Wöchentliches Backup samstags gegen 22:00 Uhr vereinbart; Kalendereintrag noch offen. Außerdem offen: Domain-abhängige Flows (E-Mail, OAuth, Recovery, Webhook-URL).
- Migration 8 setzt `search_path = public, extensions, pg_temp`; funktioniert für beide pgcrypto-Schemata, Check 1a bleibt trotzdem sinnvoll.
- Migration 10 ist lokal verifiziert, aber noch nicht in Production angewendet; vor dem Code-Deploy anwenden und den Schema-Health-Check bestehen lassen.
- CRM-Importe werden mit Migration 9 je Zeile atomar.
- Auth-Benutzer-Löschung bleibt ein separater Schritt nach der transaktionalen Datenbereinigung.
- Lint: 124 Warnungen (0 Fehler).
