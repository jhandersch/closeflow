# Integrationen (Google Gmail/Kalender)

Zugangsdaten liegen verschlüsselt (AES-256-GCM) in `public.user_integrations`. Die Tabelle ist nur für den Service-Role-Key lesbar. Ohne die Variablen unten zeigt die Oberfläche „Noch nicht verfügbar“, und alle bestehenden Funktionen laufen unverändert.

Slack war kurz eingebaut und wurde bewusst wieder entfernt.

## Verhalten

- **Gmail:** E-Mails an Leads (`POST /api/leads/[id]/email`) werden über das verbundene Gmail gesendet. Schlägt das Senden fehl, antwortet die Route mit 502 und legt keine Aktivität an.
- **Google Kalender:** Neue Termine mit Status `scheduled` werden in den primären Google-Kalender eingetragen (nur Anlegen, kein Update/Löschen-Sync). Fehler werden nur geloggt. Die Google-ID wird in `calendar_events.google_event_id` gespeichert.
- **Kalender-Import:** Button „Termine aus Google Kalender importieren“ (`POST /api/integrations/google/import`) holt Termine der letzten 30 Tage bis in 12 Monate (max. 500) aus dem primären Kalender. Doppelte werden über `(user_id, google_event_id)` übersprungen, auch in CloseFlow gelöschte Termine kommen nicht zurück. Ganztägige Termine landen um 12:00 UTC. Nur manueller Import, keine laufende Synchronisation.
- **Berechtigungen:** Google zeigt bei nicht verifizierten Apps Häkchen für Gmail und Kalender, die der Nutzer selbst setzen muss. Fehlen sie, meldet CloseFlow das nach der Rückkehr und „Neu verbinden“ holt sie nach.

## Einrichtung

1. Migrationen `20261101000000_user_integrations.sql` und `20261101010000_calendar_google_event_id.sql` anwenden.
2. Verschlüsselungsschlüssel erzeugen und als `INTEGRATIONS_ENCRYPTION_KEY` setzen (lokal und Vercel):
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
3. Google Cloud Console: Projekt anlegen, Gmail API und Google Calendar API aktivieren, OAuth-Zustimmungsbildschirm einrichten (Scopes `gmail.send`, `calendar.events`, Testnutzer eintragen), OAuth-Client „Webanwendung“ erstellen.
   Redirect-URI: `<APP_URL>/api/integrations/google/callback` (lokal und Produktion).
4. Variablen setzen: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL` (oder `APP_URL`).
5. Für öffentliche Nutzer außerhalb der Testnutzer verlangt Google eine App-Verifizierung (sensible Scopes).

## Tests

`npm run test:integrations` (Verschlüsselung, OAuth-State, Gmail/Kalender-Requests).
