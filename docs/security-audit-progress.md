# Fortschritt: ChatGPT-Sicherheitsumsetzungshandbuch

Stand: 2026-11-06. Original: [`security-audit-handbook.md`](./security-audit-handbook.md), exakt übernommener Text mit 1.057 Zeilen. Die Statusangaben unten bewerten den Abgleich dieses Handbuchs, nicht die separate 182-Punkte-Checkliste. Ein Kapitel gilt nur dann als abgeschlossen, wenn alle darin genannten Kontrollen belegt sind; ein Code-Review allein ist keine Produktionsabnahme.

## Kapitelstatus

| Teil | Bereich | Status | Bisheriger Abgleich und offene Punkte |
|---|---|---|---|
| 1 | Sicherheitsarchitektur und Bedrohungsmodell | 🟡 Teilweise | Sicherheitsrichtlinie und Risikoregister vorhanden; ein vollständiges Datenfluss-, Vertrauensgrenzen-, PII- und Admin-Inventar nach allen ARCH-Punkten fehlt. |
| 2 | Identität und Authentifizierung | 🟡 Teilweise | Authentifizierungswege und API-Auth stichprobenartig geprüft; MFA/E-Mail-Bestätigung teils Betreiberangaben. Vollständige Auth-Testmatrix, Passkey-Entscheidung und sämtliche Anbieter-Konten nicht unabhängig abgenommen. |
| 3 | Workspace-Isolation und Multi-Tenant-Sicherheit | 🟡 Weit fortgeschritten | RLS- und `SECURITY DEFINER`-Review, lokale RLS-Matrix und Produktionsmatrix durchgeführt. Viewer-RPC-Lücke und `lead_automations`-Workspace-Policy behoben; die zurückgerollte Produktionsmatrix hatte danach 0 FAIL. Nicht jede Datenroute und jeder Einzelfall der Handbuch-Testmatrix ist damit abgenommen. |
| 4 | Next.js 16 und Anwendungssicherheit | 🟡 Weit fortgeschritten | Security-Header, CSRF/SSRF, Request-Limits, Open-Redirect-Fix, Client/Server-Secrets und Nonce-CSP geprüft. Öffentliche Seiten unter CSP lokal getestet; eingeloggte Seiten auf Vercel fehlen. Cache-Sicherheit ist nicht vollständig überprüft. |
| 5 | API- und Webhook-Sicherheit | 🟡 Weit fortgeschritten | Authentifizierung für 72 API-Routen statisch geprüft; Stripe-Signatur und Webhook-Verhalten geprüft; Fehler-/CSRF-/SSRF-Kontrollen teilweise getestet. Vollständige Schema-, Missbrauchs- und DAST-Abnahme aller Routen offen. |
| 6 | KI-Sicherheit mit Azure OpenAI | 🟡 Code-Prüfung abgeschlossen, Abnahme offen | Gemeinsamer Prompt-Guard, Workspace-Lead-Prüfung, Datenminimierung, Request-/Token-Limits und Telemetrie verbessert; `test:ai-cost` 21/21, `test:ai-routes` 10/10, Typecheck, Lint, GitHub-CI und CodeQL erfolgreich. Live-Red-Team, Azure-Datenschutz-/Region-/Aufbewahrungsprüfung und vollständige Ausgabevalidierung offen. Details: [`ai-security-review.md`](./ai-security-review.md). |
| 7 | Stripe, Google OAuth und Resend | 🟡 Teilweise | Google-Token-Verschlüsselung, OAuth-State und Widerruf geprüft; fehlender Widerruf bei Kontolöschung behoben. Resend-Templates geprüft; Stripe-Webhook-Signatur/Idempotenz statisch geprüft. Google-Verifizierung und Stripe-Live-Tests sind offen. |
| 8 | Infrastruktur und Lieferkette | 🟡 Teilweise | GitHub Actions CI, CodeQL, Dependabot, SBOM und Lizenzprüfung vorhanden; CI und CodeQL für den KI-Sicherheitscommit erfolgreich. Anbieter-Tarife, Firewall/DDoS, vollständige Secret-/Zugriffsverwaltung und Betriebsparameter nicht vollständig unabhängig bestätigt. |
| 9 | Datenschutz und organisatorische Sicherheit | ⏳ Offen | Vor allem Firmenverantwortung, AVVs, Verarbeitungsverzeichnis, TOMs, Lösch-/Aufbewahrungskonzept und mögliche DSFA benötigen Betreiber- und Rechtsprüfung; nach Firmengründung einplanen. |
| 10 | Backup, Monitoring und Notfallmanagement | 🟡 Teilweise | DR-/Incident-Dokumentation, Health-Checks, Alerting und ein Monitoring-Fenster vorhanden. Provider-Backups, zeitgemessener Produktions-Restore und tatsächliche Vercel-Cron-/Alarmzustellung sind nicht vollständig abgenommen. |
| 11 | Finale Go-live-Abnahme | ⏳ Offen / NO-GO | Die Produktionsfreigabe bleibt NO-GO: rechtliche und organisatorische Punkte, Live-/Provider-Tests sowie Betriebsnachweise fehlen. Wartungsmodus bleibt aktiv. |

## Zusammenfassung

- **Kein seriöser Prozentwert:** Die 11 Teile enthalten unterschiedlich viele und unterschiedlich gewichtige Kontrollen. „5 von 11“ würde fälschlich suggerieren, ganze Kapitel seien abgeschlossen.
- **Tief technisch bearbeitet:** Teile 3 bis 7, aber in keinem davon sind alle Abnahmepunkte bereits geschlossen.
- **Teil 6:** Code-Härtung und automatisierte Prüfungen sind erledigt; der echte Modell-/Azure- und Datenschutznachweis fehlt.
- **Go-live:** Nicht freigegeben. Teil 9 und 11 sind ausdrücklich offen; Teile 1, 2, 8 und 10 sind nur teilweise geprüft.

Die Originaldatei ist unverändert. Dieses Dokument ist der Statusbegleiter und wird nach weiteren Prüfungen aktualisiert.
