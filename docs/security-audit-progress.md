# Fortschritt: ChatGPT-Sicherheitsumsetzungshandbuch

Stand: 2026-11-12. Original: [`security-audit-handbook.md`](./security-audit-handbook.md), exakt übernommener Text mit 1.057 Zeilen. Die Statusangaben unten bewerten den Abgleich dieses Handbuchs, nicht die separate 182-Punkte-Checkliste. Ein Kapitel gilt nur dann als abgeschlossen, wenn alle darin genannten Kontrollen belegt sind; ein Code-Review allein ist keine Produktionsabnahme.

## Kapitelstatus

| Teil | Bereich | Status | Bisheriger Abgleich und offene Punkte |
|---|---|---|---|
| 1 | Sicherheitsarchitektur und Bedrohungsmodell | 🟡 Repository-Abgleich abgeschlossen; externe Abnahme offen | 13 Datenflüsse, 13 Vertrauensgrenzen, Datenklassen, Secrets-Namen, 72 API-Routen, Admin-Zugänge und THR-001–014 dokumentiert: [`security-architecture-inventory.md`](./security-architecture-inventory.md). Supabase-Projekt `closeflow` bestätigt `eu-central-1`; in der Auth-Konsole sind E-Mail-Bestätigung sowie Google- und Azure-Provider aktiviert. 0 Edge Functions und die übrigen Supabase-Einstellungen müssen noch separat verifiziert werden. Resend bestätigt verifizierte Domain in Ireland und keine Webhooks. Avatar-URL-Ausleitung im Repository blockiert; Deployment und Netzwerktest fehlen. Vercel-Projekt-Datenfreigabe für KI-Modelltraining deaktiviert, gespeichert und nach Reload geprüft; Teamoption unverändert. Stripe-Sandbox/Testansicht geöffnet; Produktionskonto nicht verifiziert. Google Cloud zeigt OAuth extern/„In Produktion“, 1/100 Nutzer und zwei Webclients, aber keine registrierten sensiblen/eingeschränkten Scopes; Integrations-Client und Callback sind bestätigt, produktive Zuordnung und Einwilligung offen. Azure-Ressource `closeflow-openai-de` ist im Tenant sichtbar, aktiv, vom Typ OpenAI, im Resource Group `closeflow-rg`, in `Germany West Central` und im Tarif `Standard`; die Konsole weist `gpt-4.1-mini` als Global Standard aus. Globale Inferenz und ihre Datenschutzfolgen sowie die produktive Endpoint-/Deployment-Zuordnung müssen weiterhin entschieden bzw. verifiziert werden. Vercel-Funktionsregion/Logs, frühere KI-Empfänger/Retention, Azure-/SMTP-Aufbewahrung und Stripe-Live-Konfiguration bleiben offen. |
| 2 | Identität und Authentifizierung | 🟡 Teilweise | Authentifizierungswege und API-Auth stichprobenartig geprüft; lokaler hCaptcha-Login und lokale Registrierung bis zur Onboarding-Session im isolierten Supabase-Stack getestet. Passwort-Reset und Magic-Link-Zustellung wurden lokal mit synthetischem `.invalid`-Konto und manuell gelöstem hCaptcha bestätigt; beide E-Mails wurden von Mailpit abgefangen. Der frische Magic-Link wurde am 2026-11-17 über den lokalen Auth-Callback geöffnet und führte zur aktiven Onboarding-Seite. Für den Passwort-Reset ist zusätzlich der lokale Recovery-Token registriert. Am 2026-11-17 wurde lokal mit hCaptcha-Test-Sitekey/Test-Secret geprüft: ungültiger Token wurde HTTP 400/`invalid-input-response` abgewiesen, gültiger Test-Token lieferte HTTP 200 und eine lokale Recovery-Mail. Die Test-Konfiguration wurde danach wieder deaktiviert; MFA/E-Mail-Bestätigung, Passkey-Entscheidung und vollständige Anbieter-Abnahme bleiben offen. |
| 3 | Workspace-Isolation und Multi-Tenant-Sicherheit | 🟡 Weit fortgeschritten | RLS- und `SECURITY DEFINER`-Review, lokale RLS-Matrix und Produktionsmatrix durchgeführt. Viewer-RPC-Lücke und `lead_automations`-Workspace-Policy behoben; die zurückgerollte Produktionsmatrix hatte danach 0 FAIL. Am 2026-11-18 wurde Migration `20261118120000_enforce_viewer_read_only_contract.sql` lokal angewandt und die komplette RLS-Matrix sowie der Leak-Check bestanden. Am 2026-11-19 wurde der Produktions-Migrationsverlauf mit dem Live-Schema abgeglichen: 17 bereits vorhandene Migrationseffekte im Ledger nachgetragen und die zwei fehlenden Sicherheitsmigrationen mit Supabase CLI angewandt; alle lokalen Migrationen sind nun im Remote-Ledger verzeichnet. Der Read-only-Katalogcheck bestätigte die MFA-Consume- und E-Mail-Bestätigungs-Guards. Am 2026-11-21 wurden nach Wiederherstellung von Docker/Supabase die lokalen Migrationen `20261027030000_harden_workspace_management_rls.sql` und `20261027020000_restrict_privileged_workspace_invites.sql` abgeglichen. RLS-Matrix, Leak-Check, Rollen-/Workspace-Switching-, Invite-, Lösch- und Onboarding-Integrationen bestanden lokal. Eine neue Produktions-RLS-Negativmatrix wurde nicht ausgeführt; Produktions- und externe Abnahme bleiben offen. |
| 4 | Next.js 16 und Anwendungssicherheit | 🟡 Weit fortgeschritten | Security-Header, CSRF/SSRF, Request-Limits, Open-Redirect-Fix, Client/Server-Secrets und Nonce-CSP geprüft. Öffentliche Seiten unter CSP lokal getestet; eingeloggte Seiten auf Vercel fehlen. Cache-Sicherheit ist nicht vollständig überprüft. |
| 5 | API- und Webhook-Sicherheit | 🟡 Weit fortgeschritten | Authentifizierung für 72 API-Routen statisch geprüft; Stripe-Signatur und Webhook-Verhalten geprüft; signierte Feedback-Links laufen nach 30 Tagen ab; Fehler-/CSRF-/SSRF-Kontrollen sowie lokale Schema-/Missbrauchsverträge bestanden. Verteilte Live-Rate-Limit-Prüfung, DAST und externe Abnahme aller Routen bleiben offen. |
| 6 | KI-Sicherheit mit Azure OpenAI | 🟡 Code-Prüfung abgeschlossen, Abnahme offen | Gemeinsamer Prompt-Guard, Workspace-Lead-Prüfung, Datenminimierung, Request-/Token-Limits und Telemetrie verbessert; `test:ai-cost` 21/21, `test:ai-routes` 10/10, Typecheck, Lint, GitHub-CI und CodeQL erfolgreich. Live-Red-Team, Azure-Datenschutz-/Region-/Aufbewahrungsprüfung und vollständige Ausgabevalidierung offen. Details: [`ai-security-review.md`](./ai-security-review.md). |
| 7 | Stripe, Google OAuth und Resend | 🟡 Teilweise | Google-Token-Verschlüsselung, OAuth-State und Widerruf geprüft; fehlender Widerruf bei Kontolöschung behoben. Im Google-Cloud-Projekt `closeflow-503114` sind zwei Web-OAuth-Clients und die produktive Callback-URI sichtbar; Gmail API und Google Calendar API sind aktiviert. Resend-Templates geprüft. Lokale Stripe-, Google-Integrations-, Billing-, CSP-, CSRF- und Cron-Contracts bestanden (15/15). Google-Verifizierungsstatus, beantragte Scope-Klassifizierung, Stripe-Live-Konfiguration, Resend-Absender-Domain im Live-Betrieb und Provider-Retentions-/Log-Nachweise bleiben offen. |
| 8 | Infrastruktur und Lieferkette | 🟡 Teilweise | GitHub Actions CI, CodeQL, Dependabot, SBOM und Lizenzprüfung vorhanden; CI und CodeQL für den KI-Sicherheitscommit erfolgreich. Am 2026-11-21 wurden die in Workflows verwendeten Actions auf unveränderliche Commit-SHAs gepinnt und ein eigener Contract-Test ergänzt. Audit-Log-Oberfläche und bekannte Ereignis-/Payload-Bezeichnungen sind lokalisiert und mit Tests abgesichert. Der Security-Upgrade von Next 16.4.1 auf 16.4.6 wurde zunächst in separater Worktree validiert und anschließend in den Haupt-Checkout übernommen. `npm run verify:release` besteht; `npm run lint` endet mit 0 Fehlern und 127 Warnungen. `npm audit` meldet nach kompatiblen TypeScript-ESLint-/minimatch-Updates 0 Schwachstellen. Anbieter-Tarife, Firewall/DDoS, vollständige Secret-/Zugriffsverwaltung und Betriebsparameter nicht vollständig unabhängig bestätigt. |
| 9 | Datenschutz und organisatorische Sicherheit | ⏳ Offen / P0 | Die Datenschutzerklärung enthält noch Platzhalter für Firma, Anschrift und Datenschutzkontakt und bezeichnet die Fertigstellung selbst als vor Produktivfreigabe erforderlich. Es fehlen belastbare Betreiberangaben, AVVs/Unterauftragsverarbeiter, Verarbeitungsverzeichnis, TOM-/DSFA-Entscheidungen, Verantwortliche und das übergreifende Löschkonzept. Die Aufbewahrung von `audit_logs` wurde auf 12 Monate festgelegt und die technische, begrenzte Bereinigung vorbereitet; produktiver Rollout und Prüfung bleiben offen. Keine gesetzlichen Angaben wurden erfunden; produktive Nutzung bleibt gesperrt. |
| 10 | Backup, Monitoring und Notfallmanagement | 🟡 Teilweise | DR-/Incident-Dokumentation, Health-Checks, Alerting und ein aktueller transaktionaler lokaler `public`-Restore (33 Tabellen, 0 Abweichungen, Rechte identisch, RLS 33/33) vorhanden. Eine 12-monatige Audit-Log-Aufbewahrung mit begrenzter täglicher Bereinigung ist implementiert; die Produktionsmigration wurde am 2026-11-21 angewandt und read-only verifiziert (0 abgelaufene Zeilen, 0 gelöschte Zeilen im Funktionstest, Ausführung nur für `service_role`). Der Vercel-Cron wird mit dem Code-Deployment aktiviert; erster Lauf und Alarmzustellung sind offen. Provider-Backups/PITR, externe/verschlüsselte Kopien und zeitgemessener Produktions-Restore sind nicht vollständig abgenommen. |
| 11 | Finale Go-live-Abnahme | ⏳ Offen / NO-GO | Die Produktionsfreigabe bleibt NO-GO: rechtliche und organisatorische P0-Punkte, Live-/Provider-Tests, Produktions-Rollout der Viewer-Migration sowie Betriebs-/Sign-off-Nachweise fehlen. Wartungsmodus bleibt aktiv; Schlüsselrotation bleibt bis zur abgeschlossenen Freigabevorbereitung am Ende. |

## Zusammenfassung

- **Kein seriöser Prozentwert:** Die 11 Teile enthalten unterschiedlich viele und unterschiedlich gewichtige Kontrollen. „5 von 11“ würde fälschlich suggerieren, ganze Kapitel seien abgeschlossen.
- **Tief technisch bearbeitet:** Teile 3 bis 7, aber in keinem davon sind alle Abnahmepunkte bereits geschlossen.
- **Teil 6:** Code-Härtung und automatisierte Prüfungen sind erledigt; der echte Modell-/Azure- und Datenschutznachweis fehlt.
- **Go-live:** Nicht freigegeben. Teil 9 und 11 sind ausdrücklich offen; Teil 1 ist repo-seitig abgeglichen, die externe Produktionsabnahme fehlt. Teile 2, 8 und 10 bleiben teilweise geprüft.

Die Originaldatei ist unverändert. Dieses Dokument ist der Statusbegleiter und wird nach weiteren Prüfungen aktualisiert.

## Abgleich mit dem Security Masterplan

Stand: 2026-11-09. Die nachfolgende Einordnung bezieht sich auf die zusätzlich bereitgestellte
„vollständige Security- und Penetrationstest-Checkliste“. Ein grüner Repository-Test ersetzt
keine Prüfung der Live-Konfiguration, keine Datenschutzfreigabe und keinen unabhängigen
Penetrationstest.

### Aktuell reproduzierbar nachgewiesene Repository-Kontrollen

| Bereich | Nachweis | Ergebnis |
|---|---|---|
| Workspace-Tenancy | `npm run lint:tenancy` | Bestanden |
| CSP, CSRF und sichere Redirects | `npm run test:csrf` | 9/9 bestanden |
| Workspace-Auth und Rollenauflösung | `npm run test:workspace-auth` | 2/2 bestanden |
| Workspace-Kapazitätsgrenzen | `npm run test:workspace-capacity` | 4/4 bestanden |
| KI-Route-Auth, Quoten, Telemetrie und Prompt-Schutzvertrag | `npm run test:ai-routes` und `npm run test:ai-cost` | 10/10 bzw. 25/25 bestanden |
| OAuth-/Google-Integration und Token-Kryptografie | `npm run test:integrations` | 6/6 bestanden |
| API-Request-Limits | `npm run test:input-limits` | 3/3 bestanden |
| Workflow-Idempotenz und Automation-Deduplizierung | `npm run test:workflow-automations` | 5/5 bestanden |
| Workspace-Usage-Quoten und idempotente Reservierung | `npm run test:usage-quota` | 6/6 bestanden |
| Release-Gate | `npm run verify:release` | Tenancy-Guard und Production Build bestanden |
| CI-Grundschutz | `.github/workflows/ci.yml`, `.github/workflows/codeql.yml` | Typecheck, Tenancy-Guard, Sicherheits-Tests, Audit, SBOM, Lizenzprüfung und CodeQL konfiguriert |
| MFA-Recovery-Code-Verbrauch | `npm run test:mfa-recovery` plus atomisches Supabase-RPC | 2/2 bestanden; Migration muss noch in jeder Zielumgebung angewendet und live getestet werden |
| Session-Widerruf nach Passwortänderung | `npm run test:auth-session-security` | 2/2 bestanden; globale Sessions werden nach erfolgreicher Passwortänderung beendet |
| Fehlerantworten bei Invite-Akzeptanz | `npm run test:security-error-contract` | 1/1 bestanden; unerwartete Exception-Texte werden nicht an Clients zurückgegeben |
| Inaktivitäts-Session-Timeout | `npm run test:session-timeout` | 1/1 bestanden; authentifizierte Dashboard-Sessions werden nach 30 Minuten Inaktivität lokal abgemeldet |
| E-Mail-Bestätigung bei Invite-Annahme | `npm run test:invite-email-confirmation` | 1/1 bestanden; der atomare Invite-RPC verlangt bestätigte E-Mail, bindet den Invite an die Account-Adresse und löscht ihn nach Annahme |
| Rate-Limit-Ausfallverhalten | `npm run test:rate-limit-fail-closed` | 1/1 bestanden; in Produktion werden Requests bei nicht verfügbarem gemeinsamem Rate-Limiter blockiert statt durch einen lokalen Fallback unlimitiert weiterzulaufen |
| Kritische Billing-/Account-Mutationen | `npm run test:critical-rate-limit-coverage` | 1/1 bestanden; Account-Löschung und Stripe-Planänderung besitzen serverseitige Rate-Limits, Billing-DB-Fehler werden generisch beantwortet |
| JSON-Schema-Grundprüfung kritischer Writes | `npm run test:request-schema-contract` | 1/1 bestanden; Profil- und Workspace-Management-Routen akzeptieren nur JSON-Objekte und weisen ungültige Payloads mit 400 zurück |
| Feldvalidierung kritischer Writes | `npm run test:field-validation-contract` | UUIDs, Invite-E-Mail-Adressen und Profilfeld-Längen werden serverseitig begrenzt |
| Onboarding-, Lead- und Import-Payloads | `npm run test:write-route-validation-contract` | JSON-Objekte, Onboarding-Feldlängen und CSV-Größe (max. 5 MiB) werden serverseitig validiert |
| Kalender-, Automations-, Billing- und Datei-Payloads | `npm run test:remaining-write-validation-contract` | Kalender- und Automationsfelder, Stripe-Plan, Datei-Workspace und Dateipfad werden serverseitig begrenzt |
| Abuse-Limits für Kalender und Automationen | `npm run test:write-abuse-limit-contract` | Kalenderänderungen und Automationsmutationen sind pro Benutzer serverseitig rate-limited |
| Privilegierte Workspace-Mutationen | `npm run test:privileged-workspace-abuse-contract` | Workspace-Löschung, Invite-Widerruf, Rollenänderung, Mitgliederentfernung und Event-Restore besitzen Rate-Limits und UUID-Guards |
| Audit-Log-Zugriff | `npm run test:audit-log-access-contract` | Owner/Admin-Zugriff bleibt workspace-begrenzt, Ergebnisse sind auf 200 Einträge begrenzt und Abfragen rate-limited |
| Cron-Authentifizierung | `npm run test:cron-auth-contract` | Alert-, Automation- und Notification-Crons fail-closed bei fehlendem Secret und verwenden length-geprüften `timingSafeEqual`-Vergleich |
| Export-Fehlerverträge | `npm run test:export-error-contract` | Fallback-Datenbankfehler beim Lead-Export werden geloggt, aber nicht an Clients zurückgegeben |
| Backup-/Restore-Skript-Schutz | `npm run test:backup-restore-safety-contract` | Backup-Prüfsummen, Storage-Abbruch, Passwortbereinigung, Production-Sperre, Leerzielprüfung und Pre-Restore-Sicherungsdump sind statisch abgesichert |
| API-Auth-Oberflächenvertrag | `npm run test:api-auth-surface-contract` | Jede API-Route hat einen expliziten Auth-Marker oder ist als bewusst öffentliche/signaturgeschützte Sonderroute klassifiziert |
| Monitoring-Fehlerroute | `npm run test:monitoring-error-contract` | Fehler-POSTs akzeptieren nur Objekt-Payloads mit begrenzten Typen; Monitoring-Reads und -Writes sind rate-limited |
| Integrations-/Demo-/Feedback-Abuse-Schutz | `npm run test:integration-abuse-contract` | Demo-Seeding, Google-Kalenderimport und authentifizierte Feedback-Abfragen sind serverseitig rate-limited; Demo-Payloads werden als JSON-Objekt validiert |
| Verbleibende Mutations-Abuse-Kontrollen | `npm run test:remaining-mutation-abuse-contract` | Google-Widerruf, Papierkorb-Leerung und Avatar-Änderung sind rate-limited; Recovery-Verifikation und Avatar-Änderung validieren Objekt-Payloads |
| Activity-Schreibschutz | `npm run test:activity-abuse-contract` | Activity-Erstellungen sind pro Benutzer rate-limited und akzeptieren nur Objekt-Payloads; Metadaten-Arrays werden verworfen |
| Billing-/OAuth-Integrationsschutz | `npm run test:billing-integration-security-contract` | Stripe-Portal und Google-OAuth-Verbindungen sind rate-limited; Stripe-Datenbankfehler werden generisch beantwortet |
| Profil-/Onboarding-/Invite-Abuse-Schutz | `npm run test:profile-onboarding-invite-abuse-contract` | Onboarding, Profiländerungen, Präferenzen und Invite-Annahme sind pro Benutzer serverseitig rate-limited |
| KI-Ausgabevalidierung | `npm run test:ai-output-validation-contract` | Priority-Analysis, Priority-AI, Follow-up-E-Mail, Lead-Memory, Activity-Analysis, Meeting-Prep, Chat, Sales-Copilot und Lead-Follow-up akzeptieren nur begrenzte Ergebnisobjekte und fail-closed bei ungültigem Modell-Output |
| Vollständige lokale API-Security-Contracts | `node --test tests/*contract.test.mjs` | 44 Tests in 31 Contract-Dateien bestanden; umfasst Auth-Surface, Request-/Feldvalidierung, Rate-Limits, Abuse-Schutz, Fehlerleaks, KI-Ausgaben, Exporte, Dateien, Kalender, Workspaces, Health und Cron |
| Lead-Analyse-/Berechnungs-Endpunkte | `npm run test:lead-analysis-security-contract` | Lead-Analyse gibt keine internen Exception-Texte aus; Analyse, Next-Action und Score sind gegen wiederholte Requests rate-limited |
| Benachrichtigungs-/Usage-Reads | `npm run test:notifications-usage-security-contract` | Notifications gibt keine internen Exception-Texte aus; Benachrichtigungs- und Usage-Reads sind rate-limited |
| Datenintensive und privilegierte Reads | `npm run test:data-read-abuse-contract` | Search ist auf 100 Treffer je Abfrage begrenzt; Forecast, Workspaces und Platform-Admin-Reads sind rate-limited |
| Exporte und Dateien | `npm run test:export-file-security-contract` | Lead-/Customer-Exporte und Datei-Reads/-Deletes sind rate-limited; Datei-Uploads bleiben auf 20 MiB begrenzt |
| Kalender-, Automations- und Mitglieder-Reads | `npm run test:calendar-workspace-security-contract` | Kalender- und Automations-Reads sind rate-limited; Workspace-Members validiert die UUID und begrenzt Requests |
| Allgemeine Reads und OAuth-Callback | `npm run test:general-api-read-security-contract` | Leads-, Activity- und Permissions-Reads sowie der Google-OAuth-Callback sind rate-limited |
| Verbleibende KI-/Lead-E-Mail-Eingaben | `npm run test:remaining-ai-input-security-contract` | AI-Insight, AI-Lead-Score, E-Mail-Generator und Lead-E-Mail validieren JSON-Objekte, Eingaben bzw. Ausgabegrenzen und Rate-Limits |
| Health-/Cron-Sonderrouten | `npm run test:health-cron-security-contract` | Öffentliche Health-Pings sind IP-rate-limited; Alerts, Automations und Notifications verlangen weiterhin constant-time geprüfte Cron-Secret-Autorisierung |
| AI-Chat-/Lead-Follow-up-Eingaben | `npm run test:ai-chat-followup-input-contract` | AI-Chat und Lead-Follow-up akzeptieren nur JSON-Objekte, validieren IDs und parsen Provider-Output typisiert |
| Supabase Storage-/Realtime-Repositoryvertrag | `npm run test:supabase-storage-realtime-contract` | Storage-Bucket privat und auf 20 MiB begrenzt; Ordnerzugriff nur für authentifizierte Workspace-Mitglieder; lokale API-/Realtime-/Storage-Limits statisch geprüft |
| Supabase-RLS-Helper-Grants | `npm run test:supabase-function-grant-contract` | Organization-/Workspace-RLS-Helper sowie die drei ergänzenden öffentlichen Funktionen sind nicht mehr für `anon`, sondern nur für `authenticated` ausführbar |

Die RLS-Matrix, der RLS-Leak-Check und der Automation-Idempotenztest wurden gegen
unbeabsichtigte Remote-Ausführung gehärtet: `CLOSEFLOW_LOCAL_DB=1` ist der sichere lokale
Pfad; ein Remote-Test benötigt weiterhin die explizite Freigabe
`CLOSEFLOW_ALLOW_REMOTE_RLS_TEST=YES`. Im lokalen Pfad verwendet der Automation-Test die
Loopback-Postgres-Verbindung und liest `.env.local` nicht.

Die zentralen Workspace-RLS-Hilfsfunktionen `is_workspace_member` und
`is_workspace_manager` sowie `can_write_workspace`, `create_onboarding_workspace` und
`update_updated_at_column` sind durch Migrationen auf `authenticated` beschränkt;
`public` und `anon` erhalten keine RPC-Ausführungsrechte mehr.

### Nicht als erledigt zu markieren

- **RLS und Datenbankrechte:** Repository-Migrationen und lokale Tests sind kein Beleg für den
  aktuellen Live-Schema-, Grant-, Storage- oder Realtime-Zustand. Dafür braucht es einen
  reproduzierbaren Produktions-/Staging-Abgleich und negative Tests mit zwei Test-Workspaces.
- **Authentifizierung:** MFA, E-Mail-Bestätigung, Login-/Recovery-Limits, Session-Widerruf und
  privilegierte Provider-Konten müssen zusätzlich in den jeweiligen Konsolen und mit einer
  autorisierten Testmatrix verifiziert werden.
- **CSP:** Die Anwendung verwendet eine nonce-basierte CSP für Seiten. Eingeloggte Seiten und
  das reale Vercel-Deployment sind noch nicht vollständig browserseitig geprüft.
- **Provider und Datenresidenz:** Azure, Vercel, Supabase, Google, Resend, Stripe und GitHub
  haben jeweils eigene Live-Konfigurationen, Logs, Speicherorte, Unterauftragsverarbeiter und
  Vertragsgrundlagen. Der Repository-Code kann diese Nachweise nicht ersetzen.
- **Azure-Prüfung vom 2026-11-12:** Die Anmeldung mit MFA wurde erfolgreich abgeschlossen und
  die Ressource `closeflow-openai-de` schreibgeschützt geöffnet. Bestätigt sind Status
  `Active`, API-Kind `OpenAI`, Tarif `Standard`, Resource Group `closeflow-rg` und Region
  `Germany West Central` unter dem Abonnement `CloseFlow`. Die Foundry-Ansicht konnte in der
  Portal-Session wegen eines clientseitigen IndexedDB-/Ladefehlers nicht belastbar ausgewertet
  werden. Deshalb bleiben konkreter Deploymentname, tatsächlicher Endpoint, Modellrouting,
  Global-Standard-/Regionalmodus, Logging/Retention, Netzwerkzugriff und Budgetalarme offen.
- **Supabase-Prüfung vom 2026-11-12:** Das Projekt `closeflow` ist im Organisationskonto
  `jhandersch` erreichbar und zeigt die Region `eu-central-1`. In
  `Authentication → Sign In / Providers` sind „Confirm email“, Google und Azure aktiviert;
  Telefon, SAML und die übrigen nicht benötigten Provider sind deaktiviert. In
  `Authentication → Multi-Factor` ist TOTP aktiviert, maximal sind 10 Faktoren pro Nutzer
  zulässig, SMS-MFA ist wegen des Free-Plans deaktiviert und die Begrenzung von AAL1-Sessions
  auf 15 Minuten ist aktiviert. Die Session-Seite zeigt Access-Tokens mit 3.600 Sekunden,
  aktivierte Erkennung und Widerruf kompromittierter Refresh-Tokens sowie ein
  Wiederverwendungsfenster von 10 Sekunden. Globale Sessiondauer und Inaktivitätslimit sind
  im Free-Plan nicht konfigurierbar und stehen auf „never“. Die Auth-Rate-Limits sind
  30 E-Mails/Stunde, 150 Token-Refreshes/5 Minuten, 30 Token-Verifikationen/5 Minuten,
  30 Sign-in-/Sign-up-Anfragen/5 Minuten und 60 Sekunden Mindestabstand pro Nutzer.
  CAPTCHA-Schutz wurde am 2026-11-12 im Supabase-Dashboard aktiviert. Die Login-Seite
  verwendet den öffentlichen `NEXT_PUBLIC_CAPTCHA_SITE_KEY` und übergibt hCaptcha-Tokens
  bei Login, Registrierung, Magic Link und Passwort-Reset; das private Secret bleibt
  ausschließlich in Supabase. Der lokale Browser-End-to-End-Test wurde am 2026-11-13
  erfolgreich durchgeführt: CAPTCHA gelöst, Login akzeptiert und Dashboard mit der
  Test-Session geladen. Die Produktionskonfiguration und ein Produktionsbrowser-Test
  bleiben wegen des derzeit deaktivierten Deployments offen. Der Schutz gegen
  bekannte/geleakte Passwörter bleibt im Free-Plan deaktiviert. Am 2026-11-14 wurde
  `.env.local` von der gehosteten Supabase-URL auf `http://127.0.0.1:54321` umgestellt.
  Publishable-, anon- und service-role-Schlüssel stammen nun aus der lokalen
  Supabase-CLI; lokale Testvariablen sind auf Loopback und `CLOSEFLOW_LOCAL_DB=1` gesetzt.
  Die lokale Auth-Health-Prüfung gab HTTP 200 zurück. Am 2026-11-15 wurde zusätzlich
  ein synthetisches `.invalid`-Testkonto lokal registriert; hCaptcha wurde manuell gelöst,
  Supabase stellte eine Session aus und die Anwendung leitete in das Onboarding weiter.
  Beim folgenden lokalen Auth-Test fiel ein `profiles.username`-Schemafehler auf: Die
  Profil-API erwartete die Spalte, in den Migrationen fehlte sie. Migration
  `20261115182300_add_profile_username.sql` ergänzt die optionale Spalte. Da in der
  lokalen Datenbank die Supabase-Migrationshistorie fehlt, wurde ausschließlich diese
  additive Änderung direkt auf der Loopback-Datenbank angewendet; die Profil-API liefert
  danach HTTP 200. Die Rollenspalte wird nicht aus der Datenbank gelesen; die API erhält
  das optionale Rollenfeld aus `app_metadata`. Produktionsdatenbank und Hosting wurden
  nicht verändert.
  Die lokale Instanz hat `auth.captcha` nicht aktiviert; dieser Test belegt daher den
  Client-Tokenpfad und den Session-/Onboardingpfad, nicht die serverseitige Ablehnung
  ungültiger CAPTCHA-Tokens. Ein Testvertrag deckt die CAPTCHA-Weitergabe für Login,
  Signup, Magic Link und Passwort-Reset ab. Session-Sicherheits-Contracts für globalen
  Sessionwiderruf nach Passwortänderung sowie 30-Minuten-Inaktivitäts-Timeout bestanden
  (3/3). Am 2026-11-15 wurde der lokale Passwort-Reset mit dem synthetischen Konto
  `security-check-20261115@example.invalid` und manuell gelöstem hCaptcha durchgeführt.
  Die Anwendung bestätigte den Versand; Mailpit fing genau eine Recovery-Mail für dieses
  Konto ab und `auth.users.recovery_sent_at` sowie ein gesetzter Recovery-Token bestätigten
  den lokalen Auth-Vorgang. Kein externer Mailversand, keine Produktions- oder
  Vercel-Änderung. Am 2026-11-15 wurde anschließend auch ein Magic Link für dasselbe
  synthetische Konto angefordert; Mailpit fing genau eine Nachricht mit dem Betreff
  „Your CloseFlow sign-in link“ ab. Am 2026-11-17 wurde ein neuer Link angefordert,
  abgefangen und über `127.0.0.1:54321/auth/v1/verify` mit aktiviertem PKCE geöffnet.
  Der Callback leitete auf `127.0.0.1:3000/onboarding` weiter; die Onboarding-Seite
  wurde mit aktiver lokaler Session erreicht. Die lokale GoTrue-Instanz hat
  `auth.captcha` nicht aktiviert; die serverseitige Ablehnung ungültiger
  CAPTCHA-Tokens bleibt daher unbelegt. Produktionsabnahme bleibt offen.
  Die Datenbankansicht zeigt für die gelisteten `public`-Tabellen jeweils „Disable RLS“,
  damit ist RLS dort aktiviert. Der Storage-Bucket `closeflow-files` ist privat konfiguriert,
  hat drei Policies und ein 20-MB-Limit. Geplante Backups/PITR sind im Free-Plan nicht
  verfügbar. Die Storage-Policy-Ansicht bestätigt für `closeflow-files` genau drei Policies:
  `SELECT`, `INSERT` und `DELETE`, jeweils ausschließlich für `authenticated`; unter
  `storage.objects` und `storage.buckets` sind keine zusätzlichen Policies angelegt.
  Die Database-Functions-Ansicht listet die produktiven Funktionen und markiert die
  `SECURITY DEFINER`-Funktionen als „Definer“. Die zuvor schreibgeschützt festgestellten
  `anon`-EXECUTE-Grants auf `can_write_workspace`, `create_onboarding_workspace`,
  `is_workspace_manager`, `is_workspace_member` und `update_updated_at_column` wurden
  am 2026-11-12 kontrolliert widerrufen. Eine nachfolgende Grant-Abfrage bestätigt für
  diese Funktionen keine `anon`-Zeile und weiterhin `authenticated`-Ausführungsrechte.
  Die Datenbankansicht
  „Pipelines“ zeigt keine konfigurierten externen Pipelines. Eine direkte Abfrage von
  `pg_publication_tables` ergab 0 Tabellen in `supabase_realtime`; damit ist derzeit
  keine Realtime-Tabelle veröffentlicht. Die Repository-Prüfung findet ebenfalls keine
  Nutzung von `supabase.channel()` oder `postgres_changes`; Realtime ist für die aktuelle
  Anwendung daher bewusst nicht aktiviert. Eine spätere Realtime-Einführung benötigt eine
  separate Tabellen-/Publication-Prüfung.
- **Backup/Restore, Monitoring und Incident Response:** Ein lokaler oder manueller Test ist
  kein Nachweis für automatisierte Backups, Storage-Sicherung, Alarmzustellung, RPO/RTO oder
  eine isolierte Wiederherstellung.
- **Externer Penetrationstest:** API-, Web-, Cloud-, Auth-, KI- und Business-Logic-Tests
  müssen ausdrücklich autorisiert, in einer freigegebenen Umgebung durchgeführt und
  anschließend unabhängig nachgetestet werden.

### Freigabeentscheidung

Der Status bleibt **NO-GO**. Es wurden im Rahmen dieses Abgleichs keine Azure-Deployments,
Produktionsvariablen, Provider-Konfigurationen oder Live-Daten geändert. Eine Freigabe ist
erst möglich, wenn die offenen P0-Nachweise, die Datenschutz-/Vertragsprüfung, Backup/Restore,
die Live-Konfigurationsprüfung und der externe Retest abgeschlossen und dokumentiert sind.

Die geprüften Workspace-, Profil-, MFA-, Billing-, Stripe-, Automations-, Import-,
Kalender-, Aktivitäts-, Export-, Onboarding- und Löschrouten geben bei Datenbankfehlern
nur noch generische Fehler aus und protokollieren die technische Ursache serverseitig.
Die verbleibenden sichtbaren Fehlermeldungen stammen aus Autorisierungs-/Rate-Limit-
Helfern oder zentralen User-Facing-Sanitizern.

Die lokalen Integrationsnachweise wurden ohne Produktionszugriff gegen die lokale Supabase-
Umgebung (`127.0.0.1`) und einen lokalen Next.js-Server ausgeführt:

- `test:local-permissions`: alle Owner-/Admin-/Member-/Viewer-, Workspace-Wechsel- und
  Tenant-Isolationsprüfungen bestanden.
- `test:rls-matrix` und `test:rls-leak`: alle Cross-Tenant-Schreib- und Leseprüfungen
  bestanden; keine Fremd-Workspace-Daten sichtbar.
- `test:local-import-limits` und `test:local-import-export`: Quoten, Parallelimporte,
  Duplikatvermeidung, XLSX-Export, CSV-Fehlerfälle und Tenant-Isolation bestanden.
- `test:local-lead-duplicates`, `test:local-customer-import` und
  `test:local-legacy-invite`: atomare Duplikatlogik, parallele Customer-Imports und
  Invite-Akzeptanz einschließlich Replay-/Rollenprüfungen bestanden.
- `test:local-delete-rpc` und `test:local-onboarding-delete`: transaktionale Löschung,
  Rollback, MFA-AAL2, Onboarding und Shared-Workspace-Schutz bestanden.
- `test:automation-idempotency`: lokale Deduplizierung, Status-Update und Cross-Workspace-
  Blockade bestanden.

Die lokalen Integrationsnachweise ersetzen weiterhin keine Live-/Staging-Prüfung; die 44
statischen Tests in 31 lokalen Security-Contract-Dateien sind davon unabhängig bestanden.

Eine verteilte Rate-Limit-/Live-Prüfung aller API-Routen sowie DAST und Provider-Live-Nachweise
bleiben offen.

Am 2026-11-21 wurden nach Wiederherstellung der lokalen Docker-/Supabase-Datenbank
`test:rls-matrix` und `test:rls-leak` erneut ausschließlich lokal ausgeführt. Die
Cross-Tenant-Matrix bestand für alle 20 Workspace-Tabellen; der Leak-Check konnte
synthetische Fremd-Tenant-Zeilen in 31/31 geprüften Tabellen anlegen und prüfte mit
vorhandenen Testzeilen alle 33 `public`-Tabellen. Dabei wurde eine vorherige Fixture-Lücke
für `user_integrations` geschlossen; künftig schlägt der Test fehl, wenn eine Tabelle
unbepflanzt bleibt. Alle Testdaten wurden transaktional zurückgerollt. Produktions- und
Remote-RLS-/Browserprüfungen bleiben offen.

Im selben lokalen Stack war die Berechtigungsdatenbank noch vor den Workspace-Hardening-
Migrationen. Nach deren lokaler, transaktionaler Anwendung bestanden `test:local-permissions`
(13 Prüffälle) und `test:local-onboarding-delete` (15 Prüffälle) gegen eine Loopback-Next.js-
Instanz. Zusätzlich bestanden `test:local-lead-duplicates` (5), `test:local-delete-rpc` (3)
und `test:local-legacy-invite` (10). Damit wurden Rollenrechte, direkte Schreibsperren,
Workspace-Wechsel, Invite-Replay, Lösch-Rollback, AAL2 und Tenant-Erhalt erneut lokal belegt.
Die Testkonten und Workspaces wurden durch die Skripte bereinigt; eine eingeloggte
Browser-/UI-Prüfung und jede Produktionsprüfung bleiben offen.
