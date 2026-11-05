# Risikoregister und Asset-Inventar

Bewertung: Wahrscheinlichkeit/Auswirkung je niedrig, mittel, hoch. Überprüfung vierteljährlich.

## Assets
| Asset | Ort | Klasse |
|---|---|---|
| Anwendung (Next.js) | Vercel, Repo `jhandersch/closeflow` | vertraulich |
| Datenbank und Auth | Supabase (Postgres, RLS) | streng vertraulich |
| E-Mail-Versand | Resend | vertraulich |
| Zahlungen | Stripe (aktuell Testmodus) | vertraulich |
| KI-Funktionen | Azure OpenAI | vertraulich |
| Kalender/Gmail-Integration | Google Cloud (nicht verifiziert) | vertraulich |
| Backups | lokal beim Betreiber | streng vertraulich |

## Risiken
| # | Risiko | W | A | Maßnahme | Status |
|---|---|---|---|---|---|
| 1 | Mandanten sehen Daten anderer | niedrig | hoch | RLS, Workspace-Prüfung, Tenancy-Guard, Tests | umgesetzt |
| 2 | Kontoübernahme Betreiber (Vercel/Supabase/GitHub) | mittel | hoch | 2FA, Push-Protection, Branch-Schutz | 2FA beim Betreiber bestätigen |
| 3 | Datenverlust | mittel | hoch | wöchentliches manuelles Backup | PITR erst mit Supabase Pro |
| 4 | Fehler-/Missbrauchsspitzen unbemerkt | mittel | mittel | Rate-Limits, Alarm-Cron, Audit-Log | umgesetzt |
| 5 | Verwundbare Abhängigkeit | mittel | mittel | Dependabot, CodeQL, `npm audit` in CI | umgesetzt |
| 6 | Cross-Site-Schreibzugriff | niedrig | mittel | CSRF-Prüfung im Proxy | umgesetzt |
| 7 | KI-Kostenexplosion | mittel | mittel | Quoten und Kostenlimits | umgesetzt |
| 8 | Einzelperson als Single Point of Failure | hoch | mittel | Dokumentation, Incident-Plan | teilweise |
| 9 | Fehlende rechtliche Grundlagen (AVV, Verarbeitungsverzeichnis) | hoch | hoch | nach Firmengründung | OFFEN, Wartungsmodus bleibt |
| 10 | Unentdeckte Schwachstellen | mittel | hoch | externer Pentest | OFFEN |
