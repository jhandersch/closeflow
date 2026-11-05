# CloseFlow Security Audit – Technisches Umsetzungshandbuch
Wir beginnen mit der tatsächlichen technischen Prüfung. Nicht mit allgemeinen Empfehlungen, sondern mit konkreten Anforderungen für deinen Stack.

Audit-Ziel

- OWASP ASVS Level 2
- DSGVO
- ISO-27001-Vorbereitung
- Multi-Tenant-Sicherheit
- Enterprise-taugliche Betriebs- und Zugriffssicherheit
Prüfbereiche

20

Prioritäten

P0–P3

Technische Abnahme

Pflicht

## Teil 1 – Sicherheitsarchitektur und Bedrohungsmodell
Ziel: Bevor wir einzelne Komponenten absichern, müssen sämtliche Vertrauensgrenzen und Datenflüsse von CloseFlow identifiziert sein.

### 1.1 Architektur-Inventar
ID

Prüfung

Priorität

ARCH-001

Alle produktiven Komponenten dokumentieren

P0

ARCH-002

Alle externen Dienste dokumentieren

P0

ARCH-003

Sämtliche Datenflüsse erfassen

P0

ARCH-004

Vertrauensgrenzen definieren

P0

ARCH-005

Personenbezogene Daten klassifizieren

P0

ARCH-006

Secrets und Zugangsdaten inventarisieren

P0

ARCH-007

Öffentliche und interne Endpunkte erfassen

P0

ARCH-008

Administratorzugänge dokumentieren

P0

ARCH-009

Abhängigkeiten zwischen Diensten dokumentieren

P1

ARCH-010

Bedrohungsmodell aktuell halten

P1

Konkrete Umsetzung:

Erstelle ein Architektur-Inventar mit diesen Komponenten:

- Next.js Frontend und App Router
- Vercel Deployment und Cron
- Supabase Auth
- Supabase PostgreSQL
- Supabase RLS
- Supabase Storage, falls verwendet
- Azure OpenAI
- Google OAuth
- Resend
- Stripe
- GitHub und GitHub Actions
Für jede Verbindung dokumentierst du:

1. Quelle
2. Ziel
3. Übertragene Daten
4. Authentifizierung
5. Verschlüsselung
6. Berechtigungen
7. Fehlerverhalten
8. Logging
9. Verantwortlichkeit
Testfall ARCH-T01

Prüfe, ob jeder externe Dienst im Inventar enthalten ist und ob seine Datenflüsse nachvollziehbar sind.

Abnahmekriterium
100 % der produktiven Dienste und ihrer Datenflüsse sind dokumentiert. Es existieren keine unbekannten externen Datenübertragungen.

### 1.2 Bedrohungsmodell
ID

Bedrohung

Priorität

THR-001

Account-Übernahme

P0

THR-002

Zugriff auf fremde Workspaces

P0

THR-003

Privilegieneskalation

P0

THR-004

Datenbankmanipulation

P0

THR-005

API-Missbrauch

P0

THR-006

Secret-Leak

P0

THR-007

KI-Prompt-Injection

P0

THR-008

OAuth-Token-Missbrauch

P0

THR-009

Webhook-Manipulation

P0

THR-010

Datenverlust

P0

THR-011

Denial of Service

P1

THR-012

Supply-Chain-Angriff

P1

THR-013

Insider-Missbrauch

P1

THR-014

Datenschutzverletzung

P0

Für jeden Eintrag müssen Angriffsszenario, Eintrittswahrscheinlichkeit, Schadensauswirkung und Gegenmaßnahme dokumentiert werden.

## Teil 2 – Identität und Authentifizierung
Hier liegt eine der wichtigsten Sicherheitsgrenzen von CloseFlow.

### 2.1 Supabase Auth
ID

Anforderung

Priorität

AUTH-001

MFA für privilegierte Konten

P0

AUTH-002

MFA-Funktion technisch testen

P0

AUTH-003

Sichere Passwort-Reset-Prozesse

P0

AUTH-004

E-Mail-Verifizierung aktivieren

P0

AUTH-005

Schutz gegen Brute Force

P0

AUTH-006

Login-Rate-Limits

P0

AUTH-007

Sichere Session-Verwaltung

P0

AUTH-008

Session-Widerruf ermöglichen

P0

AUTH-009

OAuth-Callback absichern

P0

AUTH-010

Sichere Redirect-Allowlist

P0

AUTH-011

Account-Recovery absichern

P0

AUTH-012

Veraltete Sessions widerrufen

P1

AUTH-013

Verdächtige Anmeldungen überwachen

P1

AUTH-014

Administratorzugriffe gesondert schützen

P0

### 2.2 Konkrete Supabase-Konfiguration
Im Supabase-Projekt prüfen:

- E-Mail-Verifizierung verpflichtend.
- MFA für privilegierte Benutzer erzwingen.
- Nur benötigte Authentifizierungsmethoden aktivieren.
- Redirect-URLs auf tatsächliche Domains begrenzen.
- Produktions- und Entwicklungsumgebungen trennen.
- SMTP-Versand korrekt konfigurieren.
- Zugangsdaten nicht im Client veröffentlichen.
- Auth-Logs überwachen.
Supabase verwendet für die Passwortspeicherung seine verwaltete bcrypt-Implementierung. Eine eigene Argon2id-Konfiguration ist deshalb nicht automatisch erforderlich. Entscheidend sind die tatsächlichen Einstellungen und die Einhaltung der Sicherheitsanforderungen.

### 2.3 Authentifizierungstests
AUTH-T01 – Erfolgreicher Login

- Gültige Zugangsdaten verwenden.
- MFA abschließen.
- Zugriff auf den eigenen Workspace prüfen.
Erwartung: Login funktioniert ausschließlich nach erfolgreicher Authentifizierung.

AUTH-T02 – Ungültiger Login

- Ungültiges Passwort verwenden.
- Wiederholte fehlgeschlagene Anmeldungen simulieren.
Erwartung: Rate-Limits greifen, keine sensiblen Informationen werden offengelegt.

AUTH-T03 – Session-Widerruf

- Zwei gültige Sessions erstellen.
- Eine Session widerrufen.
- Zugriff mit der widerrufenen Session prüfen.
Erwartung: Die widerrufene Session kann keine geschützten Aktionen mehr ausführen.

AUTH-T04 – MFA

- MFA für einen privilegierten Account aktivieren.
- Anmeldung ohne zweiten Faktor testen.
Erwartung: Kein Zugriff auf privilegierte Funktionen ohne erforderliche MFA.

Abnahme
Alle Tests bestanden. Keine Umgehung der vorgesehenen Authentifizierung oder Session-Kontrollen.

## Teil 3 – Workspace-Isolation und Multi-Tenant-Sicherheit
Höchste Priorität – P0
Ein Fehler in diesem Bereich kann dazu führen, dass Kunden auf Daten anderer Kunden zugreifen.

### 3.1 Workspace-Berechtigungen
ID

Anforderung

Priorität

TEN-001

Jeder Datensatz ist eindeutig einem Workspace zugeordnet

P0

TEN-002

Jede Abfrage berücksichtigt Workspace-Berechtigungen

P0

TEN-003

Owner-Rolle serverseitig prüfen

P0

TEN-004

Admin-Rolle serverseitig prüfen

P0

TEN-005

Member-Rolle serverseitig prüfen

P0

TEN-006

Rollenänderungen autorisieren

P0

TEN-007

Workspace-Wechsel serverseitig validieren

P0

TEN-008

Fremde IDs dürfen keine Zugriffsrechte gewähren

P0

TEN-009

Exporte auf Workspace beschränken

P0

TEN-010

Suchergebnisse mandantengetrennt halten

P0

TEN-011

Hintergrundjobs mandantengetrennt ausführen

P0

TEN-012

KI-Kontext mandantengetrennt halten

P0

TEN-013

Audit-Logs mandantengetrennt schützen

P0

TEN-014

Dateien mandantengetrennt schützen

P0

### 3.2 Testmatrix
Erstelle zwei vollständig getrennte Test-Workspaces:

- Workspace A
- Workspace B
Lege jeweils einen Owner, Admin und Member an.

Prüfe anschließend jede relevante Operation:

Operation

Eigener Workspace

Fremder Workspace

Datensatz lesen

Erlaubt gemäß Rolle

Verweigert

Datensatz erstellen

Erlaubt gemäß Rolle

Verweigert

Datensatz ändern

Erlaubt gemäß Rolle

Verweigert

Datensatz löschen

Erlaubt gemäß Rolle

Verweigert

Export

Erlaubt gemäß Rolle

Verweigert

Datei öffnen

Erlaubt gemäß Rolle

Verweigert

Rollenänderung

Nur berechtigt

Verweigert

### 3.3 Supabase RLS
Für jede mandantenbezogene Tabelle:

- RLS muss aktiviert sein.
- SELECT muss eingeschränkt sein.
- INSERT muss eingeschränkt sein.
- UPDATE muss eingeschränkt sein.
- DELETE muss eingeschränkt sein.
- Workspace-Zugehörigkeit muss serverseitig verifiziert werden.
- Rollen dürfen nicht aus ungeprüften Client-Daten übernommen werden.
- SECURITY DEFINER-Funktionen müssen gesondert überprüft werden.
- Service-Role-Zugriffe dürfen nicht als Ersatz für RLS verwendet werden.
Beispiel für ein konzeptionelles RLS-Prinzip:

```
ALTER TABLE public.contacts
ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_contacts_select"
ON public.contacts
FOR SELECT
TO authenticated
USING (
  public.is_workspace_member(workspace_id)
);
```

`is_workspace_member()` muss selbst sicher implementiert sein und die tatsächliche Mitgliedschaft des angemeldeten Benutzers prüfen. Die Funktion darf keine unkontrollierbare Vertrauensstellung gegenüber Client-Angaben aufbauen.

TEN-T01 – Fremder Workspace

Ein Benutzer aus Workspace A versucht, einen Datensatz aus Workspace B zu lesen.

Erwartung: Keine Daten werden zurückgegeben.

TEN-T02 – Manipulierte Workspace-ID

Eine Anfrage enthält eine Workspace-ID, zu der der Benutzer nicht gehört.

Erwartung: Der Server weist die Anfrage zurück.

TEN-T03 – Rolleneskalation

Ein Member versucht, sich selbst zum Admin zu machen.

Erwartung: Die Änderung wird serverseitig verweigert.

Abnahme
Alle Tabellen, Views, RPCs, Storage-Objekte und API-Endpunkte sind geprüft. Es gibt keinen unautorisierten Cross-Tenant-Zugriff.

## Teil 4 – Next.js 16 und Anwendungssicherheit

### 4.1 Server und Client
ID

Kontrolle

Priorität

APP-001

Secrets ausschließlich serverseitig

P0

APP-002

Server Actions autorisieren

P0

APP-003

Route Handlers autorisieren

P0

APP-004

Keine implizite Vertrauensstellung für Client-Daten

P0

APP-005

Request-Validierung mit Schemas

P0

APP-006

Sichere Fehlerbehandlung

P0

APP-007

Keine sensiblen Daten in Client-Bundles

P0

APP-008

Sichere Cache-Konfiguration

P0

APP-009

Keine mandantenübergreifenden Cache-Einträge

P0

APP-010

Schutz vor XSS

P0

APP-011

Schutz vor CSRF

P0

APP-012

Schutz vor SSRF

P0

APP-013

Sichere Datei-Uploads

P0

APP-014

Sichere Redirects

P1

APP-015

Keine sensiblen Daten in URLs

P1

### 4.2 Cache-Sicherheit
Besonders wichtig bei Next.js:

- Benutzerabhängige Antworten nicht öffentlich cachen.
- Workspace-spezifische Daten nicht zwischen Benutzern teilen.
- Caching von API-Antworten explizit überprüfen.
- Dynamische Authentifizierungsdaten nicht in gemeinsam genutzte Cache-Einträge aufnehmen.
- Nach Rollenänderungen kritische Daten erneut autorisieren.
APP-T01: Zwei Benutzer aus verschiedenen Workspaces rufen dieselbe Route nacheinander auf.

Erwartung: Jeder erhält ausschließlich seine eigenen autorisierten Daten.

APP-T02: Eine Session wird beendet und die geschützte Route erneut aufgerufen.

Erwartung: Kein Zugriff mit ungültiger Session.

## Teil 5 – API- und Webhook-Sicherheit
ID

Kontrolle

Priorität

API-001

Authentifizierung geschützter Endpunkte

P0

API-002

Objektbezogene Autorisierung

P0

API-003

Schema-Validierung

P0

API-004

Rate-Limits

P0

API-005

Maximale Request-Größe

P0

API-006

Idempotenz kritischer Aktionen

P0

API-007

Sichere Fehlerantworten

P0

API-008

Webhook-Signaturprüfung

P0

API-009

Replay-Schutz

P0

API-010

Sichere Retry-Mechanismen

P1

API-011

API-Versionierung

P1

API-012

Abschaltung ungenutzter Endpunkte

P1

### Webhook-Abnahme
Für jeden Webhook gilt:

1. Signatur wird serverseitig überprüft.
2. Ungültige Signaturen werden abgewiesen.
3. Wiederholte Events erzeugen keine doppelten Aktionen.
4. Verarbeitung ist nachvollziehbar protokolliert.
5. Secrets sind nicht im Frontend verfügbar.

## Teil 6 – KI-Sicherheit mit Azure OpenAI
P0 – besondere Datenabflussgefahr
ID

Kontrolle

Priorität

AI-001

KI-Aufrufe nur serverseitig

P0

AI-002

API-Schlüssel sicher speichern

P0

AI-003

Workspace-Kontext serverseitig bestimmen

P0

AI-004

Prompt-Injection-Risiken berücksichtigen

P0

AI-005

Externe Inhalte als nicht vertrauenswürdig behandeln

P0

AI-006

Tool-Aufrufe serverseitig autorisieren

P0

AI-007

KI-Ausgaben vor kritischen Aktionen validieren

P0

AI-008

Keine unkontrollierten Datenbankaktionen

P0

AI-009

PII-Minimierung

P0

AI-010

KI-Quoten pro Workspace

P0

AI-011

Token- und Kostenlimits

P1

AI-012

Modell- und API-Versionen überwachen

P1

AI-013

KI-Datenverarbeitung dokumentieren

P0

AI-014

KI-Ausgaben protokollieren, ohne unnötige sensible Inhalte zu speichern

P1

AI-T01: Ein Benutzer versucht, über einen KI-Aufruf Daten aus einem fremden Workspace zu erhalten.

Erwartung: Der KI-Kontext enthält ausschließlich autorisierte Daten.

AI-T02: Ein importierter Text enthält Anweisungen, die versuchen, interne Regeln zu überschreiben.

Erwartung: Der Inhalt wird als nicht vertrauenswürdige Eingabe behandelt und löst keine unautorisierten Aktionen aus.

AI-T03: Die KI fordert eine kritische Aktion an.

Erwartung: Eine separate serverseitige Berechtigungsprüfung ist erforderlich.

## Teil 7 – Stripe, Google OAuth und Resend

### Stripe

- Test- und Live-Schlüssel strikt trennen.
- Webhook-Signaturen prüfen.
- Event-IDs gegen doppelte Verarbeitung absichern.
- Zahlungsstatus niemals allein vom Client übernehmen.
- Beträge und Währungen serverseitig validieren.
- Berechtigungen nach Zahlung serverseitig setzen.
- Keine Kreditkartendaten selbst speichern, wenn Stripe die Verarbeitung übernehmen kann.

### Google OAuth

- Nur erforderliche Scopes anfordern.
- OAuth State validieren.
- Redirect-URLs begrenzen.
- Refresh-Tokens verschlüsselt und serverseitig speichern.
- Token-Widerruf und Disconnect implementieren.
- Google-Zugriffsrechte pro Workspace und Benutzer kontrollieren.
- Gmail- und Kalenderdaten niemals workspaceübergreifend verfügbar machen.

### Resend

- SPF konfigurieren.
- DKIM aktivieren.
- DMARC mit zunächst geeigneter Überwachung und anschließend strengerer Policy einführen.
- Absenderdomains absichern.
- API-Key nur serverseitig speichern.
- Missbrauchslimits setzen.
- E-Mail-Inhalte auf versehentliche Offenlegung sensibler Daten prüfen.

## Teil 8 – Infrastruktur und Lieferkette

### Vercel

- Produktions- und Preview-Umgebungen trennen.
- Preview-Deployments vor unberechtigtem Zugriff schützen.
- Umgebungsvariablen nach Umgebung trennen.
- Keine produktiven Secrets in Preview-Deployments verwenden.
- Cron-Endpunkte authentifizieren.
- Deployment-Rechte beschränken.
- Rollback testen.
- Domains und TLS prüfen.

### GitHub Actions

- Minimale `GITHUB_TOKEN`-Berechtigungen.
- Actions möglichst auf geprüfte Commit-SHAs pinnen.
- Secret Scanning aktivieren.
- Branch Protection erzwingen.
- Abhängigkeiten überwachen.
- Produktionsdeployments mit geschützten Environments absichern.
- Deployment-Identitäten bevorzugt über OIDC verwalten, soweit die Zielplattform es unterstützt.

### Supabase

- Produktionszugriffe beschränken.
- Service-Role-Key streng schützen.
- RLS auf sämtlichen relevanten Tabellen prüfen.
- Datenbank-Backups automatisieren.
- Restore regelmäßig testen.
- Storage-Policies prüfen.
- Datenbank-Logs überwachen.
- Nicht benötigte Funktionen und Erweiterungen vermeiden.

## Teil 9 – Datenschutz und organisatorische Sicherheit
ID

Kontrolle

Priorität

GDPR-001

Verzeichnis der Verarbeitungstätigkeiten

P0

GDPR-002

Rechtsgrundlagen dokumentieren

P0

GDPR-003

Datenschutzerklärung

P0

GDPR-004

Auftragsverarbeitungsverträge

P0

GDPR-005

Unterauftragsverarbeiter erfassen

P0

GDPR-006

Internationale Datentransfers prüfen

P0

GDPR-007

Löschkonzept

P0

GDPR-008

Auskunftsprozesse

P0

GDPR-009

Berichtigungsprozesse

P1

GDPR-010

Datenportabilität

P1

GDPR-011

Datenschutzverletzungsprozess

P0

GDPR-012

Datenschutz-Folgenabschätzung prüfen

P1

GDPR-013

Aufbewahrungsfristen definieren

P0

GDPR-014

Datenschutz durch Technikgestaltung

P0

Wichtig: Auch als Einzelbetreiber bestehen bei tatsächlicher Verarbeitung personenbezogener Daten bereits Datenschutzpflichten. Die fehlende Unternehmensgründung hebt diese nicht auf.

## Teil 10 – Backup, Monitoring und Notfallmanagement

- Automatisierte Backups.
- Verschlüsselte Sicherungen.
- Getrennte Backup-Zugänge.
- Wiederherstellung dokumentieren.
- RPO und RTO definieren.
- Restore regelmäßig testen.
- Fehleralarmierung testen.
- Security-Events zentral erfassen.
- Secrets und Tokens aus Logs ausschließen.
- Incident-Response-Plan erstellen.
- Kontaktliste für Sicherheitsvorfälle pflegen.
- Notfallwiederherstellung mindestens regelmäßig üben.

## Teil 11 – Finale Go-live-Abnahme

## CloseFlow Go-live-Gate
Nicht freigeben, solange P0 offen ist

- Alle P0-Kontrollen bestanden
- Mandantentrennung vollständig nachgewiesen
- Keine kritischen oder hohen ungepatchten Schwachstellen
- Externer Penetrationstest durchgeführt
- Backup-Wiederherstellung erfolgreich
- Incident-Response-Prozess dokumentiert
- Datenschutzunterlagen geprüft
- Produktionssecrets überprüft
- Deployment-Prozess geprüft
- Restrisiken dokumentiert und bewertet

Wichtige Einordnung: Das ist der Beginn des detaillierten Audit-Handbuchs, noch nicht die vollständige technische Abnahme. Insbesondere müssen die konkreten Tabellen, RLS-Policies, Server Actions, API-Routen und Konfigurationen im tatsächlichen Repository geprüft werden.

Der nächste sinnvolle Schritt ist, die vollständige Supabase-Datenbankstruktur einschließlich RLS-Policies und Funktionen systematisch gegen diese Anforderungen zu auditieren.