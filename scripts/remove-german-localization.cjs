const fs = require("fs")
const path = require("path")
const ts = require("typescript")

const root = path.join(process.cwd(), "src")
const translations = new Map([
  ["Lädt...", "Loading..."], ["Lade...", "Loading..."], ["Abbrechen", "Cancel"], ["Speichern", "Save"], ["Speichert...", "Saving..."],
  ["Kunden", "Customers"], ["Kunde", "Customer"], ["Aufgaben", "Tasks"], ["Aufgabe", "Task"], ["Aktivitäten", "Activities"], ["Aktivität", "Activity"],
  ["Suche", "Search"], ["Suche...", "Searching..."], ["Keine Firma", "No company"], ["Nicht angegeben", "Not specified"],
  ["Wähle deinen Wachstumsplan", "Choose your growth plan"], ["Aktueller Plan", "Current plan"], ["inaktiv", "inactive"],
  ["KI-Assistent", "AI Assistant"], ["Automatisierungen", "Automations"], ["Benachrichtigungen", "Notifications"], ["Abrechnung", "Billing"], ["Preise", "Pricing"], ["Einstellungen", "Settings"],
  ["Leads, Aufgaben und Seiten durchsuchen...", "Search leads, tasks, and pages..."], ["Lead-Aufgabe", "Lead task"],
  ["Neuer-Lead Follow-up", "New lead follow-up"], ["Kundin/Kunden innerhalb von 24h anrufen", "Call the customer within 24 hours"],
  ["Papierkorb konnte nicht geladen werden", "Could not load trash"], ["Lead konnte nicht wiederhergestellt werden", "Could not restore lead"], ["Gelöschte Leads", "Deleted leads"], ["Hier findest du deine gelöschten Leads und kannst sie", "Find your deleted leads here and"], ["Gelöschte Leads werden hier angezeigt.", "Deleted leads appear here."], ["Gelöscht am", "Deleted on"],
  ["Diese Bedingungen gelten fuer alle Vertraege zwischen CloseFlow und den jeweiligen Kundinnen und Kunden.", "These terms apply to all agreements between CloseFlow and its customers."], ["Zugangsdaten sind vertraulich zu behandeln. Inhalte muessen rechtmaessig sein und duerfen keine Rechte Dritter verletzen.", "Access credentials must be kept confidential. Content must be lawful and must not infringe third-party rights."],
  ["Diese Cookies speichern z. B. Spracheinstellungen oder andere Komfortfunktionen.", "These cookies store language preferences and other convenience settings."],
  ["Diese Seite beschreibt, wie CloseFlow personenbezogene Daten verarbeitet. Bitte die Platzhalterangaben vor Produktionsstart rechtlich finalisieren.", "This page describes how CloseFlow processes personal data. Finalize the placeholder information with legal counsel before production."],
  ["Angaben gemaess Paragraph 5 TMG. Bitte ersetze die Platzhalter vor dem Go-Live mit den finalen Firmendaten.", "Information pursuant to Section 5 TMG. Replace placeholders with final company details before go-live."], ["Die Inhalte dieser Seite wurden mit groesster Sorgfalt erstellt. Fuer die Richtigkeit, Vollstaendigkeit und Aktualitaet kann jedoch keine Gewaehr uebernommen werden.", "This page was prepared with the greatest care. However, no guarantee can be made for its accuracy, completeness, or currency."],
  ["Beim Abschluss werden realistische Demo-Leads, Aktivitäten und Aufgaben geladen.", "Completing this loads realistic demo leads, activities, and tasks."], ["Einstellungen ansehen", "View settings"],
  ["Schließen", "Close"], ["Straße, Stadt", "Street, city"], ["Nächste Aktion", "Next action"], ["Kunden anrufen", "Call customer"], ["Datum der nächsten Aktion", "Next action date"], ["Notizen zu dieser Opportunity hinzufügen...", "Add notes about this opportunity..."],
  ["Schreibe hier deine E-Mail...", "Write your email here..."], ["Keine Ergebnisse gefunden", "No results found"],
  ["Aktivität konnte nicht gespeichert werden", "Could not save activity"], ["Keine doppelte offene Automation-Task", "No duplicate open automation task"], ["Automation speichern", "Save automation"],
  ["Lead wurde kontaktiert, ist aber noch nicht weiter fortgeschritten.", "The lead was contacted but has not progressed further."], ["Überdurchschnittlicher Deal-Wert.", "Above-average deal value."], ["Keine Aktivität seit ${staleDays} Tagen.", "No activity for ${staleDays} days."],
  ["Umsatzanalyse momentan nicht verfügbar", "Revenue analysis temporarily unavailable"], ["Die KI-Analyse konnte momentan nicht erstellt werden. Deine Forecast-Daten sind weiterhin verfügbar.", "The AI analysis could not be generated right now. Your forecast data is still available."], ["Die KI-Analyse ist momentan nicht verfügbar.", "AI analysis is temporarily unavailable."], ["Prüfe deine größten offenen Deals manuell.", "Review your largest open opportunities manually."], ["Prüfe Deals mit niedrigem Health Score oder fehlender nächster Aktion.", "Review deals with a low health score or missing next action."], ["Die Pipeline ist weiterhin verfügbar und kann manuell geprüft werden.", "The pipeline remains available and can be reviewed manually."],
  ["German", "English"], ["Deutsch", "English"]
])

function filesIn(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) return filesIn(filePath)
    return /\.tsx?$/.test(entry.name) ? [filePath] : []
  })
}

function isGermanCondition(node, sourceFile) {
  const text = node.getText(sourceFile).replace(/\s+/g, " ")
  return /\b(isDe|resolvedIsDe|language|appLanguage|locale)\b/.test(text) && /isDe|resolvedIsDe|=== "de"|=== 'de'/.test(text)
}

for (const filePath of filesIn(root)) {
  const input = fs.readFileSync(filePath, "utf8")
  const sourceFile = ts.createSourceFile(filePath, input, ts.ScriptTarget.Latest, true)
  const transformer = (context) => {
    const visit = (node) => {
      if (ts.isConditionalExpression(node) && isGermanCondition(node.condition, sourceFile)) {
        const conditionText = node.condition.getText(sourceFile).replace(/\s+/g, " ")
        const keepWhenTrue = /^!\s*isDe\b/.test(conditionText)
        return ts.visitNode(keepWhenTrue ? node.whenTrue : node.whenFalse, visit)
      }
      if (ts.isJsxAttribute(node) && node.name.text === "isDe") return undefined
      return ts.visitEachChild(node, visit, context)
    }
    return (node) => ts.visitNode(node, visit)
  }
  let output = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed }).printFile(
    ts.transform(sourceFile, [transformer]).transformed[0],
  )
  output = output
    .replace(/\b(?:language|appLanguage|locale)\s*===\s*["']de["']/g, "false")
    .replace(/\b(?:language|appLanguage|locale)\s*!==\s*["']de["']/g, "true")
    .replace(/["']de-DE["']/g, '"en-US"')
    .replace(/["']de["']\s*\|\s*["']en["']/g, '"en"')
    .replace(/\b(label|description|title)En\b/g, "$1")
    .replace(/\s*(label|description|title)De:\s*(?:"[^"]*"|'[^']*'|`[^`]*`),?/g, "")
    .replace(/\s*(?:isDe|titleDe)\??:\s*(?:boolean|string);?/g, "")
    .replace(/\b(?:language|appLanguage|locale|payload\?\.language)\s*===\s*["']en["']\s*\?\s*["']en["']\s*:\s*["']de["']/g, '"en"')
    .replace(/(["']en["']\s*=\s*)["']de["']/g, "$1\"en\"")
    .replace(/(let\s+locale:\s*(?:Locale|"en")\s*=\s*)["']de["']/g, "$1\"en\"")
    .replace(/\[\s*isDe\s*,\s*/g, "[")
    .replace(/,\s*isDe\b/g, "")
    .replace(/\bisDe\s*,\s*/g, "")
    .replace(/^\s*(const|let)\s+(?:isDe|resolvedIsDe)\s*=.*(?:\r?\n(?!\s*[,;]))?/gm, "")
  for (const [from, to] of translations) output = output.split(from).join(to)
  fs.writeFileSync(filePath, output)
}