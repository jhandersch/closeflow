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

- Azure-Datenschutz-/Aufbewahrungseinstellungen, Region, Vertrags- und AVV-Abdeckung vor Go-live dokumentieren und durch den Betreiber/Anbieter verifizieren.
- Alle KI-Routen mit synthetischen Injection-Fällen testen (direkte Eingabe, CRM-Notizen, importierte Texte, verschachtelte Daten, mehrsprachige und kodierte Anweisungen); Ergebnis fachlich bewerten.
- Ausgabe- und Schema-Validierung je Route vervollständigen. Kein Modelltext darf automatisch eine Berechtigung erteilen oder eine irreversible Aktion auslösen.
- Aufbewahrung und Zugriff auf Kosten-/Nutzungs-Auditdaten festlegen; keine Prompts, Antworten oder unnötigen PII in Fehlerlogs aufnehmen.
- Die feste Obergrenze von 1.200 Completion-Tokens bei Bedarf je Feature messen und fachlich anpassen; ein Request-Limit ersetzt keine Kostenüberwachung bei Azure.
