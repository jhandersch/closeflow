# Kontroll-Mapping (ISO 27001 Annex A / NIST CSF / OWASP ASVS)

Stand: 2026-11-05. Gruppiert nach Kontrollbereichen, **nicht** 1:1 nach der 182-Punkte-Liste des Betreibers (die Originaldatei lag bei der Erstellung nicht mehr vor). Status: ✅ umgesetzt und belegt · 🟡 teilweise · 👤 Betreiber · ☁️ Anbieter (Vercel/Supabase) · ⏳ später (siehe `post-company-todo.md`) · ❌ nicht erreichbar/nicht geplant.

Kein Zertifikat und keine Konformitätsaussage: ISO 27001 verlangt ein Managementsystem, das hier nicht existiert.

## Zugriff und Identität (A.5.15–5.18, A.8.2–8.5 · NIST PR.AA · ASVS V2/V3/V4)
| Kontrolle | Status | Beleg |
|---|---|---|
| Authentifizierung über Supabase Auth, bcrypt-Hashes | ✅ | Anbieter |
| Argon2id für Passwörter | ❌ | Supabase nutzt bcrypt |
| MFA für Nutzer | ✅ | in der App umgesetzt (Release-Matrix) |
| Passkeys | ⏳ | Supabase-Support klären |
| E-Mail-Bestätigung | ✅ | „Confirm email“ in Supabase, Betreiber bestätigt 2026-11-05 |
| Rollen owner/admin/member, serverseitige Prüfung | ✅ | `workspaceAuth`, Tests `test:workspace-auth` |
| Mandantentrennung (RLS, Tenancy-Guard) | ✅ | `lint:tenancy`, RLS-Tests |
| 2FA auf GitHub | ✅ | Betreiber bestätigt |
| 2FA auf Vercel und Supabase | ✅ | Betreiber bestätigt 2026-11-05 |
| 2FA auf Resend, Stripe, Google, Azure | 👤 | Betreiber bestätigt noch |
| Rechte-Review, Offboarding | 🟡 | `security-policy.md`, erste Durchführung offen |

## Anwendungssicherheit (A.8.25–8.29 · NIST PR.PS · ASVS V5/V7/V13/V14)
| Kontrolle | Status | Beleg |
|---|---|---|
| Eingabevalidierung, Größenlimits | ✅ | `inputLimits`, `test:input-limits` |
| SQL-Injection | ✅ | parametrisierte Supabase-Aufrufe, Review |
| XSS (React-Escaping, keine ungeprüften HTML-Ausgaben) | ✅ | Review |
| CSRF | ✅ | `src/lib/csrf.ts`, `test:csrf` |
| SSRF | ✅ | nur feste Zielhosts |
| Rate-Limits, KI-Quoten | ✅ | `test:usage-quota`, `test:ai-cost` |
| KI-Sicherheit (Workspace, Prompt-Guard, Limits, Datenminimierung) | 🟡 | Code-Review und Tests: `docs/ai-security-review.md`; Live-Red-Team und Azure-Datenschutzprüfung offen |
| Security-Header | ✅ | HSTS, nosniff, XFO, Referrer, Permissions; Produktion und lokaler Build geprüft |
| Vollständige `script-src`-CSP mit Nonces | ✅ | `src/lib/csp.ts` + `src/proxy.ts`; lokal im Edge geprüft (Login/öffentliche Seiten); eingeloggte Seiten noch ungeprüft, daher beim Go-live zuerst `CSP_REPORT_ONLY=1` |
| Fehlerbehandlung ohne Detail-Leaks | 🟡 | stichprobenartig, kein Vollreview |
| Cron-Endpunkte geschützt | ✅ | Bearer `CRON_SECRET`, 401 geprüft |
| Secure-Coding-Review, SAST | ✅ | CodeQL |
| DAST / Pentest | ⏳ | ZAP auf Preview, externer Pentest |

## Kryptografie und Secrets (A.8.24 · NIST PR.DS · ASVS V6)
| Kontrolle | Status | Beleg |
|---|---|---|
| TLS erzwungen, HSTS | ✅ | HTTP → 308 HTTPS |
| Verschlüsselung at rest | ☁️ | Supabase/Vercel |
| Secrets nicht im Repo, Scanning | ✅ | Push-Protection, Secret-Scanning |
| Rotationskonzept | 🟡 | `security-policy.md`, erste Rotation offen |
| `CRON_SECRET` ≥ 32 Zeichen | 👤 | Betreiber meldet gesetzt, Länge nicht von mir prüfbar |

## Logging, Monitoring, Reaktion (A.8.15–8.16, A.5.24–5.28 · NIST DE/RS · ASVS V7)
| Kontrolle | Status | Beleg |
|---|---|---|
| Audit-Trail für sicherheitsrelevante Aktionen | ✅ | `audit_logs`, `test:audit-log` |
| Fehleralarm per E-Mail | ✅ | Cron `alerts`, `test:alerting`; Zustellung auf Vercel ungetestet |
| Health-Check alle 15 Min | ✅ | `health-check.yml` |
| Incident-Plan | ✅ | `incident-plan.md` |
| Aufbewahrungsfrist für Logs | 🟡 | Vorschlag 12 Monate, nicht umgesetzt |
| Login-Ereignisse zentral | ❌ | nur Supabase-Auth-Logs |
| 24/7-Überwachung, SIEM | ❌ | Einzelbetreiber |

## Betrieb, Backup, Wiederanlauf (A.8.13–8.14, A.5.29–5.30 · NIST RC)
| Kontrolle | Status | Beleg |
|---|---|---|
| Backup und Restore getestet | 🟡 | manuell wöchentlich, Restore lokal 2026-10-19 |
| Point-in-Time-Recovery | ⏳ | Supabase Pro |
| DR-Plan, RPO/RTO | 🟡 | `disaster-recovery.md` (geschätzt) |
| Rollback Deployment | ✅ | Vercel „Promote“, dokumentiert, nicht geübt |
| Wartungsmodus | ✅ | `maintenance-mode.md` |

## Lieferkette und Änderungsmanagement (A.8.8, A.8.9, A.8.32, A.5.19–5.22 · NIST ID.RA, GV.SC)
| Kontrolle | Status | Beleg |
|---|---|---|
| Dependabot, `npm audit` (Produktion 0) | ✅ | CI |
| Lizenzprüfung, SBOM | ✅ | `check-licenses.mjs`, CI-Artefakt |
| Branch-Schutz, Pflicht-Checks | ✅ | Pflicht-Checks CodeQL und „CI / verify“ (Betreiber bestätigt 2026-11-05) |
| Pinning der Actions auf SHA | ⏳ | derzeit Versions-Tags |
| Lieferantenbewertung, AVVs | ⏳ | nach Firmengründung |

## Organisation, Recht, Datenschutz (A.5, A.6, A.7 · NIST GV · DSGVO)
| Kontrolle | Status |
|---|---|
| Security-Policy, Risikoregister, Datenklassifizierung | 🟡 Entwurf vorhanden, Verantwortliche fehlen |
| Verarbeitungsverzeichnis, AVVs, TOM-Dokument | ⏳ |
| Datenschutzerklärung, Impressum, AGB, Löschkonzept | ⏳ |
| Datenschutzbeauftragter-Prüfung, DSFA | ⏳ |
| Schulungen, Awareness | ❌ Einzelbetreiber, später |
| ISO-27001-Zertifizierung | ❌ nicht geplant |
| WAF/DDoS, Server-Hardening | ☁️ Anbieter, nur dokumentieren |

## Zusammenfassung
Technische P0-Kontrollen sind weitgehend belegt. Offen sind Betreiber-Konten (2FA, Secrets), Tests auf Vercel nach dem Wartungsmodus, Pentest, PITR und alle rechtlichen und organisatorischen Punkte. Release-Matrix bleibt NO-GO.
