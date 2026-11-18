# KI-Sicherheitsprüfung – Teil 6

Stand: 2026-11-06. Prüfung des ChatGPT-Umsetzungshandbuchs (AI-001 bis AI-014 und AI-T01 bis AI-T03) gegen den aktuellen Code. Dies ist ein Code-Review, kein Azure-Live-Red-Team und keine Garantie, dass ein Sprachmodell Prompt-Injection zuverlässig widersteht.

## Umgesetzte Kontrollen

| Kontrolle | Status | Nachweis |
|---|---|---|
| KI-Aufrufe nur serverseitig, Azure-Konfiguration geprüft | ✅ | `src/lib/aiCost.ts`; Azure-Endpunkt muss HTTPS ohne zusätzliche Pfade/Query sein; API-Key nicht öffentlich |
| Authentifizierung, Workspace und KI-Quote | ✅ | KI-Routen nutzen gemeinsame oder manuelle Auth-/Workspace-/Quota-Prüfung; `test:ai-routes` |
| Prompt-Injection als Defense-in-Depth | 🟡 | gemeinsamer Guard hängt seine Sicherheitsregeln an den letzten System-Prompt; CRM-/Nutzereingaben bleiben User-Daten; kein Wirksamkeitsversprechen |
| Tool-Aufrufe und externe Aktionen | ✅ | Provider-Transport blockiert Tool-Aufrufe; KI-Routen führen keine vom Modell ausgelösten DB-/E-Mail-/CRM-Aktionen aus |
| Eingabe- und Ausgabelimits | ✅ | Guard begrenzt Provider-Request auf 256 KiB und Ausgaben auf höchstens 1.200 Tokens; Chat- und ausgewählte Routen haben zusätzliche Feldgrenzen |
| Workspace-Fremdzugriff im KI-Chat | ✅ | optionale Lead-ID wird vor dem Modellaufruf in genau dem autorisierten Workspace geprüft |
| Datenminimierung | 🟡 | E-Mail-Generator verwendet eine Allowlist und sendet keine internen Deal-Kosten mehr; weitere KI-Funktionen übermitteln die jeweils für Analyse benötigten CRM-Kontexte |
| KI-Telemetrie ohne Prompt-/Antwortspeicherung | ✅ | Token-/Kostenereignisse; Chat-Prompts und -Antworten werden nicht zusätzlich in `ai_conversations` gespeichert |
| Ausgabevalidierung | 🟡 | wichtige JSON-Antworten werden in den Routen geprüft; Modellantworten sind weiterhin nicht autoritativ und dürfen keine Berechtigungsentscheidung ersetzen |

## Behobene Befunde

1. Der frühere Guard wurde vor den Anwendungs-System-Prompt gestellt und verlangte, das Ausgabeformat aus dem „ersten“ System-Prompt zu übernehmen. Die Sicherheitsregeln folgen jetzt dem Anwendungs-Prompt.
2. Der Chat nahm eine Lead-ID an, ohne sie im ausgewählten Workspace zu prüfen. Die Route prüft die Mitgliedschaft/Lesbarkeit vor dem Provider-Aufruf.
3. Der Chat speicherte Prompt und Antwort zusätzlich in `ai_conversations`, obwohl der Client diese Tabelle nicht nutzt. Diese Speicherung wurde entfernt.
4. Der E-Mail-Generator übermittelte das komplette Lead-Objekt einschließlich Feldern, die für den Entwurf nicht nötig waren, sowie interne Deal-Kosten. Er sendet jetzt nur Name, Firma, Status, Wert und begrenzte Notizen; Kosten, E-Mail, Telefonnummern und sonstige Lead-Felder werden nicht an diesen Modellaufruf gegeben.
5. Es gab keinen gemeinsamen Token- oder Requestgrößen-Deckel. Der zentrale Provider-Transport setzt die Obergrenzen und scheitert bei ungültigen Chat-Payloads oder Tool-Aufrufen geschlossen.

## Tests

- `npm run test:ai-cost`: 21/21 bestanden.
- `npm run test:ai-routes`: 10/10 bestanden.
- `npx tsc --noEmit`: bestanden.
- ESLint auf den geänderten KI-Routen, Bibliotheken und Tests: bestanden.
- Ein Produktions-Build wurde gestartet, lief in der lokalen Umgebung jedoch über zehn Minuten ohne Abschluss und wurde abgebrochen. Daher kein Build-Erfolg behauptet.
- Kein echter Azure-Aufruf, kein Modell-Red-Team und kein produktiver Datentransfer als Test ausgeführt.

## Noch offene Punkte

- Azure-Konsole am 2026-11-06: Ressource `closeflow-openai-de` in Germany West Central, `gpt-4.1-mini` als `Global Standard`, Version `2025-04-14`, Inhaltsfilter `DefaultV2`, Status `Succeeded`; keine Diagnostic Settings für die Ressource definiert. Laut [Microsoft](https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/openai/data-privacy) kann Global Standard Prompts und Antworten außerhalb der Ressourcengeografie verarbeiten. Eine EU-only-Verarbeitung ist damit nicht nachgewiesen; Verknüpfung zum produktiven Endpoint, Datenschutz-/Transferentscheidung, Abuse-Monitoring, Aufbewahrungsfrist und Vertrags-/AVV-Abdeckung bleiben vor Go-live offen. Keine Diagnostic Settings bedeutet nicht, dass sämtliche Provider-Logs oder Abuse-Monitoring ausgeschaltet sind.
- Alle KI-Routen mit synthetischen Injection-Fällen testen (direkte Eingabe, CRM-Notizen, importierte Texte, verschachtelte Daten, mehrsprachige und kodierte Anweisungen); Ergebnis fachlich bewerten.
- Ausgabe- und Schema-Validierung je Route vervollständigen. Kein Modelltext darf automatisch eine Berechtigung erteilen oder eine irreversible Aktion auslösen.
- Aufbewahrung und Zugriff auf Kosten-/Nutzungs-Auditdaten festlegen; keine Prompts, Antworten oder unnötigen PII in Fehlerlogs aufnehmen.
- Die feste Obergrenze von 1.200 Completion-Tokens bei Bedarf je Feature messen und fachlich anpassen; ein Request-Limit ersetzt keine Kostenüberwachung bei Azure.

## Azure-Alternative: Data Zone Standard

Auf Wunsch des Betreibers wurden am 2026-11-06 EU-/regionale Optionen geprüft, ohne Ressourcen oder Einstellungen zu ändern:

- Microsofts [Verfügbarkeitsmatrix](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability) listet `gpt-4.1-mini` (`2025-04-14`) und `gpt-4o-mini` (`2024-07-18`) für **Data Zone Standard** in `germanywestcentral`. Die Deployment-Dialoge zeigten am 2026-11-06 für beide Modelle `EUR Data Zone` und Filter `DefaultV2` sowie jeweils verfügbare Quota: 2 Mio. TPM für `gpt-4.1-mini` und 1 Mio. TPM für `gpt-4o-mini`. Beide Dialoge wurden ohne Deployment abgebrochen; Quota kann sich ändern und eine erfolgreiche Bereitstellung ist damit nicht nachgewiesen.
- Für rein regionales Standard-Deployment listet dieselbe Matrix beide Modelle in `swedencentral`, aber nicht in `germanywestcentral`. Für eine tatsächlich verfügbare und finanzierbare Umstellung sind Abo-Quota, Tarif und Einrichtung gesondert zu prüfen.
- Die [Deployment-Dokumentation](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/deployment-types) ordnet die EU Data Zone der Azure EU Data Boundary zu und weist darauf hin, dass diese auch EFTA-Länder wie Norwegen und die Schweiz umfassen kann. Die [Verfügbarkeitsmatrix](https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability) beschreibt EU-Data-Zone-Verarbeitung dagegen als EU-Mitgliedstaaten. Eine rein auf EU-Mitgliedstaaten beschränkte Verarbeitung muss wegen dieser unterschiedlichen Microsoft-Angaben vor einer entsprechenden Zusage vertraglich geklärt werden. Data Zone ist keine Garantie für Verarbeitung ausschließlich in Deutschland, deaktiviert kein Abuse-Monitoring und garantiert keine Null-Aufbewahrung.
- CloseFlow unterstützt beide Modellpfade und nutzt eine gemeinsame Endpoint-/Key-Konfiguration sowie je ein Deployment- und Preispaar in `src/lib/aiCost.ts`. Laut Sitzungsaufzeichnung vom 2026-11-01 waren damals **beide** Pfade auf das `gpt-4.1-mini`-Deployment und dessen Preis gesetzt. Die geprüfte Azure-Ressource zeigt derzeit nur dieses Global-Deployment. Auch die lokale Testkonfiguration verweist auf diese Ressource und für beide Pfade auf dieses Deployment; sie ist aber kein Nachweis für Production. Vercel listete am 2026-11-06 beide Deployment- und alle vier Preisvariablen für Production als Secret, deren Werte dort nicht bestätigt wurden. Einen Pfad auf ein echtes `gpt-4o-mini` umzustellen wäre möglicherweise eine Modell- und Verhaltensänderung statt nur eines Regionswechsels und muss separat bewertet werden.
- Laut [Vercel-Dokumentation](https://vercel.com/docs/environment-variables/sensitive-environment-variables) sind gespeicherte Secret-Werte nach dem Speichern nicht mehr lesbar; beim Bearbeiten wird nur ein neuer Wert gesetzt. Daher weder Werte durch Bearbeitung ersetzen noch einen Diagnose-Endpunkt oder Logs zum Auslesen einführen. Produktionszuordnung über vorhandene, vertrauenswürdige Betriebsnachweise und den tatsächlich laufenden Deployment-Stand klären; bleiben diese unzureichend, ist eine kontrollierte Neukonfiguration mit gesichertem Rückfallplan gesondert zu planen. Lokale Einstellungen und historische Aufzeichnungen allein bestätigen den aktuellen Produktionsstand nicht.
- **Betreiberbestätigung 2026-11-06:** In Vercel Production wurden für beide Modellpfade unverändert 0,40 USD Input und 1,60 USD Output pro Million Tokens eingetragen. Das entspricht den November-Preisen für `gpt-4.1-mini` Global Standard und ist konsistent mit der historischen Zuordnung beider Pfade zu diesem Modell. Es belegt nicht unabhängig die aktuellen Deployment-Namen oder den produktiven Endpoint; falls tatsächlich `gpt-4o-mini` angesprochen wird, stimmen diese Preise nicht mit dessen November-Tarif überein. Für eine Data-Zone-Umstellung sind die Preiswerte auf das jeweils tatsächlich genutzte Modell und Deployment abzustimmen.
- Die [Azure Retail Prices API](https://prices.azure.com/api/retail/prices) zeigte am 2026-11-06 für Germany West Central folgende öffentliche Standard-Textpreise pro Million Tokens (Input/Output): `gpt-4.1-mini` Global 0,40/1,60 USD, Data Zone 0,44/1,76 USD; `gpt-4o-mini` Global 0,15/0,60 USD, Data Zone 0,165/0,66 USD. Dies sind Retail-Vergleichswerte, keine Bestätigung individueller Vertragskonditionen, Steuern, Währung oder der in Vercel tatsächlich gesetzten Werte. Kostenrechnung muss zum tatsächlich angesprochenen Modell passen.
- **Abrechnungsprofil-Preisliste November 2026:** Die vom Betreiber bereitgestellte Azure-Preisliste des mit `CloseFlow` verknüpften Abrechnungsprofils bestätigt für `DE West Central` die oben genannten Standard-Textpreise pro Million Tokens für beide Modelle und Deployment-Typen. Die Datei weist die Einheitspreise in USD und die Abrechnungswährung EUR aus; Wechselkurs, Steuern, Endrechnung und künftige Preise sind damit nicht bestätigt. Das Abonnement verwendet den `Microsoft Azure Plan`. Die Preisliste verbleibt lokal und wird nicht ins Repository übernommen.
- Vor Bereitstellung und synthetischen Tests müssen aktuelle Endpoint-/Modellzuordnung, Testzugang und Rückfallplan bestätigt werden; die Tarife sind für November durch die Preisliste belegt. Für eine spätere Produktionsumstellung sind passende Deployments und Preise, Filter, Funktions- und Kostentests sowie ein separat freigegebener Rollout notwendig; bisherige Produktionswerte dürfen nicht überschrieben werden, solange ihre Wiederherstellung nicht gesichert ist.
- Eine spätere Änderung von Azure-Deployments oder Vercel-Umgebungsvariablen benötigt eine separate Freigabe und einen kontrollierten Rollout. Der Wartungsmodus bleibt unverändert.
