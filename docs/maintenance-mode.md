# Wartungsmodus

Sperrt die gesamte App (alle Seiten und `/api/**`) mit einer „In Arbeit“-Seite (HTTP 503, `noindex`, `robots.txt` = Disallow).

## Einschalten
Vercel → Settings → Environment Variables (Production):

| Variable | Wert |
|---|---|
| `MAINTENANCE_MODE` | `on` |
| `MAINTENANCE_BYPASS_SECRET` | eigener Zugangscode, mind. 24 Zeichen (nie committen) |

Danach Redeploy. Ausschalten: `MAINTENANCE_MODE` löschen oder auf `off`, Redeploy.

## Weiter testen
Es gibt kein Formular auf der Wartungsseite. Skripte senden den Header `x-maintenance-bypass: <Code>` (Wert von `MAINTENANCE_BYPASS_SECRET`). Zum normalen Testen im Browser den Modus ausschalten.

## Bleibt erreichbar
`/api/health`, `/api/cron/*` (CRON_SECRET-geschützt), `/api/stripe/webhook` (signaturgeprüft).

## Hinweis
Google-Verbindung und Anmeldung funktionieren im Browser erst nach dem Ausschalten. Ein Deployment startet das Monitoring-Fenster neu.
