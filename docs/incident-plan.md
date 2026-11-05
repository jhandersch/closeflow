# Incident-Plan (Sicherheits- und Betriebsvorfälle)

Kurzer Ablauf für den Betreiber. Ziel: Schaden begrenzen, Ursache finden, Nutzer informieren, daraus lernen.

## 1. Erkennen

- `npm run monitor:snapshot -- 1` (Health, Fehler, Datenbank, Test-Nutzer).
- Vercel Logs und Supabase Logs, Fehler unter Settings → Monitoring in der App.
- Hinweise von Nutzern oder externen Meldern (Kontakt im Impressum).

## 2. Einstufung

| Stufe | Beispiel | Reaktion |
|---|---|---|
| P0 | Fremde Daten sichtbar, Secret geleakt, Datenverlust | sofort, Wartungsmodus |
| P1 | Login, Zahlung oder Speichern defekt | am selben Tag |
| P2 | Einzelne Funktion defekt, Fehlerspitzen | nächster Werktag |

## 3. Sofortmaßnahmen

1. **Eindämmen:** `MAINTENANCE_MODE` in Vercel setzen und neu deployen (`docs/maintenance-mode.md`). Health, Cron und Stripe-Webhook bleiben erreichbar.
2. **Secrets rotieren**, falls betroffen (siehe Abschnitt 5).
3. **Beweise sichern:** Vercel- und Supabase-Logs exportieren, bevor sie ablaufen. Nichts löschen.
4. **Nicht überschreiben:** Vor Reparaturen ein frisches Backup erstellen (`docs/backup-restore.md`).

## 4. Beheben und Wiederherstellen

- Fehlerhaften Deploy zurückrollen (Vercel → Deployments → Promote vorherigen Stand).
- Datenverlust: Restore nach `docs/backup-restore.md` (in-place oder neues Projekt).
- Nach dem Fix: `npm run verify:release`, relevante Tests (`test:cross-tenant:suite`, `test:automations-e2e`) und `monitor:snapshot`.
- Wartungsmodus erst nach grünen Prüfungen abschalten.

## 5. Secrets rotieren (Reihenfolge)

| Secret | Wo | Danach |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY`, JWT-Secret | Supabase → Settings → API | Vercel-Variable ersetzen, Redeploy |
| `CRON_SECRET` | Vercel (Wert mit `openssl rand -hex 32` erzeugen) | Redeploy, Cron einmal manuell testen |
| `RESEND_API_KEY` | Resend → API Keys | Vercel-Variable ersetzen, Redeploy |
| Stripe-Keys und Webhook-Secret | Stripe Dashboard | Vercel-Variablen ersetzen, Webhook testen |
| Azure-OpenAI-Key | Azure Portal → Keys (Key 2 verwenden, Key 1 neu erzeugen) | Vercel-Variable ersetzen |
| Google-OAuth-Secret | Google Cloud Console | Vercel-Variable ersetzen |

Alte Schlüssel immer widerrufen, nicht nur ersetzen. Secrets nie in Chat, Tickets oder Commits einfügen.

## 6. Meldung

- Personenbezogene Daten betroffen: Meldung an die Datenschutzbehörde **innerhalb von 72 Stunden** nach Bekanntwerden (Art. 33 DSGVO), betroffene Nutzer ohne unnötige Verzögerung informieren (Art. 34 DSGVO), wenn ein hohes Risiko besteht. Rechtliche Details nach der Firmengründung mit Beratung klären.
- Kurzen Vorfallbericht anlegen: Zeitpunkt, Ursache, betroffene Daten, Maßnahmen, Lehren.

## 7. Nachbereitung

- Ursache dauerhaft beheben, Test ergänzen, der das Problem künftig fängt.
- Diesen Plan bei Bedarf anpassen.

## Kontakte und Zugänge (vom Betreiber zu pflegen)

- 2FA aktiv bei: GitHub, Vercel, Supabase, Azure, Resend, Stripe, Google Cloud.
- Notfallzugang (Recovery-Codes) offline gesichert.
