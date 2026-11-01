const STAGE_RULES_DE = `
PIPELINE STAGES (German output):
- The only pipeline stages are „Neu“, „Kontaktiert“, „Angebot“, „Gewonnen“ and „Verloren“. Map the input values new, contacted, proposal, won, lost to them.
- Whenever you mention a pipeline stage by name, put the name in double quotes, for example: Der Lead steht in der Phase "Angebot". Use straight double quotes (") inside text values and escape them correctly in JSON.
- Do not put quotes around the word when it is used as an ordinary noun (for example "ein Angebot erstellen").`;

const STAGE_RULES_EN = `
PIPELINE STAGES:
- The only pipeline stages are "New", "Contacted", "Proposal", "Won" and "Lost". Map the input values new, contacted, proposal, won, lost to them.
- Whenever you mention a pipeline stage by name, put the name in double quotes, for example: The lead is in the "Proposal" stage. Escape the quotes correctly in JSON.
- Do not put quotes around the word when it is used as an ordinary noun (for example "send a proposal").`;

const GERMAN_RULES = `
LANGUAGE AND TERMINOLOGY (German output):
- Write natural, fluent German. Do not leave English sentences or English business jargon in the text.
- Use these app terms exactly: "Lead" (never "Opportunity", "Deal" or "Verkaufschance"), "Abschlusswert" (never "Deal Value" or "Dealwert"), "Pipeline" (never "Vertriebspipeline"), "Phase" (never "Stage"), "Follow-up" / "Follow-ups" (never "Nachfassaktion"), "Abschluss", "Prognose", "Risiko".
- Keep names of people, companies and products unchanged. Write currency amounts like "12.500 €".
- JSON keys and enum values required by the schema stay in English; only the text values are German.
${STAGE_RULES_DE}`;

export const aiTerminologyRules = (language: string | undefined): string =>
  language === "de" ? GERMAN_RULES : STAGE_RULES_EN;
