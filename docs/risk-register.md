# Risikoregister und Asset-Inventar

Bewertung: Wahrscheinlichkeit/Auswirkung je niedrig, mittel, hoch. Überprüfung vierteljährlich.

## Assets
| Asset | Ort | Klasse |
|---|---|---|
| Anwendung (Next.js) | Vercel, Repo `jhandersch/closeflow` | vertraulich |
| Datenbank und Auth | Supabase (Postgres, RLS) | streng vertraulich |
| E-Mail-Versand | Resend | vertraulich |
| Zahlungen | Stripe (Sandbox/Testansicht am 2026-11-06 geöffnet; Produktionsmodus nicht verifiziert) | vertraulich |
| KI-Funktionen | Azure OpenAI | vertraulich |
| Kalender/Gmail-Integration | Google Cloud (OAuth extern/„In Produktion“; Scopes/Client-Zuordnung noch abzugleichen) | vertraulich |
| Backups | lokal beim Betreiber | streng vertraulich |

## Risiken
| # | Risiko | W | A | Maßnahme | Status |
|---|---|---|---|---|---|
| 1 | Mandanten sehen Daten anderer | niedrig | hoch | RLS, Workspace-Prüfung, Tenancy-Guard, Tests | umgesetzt |
| 2 | Kontoübernahme Betreiber (Vercel/Supabase/GitHub) | mittel | hoch | 2FA, Push-Protection, Branch-Schutz | 2FA beim Betreiber bestätigen |
| 3 | Datenverlust | mittel | hoch | wöchentliches manuelles Backup | PRODUKTIV BESTÄTIGT OFFEN: Supabase Free Plan bietet keine geplanten Backups/PITR; aktueller transaktionaler Restore lokal am 2026-11-15 bestanden, aber regelmäßiges externes Backup, getrennte verschlüsselte Kopien und zeitgemessener Produktions-Restore bleiben offen |
| 4 | Fehler-/Missbrauchsspitzen unbemerkt | mittel | mittel | Rate-Limits, Alarm-Cron, Audit-Log | umgesetzt |
| 5 | Verwundbare Abhängigkeit | mittel | mittel | Dependabot, CodeQL, `npm audit` in CI | umgesetzt |
| 6 | Cross-Site-Schreibzugriff | niedrig | mittel | CSRF-Prüfung im Proxy | umgesetzt |
| 7 | KI-Kostenexplosion | mittel | mittel | Quoten und Kostenlimits | umgesetzt |
| 8 | Einzelperson als Single Point of Failure | hoch | mittel | Dokumentation, Incident-Plan | teilweise |
| 9 | Fehlende rechtliche Grundlagen (AVV, Verarbeitungsverzeichnis) | hoch | hoch | Firmengründung, Betreiberangaben, AVVs, Verarbeitungsverzeichnis, TOMs und Lösch-/Aufbewahrungsfristen | P0 OFFEN: Datenschutzerklärung enthält weiterhin Firma-/Adress-/Kontaktplatzhalter; Wartungsmodus bleibt |
| 10 | Unentdeckte Schwachstellen | mittel | hoch | externer Pentest | OFFEN |
| 11 | Profilbild-URL konnte Inhalte von beliebigen Drittanbieter-Hosts laden und Browser-Verbindungsmetadaten teilen | mittel | mittel | UI-Eingabe/Vorschau entfernt, APIs lehnen nichtleere URLs ab, OAuth-Callback übernimmt keine URL; veröffentlichte Version und Browser-Netzwerkprüfung verifizieren | CODE-FIX LOKAL, Rollout-/Produktionsprüfung offen |
| 12 | Providerregionen/Retention und Vercel-Runtime-Einstellungen nicht vollständig verifiziert | mittel | hoch | produktive Konsoleninventur, Datenverarbeitungsverträge und Retention dokumentieren; Supabase-Projekt `closeflow` in `eu-central-1`, E-Mail-Bestätigung, TOTP-MFA, 15-Minuten-AAL1-Begrenzung, Auth-Rate-Limits, aktivierte RLS auf gelisteten Tabellen, privater `closeflow-files`-Bucket mit 20 MB und drei ausschließlich `authenticated` zugewiesenen SELECT-/INSERT-/DELETE-Policies sowie Google-/Azure-Provider bestätigt; Resend-Region und Domainstatus bestätigt; Google-Cloud-OAuth-Scopes mit den im Code angeforderten Gmail-/Kalender-Rechten abgleichen | TEILWEISE GEPRÜFT, lokale Integration-/CSP-/Cron-/Billing-Contracts 15/15 bestanden und Next 16.4.6 separat validiert; Produktions-Sitekey/Auth-Browser-Test, Leaked-Password-Schutz, begrenzte Sessions, Supabase-Backups/PITR, Scope-Klassifizierung, Google-Verifizierung, Vercel-Funktionsregion/Logs und mehrere Provider-Retention-Angaben bleiben unbestätigt |
| 13 | Feedback-Link ist signiert, hat aber kein Ablaufdatum und ist wiederverwendbar | niedrig | mittel | Ablauf/Rotation oder Widerrufbarkeit ergänzen; Rate-Limit und Datenminimierung beibehalten | CODE-FIX LOKAL: signierte Tokens laufen nach 30 Tagen ab; Rollout-/Produktionsprüfung offen |
| 14 | Vercel konnte bei aktivierter Projektoption Code-/Chatdaten mit KI-Modellanbietern für Trainingszwecke teilen | mittel | mittel | Projektoption mit Freigabe deaktiviert und nach Reload geprüft; frühere Empfänger und Retention klären | PROJEKTSEITIG DEAKTIVIERT 2026-11-06; frühere Verarbeitung und Teamoption bleiben gesondert zu betrachten |
| 15 | Azure-OpenAI-Deployment `Global Standard` kann CRM-Prompts und Antworten außerhalb der EU verarbeiten, obwohl die Ressource `closeflow-openai-de` in Germany West Central liegt | mittel | hoch | tatsächlichen Produktions-Endpoint abgleichen; EU-/Regional-Option, Verfügbarkeit, Kosten und Auswirkungen prüfen oder globale Verarbeitung inklusive Drittlandtransfers und AVV rechtlich bewerten | OFFEN, Ressource aktiv und schreibgeschützt bestätigt; konkretes Deployment/Endpoint, Global-/Regionalmodus, Abuse-Monitoring und Retention noch nicht belastbar verifiziert |
| 16 | Die Vercel-Projekteinstellung für Functions zeigt Washington D.C. (`iad1`), sodass bei einem entsprechenden Deployment Serververarbeitung in den USA erfolgt | mittel | hoch | Region des laufenden Deployments bestätigen; Datenflüsse und Drittlandtransfers bewerten; Frankfurt als Alternative sowie Auswirkungen und Rollback vor einer freigegebenen Änderung prüfen | OFFEN, Projekteinstellung bestätigt; tatsächliche Region des laufenden Deployments nicht unabhängig bestätigt |
| 17 | Produktive Supabase-Function-Grants erlauben `anon` weiterhin EXECUTE auf fünf öffentlichen Funktionen | mittel | hoch | Zielumgebung gegen die Grant-Restriktionsmigration abgleichen; `anon`/`public` widerrufen und nur erforderliche Rollen wie `authenticated`/`service_role` zulassen; anschließend negative RPC-Tests ausführen | LIVE-BEHOBEN 2026-11-12: `anon`/`public` für `can_write_workspace`, `create_onboarding_workspace`, `is_workspace_manager`, `is_workspace_member` und `update_updated_at_column` widerrufen; `authenticated`-Ausführung bestätigt. Am 2026-11-18 bestand lokal die komplette Viewer-RLS-Matrix und der Leak-Check nach Migration `20261118120000_enforce_viewer_read_only_contract.sql`; Produktions-Rollout und negative Live-RPC-Prüfung bleiben offen |
