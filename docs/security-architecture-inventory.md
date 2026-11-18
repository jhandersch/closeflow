# Sicherheitsarchitektur-Inventar und Bedrohungsmodell

Stand: 2026-11-06. Geltungsbereich: CloseFlow-Webanwendung in diesem Repository, die dort sichtbaren Deploy-/CI-/Datenbank-Konfigurationen und die vom Betreiber dokumentierten Produktionsdienste. Supabase-, Vercel-, Resend- und Google-Cloud-Konsolen wurden am 2026-11-06 lesend geprüft. Azure-, Stripe- und GitHub-Organisations-/Anbietereinstellungen wurden nicht vollständig geprüft.

## Status und Abnahmegrenze

Dieses Dokument bearbeitet Teil 1 des [`security-audit-handbook.md`](./security-audit-handbook.md), insbesondere ARCH-001 bis ARCH-010 und ARCH-T01.

**Ergebnis: Code-Inventar und Bedrohungsmodell sind abgeschlossen; die externe Produktionsabnahme wartet auf begrenzte Restbestätigungen.** Am 2026-11-06 wurden Supabase-, Vercel-, Resend-, Google-Cloud- und Azure-Konsolen lesend geprüft. Supabase bestätigt Central EU (Frankfurt), Compute `eu-central-1`/Nano, 0 Edge Functions und keine eingerichtete Supabase-GitHub-/Vercel-Integration. Die Auth-Einstellungen bestätigen E-Mail-, Google- und Azure-Provider aktiv, Registrierung erlaubt und E-Mail-Autobestätigung aus. Resend bestätigt `closeflowapp.de` als verifiziert in Ireland (`eu-west-1`), Provider IONOS, Resend Forge deaktiviert und keine konfigurierten Webhooks. Der Vercel-Projektbereich zeigt die Verknüpfung zu `jhandersch/closeflow`; die Einstellung „Improve models with this project’s data“ ist aktiviert. Laut Vercel-Beschreibung kann Vercel Projekt-Code und Chatdaten mit KI-Modellanbietern für Trainingszwecke teilen; dieser zusätzliche Datenfluss ist als DF-13 dokumentiert. Der Betreiber hat die Deaktivierung freigegeben. Ein Änderungsversuch ließ den Schalter aktiviert und „Save“ deaktiviert; es wurde nichts gespeichert. Funktionsstandort sowie Log-Drains/Aufbewahrung konnten nicht festgestellt werden. Die Stripe-Konsole zeigte das Konto „CloseFlow Sandbox“ in der Testansicht; damit ist der Modus des Produktionskontos nicht bestätigt. Google Cloud zeigt das Projekt `closeflow-503114`, eine externe OAuth-App im Status „In Produktion“ und zwei OAuth-Webclients. Die Zielgruppe zeigt 1 von maximal 100 Nutzern. In „Datenzugriff“ sind keine sensiblen oder eingeschränkten OAuth-Scopes registriert; das Überprüfungscenter sagt deshalb, dass keine Überprüfung erforderlich sei. Das steht den im Code angeforderten Gmail- und Kalenderrechten gegenüber (DF-05); die tatsächliche OAuth-Zustimmung und die Verknüpfung der Clients müssen abgeglichen werden. Azure zeigt die Ressource `closeflow-openai-de` in Germany West Central und ein erfolgreiches `gpt-4.1-mini`-Deployment als **Global Standard**. Laut Microsoft kann die Verarbeitung bei Global-Deployments auch außerhalb der Ressourcengeografie stattfinden; eine auf Deutschland oder die EU begrenzte Verarbeitung ist damit nicht belegt (DF-04). Die Zuordnung zur produktiven Vercel-Konfiguration und eine bewusste Datenschutzentscheidung sind offen. Im Repository ist die Avatar-URL-Ausleitung durch UI-Entfernung, API-Ablehnung und Unterdrückung gespeicherter URLs blockiert; der produktive Rollout ist nicht verifiziert. Kapitel 1 ist **repository- und teilweise konsolenseitig geprüft, aber noch nicht vollständig extern abgenommen**.

## 1. Architektur-Inventar (ARCH-001, ARCH-002, ARCH-009)

### Produktiv vorgesehene Komponenten

| Komponente | Zweck und Daten | Identität/Berechtigung | Betrieb / Grenze |
|---|---|---|---|
| Browser-Frontend | Next.js App Router, React; Dashboard, Landing-/Rechtsseiten, Login, Feedback | Supabase-Session-Cookie; Client-Supabase-Schlüssel ist Publishable/Anon, niemals Service Role | Nutzergerät und Browser sind nicht vertrauenswürdig; die App läuft derzeit im Wartungsmodus laut Betreiberangaben |
| Next.js-Anwendung / API | UI-Rendering, serverseitige Geschäftslogik, 72 API-Route-Dateien; OAuth, KI, Integrationen, Cron, Webhooks | Supabase User-Session oder explizit signierter Dienstaufruf; einzelne eng begrenzte serverseitige Admin-Funktionen nutzen Service Role | Vercel; Next.js 16 mit `src/proxy.ts`; serverseitige Umgebungsvariablen |
| Vercel | Hosting, Build/Deployment, Runtime, geplante Cron-Aufrufe | Vercel-Projektzugang; Cron-Aufrufe zusätzlich mit `CRON_SECRET` | Projekt `closeflow`, GitHub-Repository `jhandersch/closeflow`; Projekteinstellung für Function Region zeigt Washington D.C. (`iad1`, USA). Die Region des aktuell laufenden Deployments muss separat bestätigt werden; Firewall und Runtime-Logs sind offen |
| Supabase Auth | Konten, Session-/JWT-Ausgabe, MFA und Nutzer-Metadaten | Auth-Session; MFA-Funktionen; E-Mail-Bestätigung laut Betreiberangabe aktiviert | Externe Auth-/Datenbankplattform; Auth-E-Mail-Zustellung hängt von nicht im Repo dokumentierter Projektkonfiguration ab |
| Supabase Auth OAuth-Provider | Social Login über Google und Microsoft Azure | Provider-Identität; genauer Claim-/Scope-Umfang wird im Supabase-Projekt konfiguriert | Öffentliche Supabase-Auth-Einstellungen am 2026-11-06 zeigen `email`, `google` und `azure` aktiv; `/login` bietet Google- und Microsoft-Login an |
| Supabase PostgreSQL | Profile, Workspaces, CRM-, Kalender-, Automations-, Abrechnungs-, Nutzungs- und Auditdaten | User-JWT und RLS; für eng begrenzte serverseitige Jobs Service Role; privilegierte SQL-Funktionen | Konsole zeigt Central EU (Frankfurt), AWS `eu-central-1`, Nano; `public`-Schema mit RLS; Service Role umgeht RLS |
| Supabase Storage | Privater Bucket `closeflow-files`, max. 20 MiB je Datei; Objekte liegen unter Workspace-UUID | Nicht öffentlicher Bucket, Workspace-Mitgliedschaft in Storage-Policies; Datei-API prüft Session und Pfad | Storage-Objektinhalte sind in den dokumentierten DB-Backups nicht enthalten; diese Lücke ist im Backup-Runbook beschrieben |
| Azure OpenAI | Chat-Completions für Sales-/Forecast-/E-Mail-/Lead-Funktionen; CRM-Kontext kann an Modell übermittelt werden | Server-seitiger Azure API-Key; Routen prüfen User, Workspace und KI-Quote; keine Modell-Tools | Konsole: Ressource `closeflow-openai-de` in Germany West Central, Deployment `gpt-4.1-mini` als Global Standard. Die Ressourcengeografie beschränkt bei Global Standard die Inferenz nicht auf Deutschland/EU. Zuordnung zum produktiven Endpunkt, Abuse-Monitoring und Retention bleiben zu bestätigen |
| Google OAuth / APIs | Nutzerautorisierung; Gmail-Versand; Google-Kalender anlegen/importieren; OAuth-Token-Austausch/Widerruf | OAuth Client Secret; nutzergebundener, HMAC-signierter State; Code fordert Gmail- und Kalender-Scopes an; Refresh-Token AES-256-GCM verschlüsselt | Google Cloud zeigt externe OAuth-App „In Produktion“, zwei OAuth-Webclients und 1/100 Nutzer. „Datenzugriff“ enthält keine sensiblen/eingeschränkten Scopes; Code-Anfrage und Client-Zuordnung sind abzugleichen, Verifizierung/Produktionstauglichkeit nicht daraus abgeleitet |
| Resend | Einladungen, Benachrichtigungs-Digests und Betreiber-Alarm-E-Mails | Server-seitiger `RESEND_API_KEY`; Absender `EMAIL_FROM` | E-Mail-Anbieter verarbeitet Empfänger, Betreff und Inhalt; verifizierte Produktionsdomain/Zustellung noch nicht vollständig bestätigt |
| Stripe | Checkout-/Billing-Portal und Subscription-Status-Webhooks | Server-seitiger Stripe-Key; Webhook-Signatur wird geprüft; Webhook nutzt Service Role für Status-Upserts | Am 2026-11-06 war im Dashboard das Konto „CloseFlow Sandbox“ in der Testansicht geöffnet; dies bestätigt nicht den Produktionsmodus. Produktives Konto und Webhook-Konfiguration nicht verifiziert. Keine Karten-Rohdaten werden in CloseFlow-Tabellen gespeichert |
| GitHub / GitHub Actions | Quellcode, Branch-Regeln, CI, CodeQL, npm-Abhängigkeiten, SBOM-Artefakt | GitHub-Konto/-Ruleset; CI-Pipeline mit minimalen `contents: read`-Rechten; veröffentlichte Actions teils per Versions-Tag referenziert | GitHub verarbeitet privaten Quellcode und Build-Metadaten; CI lädt Actions/Dependencies aus dem Ökosystem |
| npm Registry / Build-Toolchain | `npm ci`, Next.js-Build und CI-Tools | Lockfile und npm-Integrität; lokale/CI-Umgebung | Build bezieht Drittanbieterpakete; Actions-Pinning auf Commit-SHAs bleibt als Supply-Chain-Härtung offen |

### Inventarisierte externe Ziele und Abgrenzung

Im Quellcode finden sich feste Google OAuth-/Gmail-/Calendar-Hosts und ein fest konfigurierter CloseFlow-Host für Betreiber-Mail-Links. Azure OpenAI und Supabase werden über HTTPS-Endpunkt-Umgebungsvariablen adressiert. Die Azure-Produktionskonfiguration wird in einem Smoke-Run vom 2026-11-01 als `gpt-4.1-mini`, Global Standard, Germany West Central beschrieben und vom Betreiber am 2026-11-06 bestätigt; Abuse-Monitoring-/Retention-Einstellungen bleiben unbekannt. Stripe und Resend werden über ihre offiziellen SDKs angesprochen; deren Zielhosts sind nicht als eigene URL-Strings in der App ausgeschrieben. Die Resend-Konsole zeigte `closeflowapp.de` verifiziert, IONOS als DNS-Provider, Region Ireland (`eu-west-1`) und keine eingerichteten Resend-Webhooks. `next/font/google` bezieht Schriftdateien während des Builds; die erzeugten Fonts werden von der Anwendung ausgeliefert, nicht bei jedem Seitenaufruf direkt von Google angefragt. Ein Analytics-/Advertising-SDK ist im Produktions-Dependency-Inventar nicht erkennbar.

**Avatar-Ausleitung und aktuelle Codekontrolle:** Eine frühere Profileinstellungs-Vorschau lud `avatar_url` direkt im Browser und konnte dadurch IP-Adresse, User-Agent und Referrer an einen frei gewählten Drittanbieter übertragen. Die Profileinstellungsfelder und Vorschau sind entfernt, beide Profil-APIs lehnen nichtleere Avatar-URLs ab, Profilantworten geben keine gespeicherten URLs zurück, und der OAuth-Callback übernimmt keine Providerbild-URL in die Profiletabelle. Der Codepfad sendet deshalb keine Avatar-Bildanfrage an Drittanbieter. Bereits in Supabase gespeicherte Werte werden nicht automatisch massenhaft gelöscht; Auth-Provider-Metadaten können weiterhin Bild-URLs enthalten, werden von der Anwendung aber nicht gerendert oder abgerufen. Der produktive Rollout und die Prüfung auf der veröffentlichten Anwendung stehen noch aus. Dieser frühere Datenfluss ist als kontrollierter Pfad in DF-10 erfasst und darf nicht als serverseitiger SSRF-Pfad beschrieben werden.

**Nicht aus Code/Repo oder den geprüften Konsolen feststellbar:** SMTP-Region und Aufbewahrung, Region des aktuell laufenden Vercel-Deployments, Analytics-/Firewall-/Log-Drain- und Log-Retention-Einstellungen, Vercels tatsächliche KI-Subprozessoren und Datenaufbewahrung, tatsächliche Vercel-Produktions-Env-Werte, Azure-Content-Filter/Abuse-Monitoring-/Aufbewahrungseinstellungen, die wirksame Google-OAuth-Client-/Scope-Konfiguration sowie Stripe-Live-/Test-Modus. Die Vercel-Projekteinstellung zeigt `iad1` in den USA; eine Einstellungsänderung würde laut Vercel erst nach neuem Deployment wirksam. Google Cloud zeigt „In Produktion“ und keine hinterlegten sensiblen/eingeschränkten Scopes, während der Anwendungscode Gmail- und Kalender-Scopes anfordert; dies muss mit den tatsächlich verwendeten OAuth-Clients und einem kontrollierten Integrationstest abgeglichen werden. Die Supabase-Konsole zeigte 0 Edge Functions sowie im Integrationsbereich „Connect GitHub“/„Install Vercel integration“ (also keine vorhandene native Projektverknüpfung). Der Betreiber muss die offenen Konsolenangaben vor der endgültigen ARCH-T01-Abnahme ergänzen.

## 2. Datenfluss-Register (ARCH-003)

Alle Datenflüsse sind transportseitig für produktive Verbindungen TLS/HTTPS, soweit der Anbieter es unterstützt. Dieses Register dokumentiert Codepfade und bekannte Datenarten; es ersetzt keine AVV-, Region- oder Retention-Prüfung.

### DF-01 Browser ↔ Vercel / Next.js

- **Quelle → Ziel:** Browser des Nutzers → CloseFlow-Webanwendung auf Vercel; Antworten und Cookies zurück zum Browser.
- **Daten:** Login-/Formulardaten, Session-Cookies/JWT, CRM-Ansichten, Nutzeraktionen, Dateien/API-Payloads, Sprache/Theme.
- **Authentifizierung:** Supabase Auth; geschützte UI/API prüft die Session serverseitig. Öffentliche Seiten bleiben anonym erreichbar.
- **Verschlüsselung:** HTTPS/HSTS im Produktionspfad; Session-Cookies über Supabase-SSR/Auth-Konfiguration.
- **Berechtigungen:** Server-Routen autorisieren User und Workspace; Eingaben aus Browser sind grundsätzlich nicht vertrauenswürdig.
- **Fehlerverhalten:** API-Statuscodes, Wartungsmodus-503, allgemeine Fehlerantworten; Monitoring-/Auditpfad je nach Route.
- **Logging:** Vercel-Runtime-Logs und begrenzte anwendungsseitige Fehler-/Audit-Events; keine vollständige unabhängige Log-Konfiguration vorliegend.
- **Verantwortung:** CloseFlow-Anwendungslogik und Vercel-Plattform; Betreiber für Vercel-Konten, Logs, Regionen und Access Control.

### DF-02 Browser ↔ Supabase Auth / PostgREST / Storage

- **Quelle → Ziel:** Browser-Client → Supabase Auth und für einige Datenoperationen direkt zu Supabase PostgREST/Storage.
- **Daten:** Authentifizierung, User-Metadaten, Workspace- und CRM-Daten, private Dateioperationen.
- **Authentifizierung:** Publishable-/Anon-Key identifiziert nur das Projekt; Zugriff beruht auf Nutzer-JWT, SQL-Grants und RLS. Kein Client darf die Service Role erhalten.
- **Verschlüsselung:** HTTPS; Supabase-seitige Verschlüsselung/Backups sind Anbieter- und Tarifleistung und hier nicht verifiziert.
- **Berechtigungen:** Tabellen-RLS, Workspace-Mitgliedschaft und Storage-Policies; Viewer-Schreibrechte wurden durch RLS-/RPC-Tests gehärtet.
- **Fehlerverhalten:** Supabase-Fehler gehen an Route/UI; einige UI-Datenpfade zeigen leere Zustände oder Fehlerbanner.
- **Logging:** Supabase Auth-/DB-/API-Logs liegen beim Anbieter; Retention ist tarif- und Dashboard-abhängig.
- **Verantwortung:** CloseFlow für Policies/Queries und minimale Publishable-Key-Verwendung; Supabase für Plattformbetrieb.

### DF-03 Vercel-Server ↔ Supabase PostgreSQL / Auth / Storage

- **Quelle → Ziel:** Next.js-Serverkomponenten und API-Routen → Supabase SDK/API; bei Service-Role-Operationen administrativer Supabase-Zugriff.
- **Daten:** User- und Workspace-Daten, Nutzungs-/Kosten-Telemetrie, Auth-Admin-Funktionen, verschlüsselte Google-Credentials, Feedback, Dateien.
- **Authentifizierung:** User-JWT für normale Operationen; `SUPABASE_SERVICE_ROLE_KEY` für Admin-Client, Cron, Webhook, Konto-Löschung, Feedback und einzelne Systempfade.
- **Verschlüsselung:** HTTPS zu Supabase.
- **Berechtigungen:** User-Client unter RLS; Service Role umgeht RLS und wird in server-only Modulen/Routen verwendet. Zu inventarisierende Verbraucher: Admin-Client, Auth-Admin, Cron, Onboarding, Billing-Webhook, Health, Feedback, Integrations-Store, Rate-Limiter und Telemetrie.
- **Fehlerverhalten:** Fehler werden überwiegend geprüft; sensitive Admin-Fehler werden teilweise serverseitig geloggt und mit generischer Antwort zurückgegeben.
- **Logging:** Audit-Events für definierte Geschäfts-/Sicherheitsaktionen; AI-Nutzungsereignisse speichern Modell/Feature/Token/Kosten, nicht den Prompt.
- **Verantwortung:** CloseFlow für Schlüssel und Codepfade; Supabase für die Datenplattform; Betreiber für Rotation/Notfallzugriff.

### DF-04 Vercel-Server → Azure OpenAI

- **Quelle → Ziel:** KI-API-Routen auf Vercel → Azure OpenAI Chat-Completions-Endpunkt aus Serverkonfiguration.
- **Daten:** Nutzeranfrage, Lead-/Kunden-/Aktivitäts-/Pipeline-Notizen und je Feature nötiger CRM-Kontext. E-Mail-Generator verwendet eine Allowlist; andere Routen können umfangreichere Kontextobjekte übermitteln.
- **Authentifizierung:** `AZURE_OPENAI_API_KEY`; Schlüssel bleibt serverseitig. KI-Routen authentifizieren Nutzer, Workspace und Quote.
- **Verschlüsselung:** HTTPS erzwungen; Konfiguration lehnt unsichere Endpunkte und Zusatzpfade ab.
- **Berechtigungen:** Deployment-Key gewährt Providerzugriff; CloseFlow setzt Workspace-Grenze vor den Aufruf. Keine Modell-Tools oder autonomen DB-/E-Mail-Aktionen.
- **Fehlerverhalten:** Providerfehler werden in generische API-Fehler übersetzt; Kosten-/Token-Audit muss bei erfolgreicher Completion gelingen. Requestlimit 256 KiB und Completionlimit 1.200 Tokens im gemeinsamen Transport.
- **Logging:** Token-/Kosten-/Feature-Daten; Fehler-Events können Providerfehlertexte aufnehmen. Prompts/Antworten werden nicht absichtlich in `ai_conversations` persistiert.
- **Providerkonfiguration und Verarbeitungsort:** Am 2026-11-06 zeigt Azure die Ressource `closeflow-openai-de` als aktiv in Germany West Central; Foundry zeigt `gpt-4.1-mini` (Version `2025-04-14`) als erfolgreiches Deployment vom Typ **Global Standard** mit Inhaltsfilter `DefaultV2`. Die Ressourcengeografie ist keine Garantie für EU-/Deutschland-Inferenz: Laut [Microsofts Datenschutzdokumentation](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy) können Prompts und Antworten bei Global-Deployments in beliebigen Geografien verarbeitet werden, in denen das Modell verfügbar ist. Microsoft beschreibt für Abuse-Monitoring mögliche Stichproben und menschliche Prüfung; ob hierfür bei dieser Ressource eine abweichende Freigabe greift und welche Aufbewahrungsfrist gilt, ist nicht nachgewiesen. Azure zeigt keine definierten Diagnostic Settings für den Export von Ressourcenlogs/Metriken; das beweist nicht, dass andere Logs oder Abuse-Monitoring deaktiviert sind. Die Verbindung des Deployments mit der tatsächlich aktiven Vercel-Konfiguration muss ohne Offenlegung von Geheimnissen bestätigt werden.
- **Verantwortung:** CloseFlow für Datenminimierung und Prompt-Sicherheit; Microsoft/Azure für Verarbeitung und Abuse-Monitoring; Betreiber für Region, Retention, Verträge und Key-Rotation.

### DF-05 Browser/Vercel ↔ Google OAuth / Gmail / Calendar

- **Quelle → Ziel:** Browser leitet Nutzer zur Google-Einwilligung; Next.js tauscht Auth-Code/Refresh-Token aus und ruft Gmail/Calendar API auf.
- **Daten:** E-Mail-Adresse, OAuth-Scopes, Refresh-/Access-Token; Gmail-Empfänger und E-Mail-Inhalt; Kalendertermine, Teilnehmer-/Zeit-/Beschreibung und CRM-Verknüpfungen.
- **Authentifizierung:** Google OAuth Client; signierter State ist an User-ID gebunden und 10 Minuten gültig; Refresh Token wird AES-256-GCM-verschlüsselt in `user_integrations` gespeichert. Verbindung wird beim Trennen und nach erfolgreicher Kontobereinigung widerrufen.
- **Verschlüsselung:** HTTPS zu Google; gespeicherte Credentials zusätzlich anwendungsseitig AES-256-GCM.
- **Berechtigungen:** Der Code fordert `gmail.send`, `calendar.events`, `openid` und `email` an; vom Nutzer erteilte Scopes werden geprüft. Keine Hintergrund-Gmail-Lese-Funktion im dokumentierten Flow. Die Google-Cloud-Konsole listet am 2026-11-06 keine sensiblen oder eingeschränkten Scopes und meldet, dass keine Überprüfung erforderlich sei. Der Client `CloseFlow Integrationen` erlaubt als Weiterleitung `https://www.closeflowapp.de/api/integrations/google/callback`; die lokale Client-ID stimmt mit diesem Client überein. Das bestätigt weder die produktive Vercel-Client-ID noch die tatsächliche OAuth-Zustimmung. Vor Produktivnutzung müssen diese und die Abweichung zur Scope-Liste geklärt werden.
- **Fehlerverhalten:** OAuth-Fehler führen zurück zu Settings; API-Fehler melden generische Integrationsfehler; Kalender-Erstellungsfehler werden geloggt.
- **Logging:** Verbindungs-/Trenn-Audit; Fehlerlogs können Providerstatus, aber keine OAuth-Secrets enthalten sollen.
- **Verantwortung:** Nutzer für Google-Zustimmung; CloseFlow für Scope-Minimierung/Token-Schutz; Google für API-Verarbeitung und Verifizierung.

### DF-06 Vercel-Server → Resend → E-Mail-Empfänger

- **Quelle → Ziel:** CloseFlow-Mailfunktionen → Resend API → Einladungs-, Benachrichtigungs- oder Betreiber-Mailbox.
- **Daten:** E-Mail-Adressen, Workspace-/Einladungslink, Notification-Titel/-Text, Betreiber-Alert-Zahlen.
- **Authentifizierung:** `RESEND_API_KEY`; Sender via `EMAIL_FROM`.
- **Verschlüsselung:** HTTPS zum Provider und dessen Mailtransport; SMTP/TLS-Zustellung beim Empfänger abhängig vom Empfänger-Mailserver.
- **Berechtigungen:** Server darf mit API-Key Nachrichten versenden; Einladungslinks sind tokenisiert; Notification-Mail wird nur bei gespeicherter Einwilligung verschickt.
- **Fehlerverhalten:** API-Fehler führen zu Fehlerantwort oder Cron-Fehlerzählung; Zustellung ist asynchron.
- **Logging:** Versandstatus/Fehler; `email.ts` protokolliert bei Einladungsfehlern die vollständige Provider-Fehlerstruktur. Diese darf keine Empfänger-/Inhaltsdaten enthalten; tatsächliche Resend-Fehlerstruktur und Dashboard-Retention sind zu bestätigen.
- **Verantwortung:** CloseFlow für Empfänger/Content/Einwilligung; Resend für Zustellung/Logs; Betreiber für Domainverifizierung und Retention.

### DF-07 Browser/Vercel ↔ Stripe

- **Quelle → Ziel:** Serverseitige Checkout-/Portal-Erstellung → Stripe; Stripe Webhook → CloseFlow; Browser wird zur gehosteten Stripe-Seite umgeleitet.
- **Daten:** Workspace-/Plan-/Stripe-Kunden-/Subscription-IDs, Abonnementstatus und Abrechnungsereignisse. CloseFlow speichert keine rohen Kartendaten.
- **Authentifizierung:** Server-seitiger `STRIPE_SECRET_KEY`; Webhook prüft rohe Payload mit `STRIPE_WEBHOOK_SECRET` und `stripe-signature`.
- **Verschlüsselung:** HTTPS und Stripe-gehostete Zahlungsseiten.
- **Berechtigungen:** Backend erstellt Checkout/Portal nur nach User-/Workspace-Prüfung; Webhook nutzt Service Role und schreibt Subscription-Zustand, nicht frei wählbare Workspace-Daten aus einer unvalidierten Anfrage.
- **Fehlerverhalten:** Ungültige Signatur 400; Konfigurationsfehler 500; Ereignisse werden zeitlich auf veraltete Updates geprüft.
- **Logging:** Fehler werden serverseitig erfasst; keine Kartennummern im CRM.
- **Verantwortung:** CloseFlow für Webhook-/Planlogik; Stripe für Karten-/Abrechnungsdaten; Betreiber für Live-Schlüssel und Steuerkonfiguration.

### DF-08 GitHub → GitHub Actions / npm Registry → CI-Artefakte

- **Quelle → Ziel:** GitHub-Repository löst CI/CodeQL aus; GitHub Runner lädt Node/npm-Dependencies und Actions; CI lädt ein CycloneDX-SBOM-Artefakt hoch.
- **Daten:** Repository-Code, Commits, Test-/Build-Ausgaben, Dependency-Metadaten, SBOM.
- **Authentifizierung:** `GITHUB_TOKEN` mit `contents: read`; GitHub Actions Token für Upload-Artefakt.
- **Verschlüsselung:** GitHub HTTPS und Runner-Plattform.
- **Berechtigungen:** Branch-/Ruleset- und Required-Check-Konfiguration in GitHub; CI-Workflow mit minimalen Repository-Rechten. Actions sind derzeit überwiegend per Major-Tag (`@v4`, `@v3`) und nicht Commit-SHA gepinnt.
- **Fehlerverhalten:** CI schlägt bei Pflichtprüfungsfehlern fehl; bei Push können Required-Checks noch ausstehend sein.
- **Logging:** GitHub Actions Logs; Logs dürfen keine Secrets ausgeben.
- **Verantwortung:** Betreiber für Repository-/Ruleset-/Secrets-Zugriff; GitHub für Runner/Plattform; npm-/Action-Maintainer für Supply Chain.

### DF-09 Vercel Deployment und Cron

- **Quelle → Ziel:** GitHub-Commit/Deployment-Integration → Vercel Build und Runtime; Vercel-Cron triggert `/api/cron/automations`, `/api/cron/notifications`, `/api/cron/alerts`.
- **Daten:** Quellcode, Build-Output, Umgebungsvariablen; Cron liest Automationen/Benachrichtigungen/Auditdaten, ggf. sendet E-Mails.
- **Authentifizierung:** Vercel-Projektintegration; Cron-Routen prüfen Bearer `CRON_SECRET`.
- **Verschlüsselung:** Plattformseitig; Vercel-Env-Secret-Verwaltung.
- **Berechtigungen:** Cron-Routen nutzen Service Role, begrenzte Jobs und Workspace-Scopes; Projektmitglieder können Deployments/Secrets beeinflussen.
- **Fehlerverhalten:** Jobs antworten mit Fehlerstatus/Fehlerzählung; keine automatische Failover-Umgebung dokumentiert.
- **Logging:** Vercel Runtime/Cron Logs; tatsächliche Aufbewahrung und Alarmierung tarifabhängig und offen.
- **Verantwortung:** Betreiber für Mitglieder, Secrets, Regions-/Firewall-/Cron-Settings; Vercel für Plattform.

### DF-10 Profilbild-URL (früherer Datenfluss, im Repository blockiert)

- **Früherer Quelle → Ziel-Pfad:** Browser lud `profiles.avatar_url` direkt von einer vom Nutzer oder OAuth-Provider gelieferten URL.
- **Frühere Daten:** Netzwerk-Metadaten (IP, User-Agent, Referrer/Origin) und Bildabruf; Bild-URLs konnten nutzerbezogene Parameter enthalten.
- **Aktuelle Codekontrollen:** UI-Felder und `<img>`-Vorschau entfernt; beide Profil-API-PATCH-Routen lehnen nichtleere Avatarwerte mit 400 ab; Profil-GET gibt keine gespeicherte URL aus; OAuth-Sync schreibt einen leeren Profilwert.
- **Verbleibende Daten:** Frühere Profilwerte werden nicht per Migration massenhaft gelöscht. OAuth-Bild-URLs können in Supabase-Auth-Provider-Metadaten verbleiben; CloseFlow rendert oder lädt sie nicht. Ein ausdrücklicher Datenlöschlauf für Altwerte ist nicht erfolgt.
- **Fehlerverhalten/Logging:** API-Anfragen mit einem nichtleeren Avatarwert erhalten 400; kein externer Bildhost wird kontaktiert.
- **Status:** Im Repository blockiert; produktiver Rollout und Browser-Netzwerkprüfung sind noch nicht bestätigt.

### DF-11 Supabase Auth → E-Mail-Zustellung

- **Quelle → Ziel:** Supabase Auth versendet Login-/Bestätigungs-/Recovery-E-Mails über den im Projekt konfigurierten SMTP-Anbieter.
- **Daten:** Konto-E-Mail-Adresse und Auth-/Recovery-Link bzw. Auth-Token.
- **Authentifizierung/Verschlüsselung:** Supabase Auth und SMTP-Konfiguration des Projekts. Der öffentliche Supabase-Auth-Settings-Abruf am 2026-11-06 bestätigte `external.email=true` und `mailer_autoconfirm=false`; er enthält keine SMTP-Host-/Region-Angabe.
- **Berechtigungen/Fehler/Logging:** Abhängig von Supabase-/SMTP-Einstellungen.
- **Verantwortung:** Betreiber und Supabase; SMTP-Konfiguration, Regionen und Retention müssen in der Supabase-Konsole inventarisiert werden.
- **Status:** Historischer Produktions-Smoke-Run vom 2026-10-24 meldet IONOS-Mailboxen und konfiguriertes Supabase Custom SMTP. Betreiberbestätigung vom 2026-11-06: Custom SMTP aktiv, Host `smtp.ionos.de`. SMTP-Region und Aufbewahrung sind noch nicht dokumentiert.

### DF-12 Browser ↔ Supabase Auth ↔ Google / Microsoft Azure (Social Login)

- **Quelle → Ziel:** Nutzer startet Google- oder Microsoft-Login im Browser; Supabase Auth leitet zum aktivierten Provider weiter und verarbeitet den Rückruf; CloseFlow tauscht den Supabase-Auth-Code gegen eine Anwendungssession.
- **Daten:** Auth-Code und Provider-Identitätsdaten, insbesondere E-Mail und Profilmetadaten; der Callback synchronisiert Name, Username, Firmenname und Sprache in `profiles`, aber keine Avatar-URL. Supabase kann Providerbild-Metadaten unabhängig davon in Auth-Identitäten speichern. Keine CRM-Daten werden an den OAuth-Provider übermittelt.
- **Authentifizierung:** Provider-OAuth-Client-Konfiguration im Supabase-Projekt; Anwendung verwendet Supabase `signInWithOAuth` und `exchangeCodeForSession`. Provider-Client-Secrets liegen außerhalb des Repositories.
- **Verschlüsselung:** HTTPS für Browser-, Supabase- und Provider-Verbindungen; Provider-Tokens und Supabase-Session werden nach Supabase-Auth-Konfiguration verarbeitet.
- **Berechtigungen:** Am 2026-11-06 über `/auth/v1/settings` bestätigt: E-Mail, Google und Azure als externe Auth-Provider aktiviert. Der Login-Code zeigt Google- und Microsoft-Buttons. Google Cloud zeigt die OAuth-App als extern und „In Produktion“, 1 von 100 Nutzern, zwei Webclients sowie keine registrierten sensiblen/eingeschränkten Scopes. Der Code fordert `openid`, `email`, `https://www.googleapis.com/auth/gmail.send` und `https://www.googleapis.com/auth/calendar.events` an; Zuordnung und wirksame Einwilligung müssen überprüft werden. Azure-Provider-Details bleiben ungeprüft.
- **Fehlerverhalten:** OAuth-Fehler leiten mit Fehlerstatus zurück zum Login; Callback prüft Code und begrenzt `next` auf sichere interne Pfade.
- **Logging:** Supabase Auth-Logs und Vercel-Callback-Logs; tatsächliche Retention im Dashboard/Tarif zu bestätigen.
- **Verantwortung:** CloseFlow für Callback-/Session-Sicherheit; Betreiber für OAuth-App-Konfiguration und erlaubte Redirect-Origins; Supabase und die jeweiligen Identitätsanbieter für den Auth-Transport.

### DF-13 CloseFlow-Projektbereich ↔ Vercel KI-Modellanbieter (projektbezogene Datenfreigabe)

- **Quelle → Ziel:** Vercel-Projekt `closeflow` → von Vercel eingesetzte KI-Modellanbieter, falls Vercel seine dokumentierte Nutzung von Projekt-Code und Chatdaten für Modelltraining ausführt.
- **Daten:** Laut Vercel-Einstellungsbeschreibung „code and chat data“ des Projekts. Das ist nicht gleichbedeutend mit einem bestätigten Laufzeitfluss aller CRM-Datensätze; welche konkreten Code-/Chatinhalte erfasst werden, geht aus der Oberfläche nicht hervor.
- **Authentifizierung:** Vercel-Projekt-/Teamkonfiguration. Die zuvor aktivierte Option „Improve models with this project’s data“ wurde am 2026-11-06 mit Betreiberfreigabe deaktiviert und gespeichert.
- **Verschlüsselung:** Plattforminterne Übertragung und Verarbeitung unterliegen Vercels Bedingungen; konkrete Provider, Region und Retention waren aus der geprüften Einstellung nicht ersichtlich.
- **Berechtigungen:** Die Projekt-Checkbox war nach dem Speichern und erneutem Laden deaktiviert. Der zuvor fehlgeschlagene Versuch betraf das verdeckte Checkbox-Element; über das sichtbare Bedienelement war die Änderung möglich. Die Teamoption blieb aktiviert und wurde nicht geändert.
- **Fehlerverhalten:** Nicht anwendbar auf den CloseFlow-Runtime-Requestpfad; der Projektbereich bietet keinen für diese Prüfung sichtbaren Laufzeitstatus dieses Datenexports.
- **Logging:** Nicht in der Oberfläche verifiziert; Vercel-Projekt-/Team-Audit- und Log-Einstellungen gesondert prüfen.
- **Verantwortung:** Betreiber verantwortet Projekt-/Teamoptionen; Vercel verantwortet Anbieterbeziehungen und Verarbeitung nach den einschlägigen Einstellungen/Bedingungen.
- **Status:** Für das Projekt deaktiviert; Vercel sagt laut Einstellung zu, künftig keine Daten dieses Projekts zu diesem Zweck weiterzugeben. Früher übertragene Inhalte, Empfänger und Aufbewahrung bleiben unbestätigt; andere Teamprojekte sind von der Projektänderung nicht umfasst.

## 3. Vertrauensgrenzen (ARCH-004)

1. **Nutzergerät ↔ CloseFlow-Frontend:** Eingaben, URL-Parameter, Dateien und Browserumgebung sind nicht vertrauenswürdig.
2. **Browser ↔ Supabase:** Publishable-Key ist öffentlich; Nutzer-JWT/RLS und Policies begrenzen Zugriff. Manipulierte Requests sind zu erwarten.
3. **Vercel Runtime ↔ Supabase User-Access:** User-JWT soll dieselben RLS-/Workspace-Berechtigungen respektieren.
4. **Vercel Runtime ↔ Supabase Service Role:** Hochprivilegierte Grenze; RLS wird umgangen. Nur eng begrenzte Serverpfade dürfen diesen Zugang verwenden; Leakage bedeutet potenziell systemweiten Datenzugriff.
5. **CloseFlow ↔ Azure OpenAI:** CRM-/Nutzerdaten verlassen die CloseFlow- und Supabase-Grenze; Azure-Vertrag, Region, Retention und Abuse Monitoring müssen bestätigt werden.
6. **CloseFlow ↔ Google OAuth/APIs:** Externe Nutzerautorisierung und langlebige Refresh-Tokens; Token-Schlüssel und Google-Konto sind separate Grenzen.
7. **CloseFlow ↔ Resend/E-Mail-Empfänger:** Nachrichteninhalte verlassen die Anwendung; E-Mail kann weitergeleitet/gespeichert werden und ist kein vertraulicher Kanal.
8. **CloseFlow ↔ Stripe:** Zahlungs-/Subscription-Ereignisse sind nur nach Signaturprüfung vertrauenswürdig; Webhook-Eingang hat Service-Role-Wirkung.
9. **GitHub/npm/Actions ↔ Build-Artefakt:** Quellcode und externe Build-Abhängigkeiten können Produktionscode beeinflussen; Freigabe und SHA-Pinning sind wichtige Kontrollen.
10. **Vercel-/Supabase-/Google-/Azure-/Resend-/Stripe-Admin-Portale:** Betreiberkonten und Providerpersonal liegen außerhalb der App-RLS; Kontoschutz und Rollen sind Betreiber-/Providerverantwortung.
11. **Anwendung ↔ nutzerkontrollierte Avatar-Domain:** Frühere Avatar-Vorschau lud externe URLs im Browser; aktuelle Repository-Kontrollen blockieren URL-Annahme und Ausgabe. Bereits gespeicherte Altwerte werden nicht aktiv abgerufen; produktiven Rollout verifizieren.
12. **Produktions- vs. lokale/test Umgebungen:** lokale `.env.local`, Test-Schlüssel und Testdaten dürfen nicht in Produktion bzw. Logs übergehen. Keine Geheimniswerte in dieses Inventar aufnehmen.
13. **Vercel-Projektmetadaten und Vercel-KI-Funktionen:** Projekt-Code/Chatdaten können nach der aktuell aktivierten Einstellung zu KI-Modellanbietern gelangen; dies ist von den produktiven HTTP-/CRM-Datenflüssen zu trennen und als zusätzliche Providerverarbeitung zu behandeln.

## 4. Klassifizierung personenbezogener und sensibler Daten (ARCH-005)

| Klasse | Datenbeispiele im Projekt | Schutz und Verarbeitungsgrenze |
|---|---|---|
| Streng vertraulich / Authentisierung | Passwort-Hashes, MFA-/Recovery-Daten, Session-/Refresh-Tokens, Google OAuth Credentials, API-/Service-Role-/Webhook-/Cron-Secrets | Supabase Auth/Secret Store; Google Tokens zusätzlich AES-256-GCM; nur Server; nie in Client-Bundle/Logs/Backups unverschlüsselt |
| Vertraulich / CRM und Geschäftsdaten | Lead- und Kundenname, Kontaktperson, E-Mail, Telefon, Website, Notizen, Pipeline-Status/Wert/Wahrscheinlichkeit, Aufgaben, Aktivitäten, Termine | Workspace-RLS, TLS, Workspace-spezifische Autorisierung; Export-/AI-/Google-/E-Mail-Flüsse minimieren |
| Vertraulich / Kommunikation und Dateien | Feedbackkommentar/-kontakt, E-Mail-Entwürfe/-Inhalte, importierte CSV-/Dateiinhalte, Gmail-/Kalenderinhalte | Zweckgebundene Verarbeitung; nicht in unnötige Logs übernehmen; private Storage-Policies; Provider-AVV/Retention bestätigen |
| Vertraulich / Identitäts- und Abrechnungsdaten | Nutzer-E-Mail, Profilname/Telefon, Workspace-Mitgliedschaft/Rolle, Stripe-Kunden-/Subscription-IDs und Status | Supabase RLS bzw. Stripe; keine rohen Zahlungsdaten in App-DB |
| Intern / Sicherheits- und Betriebsdaten | Audit-Ereignisse, IP-basierte Rate-Limit-Schlüssel, Fehlerstatus, Nutzungs-/Token-/Kostenwerte, Deployment-Commit | Zugriff begrenzen, Retention festlegen; keine unnötigen Prompt-/Antwortdaten in Telemetrie |
| Vertraulich / Quellcode und Projekt-Chats | CloseFlow-Repository-Code und Vercel-Projekt-Chats, die im Rahmen der Vercel-Einstellung „Improve models with this project’s data“ erfasst werden könnten | Vercel-Projektsetting war am 2026-11-06 aktiviert; konkrete Datenauswahl, Anbieter und Retention müssen geklärt werden |
| Öffentlich oder Nutzer-kontrolliert | Öffentliche Landing-/Legal-Seiten, öffentliche Feedback-Routen mit tokenisiertem Workspace-Link, Website-URLs | „Öffentlich erreichbar“ bedeutet nicht „ohne Berechtigungsprüfung“; Profilbild-URLs werden im aktuellen Repository-Code nicht gerendert oder abgerufen |
| Besondere Kategorien / hochsensible Freitexte | Nicht als notwendige CRM-Felder vorgesehen; Nutzer können solche Inhalte aber in freie Notizen, Aktivitäten, Dateien oder KI-Eingaben schreiben | Vor Go-live Nutzungsrichtlinien, Rechtsgrundlage, Auftragsverarbeitung, Löschfristen und KI-Eingabehinweis klären; aktuell keine technische Erkennung oder Garantie der Vermeidung |

## 5. Secrets- und Zugangsdateninventar (ARCH-006)

Keine Werte oder Auszüge werden hier gespeichert.

| Secret / Konfiguration | Zweck | vorgesehener Speicher / Verbraucher |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | RLS-umgehender Adminzugriff | serverseitige Vercel-Env; `createAdminClient`, klar begrenzte Admin-/Cron-/Webhook-/Systempfade |
| `AZURE_OPENAI_API_KEY` | KI-Providerzugriff | serverseitige Vercel-Env; zentraler Azure-Client |
| `STRIPE_SECRET_KEY` | Stripe Server-SDK, Checkout/Portal/Webhook | serverseitige Vercel-Env |
| `STRIPE_WEBHOOK_SECRET` | Signaturprüfung eingehender Stripe-Webhooks | serverseitige Vercel-Env |
| `RESEND_API_KEY` | E-Mail-API | serverseitige Vercel-Env |
| `GOOGLE_OAUTH_CLIENT_SECRET` | OAuth-Code-/Refresh-Token-Austausch | serverseitige Vercel-Env |
| `INTEGRATIONS_ENCRYPTION_KEY` | AES-256-GCM für gespeicherte Google Credentials; zugleich OAuth-State-HMAC-Key | serverseitige Vercel-/lokale Secret-Env; kein im Code dokumentierter Rotation-/Key-Versionierungsprozess |
| `CRON_SECRET` | Bearer-Authentisierung der drei Cron-Routen | serverseitige Vercel-Env; dokumentierte Mindestlänge 32 Zeichen, Wert/Länge nicht unabhängig geprüft |
| `MAINTENANCE_BYPASS_SECRET` | Bypass des Wartungsmodus | serverseitige Vercel-Env |
| `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` | Stripe-Preismapping | Vercel-Konfiguration; IDs sind keine Zugangsschlüssel, aber Deployment-Konfiguration |
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`, Deployment-Namen und Preise | Provider-Ziel, Version, Kostenkalkulation | Serverkonfiguration; keine Authentisierungsgeheimnisse (Endpoint/Deployment können Infrastruktur-Metadaten sein) |
| `AZURE_OPENAI_GPT_4_1_MINI_INPUT_USD_PER_1M_TOKENS`, `AZURE_OPENAI_GPT_4_1_MINI_OUTPUT_USD_PER_1M_TOKENS`, `AZURE_OPENAI_GPT_4O_MINI_INPUT_USD_PER_1M_TOKENS`, `AZURE_OPENAI_GPT_4O_MINI_OUTPUT_USD_PER_1M_TOKENS` | Kostenkalkulation, keine Zugangsdaten | Serverkonfiguration; Werte müssen zu Azure-Region/Deployment passen |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser-/Serverprojektzugang | bewusst öffentlich; Sicherheit beruht auf RLS/Grants, nicht Geheimhaltung |
| `GOOGLE_OAUTH_CLIENT_ID`, URLs, `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL` | öffentliche OAuth-/Origin-Konfiguration | Server/Browserkonfiguration; keine Secrets |
| `CLOSEFLOW_ADMIN_EMAILS` | Allowlist für plattformweite Admin-Funktionen; verlangt bestätigte E-Mail | Vercel-Env; organisatorisch privilegierte Konfiguration |
| `CLOSEFLOW_ALERT_EMAIL`, `CLOSEFLOW_ALERT_ERROR_THRESHOLD`, `EMAIL_FROM`, Stripe Redirect-URLs, `CSP_REPORT_ONLY`, `MAINTENANCE_MODE` | Betriebs-/Benachrichtigungs-/Deployment-Konfiguration | Vercel-Projektkonfiguration; kein Secret außer wenn URL/Adresse intern sensibel ist |
| `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID`, `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL` | Stripe-Preis- und Redirect-Konfiguration | Vercel-Projektkonfiguration |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `APP_URL` | Öffentliche Canonical-/OAuth-/Mail-Link-Origins | Deploymentkonfiguration; müssen auf erwartete HTTPS-Origin zeigen |
| `VERCEL_GIT_COMMIT_SHA`, `NODE_ENV` | Build-/Laufzeit-Metadaten | Vercel/Runtime |

### Admin-Zugänge und erhöhte Rechte (ARCH-008)

- **Providerkonten:** GitHub, Vercel, Supabase, Resend, Stripe, Google Cloud und Azure sind in [`security-policy.md`](./security-policy.md) als Produktionszugänge erfasst. Dort ist der Betreiber als alleiniger Zugangsträger dokumentiert; 2FA soll auf allen Konten gelten. Die tatsächliche Nutzerliste, 2FA-Konfiguration und Recovery-Zugänge sind nicht über Code verifizierbar.
- **GitHub:** Repository `jhandersch/closeflow`, Branch `main`, Ruleset/CI/CodeQL; Actions werden noch nicht alle auf unveränderliche Commit-SHAs gepinnt.
- **Plattform-Admin in CloseFlow:** `CLOSEFLOW_ADMIN_EMAILS` und bestätigte Nutzer-E-Mail; privilegierte Admin-Routen müssen diese Prüfung vor Service-Role-Abfragen ausführen.
- **Workspace-Admins:** Rollen owner/admin und weitere Workspace-Rollen; Autorisierung serverseitig und über RLS/Workspace-Checks.
- **Service Role:** technisch Vollzugriff auf Supabase-Daten; daher keine menschliche Browserrolle, kein Client-Key, nur privilegierte Serverpfade.
- **Notfallzugriff / Separation of Duties:** zweite Vertrauensperson und unabhängige Vier-Augen-Freigabe fehlen laut Betriebsdokumentation; Einzelpersonenrisiko ist im Bedrohungsmodell.

## 6. Endpunkte: öffentlich, signiert, authentisiert, intern (ARCH-007)

Es wurden **72 API-Route-Dateien** unter `src/app/api` gezählt. HTTP-Erreichbarkeit bedeutet nicht anonyme Berechtigung. Die Sicherheitsgrenze ist je Gruppe:

| Gruppe | Endpunkte / Zugang |
|---|---|
| Öffentliche Webinhalte | `/`, `/login`, `/pricing`, `/impressum`, `/datenschutz`, `/cookies`, `/agb` und weitere Marketing-/Legal-Seiten; öffentliche Ausgabe, keine CRM-Daten |
| OAuth | `/auth/callback` verarbeitet einen Supabase-Auth-Code und validiert/normalisiert `next`; `/api/integrations/google/callback` erfordert Benutzerkontext und signierten nutzergebundenen OAuth-State |
| Health | `GET /api/health` ist öffentlich und gibt nur `status`, Service-/Commitversion, pass/fail für DB und Konfiguration sowie Zeit aus; keine Werte/Fehlerdetails |
| Cron | `GET /api/cron/automations`, `/api/cron/notifications`, `/api/cron/alerts`; öffentlich routbar, aber Bearer-`CRON_SECRET` erforderlich; Service Role wird nach erfolgreicher Auth benutzt |
| Stripe | `POST /api/stripe/webhook` ist öffentlich routbar, aber rohe Payload muss Stripe-Signatur bestehen; andere Billing-/Checkout-Routen benötigen User-/Workspace-Authentisierung |
| Feedback | `POST /api/feedback` ist signiertes Feedback-Formular (HMAC auf Workspace-ID, Rate-Limit, Feldlimits); Token hat derzeit kein Ablaufdatum/Einzelverwendung. `GET /api/feedback` authentisiert User und liefert Workspace-Feedback sowie wiederverwendbaren Link. `/feedback/[workspaceId]` ist mit Signatur erreichbar |
| Admin | `/api/admin/overview`, `/api/admin/users` benötigen bestätigte Admin-Allowlist-Identität |
| Nutzer-/Workspace-API | Leads, Kunden, Tasks, Aktivitäten, Kalender, Dateien, Import/Export, Profile, Einladungen, Rollen, Audit, Suche, Notifications und Usage erfordern User-Session plus Workspace-/Rollen-/RLS-Prüfung; schreibende Routen mit Viewer-Guard |
| KI-API | 15 Provider-Routen; authentisierte User, Workspace-Kontext und KI-Quote; zentrale Azure-Konfiguration, Request-Guard und Telemetrie |
| Monitoring-API | Fehlerberichte und Recovery-Code-Endpunkte brauchen Auth bzw. eigene Rate-Limits/Autorisierung |
| Demo/Onboarding | `POST /api/demo/seed` wird nur innerhalb des authentisierten Onboarding-Flows aufgerufen; Onboarding selbst ist user-authentisiert und scoped |

Vollständige statische Routenliste aus den `export function GET/POST/...`-Handlern (dynamische Parameter in eckigen Klammern):

```text
GET,POST      /api/activity
POST          /api/activity-ai
GET           /api/admin/overview
GET           /api/admin/users
POST          /api/ai/chat
POST          /api/ai/email-generator
POST          /api/ai/email-rewrite
POST          /api/ai/lead-score
POST          /api/ai/meeting-prep
POST          /api/ai-insight
GET           /api/audit-logs
DELETE,GET,
PATCH,POST    /api/automations
GET           /api/billing
DELETE,GET,
POST,PUT      /api/calendar/events
POST          /api/calendar/events/restore
GET           /api/cron/alerts
GET           /api/cron/automations
GET           /api/cron/notifications
GET           /api/customers/export
POST          /api/customers/import
GET           /api/dashboard/forecast
POST          /api/demo/seed
GET,POST      /api/feedback
DELETE,GET,
POST          /api/files
POST          /api/follow-up-ai
POST          /api/follow-up-ai/forecast-ai
GET           /api/health
GET,DELETE    /api/integrations/google
POST          /api/integrations/google/import
GET           /api/integrations/google/callback
GET           /api/integrations
POST          /api/lead-memory-ai
DELETE,GET,
PATCH,POST,
PUT           /api/leads
POST          /api/leads/[id]/ai-analysis
POST          /api/leads/[id]/email
POST          /api/leads/[id]/follow-up-ai
POST          /api/leads/[id]/next-action
POST          /api/leads/[id]/score
GET           /api/leads/export
POST          /api/leads/import
GET           /api/leads/search
DELETE        /api/leads/trash
GET           /api/me/permissions
GET,POST      /api/monitoring/errors
GET           /api/notifications
POST          /api/onboarding
POST          /api/priority-ai
POST          /api/priority-analysis
GET,PATCH     /api/profile
PATCH         /api/profile/avatar
POST          /api/profile/delete
PATCH         /api/profile/preferences
POST          /api/revenue-forecast-ai
POST          /api/sales-copilot
GET           /api/search
POST          /api/security/recovery-codes/regenerate
GET           /api/security/recovery-codes/status
POST          /api/security/recovery-codes/verify
POST          /api/stripe/change-plan
POST          /api/stripe/create-checkout
POST          /api/stripe/create-portal
POST          /api/stripe/webhook
GET           /api/usage
POST          /api/workspaces/create
POST          /api/workspaces/delete
POST          /api/workspaces/invite
POST          /api/workspaces/invite/accept
POST          /api/workspaces/invite/revoke
GET           /api/workspaces/members
POST          /api/workspaces/remove-member
GET           /api/workspaces
POST          /api/workspaces/update-role
```

Diese Liste erfasst Methoden aus Funktionsdeklarationen; Methoden, die Next.js automatisch beantwortet oder außerhalb von Route-Handlern gerendert werden, sind nicht enthalten. Auth-Tests decken gemeinsame AI-/Workspace-Verträge und ausgewählte Endpunkte ab, nicht jeden Methodenzweig aller 72 Dateien.

## 7. Bedrohungsmodell (ARCH-010)

Bewertung **W** = Eintrittswahrscheinlichkeit; **A** = Auswirkung. Die Einstufungen sind qualitative Code-/Betriebsbewertungen, keine statistische Messung. „Rest“ bezeichnet Risiko nach dokumentierten Kontrollen.

| ID / Bedrohung | Konkretes Angriffsszenario | W | A | Gegenmaßnahmen / Nachweis | Reststatus |
|---|---|---:|---:|---|---|
| THR-001 Account-Übernahme | Passwort-Reuse/Phishing kompromittiert Betreiber- oder Nutzerkonto; Angreifer nutzt Session für Datenexport/Workspace-Zugriff | Mittel | Hoch | Supabase Auth, MFA-Funktionen, bestätigte E-Mail, Recovery-Rate-Limits, Admin nur bestätigte Allowlist-E-Mail; Provider-2FA ist teilweise Betreiberangabe | Mittel: Passkeys/alle Portal-2FA/aktive Sessions und Auth-Alarmierung nicht vollständig unabhängig bestätigt |
| THR-002 Zugriff auf fremde Workspaces | Manipulierter `workspace_id`, Record-ID, Storage-Pfad oder KI-Kontext zielt auf fremden Mandanten | Niedrig–Mittel | Sehr hoch | PostgreSQL RLS, Workspace-Auth, Tenancy-Lint, lokale/Produktions-RLS-Matrix; fünf Viewer-RPC-Fixes und `lead_automations`-Insert-Guard | Niedrig, nicht null: nicht jeder API-Zweig wurde gegen jeden Objekt-/Rollenfall dynamisch getestet |
| THR-003 Privilegieneskalation | Member/Viewer ruft Admin-Route oder privilegierte RPC auf oder ändert Workspace-Rolle | Niedrig–Mittel | Hoch | bestätigte Plattform-Admin-Allowlist; Workspace-Rollenchecks; RLS und `can_write_workspace`; Audit-Events für Rollen-/Mitgliedsaktionen | Niedrig–Mittel: privilegierte Pfade brauchen fortlaufende Regressionstests; Service Role hat systemweiten Zugriff |
| THR-004 Datenbankmanipulation | SQL-/API-Eingaben umgehen RLS, schreiben in fremde Workspace-Daten oder missbrauchen SECURITY DEFINER | Niedrig–Mittel | Sehr hoch | parametrisierte Supabase-Queries; RLS auf geprüften Tabellen; Review von 25 SECURITY DEFINER-Funktionen mit `search_path`; RPC-Rechte begrenzt | Niedrig–Mittel: live Schema-Drift/Policies bleiben deploy- und migrationsabhängig |
| THR-005 API-Missbrauch | Bot spamt Login-/Import-/KI-/Export-/Feedback-Routen, verursacht Kosten oder Datenabfluss | Mittel | Hoch | KI-Quoten, Rate-Limits ausgewählter Routen, 1-MiB Proxy-Bodylimit, engere feldspezifische Limits einzelner Routen, CSRF-/Auth-Checks | Mittel: kein vollständiger globaler WAF-/Bot-Schutz nachgewiesen; nicht alle Endpunkte haben individuelle Rate-Limits |
| THR-006 Secret-Leak | Service-Role-/Azure-/Stripe-/OAuth-Key gelangt in Clientbundle, Git, Fehlerlog oder Preview | Niedrig–Mittel | Sehr hoch | Server-Env-Konventionen, Public-Key-Validierung, GitHub Secret Scanning/Push Protection laut Betreiber, CI; keine Admin-Client-Imports in Clientmodulen beim vorigen Scan gefunden | Mittel: tatsächliche Vercel-Env-/Teamrechte und Secret-Rotation können nicht aus Repo verifiziert werden; `email.ts` loggt vollständige Resend-Fehlerstruktur |
| THR-007 KI-Prompt-Injection | Lead-Notiz/importierter Text versucht Sicherheitsregeln umzuschreiben oder interne Informationen in E-Mail/Antwort zu bringen | Hoch | Hoch | zentraler Guard an letztem System-Prompt; User-/CRM-Inhalte als Daten, keine KI-Tools/automatisierten Aktionen; begrenzte Eingabe/Ausgabe; E-Mail-Datenallowlist | Hoch/teilweise: Promptregeln sind Defense-in-Depth und kein garantierter Schutz; Live-Red-Team und vollständige Ausgabeschemata fehlen |
| THR-008 OAuth-Token-Missbrauch | Angreifer stiehlt Refresh Token, fälscht State oder missbraucht Gmail-/Kalender-Berechtigung | Niedrig–Mittel | Hoch | State HMAC, User-Bindung, 10-Minuten-TTL; AES-256-GCM Credentials; Service-Role-only Tabelle; Disconnect-/Kontolöschungswiderruf; begrenzte Scopes | Mittel: State innerhalb TTL replaybar; Schlüsselrotation fehlt; Google-Konsole zeigt keine registrierten sensiblen/eingeschränkten Scopes, obwohl der Code Gmail-/Kalender-Scopes anfordert; wirksame Client-/Einwilligungskonfiguration offen |
| THR-009 Webhook-Manipulation | Angreifer schickt falsche Subscription-Events oder Replay, um Plan/Workspace zu ändern | Niedrig | Hoch | Stripe `constructEvent` prüft Signatur über rohe Payload; Status-/Eventzeit-Checks und Workspace-Upsert | Niedrig–Mittel: Live-/Adversarial-Tests offen; dedizierte Event-ID-Deduplizierung ist nicht separat dokumentiert |
| THR-010 Datenverlust | Fehlmigration, Löschung, Anbieter-Ausfall oder kompromittierter Admin löscht CRM-/Auth-Daten | Mittel | Sehr hoch | wöchentliches manuelles Backup, Checksummen, verschlüsselte Medien laut Betreiber, Restore-Test gegen neues Supabase-Projekt und In-Place-Prod-Restore dokumentiert | Mittel–Hoch: RPO bis 7 Tage, Storage-Datei-Inhalte fehlen im DB-Backup, halbjährliche Restore-Zeitmessung und PITR offen |
| THR-011 Denial of Service | Verteilte Anfragen verbrauchen Vercel-Compute, Supabase-Verbindungen, E-Mail-/KI-Budget | Mittel | Hoch | Bodylimits, DB/KI-Quoten, ausgewählte Rate-Limits, kurze Provider-Timeouts, Azure-Budgetalarme laut Betreiber | Mittel–Hoch: Budgetalarme sind kein Ausgabenlimit; Vercel-Firewall/Tarif und flächendeckende IP-/User-Limits nicht nachgewiesen |
| THR-012 Supply-Chain-Angriff | kompromittiertes npm-Paket oder GitHub Action führt Code im Build/CI aus | Niedrig–Mittel | Sehr hoch | Lockfile/npm ci, CodeQL, Dependabot, `npm audit`, Lizenzcheck, SBOM und minimale CI-Rechte | Mittel: Actions sind nicht durchgängig SHA-gepinnt; Registry-/Maintainer-Risiko bleibt inhärent |
| THR-013 Insider-Missbrauch | Einzelner Betreiber oder kompromittiertes Provider-Admin-Konto nutzt Service Role/Exporte ohne Vier-Augen-Prinzip | Niedrig (wenige Personen) | Sehr hoch | auditierte Exporte und Rollenänderungen; dokumentierter Incident-/Offboarding-Prozess; Plattformzugänge laut Betreiber nur eine Person | Mittel–Hoch: Single Point of Failure, keine unabhängige zweite Vertrauensperson oder Separation of Duties |
| THR-014 Datenschutzverletzung | CRM-/Kontakt-/Freitextdaten werden ohne ausreichende Rechtsgrundlage, AVV, Löschfrist oder in ungeprüfter Region an Azure/Google/E-Mail übertragen | Mittel | Sehr hoch | Datenklassen/Security Policy; KI-Datenminimierung; Google Scope-/Einwilligungsfluss; E-Mail-Consent; Wartungsmodus/NO-GO | Hoch/offen: Firmenverantwortung, AVVs, DSFA/Verzeichnis, Azure-Region/Retention und Auth-SMTP müssen Betreiber/rechtlich geklärt werden |

## 8. Abhängigkeiten, Aktualisierung und Prüfbelege (ARCH-009, ARCH-010)

- Supabase Auth liefert Identität/JWT, die Next.js-Server und RLS nutzen.
- Next.js-Server benötigt Supabase für Auth, CRM, Audit, Quoten und Storage; einige systemweite Jobs benötigen Service Role.
- Azure OpenAI benötigt serverseitige Workspace-/Quota-Entscheidung und die Azure-Deployment-/Preis-Konfiguration.
- Google OAuth-Token hängen von `GOOGLE_OAUTH_CLIENT_ID/SECRET` und `INTEGRATIONS_ENCRYPTION_KEY` ab; Gmail/Calendar-API braucht Nutzerzustimmung.
- Resend-Versand hängt von `RESEND_API_KEY`, `EMAIL_FROM` und Zustimmung/Empfänger-/Einladungsworkflow ab.
- Stripe Checkout/Billing hängt von Preis-IDs und Secret Key ab; Abo-Status hängt von korrekt konfiguriertem, signiertem Webhook ab.
- Vercel-Cron braucht `CRON_SECRET`, Supabase-Service-Role, bei Notifications Resend.
- GitHub Actions braucht npm-Registry/Actions-Verfügbarkeit; Vercel-Deployment des Projekts ist mit `jhandersch/closeflow` verbunden.
- Die zuvor aktivierte Projekt-Datenfreigabe für Modelltraining ist seit 2026-11-06 deaktiviert; frühere Empfänger und Retention waren in der sichtbaren Einstellung nicht ausgewiesen.
- Supabase-Dateiinhalte sind von Datenbank-Backups unabhängig und brauchen bei nicht leerem Bucket eine eigene Sicherung.

**Aktualisierung:** bei neuem Provider/SDK, neuer Datenkategorie, neuer Route mit externer Verarbeitung, Schema-/RLS-Migration, Änderungen an Adminzugriff/Secrets oder mindestens vierteljährlich. Eigentümer: aktuell Betreiber; bei Firmengründung Security-/Privacy-Verantwortliche benennen.

**ARCH-T01 Prüfergebnis:** Die Repository-Suche fand die Codepfade und SDK-Kategorien; Supabase Auth bestätigt E-Mail/Google/Azure; Resend bestätigt eine verifizierte Domain in Ireland und keine Webhooks; Supabase bestätigt Frankfurt als DB-Region und 0 Edge Functions. Kein Analytics-/Ads-SDK und keine weitere explizite Server-Integrationsfamilie wurde im Produktions-Dependency-Inventar gefunden. Der Vercel-Projektbereich zeigt die GitHub-Verknüpfung; die projektbezogene Datenfreigabe für KI-Modelltraining wurde deaktiviert und nach Reload geprüft. Die Function-Region-Projekteinstellung zeigt `iad1` in den USA; die Deployment-Detailansicht zeigt „all“, sodass die tatsächlich wirksame Region nicht abschließend bestimmt ist. Avatar-URLs werden im Repository-Code nicht mehr angenommen oder abgerufen; produktiver Rollout und Browser-Netzwerktest fehlen. Vercel-Log-Einstellungen, frühere Vercel-KI-Empfänger/Retention, Azure-Content-/Abuse-Einstellungen, aktuelle Google-/Stripe-Details sowie SMTP- und Anbieter-Log-Retention sind noch nicht verifiziert. ARCH-T01 ist **Code- und teilweise konsolenseitig geprüft; externe Gesamt-Abnahme offen**.

## 9. Erforderliche Betreiberbestätigungen für die externe ARCH-T01-Abnahme

Vor der endgültigen Abnahme muss der Betreiber die folgenden Fakten in den jeweiligen Konsolen prüfen. **Keine API-Keys, Passwörter, SMTP-Credentials oder sonstigen Secret-Werte übermitteln.** Wo eine Einstellung nicht aktiv ist, bitte „nicht aktiv“ nennen; wo sie unbekannt ist, bitte „unbekannt“ schreiben und nicht schätzen.

| Dienst | Zu bestätigen (nur Konfigurationsfakten, keine Secrets) |
|---|---|
| Supabase Auth / SMTP | **Bestätigt:** Custom SMTP aktiv, Host `smtp.ionos.de` (Betreiber, 2026-11-06). Noch nötig: SMTP-Region/Aufbewahrung, Auth-Mail-Templates/Redirect-Hosts und verfügbare Auth-Log-Aufbewahrung. |
| Supabase | **Konsole bestätigt:** Region Central EU (Frankfurt), AWS `eu-central-1`, Nano; 0 Edge Functions; keine native GitHub-/Vercel-Projektintegration im Integrationsbereich. Öffentliche Auth-Einstellungen bestätigen E-Mail/Google/Azure-Provider aktiv, Registrierung erlaubt und E-Mail-Autobestätigung aus. Noch zu prüfen: Analytics/Log-Drains, Extensions/Webhooks außerhalb dieses Repositories und Auth-/DB-/Storage-Log-/Backup-Aufbewahrung. |
| Vercel | **Konsole bestätigt:** Projekt `closeflow` mit GitHub-Repository `jhandersch/closeflow`; „Improve models with this project’s data“ am 2026-11-06 mit Freigabe deaktiviert, gespeichert und nach erneutem Laden als deaktiviert bestätigt. Zuvor mögliche Weitergabe von Code-/Chatdaten; konkrete Anbieter und Retention unklar. Teamoption unverändert aktiviert. Function-Region-Projekteinstellung `iad1` (Washington D.C., USA); die tatsächlich im laufenden Deployment wirksame Region ist nicht bestätigt. Projekt-Drains-Seite zeigt „create your first Drain“ und Upgrade-Aufforderung, keine projektbezogene Drain-Liste; Team-Drains sind damit nicht geprüft. Analytics-Dashboard ist erreichbar, Aktivierung und tatsächliche Datenübertragung sind daraus nicht bestätigt. Speed Insights und Runtime-/Build-Log-Aufbewahrung bleiben offen. |
| Azure OpenAI | **Konsole 2026-11-06:** `closeflow-openai-de`, aktiv, Germany West Central; `gpt-4.1-mini`, Version `2025-04-14`, `Global Standard`, `DefaultV2`, Status `Succeeded`. Keine Diagnostic Settings für die Ressource definiert. Global kann Inferenz außerhalb der EU stattfinden. Die ohne Deployment abgebrochenen Dialoge boten Data Zone Standard in der EUR Data Zone mit 2 Mio. TPM verfügbarer Quota für `gpt-4.1-mini` und 1 Mio. TPM für `gpt-4o-mini` an. Quota kann sich ändern; Bereitstellung und genaue Grenze der EU Data Boundary sind nicht bestätigt. Die Preisliste des zugehörigen Abrechnungsprofils bestätigt die dokumentierten Modelltarife für November 2026. Historisch zeigten beide Modellpfade auf `gpt-4.1-mini`; aktuelle Secret-Werte in Vercel sind nicht bestätigt. Vergleich und Rollout-Voraussetzungen: [`ai-security-review.md`](./ai-security-review.md#azure-alternative-data-zone-standard). Produktions-Endpoint-Zuordnung, Datenschutz-/Transferentscheidung, Abuse-Monitoring und Aufbewahrungsfrist bleiben offen. |
| Resend / Google / Stripe | **Resend-Konsole bestätigt:** Domain `closeflowapp.de` verifiziert, DNS-Provider IONOS, Region Ireland (`eu-west-1`), Forge deaktiviert, keine Webhooks. **Google Cloud am 2026-11-06 geprüft:** OAuth-App extern/„In Produktion“, 1/100 Nutzer, zwei OAuth-Webclients; keine sensiblen/eingeschränkten Scopes im Datenzugriff registriert und keine Überprüfung erforderlich laut Überprüfungscenter. Code fordert Gmail-/Kalender-Scopes an; wirksame Client-Zuordnung und Einwilligung offen. **Stripe:** Dashboard zeigte „CloseFlow Sandbox“ in der Testansicht; Produktionskonto und Webhooks nicht bestätigt. |
| Browser/Avatar | **Entscheidung des Betreibers (2026-11-06) technisch im Repository umgesetzt:** Profilbild-URL-Felder/Vorschau entfernt, API weist nichtleere URLs zurück und OAuth synchronisiert keine Bild-URL in `profiles`. Altwerte können gespeichert bleiben, werden aber nicht mehr ausgegeben oder abgerufen. Produktiver Rollout und Browser-Netzwerkprüfung noch offen. |

**Avatar-Preview-Vorbereitung 2026-11-06:** Der Betreiber hat einen Preview-Test ohne Push und ohne Produktionsdeployment freigegeben und anschließend ausdrücklich die Produktionsdatenbank für gekennzeichnete synthetische Test-Fixtures erlaubt. Keine echten Kundendaten verwenden; die gezielte Bereinigung und Prüfung auf Reste sind erforderlich. Der Avatar-Guard-Test besteht 2/2; TypeScript ist erfolgreich. Das vorhandene Preview-Smoke-Skript ist für den Avatar-Nachweis nicht ausreichend und seine Cleanup-Logik muss vor einer Nutzung verbessert oder ersetzt werden. Das Vercel-CLI ist am Projekt angemeldet; sein Dry-Run zeigt, dass `.env.local` ausgeschlossen würde, aber auch lokale Archive und weitere nicht benötigte Dateien im Upload enthalten wären. Deshalb ist ein ausdrücklich gefilterter Deployment-Kontext erforderlich. Die Preview-Umgebung enthält unter anderem Service-Role- und Resend-Konfiguration; ihr Zugriffsschutz ist vor einem Deployment nachzuweisen. Die zuletzt versuchte Kommandozeile startete auch für einen einfachen Testbefehl nicht mehr; ein Preview wurde nicht erstellt und keine Fixtures wurden angelegt. Tests bleiben offen: beide Profilendpunkte weisen nichtleere Avatar-URLs zurück, leere Werte bleiben zulässig, GET liefert keine Alt-URL; beide Einstellungsseiten und gegebenenfalls OAuth-Callback erzeugen keine externen Avatar-Bildanfragen. Produktivrollout und Commit/Push bleiben separat freigabepflichtig.

Nach Eingang dieser Fakten werden sie in die entsprechenden DF-Abschnitte eingetragen und ARCH-T01 kann anhand der tatsächlich aktiven produktiven Konfiguration neu bewertet werden. Der Feedback-Link ohne Ablaufdatum bleibt als bewusst erfasstes Restrisiko (Risikoregister #13) dokumentiert; er verhindert nicht das Inventar-Abnahmekriterium, muss aber vor Go-live durch eine dokumentierte Risikoentscheidung oder technische Begrenzung adressiert werden.

### Vorbereitung: Vercel-Funktionen nach Frankfurt

Der Betreiber hat am 2026-11-06 die **Vorbereitung**, nicht die Umstellung oder ein Deployment, freigegeben.

1. **Ausgangslage:** Projekteinstellung zeigt `iad1` (Washington D.C.); das aktuelle Produktionsdeployment zeigt bei Function Region nur „all“. Laufzeitregion anhand geeigneter Vercel-Deployment-/Laufzeitnachweise ohne Kundendaten und ohne Offenlegung von Secrets klären. Die Repo-Datei `vercel.json` definiert keine Region; eine Deployment-spezifische Überschreibung ist dadurch nicht ausgeschlossen.
2. **Umfang und Risiken:** `fra1` (Frankfurt) ist im Dashboard auswählbar. Laut [Vercel](https://vercel.com/docs/functions/configuring-functions/region) gilt die Einstellung für Functions, nicht automatisch für CDN oder Routing Middleware; einzelne Funktionen können Regionen überschreiben. Drittlandverarbeitung bei weiteren Diensten, insbesondere Azure Global Standard, bleibt getrennt zu bewerten. Zugriffe auf Supabase, Azure, Resend, Stripe und Google sowie Cron-Jobs müssen erreichbar bleiben.
3. **Vor Freigabe:** Aktuelles Produktionsdeployment und Projekteinstellung als Rückfallpunkt dokumentieren, Preview-/Teststrategie und zulässige Testkonten festlegen, Zugriffs- und Providerbedingungen prüfen. Keine echten CRM-Daten für Tests verwenden. Die spätere Änderung von `iad1` auf `fra1` und der notwendige Redeploy benötigen ausdrückliche Betreiberfreigabe; keine gleichzeitige Azure-Modellumstellung.
4. **Nach freigegebenem Rollout:** Erfolgreiches Deployment und tatsächliche Laufzeitregion verifizieren; Wartungsmodus beibehalten, Health, Authentifizierung, Workspace-Zugriffe und wichtige Integrationen mit geeigneten synthetischen Testdaten prüfen. Cron- und Webhook-Tests nur kontrolliert und ohne reale Zahlungen oder unerwünschten Versand. Dokumentierte Ergebnisse und Monitoring-Fenster nach Deployment aktualisieren.
5. **Rückfall:** Vorab klären, wie die bestehende Produktionsversion wieder aktiviert und die Projekteinstellung bei Bedarf auf `iad1` zurückgesetzt werden kann; prüfen, welche Einstellungen bei einem erneuten Deployment wirksam werden. Rückfall ist nicht geübt und erfordert ebenso eine kontrollierte Entscheidung. Ein Rückfall nach `iad1` kann erneut US-Verarbeitung bedeuten.

## 10. Abnahmematrix Kapitel 1

| Anforderung | Ergebnis |
|---|---|
| ARCH-001 produktive Komponenten | Code-Inventar sowie Supabase-, Vercel-, Resend- und Google-Cloud-Konsolenbefunde dokumentiert; Vercel-Projekteinstellung zeigt `iad1`, wirksame Deployment-Region und Log-Einstellungen noch offen |
| ARCH-002 externe Dienste | Code-/SDK-Dienste, Supabase Auth Provider, keine Supabase Edge Functions, Resend-Domain/Webhookstatus, Vercel-Projekt-Datenfreigabe und Google-OAuth-Status/Scope-Abweichung dokumentiert; weitere Provider-Dashboard-Fakten offen |
| ARCH-003 Datenflüsse mit Quelle, Ziel, Daten, Auth, TLS, Rechten, Fehler, Logs, Verantwortung | DF-01 bis DF-13 dokumentiert; Provider-Retention/Log-Details teils nicht repo-verfügbar |
| ARCH-004 Vertrauensgrenzen | 13 Grenzen dokumentiert |
| ARCH-005 Datenklassifikation | 7 Klassen inkl. Freitext-/Sonderkategorien-Risiko dokumentiert |
| ARCH-006 Secrets | Namen, Zwecke und Speicherorte dokumentiert; keine Werte |
| ARCH-007 öffentlich/interne Endpunkte | 72 API-Routen gezählt und Zugangskategorien beschrieben |
| ARCH-008 Adminzugänge | App-/Provider-/Service-Role-Zugänge und unabhängige Bestätigungsgrenzen dokumentiert |
| ARCH-009 Dienstabhängigkeiten | Kernabhängigkeiten dokumentiert |
| ARCH-010 Bedrohungsmodell aktuell halten | THR-001 bis THR-014 mit Szenario, W/A, Maßnahme und Restrisiko dokumentiert |
| ARCH-T01 keine unbekannten externen Datenübertragungen | Code- und ausgewählte Konsolenprüfung dokumentiert. Avatar-URL-Ausleitung ist im Repository blockiert, produktiver Rollout aber offen. Vercel-Projekt-Datenteilung für Modelltraining wurde deaktiviert und nach Reload geprüft. Google OAuth ist extern/„In Produktion“, aber die Konsole listet keine sensiblen/eingeschränkten Scopes, obwohl der Code Gmail-/Kalender-Scopes anfordert; produktive Client-Zuordnung und wirksame Einwilligung sind offen. Vercel-Funktionsregion/Logs, KI-Unterauftragsverarbeiter, Azure-/Stripe-Konfigurationen und weitere Restangaben aus Abschnitt 9 sind noch offen |

**Kapitel-1-Abschluss:** Der technische Repository-Abgleich, die Datenflussdokumentation und das Bedrohungsmodell sind abgeschlossen. Für die externe Gesamt-Abnahme fehlen die in Abschnitt 10 aufgeführten Konfigurationsfakten; dies ist eine klar abgegrenzte Betreiberabhängigkeit und keine noch ausstehende Code-Inventarisierung. Kapitel 1 ist daher repository-seitig vollständig, aber bis zur Bestätigung weiterhin nicht als produktionsseitig abgenommen oder als Go-live-Freigabe zu bezeichnen.
