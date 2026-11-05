# Security-Policy (CloseFlow)

Stand: 2026-11. Gilt für den Betreiber (Einzelperson, Firmengründung geplant). Offene Punkte sind als **OFFEN** markiert.

## 1. Zugriff und Berechtigungen
- Produktionszugänge: GitHub, Vercel, Supabase, Resend, Stripe, Google Cloud, Azure. Nur der Betreiber hat Zugang.
- Pflicht: Zwei-Faktor-Authentifizierung auf allen genannten Konten (Status pro Konto: Betreiber pflegt in `go-live-checklist.md`).
- Anwendungsrollen: owner, admin, member. Mandantentrennung über RLS und Workspace-Prüfungen (`npm run lint:tenancy`).
- Berechtigungs-Review: vierteljährlich. Prüfen: Workspace-Mitglieder mit Rolle admin/owner, offene Einladungen, GitHub-Kollaborateure, Vercel-/Supabase-Mitglieder.
- Offboarding: Zugang bei Vercel, Supabase, GitHub und Google sofort entziehen, danach Secrets rotieren (siehe `incident-plan.md`, Abschnitt 5).

## 2. Secrets
- Secrets liegen nur in Vercel-Umgebungsvariablen bzw. lokal in `.env.local` (nicht im Repo). GitHub Secret-Scanning und Push-Protection sind aktiv.
- Rotation: sofort bei Verdacht oder Offboarding, sonst jährlich. `CRON_SECRET` mindestens 32 Zeichen.
- Keine Secrets in Logs, Audit-Payloads (werden in `src/lib/auditLog.ts` gefiltert) oder Chats.

## 3. Logging und Aufbewahrung
- Audit-Trail (Tabelle `audit_logs`): Rollen, Einladungen, Exporte, Automationen, Integrationen, Planwechsel. Sichtbar für owner/admin unter Einstellungen → Monitoring.
- Fehler-Events: Alarm per E-Mail bei Fehlerspitze (Cron `alerts`, täglich).
- Login-Ereignisse: nur in den Supabase-Auth-Logs (Aufbewahrung durch Anbieter, Tarif-abhängig).
- **OFFEN:** definierte Aufbewahrungsfrist für `audit_logs` (Vorschlag: 12 Monate) und automatische Löschung.

## 4. Änderungen
- `main` ist per Ruleset geschützt (keine Force-Pushes, keine Löschung, Pflicht-Check CodeQL). CI (`.github/workflows/ci.yml`) prüft Typen, Tenancy, Tests, `npm audit`, Lizenzen, SBOM.
- Abhängigkeiten: Dependabot. Kritische/hohe Schwachstellen in Produktionsabhängigkeiten werden innerhalb von 7 Tagen behoben.
- Migrationen und Produktionsdeploys nur mit bewusster Freigabe des Betreibers.

## 5. Vorfälle
Siehe `incident-plan.md`. Datenschutzvorfälle: Meldung an Aufsichtsbehörde binnen 72 h (**OFFEN:** Kontakt und Verantwortliche nach Firmengründung eintragen).

## 6. Datenklassifizierung
| Klasse | Beispiele | Schutz |
|---|---|---|
| Streng vertraulich | Passwort-Hashes, API-Keys, OAuth-Tokens, Service-Role-Key | nur Server, nie im Client, nie in Logs |
| Vertraulich | Leads, Kunden, Notizen, Rechnungsdaten, E-Mail-Inhalte | RLS, TLS, Export nur owner/admin und auditiert |
| Intern | Audit-Logs, Monitoring-Daten, Nutzungszähler | Zugriff nur owner/admin |
| Öffentlich | Landing Page, Feedback-Seite | keine personenbezogenen Daten |
