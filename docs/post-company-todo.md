# Aufgaben nach der Firmengründung

Alles, was bewusst auf später verschoben ist. Solange diese Punkte offen sind, bleibt die Release-Matrix NO-GO und der Wartungsmodus aktiv. Reihenfolge = empfohlene Priorität.

## 1. Rechtliches (Blocker für Go-Live)
- [ ] Firma gründen, Rechtsform und Verantwortliche festlegen
- [ ] Impressum, Datenschutzerklärung, AGB mit finalen Firmendaten
- [ ] Auftragsverarbeitungsverträge (AVV) mit Supabase, Vercel, Resend, Stripe, Google, Microsoft/Azure; Drittlandtransfers prüfen
- [ ] Verarbeitungsverzeichnis und TOM-Dokument (Grundlage: `security-policy.md`, `compliance-mapping.md`)
- [ ] Löschkonzept und Aufbewahrungsfristen (inkl. `audit_logs`, Backups)
- [ ] Prüfung, ob DSFA oder Datenschutzbeauftragter nötig ist
- [ ] Meldekontakt für Datenschutzvorfälle (72 h) im `incident-plan.md` eintragen
- [ ] Cookie-/Tracking-Prüfung der Landing Page

## 2. Konten auf die Firma umstellen
- [ ] Firmen-E-Mail-Adressen (Betreiber, Support, Sicherheit, Datenschutz)
- [ ] GitHub, Vercel, Supabase, Resend, Stripe, Google Cloud, Azure auf Organisations-Konten bzw. Firmenadresse; 2FA prüfen
- [ ] Mindestens eine zweite Vertrauensperson mit Notfallzugang (Single Point of Failure)
- [ ] `CLOSEFLOW_ALERT_EMAIL` auf Firmenadresse; `EMAIL_FROM` mit verifizierter Resend-Domain
- [ ] Alle Secrets nach dem Umzug rotieren

## 3. Zahlungen
- [ ] Stripe-Konto verifizieren, Live-Schlüssel und Live-Webhook einrichten
- [ ] Steuerliche Einstellungen (USt, Rechnungsdaten)
- [ ] Zahlungs-Testlauf mit echter Karte, Rückerstattung testen

## 4. Google-Integration
- [ ] OAuth-Verifizierung (Datenschutzerklärung, Domain, Scope-Begründung)
- [ ] Bei sensiblen Scopes (Gmail) ggf. externes Sicherheits-Assessment (CASA)

## 5. Betrieb und Sicherheit
- [ ] Supabase Pro mit Point-in-Time-Recovery, Restore-Test mit Zeitmessung (RPO/RTO neu festlegen)
- [ ] Vercel-Tarif prüfen (Cron-Limits, Logs, Team-Funktionen)
- [ ] Wartungsmodus kurz abschalten und auf Vercel testen: Header, Cron `alerts`, E-Mail-Versand; danach DAST (ZAP) gegen Preview
- [ ] CSP beim Go-live: zuerst `CSP_REPORT_ONLY=1` in Vercel setzen, eingeloggte Seiten durchklicken (Konsole auf Verstöße prüfen), danach Variable entfernen (= erzwingen)
- [ ] Externer Penetrationstest, Nachtests der Befunde
- [ ] Rollback-Übung auf Vercel, DR-Übung halbjährlich
- [ ] Aufbewahrungsfrist für `audit_logs` umsetzen (12 Monate vorgeschlagen)
- [ ] GitHub Actions auf Commit-SHAs pinnen
- [ ] Passkey-Unterstützung bei Supabase klären
- [ ] Uptime-Monitoring mit Benachrichtigung (Handy) einrichten
- [ ] Übersetzung der neuen UI-Texte (Audit log) ins Deutsche

## 6. Organisation
- [ ] Rollen und Verantwortlichkeiten schriftlich festlegen
- [ ] Vierteljährliches Berechtigungs-Review und Risikoregister-Review im Kalender
- [ ] Mitarbeiter-Onboarding/Offboarding und Schulung, sobald Personal dazukommt
- [ ] Optional: Zertifizierung (ISO 27001, SOC 2) erst bei Kundenbedarf

## 7. Go-Live
- [ ] Release-Matrix vollständig abarbeiten (Final Approval Block ausfüllen)
- [ ] Wartungsmodus abschalten, Smoke-Test auf Produktion
- [ ] Erste Wochen: tägliche Kontrolle von Alarm-Mail, Monitoring und Audit-Log
