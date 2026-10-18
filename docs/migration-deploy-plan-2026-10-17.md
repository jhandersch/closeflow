# Migrations- und Deploy-Plan (Stand 2026-10-17)

**Aktueller Status (2026-10-18): Migrationen 1-9 wurden in Production angewendet und in `schema_migrations` erfasst; Gesamtfreigabe bleibt NO-GO.**
Die frühen Migrationen wurden manuell über die Supabase Management API angewendet, da `db push` das DB-Passwort ablehnte. Produktion hat weiterhin weder einen Staging-Klon noch einen geprüften Backup-/Restore-Pfad.

## 0. Voraussetzungen

- Jede Anweisung unten gegen **Staging oder einen Produktions-Klon** ausführen, bevor Produktion angefasst wird. Ein solcher Klon existiert derzeit nicht (offen).
- `supabase/config.toml`: `[db.migrations] enabled = false` ist nur für den lokalen Test. Vor jedem `supabase db push` auf `true` setzen oder die Datei nicht verwenden.
- Backup vor Start (Backup/Restore selbst ist noch ungetestet, USB-Stick-abhängig). Ohne geprüftes Backup nicht fortfahren.
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

Hinweise:
- Migration 1 hängt funktional von 3 ab. Bei einer Datenbank, in der die Helper noch `SECURITY INVOKER` sind, kann 1 allein RLS-Rekursion auslösen. Deshalb **1 und 3 in einer Sitzung anwenden und danach sofort Check 3a** (unten) ausführen.
- Migration 5: Falls Check 1a nicht `extensions` ergibt, `search_path` in der Funktion anpassen (z. B. `public`), sonst scheitert jede Token-Annahme.
- Migrationen 4, 6 und 7 sind rein additiv und stören den alten Code nicht. Der neue Code stört ohne sie: Import-Routen antworten 503, Kontolöschung 500, und der Stripe-Webhook antwortet bei Abo-Events mit 500 (Spalte fehlt; Stripe wiederholt, verliert aber nichts). Migration 7 also zwingend vor dem Code-Deploy.

## 3. Nach den Migrationen, vor dem Code-Deploy (Verifikation)

3a. RLS-Rekursionstest als normaler Nutzer: `select count(*) from public.leads;` mit einem echten Test-Login (nicht service role) -> kein `54001`.
3b. `tests/rls-cross-tenant-matrix.mjs` und `tests/rls-leak-check.mjs` im Produktionsmodus gegen **Staging** (nicht `*-production.mjs` ohne Freigabe).
3c. `select proname, prosecdef from pg_proc where proname in ('is_workspace_member','is_workspace_manager','delete_account_data','acquire_workspace_import_lock','accept_organization_invite');`
3d. Grants: `delete_account_data` darf nur `service_role` haben (`select grantee from information_schema.routine_privileges where routine_name='delete_account_data';`).

## 4. Code-Deploy

1. Commit der Codeänderungen (siehe `git status`), Review.
2. `npm run verify:release`, `npx tsc --noEmit`, Unit-Tests (`npm test` bzw. vorhandene Skripte).
3. Preview-Deploy, dort Smoke: Login, Lead anlegen, CSV-Import (Lead + Kunde), Export, Konto-Löschung nur mit Wegwerf-Konto (aal2).
4. Produktions-Deploy erst nach ausdrücklicher Freigabe durch dich.

## 5. Rollback-Reihenfolge

1. Code auf vorherige Version zurückrollen (Vercel Instant Rollback).
2. Danach erst Migrationen 6 und 4 zurücknehmen (nur wenn nötig, additiv, Rest kann bleiben).
3. RLS-Änderungen (1, 3) nur mit den vorab exportierten Definitionen zurücknehmen; beide zusammen.
4. Bei Datenverlust: Wiederherstellung aus Backup (Restore-Test steht aus).

## 6. Nach dem Deploy

- Logs 30 Minuten beobachten: `IMPORT LOCK ERROR`, 503 auf `/api/*/import`, 500 auf `/api/profile/delete`, `54001`.
- Cron-/Stripe-Webhook weiter wie in `docs/go-live-checklist.md` prüfen.

## 7. Weiterhin offen (nicht durch diesen Plan gelöst)

- Kein Staging/Klon, Schema in Produktion nicht gegengeprüft.
- Backup/Restore (USB-Stick), Domain-abhängige Flows (E-Mail, OAuth, Recovery, Webhook-URL).
- Migration 8 setzt `search_path = public, extensions, pg_temp`; funktioniert für beide pgcrypto-Schemata, Check 1a bleibt trotzdem sinnvoll.
- Imports verhindern Duplikate entsprechend ihren bestehenden Regeln; manuelle exakte Lead-Dubletten erhalten eine Warnung, werden aber erlaubt. Gleichzeitige Import-/Create-Anfragen können die Warnung umgehen, da kein globaler Unique-Key besteht.
- CRM-Importe werden mit Migration 9 je Zeile atomar.
- Auth-Benutzer-Löschung bleibt ein separater Schritt nach der transaktionalen Datenbereinigung.
- Lint: 124 Warnungen (0 Fehler).
