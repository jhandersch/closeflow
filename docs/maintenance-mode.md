# Wartungsmodus

Sperrt die gesamte App (alle Seiten und `/api/**`) mit einer „In Arbeit“-Seite (HTTP 503, `noindex`, `robots.txt` = Disallow).

## Einschalten
Vercel → Settings → Environment Variables (Production):

| Variable | Wert |
|---|---|
| `MAINTENANCE_MODE` | `on` |
| `MAINTENANCE_BYPASS_SECRET` | eigener Zugangscode, mind. 24 Zeichen (nie committen) |

Danach Redeploy. Ausschalten: `MAINTENANCE_MODE` löschen oder auf `off`, Redeploy.

## Weiter testen (Team-Zugang)
Auf der Wartungsseite „Team-Zugang“ aufklappen und den Code eingeben. Es wird ein httpOnly-Cookie (14 Tage) gesetzt. Skripte können stattdessen den Header `x-maintenance-bypass: <Code>` senden.

## Bleibt erreichbar
`/api/health`, `/api/cron/*` (CRON_SECRET-geschützt), `/api/stripe/webhook` (signaturgeprüft), `/maintenance-access`.

## Hinweis
Google-Verbindung (OAuth-Callback) und Anmeldung funktionieren nur mit Team-Zugang. Ein Deployment startet das Monitoring-Fenster neu.
